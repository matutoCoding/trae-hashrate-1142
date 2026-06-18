import { db } from '../data/database.js';
import type { ApprovalNode, ApprovalNodeStatus, ApprovalRules, ReminderRecord, Reservation } from '../../shared/types.js';
import { addHours, genId } from '../utils/dateUtils.js';
import { processAllTimeouts, createReminder, createEscalationNode } from '../algorithms/timeoutDetection.js';

export const createApprovalNode = (
  reservationId: string,
  approverId: string,
  approverName: string,
  role: ApprovalNode['role'],
  level: number
): ApprovalNode => {
  const now = new Date();
  return {
    id: genId(),
    reservationId,
    approverId,
    approverName,
    role,
    level,
    status: 'pending',
    createdAt: now.toISOString(),
    deadline: addHours(now, db.rules.advisorTimeoutHours).toISOString(),
    reminders: [],
  };
};

export type ApprovalNodeWithReservation = ApprovalNode & {
  reservation?: Reservation & { benchName?: string };
};

export const getPendingApprovals = (
  approverId: string,
  filters?: { benchId?: string; userName?: string; projectName?: string }
): ApprovalNodeWithReservation[] => {
  let result = db.approvals
    .filter((a) => a.approverId === approverId && a.status === 'pending')
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .map((a) => {
      const reservation = db.reservations.find((r) => r.id === a.reservationId);
      const bench = reservation ? db.benches.find((b) => b.id === reservation.benchId) : undefined;
      return {
        ...a,
        reservation: reservation
          ? { ...reservation, benchName: bench?.name || reservation.benchName }
          : undefined,
      };
    });

  if (filters?.benchId) {
    result = result.filter((a) => a.reservation?.benchId === filters.benchId);
  }
  if (filters?.userName) {
    const kw = filters.userName.toLowerCase();
    result = result.filter((a) => a.reservation?.userName.toLowerCase().includes(kw));
  }
  if (filters?.projectName) {
    const kw = filters.projectName.toLowerCase();
    result = result.filter((a) => a.reservation?.projectName.toLowerCase().includes(kw));
  }

  return result;
};

export const getAllApprovals = (
  filters?: {
    benchId?: string;
    userName?: string;
    projectName?: string;
    status?: ApprovalNodeStatus;
  }
): ApprovalNodeWithReservation[] => {
  let result = [...db.approvals]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((a) => {
      const reservation = db.reservations.find((r) => r.id === a.reservationId);
      const bench = reservation ? db.benches.find((b) => b.id === reservation.benchId) : undefined;
      return {
        ...a,
        reservation: reservation
          ? { ...reservation, benchName: bench?.name || reservation.benchName }
          : undefined,
      };
    });

  if (filters?.benchId) {
    result = result.filter((a) => a.reservation?.benchId === filters.benchId);
  }
  if (filters?.userName) {
    const kw = filters.userName.toLowerCase();
    result = result.filter((a) => a.reservation?.userName.toLowerCase().includes(kw));
  }
  if (filters?.projectName) {
    const kw = filters.projectName.toLowerCase();
    result = result.filter((a) => a.reservation?.projectName.toLowerCase().includes(kw));
  }
  if (filters?.status) {
    result = result.filter((a) => a.status === filters.status);
  }

  return result;
};

export const getApprovalById = (id: string): ApprovalNode | undefined => {
  return db.approvals.find((a) => a.id === id);
};

export interface ApprovalActionResult {
  success: boolean;
  node?: ApprovalNode;
  reservation?: Reservation;
  error?: string;
}

export const approveReservation = (
  approvalId: string,
  approverId: string,
  comment?: string
): ApprovalActionResult => {
  const node = db.approvals.find((a) => a.id === approvalId);
  if (!node) return { success: false, error: '审批节点不存在' };
  if (node.approverId !== approverId && approverId !== 'admin_001' && approverId !== 'auto_system') {
    return { success: false, error: '无权限审批此申请' };
  }
  if (node.status !== 'pending' && node.status !== 'timeout') {
    return { success: false, error: '此申请已被处理' };
  }

  node.status = 'approved';
  node.handledAt = new Date().toISOString();
  if (comment) node.comment = comment;
  if (approverId === 'auto_system') {
    node.role = 'auto';
  }

  const reservation = db.reservations.find((r) => r.id === node.reservationId);
  if (reservation) {
    reservation.status = 'approved';
    const idx = reservation.approvalTrail.findIndex((a) => a.id === approvalId);
    if (idx !== -1) reservation.approvalTrail[idx] = { ...node };

    const occ = db.occupancies.find((o) => o.id === reservation.occupancyId);
    if (occ) occ.status = 'confirmed';
  }

  return { success: true, node, reservation };
};

export const rejectReservation = (
  approvalId: string,
  approverId: string,
  comment?: string
): ApprovalActionResult => {
  const node = db.approvals.find((a) => a.id === approvalId);
  if (!node) return { success: false, error: '审批节点不存在' };
  if (node.approverId !== approverId && approverId !== 'admin_001' && approverId !== 'auto_system') {
    return { success: false, error: '无权限审批此申请' };
  }
  if (node.status !== 'pending' && node.status !== 'timeout') {
    return { success: false, error: '此申请已被处理' };
  }

  node.status = 'rejected';
  node.handledAt = new Date().toISOString();
  node.comment = comment || '审批未通过';
  if (approverId === 'auto_system') {
    node.role = 'auto';
  }

  const reservation = db.reservations.find((r) => r.id === node.reservationId);
  if (reservation) {
    reservation.status = 'rejected';
    const idx = reservation.approvalTrail.findIndex((a) => a.id === approvalId);
    if (idx !== -1) reservation.approvalTrail[idx] = { ...node };

    const occ = db.occupancies.find((o) => o.id === reservation.occupancyId);
    if (occ && occ.reservationIds.length <= 1) {
      occ.status = 'cancelled';
    }
  }

  return { success: true, node, reservation };
};

export const escalateApproval = (
  approvalId: string,
  escalatedById: string
): ApprovalActionResult => {
  const node = db.approvals.find((a) => a.id === approvalId);
  if (!node) return { success: false, error: '审批节点不存在' };

  const reservation = db.reservations.find((r) => r.id === node.reservationId);
  if (!reservation) return { success: false, error: '关联预约不存在' };

  const reminder = createReminder(node, 2, db.rules);
  db.reminders.push(reminder);
  node.reminders.push(reminder);
  node.status = 'escalated';
  node.handledAt = new Date().toISOString();

  const newNode = createEscalationNode(reservation, node, db.rules);
  db.approvals.push(newNode);
  reservation.approvalTrail.push(newNode);

  return { success: true, node: newNode, reservation };
};

export const runTimeoutCheck = () => {
  const result = processAllTimeouts(db.approvals, db.reservations, db.rules);

  result.newReminders.forEach((r) => db.reminders.push(r));

  result.updatedNodes.forEach((updatedNode) => {
    const idx = db.approvals.findIndex((a) => a.id === updatedNode.id);
    if (idx !== -1) {
      db.approvals[idx] = updatedNode;
      const reservation = db.reservations.find((r) => r.id === updatedNode.reservationId);
      if (reservation) {
        const trailIdx = reservation.approvalTrail.findIndex((a) => a.id === updatedNode.id);
        if (trailIdx !== -1) reservation.approvalTrail[trailIdx] = { ...updatedNode };
      }
    }
  });

  result.escalatedReservations.forEach(({ reservationId, newNode }) => {
    db.approvals.push(newNode);
    const reservation = db.reservations.find((r) => r.id === reservationId);
    if (reservation) {
      reservation.approvalTrail.push(newNode);
    }
  });

  result.autoDecided.forEach(({ reservation, action }) => {
    if (action === 'approve') {
      approveReservation(
        reservation.approvalTrail[reservation.approvalTrail.length - 1]?.id || '',
        'auto_system',
        '系统自动审批通过（超时未处理）'
      );
    } else {
      rejectReservation(
        reservation.approvalTrail[reservation.approvalTrail.length - 1]?.id || '',
        'auto_system',
        '系统自动驳回（超时未处理）'
      );
    }
  });

  return result;
};

export const getReminders = (filters?: {
  recipientId?: string;
  type?: string;
}): ReminderRecord[] => {
  let result = [...db.reminders];
  if (filters?.recipientId) {
    result = result.filter((r) => r.recipientId === filters.recipientId);
  }
  if (filters?.type && filters.type !== 'all') {
    result = result.filter((r) => r.type === filters.type);
  }
  return result.sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
  );
};

export const getAllApprovalsOld = (): ApprovalNode[] => {
  return [...db.approvals].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const getRules = (): ApprovalRules => {
  return { ...db.rules };
};

export const updateRules = (rules: Partial<ApprovalRules>): ApprovalRules => {
  db.rules = { ...db.rules, ...rules };
  return { ...db.rules };
};
