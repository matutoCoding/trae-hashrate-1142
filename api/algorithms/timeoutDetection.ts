import type {
  ApprovalNode,
  ReminderRecord,
  ApprovalRules,
  Reservation,
} from '../../shared/types.js';
import { addHours, genId } from '../utils/dateUtils.js';

export interface TimeoutCheckResult {
  newReminders: ReminderRecord[];
  updatedNodes: ApprovalNode[];
  escalatedReservations: { reservationId: string; newNode: ApprovalNode }[];
  autoDecided: { reservation: Reservation; action: 'approve' | 'reject' }[];
}

export const checkNodeTimeout = (
  node: ApprovalNode,
  rules: ApprovalRules,
  now: Date = new Date()
): { shouldRemind: boolean; shouldEscalate: boolean; shouldAutoDecide: boolean } => {
  if (node.status !== 'pending') {
    return { shouldRemind: false, shouldEscalate: false, shouldAutoDecide: false };
  }

  const created = new Date(node.createdAt).getTime();
  const nowTime = now.getTime();
  const elapsedHours = (nowTime - created) / (1000 * 60 * 60);

  const existingReminderLevels = node.reminders.map((r) => r.level);

  return {
    shouldRemind:
      elapsedHours >= rules.firstReminderHours && !existingReminderLevels.includes(1),
    shouldEscalate:
      elapsedHours >= rules.escalationHours && !existingReminderLevels.includes(2),
    shouldAutoDecide:
      elapsedHours >= rules.autoDecisionHours && !existingReminderLevels.includes(3),
  };
};

export const createReminder = (
  node: ApprovalNode,
  level: number,
  rules: ApprovalRules,
  now: Date = new Date()
): ReminderRecord => {
  const messages: Record<number, string> = {
    1: `您好，您有待审批的预约申请（预约ID: ${node.reservationId}），已超过${rules.firstReminderHours}小时未处理，请尽快审批。`,
    2: `警告：预约申请（ID: ${node.reservationId}）的审批已超过${rules.escalationHours}小时未处理，系统将升级至上级审批。责任人已记录。`,
    3: `超时自动裁决：预约申请（ID: ${node.reservationId}）已超过${rules.autoDecisionHours}小时未处理，系统将自动执行${rules.autoDecisionAction === 'approve' ? '通过' : '驳回'}。责任人已归档。`,
  };

  const types: Record<number, ReminderRecord['type']> = {
    1: 'reminder',
    2: 'escalation',
    3: 'auto_decision',
  };

  return {
    id: genId(),
    approvalId: node.id,
    type: types[level],
    level,
    sentAt: now.toISOString(),
    recipientId: node.approverId,
    recipientName: node.approverName,
    message: messages[level],
    responsibleParty: level >= 2 ? node.approverName : undefined,
  };
};

export const createEscalationNode = (
  reservation: Reservation,
  currentNode: ApprovalNode,
  rules: ApprovalRules,
  escalationApproverId: string = 'dept_head_001',
  escalationApproverName: string = '系主任王教授',
  now: Date = new Date()
): ApprovalNode => {
  const deadline = addHours(now, rules.advisorTimeoutHours);
  return {
    id: genId(),
    reservationId: reservation.id,
    approverId: escalationApproverId,
    approverName: escalationApproverName,
    role: 'department_head',
    level: currentNode.level + 1,
    status: 'pending',
    createdAt: now.toISOString(),
    deadline: deadline.toISOString(),
    reminders: [],
    comment: `超时升级：原审批人${currentNode.approverName}未在规定时间内处理`,
  };
};

export const processAllTimeouts = (
  nodes: ApprovalNode[],
  reservations: Reservation[],
  rules: ApprovalRules
): TimeoutCheckResult => {
  const result: TimeoutCheckResult = {
    newReminders: [],
    updatedNodes: [],
    escalatedReservations: [],
    autoDecided: [],
  };

  for (const node of nodes) {
    if (node.status !== 'pending') continue;

    const reservation = reservations.find((r) => r.id === node.reservationId);
    if (!reservation) continue;

    const { shouldRemind, shouldEscalate, shouldAutoDecide } = checkNodeTimeout(node, rules);

    if (shouldRemind) {
      const reminder = createReminder(node, 1, rules);
      result.newReminders.push(reminder);
      result.updatedNodes.push({
        ...node,
        reminders: [...node.reminders, reminder],
      });
    }

    if (shouldEscalate) {
      const reminder = createReminder(node, 2, rules);
      result.newReminders.push(reminder);
      const escalatedNode = createEscalationNode(reservation, node, rules);
      result.escalatedReservations.push({
        reservationId: reservation.id,
        newNode: escalatedNode,
      });
      result.updatedNodes.push({
        ...node,
        status: 'escalated',
        reminders: [...node.reminders, reminder],
        handledAt: new Date().toISOString(),
      });
    }

    if (shouldAutoDecide) {
      const reminder = createReminder(node, 3, rules);
      result.newReminders.push(reminder);
      result.autoDecided.push({
        reservation,
        action: rules.autoDecisionAction,
      });
      result.updatedNodes.push({
        ...node,
        status: 'timeout',
        reminders: [...node.reminders, reminder],
        handledAt: new Date().toISOString(),
      });
    }
  }

  return result;
};

export const calculateDeadline = (
  createdAt: Date,
  rules: ApprovalRules
): Date => {
  return addHours(createdAt, rules.advisorTimeoutHours);
};
