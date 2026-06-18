import { db } from '../data/database.js';
import type {
  Reservation,
  OccupancyBlock,
  SplitRecord,
  TimeSlot,
} from '../../shared/types.js';
import { checkConflict } from '../algorithms/conflictDetection.js';
import { mergeWithExisting } from '../algorithms/mergeAlgorithm.js';
import { splitOccupancyByCancellation } from '../algorithms/splitAlgorithm.js';
import { createApprovalNode } from './ApprovalService.js';
import { addHours, genId } from '../utils/dateUtils.js';

export interface CreateReservationData {
  benchId: string;
  userId: string;
  userName: string;
  advisorId: string;
  advisorName: string;
  projectName: string;
  description: string;
  participants: string[];
  startTime: string;
  endTime: string;
}

export interface CreateReservationResult {
  success: boolean;
  reservation?: Reservation;
  merged?: boolean;
  mergedOccupancy?: OccupancyBlock;
  conflict?: string;
}

export const createReservation = (
  data: CreateReservationData
): CreateReservationResult => {
  const timeSlot: TimeSlot = { start: data.startTime, end: data.endTime };

  const conflict = checkConflict(timeSlot, data.benchId, db.occupancies);
  if (conflict) {
    return {
      success: false,
      conflict: `时段冲突：${db.benches.find((b) => b.id === conflict.benchId)?.name || '该实验台'} 已有占用 (${new Date(conflict.startTime).toLocaleString('zh-CN')} - ${new Date(conflict.endTime).toLocaleString('zh-CN')}) 重叠`,
    };
  }

  const reservationId = genId();
  const mergeResult = mergeWithExisting(
    reservationId,
    timeSlot,
    data.benchId,
    db.occupancies
  );

  mergeResult.mergedBlockIds.forEach((id) => {
    const idx = db.occupancies.findIndex((o) => o.id === id);
    if (idx !== -1) db.occupancies.splice(idx, 1);
  });
  db.occupancies.push(mergeResult.newBlock);

  const approvalNode = createApprovalNode(
    reservationId,
    data.advisorId,
    data.advisorName,
    'advisor',
    1
  );

  const bench = db.benches.find((b) => b.id === data.benchId);

  const reservation: Reservation = {
    id: reservationId,
    benchId: data.benchId,
    benchName: bench?.name,
    userId: data.userId,
    userName: data.userName,
    advisorId: data.advisorId,
    advisorName: data.advisorName,
    projectName: data.projectName,
    description: data.description,
    participants: data.participants,
    startTime: data.startTime,
    endTime: data.endTime,
    occupancyId: mergeResult.newBlock.id,
    status: 'pending',
    createdAt: new Date().toISOString(),
    approvalTrail: [approvalNode],
  };

  db.reservations.push(reservation);
  db.approvals.push(approvalNode);

  return {
    success: true,
    reservation,
    merged: mergeResult.merged,
    mergedOccupancy: mergeResult.newBlock,
  };
};

export const getReservationsByUser = (
  userId: string,
  status?: string
): Reservation[] => {
  let result = db.reservations.filter((r) => r.userId === userId);
  if (status && status !== 'all') {
    result = result.filter((r) => r.status === status);
  }
  return result.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const getReservationById = (id: string): Reservation | undefined => {
  return db.reservations.find((r) => r.id === id);
};

export const cancelReservation = (
  reservationId: string,
  operatorId: string,
  operatorName: string,
  reason: string = '用户退订'
): { success: boolean; reservation?: Reservation; split?: SplitRecord; error?: string } => {
  const reservation = db.reservations.find((r) => r.id === reservationId);
  if (!reservation) {
    return { success: false, error: '预约不存在' };
  }

  if (reservation.status === 'cancelled' || reservation.status === 'completed') {
    return { success: false, error: '该预约状态不允许退订' };
  }

  const now = Date.now();
  const deadline = addHours(new Date(reservation.startTime), -db.rules.cancellationDeadlineHours).getTime();
  if (now > deadline && reservation.status === 'approved') {
    return {
      success: false,
      error: `距离开始时间不足${db.rules.cancellationDeadlineHours}小时，无法退订`,
    };
  }

  const occupancy = db.occupancies.find((o) => o.id === reservation.occupancyId);
  if (occupancy) {
    const remainingIds = occupancy.reservationIds.filter((id) => id !== reservationId);

    if (remainingIds.length === 0) {
      occupancy.status = 'cancelled';
    } else {
      const cancelSlot: TimeSlot = {
        start: reservation.startTime,
        end: reservation.endTime,
      };
      const splitResult = splitOccupancyByCancellation(
        occupancy,
        cancelSlot,
        reservationId,
        db.reservations,
        operatorId,
        operatorName,
        reason
      );

      if (splitResult) {
        splitResult.removedBlockIds.forEach((id) => {
          const idx = db.occupancies.findIndex((o) => o.id === id);
          if (idx !== -1) db.occupancies.splice(idx, 1);
        });
        db.occupancies.push(...splitResult.newBlocks);
        db.splits.push(splitResult.splitRecord);

        Object.entries(splitResult.reservationOccupancyMap).forEach(([rid, newOccId]) => {
          const r = db.reservations.find((x) => x.id === rid);
          if (r) {
            r.occupancyId = newOccId;
            if (!r.splitHistory) r.splitHistory = [];
            r.splitHistory.push(splitResult.splitRecord);
          }
        });

        reservation.status = 'cancelled';
        if (!reservation.splitHistory) reservation.splitHistory = [];
        reservation.splitHistory.push(splitResult.splitRecord);

        return {
          success: true,
          reservation,
          split: splitResult.splitRecord,
        };
      }
    }
  }

  reservation.status = 'cancelled';
  return { success: true, reservation };
};

export const updateReservationStatus = (
  id: string,
  status: Reservation['status']
): Reservation | null => {
  const reservation = db.reservations.find((r) => r.id === id);
  if (!reservation) return null;
  reservation.status = status;

  if (status === 'approved') {
    const occ = db.occupancies.find((o) => o.id === reservation.occupancyId);
    if (occ) occ.status = 'confirmed';
  }
  if (status === 'rejected' || status === 'cancelled') {
    const occ = db.occupancies.find((o) => o.id === reservation.occupancyId);
    if (occ && occ.reservationIds.length <= 1) {
      occ.status = 'cancelled';
    }
  }

  return reservation;
};

export const getAllReservations = (): Reservation[] => {
  return [...db.reservations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};
