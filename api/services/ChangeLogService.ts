import type {
  ChangeLogEntry,
  ChangeLogType,
  Reservation,
  ApprovalNode,
  ReminderRecord,
  SplitRecord,
} from '../../shared/types.js';
import { genId } from '../utils/dateUtils.js';
import { db } from '../data/database.js';

export const buildChangeLog = (reservation: Reservation): ChangeLogEntry[] => {
  const log: ChangeLogEntry[] = [];

  log.push({
    id: genId(),
    type: 'submit',
    time: reservation.createdAt,
    operatorId: reservation.userId,
    operatorName: reservation.userName,
    isSystem: false,
    title: '提交预约',
    description: `${reservation.userName} 提交了预约申请`,
    details: {
      projectName: reservation.projectName,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
    },
  });

  if (reservation.approvalTrail && reservation.approvalTrail.length > 0) {
    for (const node of reservation.approvalTrail) {
      if (node.status === 'pending') {
        log.push({
          id: genId(),
          type: 'approval',
          time: node.createdAt,
          operatorId: node.approverId,
          operatorName: node.approverName,
          isSystem: false,
          title: '进入审批',
          description: `等待 ${node.approverName}（${roleText(node.role)}）审批`,
          details: {
            role: node.role,
            level: node.level,
            deadline: node.deadline,
          },
        });
      } else if (node.status === 'approved') {
        log.push({
          id: genId(),
          type: 'approval',
          time: node.handledAt || node.createdAt,
          operatorId: node.role === 'auto' ? 'auto_system' : node.approverId,
          operatorName: node.role === 'auto' ? '系统自动' : node.approverName,
          isSystem: node.role === 'auto',
          title: node.role === 'auto' ? '自动审批通过' : '审批通过',
          description: node.comment || '审批通过',
          details: {
            role: node.role,
            level: node.level,
            comment: node.comment,
          },
        });
      } else if (node.status === 'rejected') {
        log.push({
          id: genId(),
          type: 'approval',
          time: node.handledAt || node.createdAt,
          operatorId: node.role === 'auto' ? 'auto_system' : node.approverId,
          operatorName: node.role === 'auto' ? '系统自动' : node.approverName,
          isSystem: node.role === 'auto',
          title: node.role === 'auto' ? '自动驳回' : '审批驳回',
          description: node.comment || '审批未通过',
          details: {
            role: node.role,
            level: node.level,
            comment: node.comment,
          },
        });
      } else if (node.status === 'timeout') {
        log.push({
          id: genId(),
          type: 'auto_decision',
          time: node.handledAt || node.createdAt,
          operatorId: 'auto_system',
          operatorName: '系统自动',
          isSystem: true,
          title: '超时裁决',
          description: `审批超时，系统自动裁决`,
          details: {
            role: node.role,
            level: node.level,
          },
        });
      } else if (node.status === 'escalated') {
        log.push({
          id: genId(),
          type: 'escalation',
          time: node.handledAt || node.createdAt,
          operatorId: 'auto_system',
          operatorName: '系统自动',
          isSystem: true,
          title: '审批升级',
          description: `超时未处理，已升级至 ${node.approverName}`,
          details: {
            role: node.role,
            level: node.level,
          },
        });
      }

      if (node.reminders && node.reminders.length > 0) {
        for (const rem of node.reminders) {
          if (rem.type === 'reminder') {
            log.push({
              id: genId(),
              type: 'reminder',
              time: rem.sentAt,
              operatorId: 'auto_system',
              operatorName: '系统自动',
              isSystem: true,
              title: '催办提醒',
              description: `第${rem.level}级催办：${rem.message}`,
              details: {
                level: rem.level,
                recipient: rem.recipientName,
              },
            });
          } else if (rem.type === 'escalation') {
            log.push({
              id: genId(),
              type: 'escalation',
              time: rem.sentAt,
              operatorId: 'auto_system',
              operatorName: '系统自动',
              isSystem: true,
              title: '升级通知',
              description: `已升级处理：${rem.message}`,
              details: {
                level: rem.level,
                recipient: rem.recipientName,
              },
            });
          } else if (rem.type === 'auto_decision') {
            log.push({
              id: genId(),
              type: 'auto_decision',
              time: rem.sentAt,
              operatorId: 'auto_system',
              operatorName: '系统自动',
              isSystem: true,
              title: '自动裁决通知',
              description: rem.message,
              details: {
                level: rem.level,
                recipient: rem.recipientName,
              },
            });
          }
        }
      }
    }
  }

  if (reservation.splitHistory && reservation.splitHistory.length > 0) {
    for (const sr of reservation.splitHistory) {
      log.push({
        id: genId(),
        type: 'split',
        time: sr.splitAt,
        operatorId: sr.operatorId,
        operatorName: sr.operatorName,
        isSystem: sr.operatorId === 'auto_system',
        title: '占用拆分',
        description: `${sr.reason}，原占用拆分为 ${sr.newOccupancyIds.length} 段`,
        details: {
          originalOccupancyId: sr.originalOccupancyId,
          newOccupancyIds: sr.newOccupancyIds,
          reason: sr.reason,
        },
      });
    }
  }

  const occ = db.occupancies.find((o) => o.id === reservation.occupancyId);
  if (occ && occ.mergedFrom && occ.mergedFrom.length > 0) {
    const mergedReservations = db.reservations.filter(
      (r) => occ.reservationIds.includes(r.id) && r.id !== reservation.id
    );
    const mergedNames = mergedReservations.map(
      (r) => `${r.projectName}（${r.userName}）`
    );
    log.push({
      id: genId(),
      type: 'merge',
      time: occ.mergedAt || reservation.createdAt,
      operatorId: 'auto_system',
      operatorName: '系统自动',
      isSystem: true,
      title: '时段合并',
      description: mergedNames.length > 0
        ? `与 ${mergedNames.join('、')} 自动合并为连续占用（${fmtShort(occ.startTime)} ~ ${fmtShort(occ.endTime)}）`
        : `与相邻 ${occ.mergedFrom.length} 个预约自动合并为连续占用`,
      details: {
        mergedFrom: occ.mergedFrom,
        occupancyId: occ.id,
        mergedReservationIds: mergedReservations.map((r) => r.id),
        occupancyStartTime: occ.startTime,
        occupancyEndTime: occ.endTime,
      },
    });
  }

  if (reservation.status === 'cancelled') {
    log.push({
      id: genId(),
      type: 'cancel',
      time: reservation.cancelledAt || reservation.createdAt,
      operatorId: reservation.userId,
      operatorName: reservation.userName,
      isSystem: false,
      title: '退订预约',
      description: reservation.cancelReason
        ? `${reservation.userName} 取消了预约，原因：${reservation.cancelReason}`
        : `${reservation.userName} 取消了预约`,
      details: {
        cancelReason: reservation.cancelReason,
        cancelledAt: reservation.cancelledAt,
      },
    });
  }

  log.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  let seq = 0;
  return log.map((entry) => ({
    ...entry,
    id: `log_${seq++}_${entry.id.slice(0, 8)}`,
  }));
};

const roleText = (role: string) => {
  switch (role) {
    case 'advisor':
      return '指导教师';
    case 'department_head':
      return '系主任';
    case 'auto':
      return '系统';
    default:
      return role;
  }
};

const fmtShort = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const getChangeLog = (reservationId: string): ChangeLogEntry[] => {
  const r = db.reservations.find((x) => x.id === reservationId);
  if (!r) return [];
  return buildChangeLog(r);
};
