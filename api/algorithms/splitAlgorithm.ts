import type { OccupancyBlock, Reservation, TimeSlot, SplitRecord } from '../../shared/types.js';
import { genId } from '../utils/dateUtils.js';

export interface SplitResult {
  success: boolean;
  newBlocks: OccupancyBlock[];
  removedBlockIds: string[];
  splitRecord: SplitRecord;
  reason?: string;
}

export const getCancelledSlot = (
  reservation: Reservation,
  occupancy: OccupancyBlock
): TimeSlot => {
  return {
    start: reservation.startTime,
    end: reservation.endTime,
  };
};

export const splitOccupancyByCancellation = (
  occupancy: OccupancyBlock,
  cancelSlot: TimeSlot,
  cancelReservationId: string,
  remainingReservationIds: string[],
  operatorId: string,
  operatorName: string,
  reason: string = '用户退订'
): SplitResult | null => {
  const occStart = new Date(occupancy.startTime).getTime();
  const occEnd = new Date(occupancy.endTime).getTime();
  const cancelStart = new Date(cancelSlot.start).getTime();
  const cancelEnd = new Date(cancelSlot.end).getTime();

  if (cancelStart >= occEnd || cancelEnd <= occStart) {
    return null;
  }

  const newBlocks: OccupancyBlock[] = [];

  if (cancelStart > occStart) {
    newBlocks.push({
      id: genId(),
      benchId: occupancy.benchId,
      reservationIds: [...remainingReservationIds],
      startTime: new Date(occStart).toISOString(),
      endTime: new Date(cancelStart).toISOString(),
      status: occupancy.status,
      splitFrom: occupancy.id,
    });
  }

  if (cancelEnd < occEnd) {
    newBlocks.push({
      id: genId(),
      benchId: occupancy.benchId,
      reservationIds: [...remainingReservationIds],
      startTime: new Date(cancelEnd).toISOString(),
      endTime: new Date(occEnd).toISOString(),
      status: occupancy.status,
      splitFrom: occupancy.id,
    });
  }

  const splitRecord: SplitRecord = {
    id: genId(),
    originalOccupancyId: occupancy.id,
    newOccupancyIds: newBlocks.map((b) => b.id),
    splitAt: new Date().toISOString(),
    reason,
    operatorId,
    operatorName,
  };

  return {
    success: true,
    newBlocks,
    removedBlockIds: [occupancy.id],
    splitRecord,
  };
};

export const splitIntoSegments = (
  occupancy: OccupancyBlock,
  splitPoints: number[]
): OccupancyBlock[] => {
  const start = new Date(occupancy.startTime);
  const end = new Date(occupancy.endTime);
  const segments: { start: Date; end: Date }[] = [];

  const sortedPoints = [...splitPoints].sort((a, b) => a - b);
  let current = start;

  for (const pointMinutes of sortedPoints) {
    const pointDate = new Date(start);
    pointDate.setHours(0, 0, 0, 0);
    pointDate.setMinutes(pointMinutes);

    if (pointDate.getTime() > current.getTime() && pointDate.getTime() < end.getTime()) {
      segments.push({ start: current, end: pointDate });
      current = pointDate;
    }
  }

  if (current.getTime() < end.getTime()) {
    segments.push({ start: current, end });
  }

  return segments.map((seg) => ({
    id: genId(),
    benchId: occupancy.benchId,
    reservationIds: [...occupancy.reservationIds],
    startTime: seg.start.toISOString(),
    endTime: seg.end.toISOString(),
    status: occupancy.status,
    splitFrom: occupancy.id,
  }));
};
