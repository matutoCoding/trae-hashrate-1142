import { Router, Request, Response } from 'express';
import type { ApiResponse, ApprovalNodeStatus } from '../../shared/types.js';
import {
  getPendingApprovals,
  approveReservation,
  rejectReservation,
  escalateApproval,
  runTimeoutCheck,
  getReminders,
  getAllApprovals,
  getRules,
  updateRules,
} from '../services/ApprovalService.js';
import { db } from '../data/database.js';

const router = Router();

router.get('/approvals/pending', (req: Request, res: Response) => {
  const approverId = db.currentUserId;
  const { benchId, userName, projectName } = req.query as Record<string, string>;
  const approvals = getPendingApprovals(approverId, { benchId, userName, projectName });
  const resp: ApiResponse<typeof approvals> = { success: true, data: approvals };
  res.json(resp);
});

router.get('/approvals/all', (req: Request, res: Response) => {
  const { benchId, userName, projectName, status } = req.query as Record<string, string>;
  const approvals = getAllApprovals({ benchId, userName, projectName, status: status as ApprovalNodeStatus | undefined });
  const resp: ApiResponse<typeof approvals> = { success: true, data: approvals };
  res.json(resp);
});

router.post('/approvals/:id/approve', (req: Request, res: Response) => {
  const approverId = db.currentUserId;
  const { comment } = req.body as { comment?: string };
  const result = approveReservation(req.params.id, approverId, comment);

  if (!result.success) {
    const resp: ApiResponse<null> = { success: false, error: result.error };
    return res.status(400).json(resp);
  }

  const resp: ApiResponse<typeof result> = {
    success: true,
    data: result,
    message: '审批通过',
  };
  res.json(resp);
});

router.post('/approvals/:id/reject', (req: Request, res: Response) => {
  const approverId = db.currentUserId;
  const { comment } = req.body as { comment?: string };
  const result = rejectReservation(req.params.id, approverId, comment);

  if (!result.success) {
    const resp: ApiResponse<null> = { success: false, error: result.error };
    return res.status(400).json(resp);
  }

  const resp: ApiResponse<typeof result> = {
    success: true,
    data: result,
    message: '审批驳回',
  };
  res.json(resp);
});

router.post('/approvals/:id/escalate', (req: Request, res: Response) => {
  const result = escalateApproval(req.params.id, db.currentUserId);

  if (!result.success) {
    const resp: ApiResponse<null> = { success: false, error: result.error };
    return res.status(400).json(resp);
  }

  const resp: ApiResponse<typeof result> = {
    success: true,
    data: result,
    message: '审批已升级至上级',
  };
  res.json(resp);
});

router.get('/reminders', (req: Request, res: Response) => {
  const { recipientId, type } = req.query as Record<string, string>;
  const reminders = getReminders({ recipientId, type });
  const resp: ApiResponse<typeof reminders> = { success: true, data: reminders };
  res.json(resp);
});

router.post('/reminders/timeout-check', (_req: Request, res: Response) => {
  const result = runTimeoutCheck();
  const resp: ApiResponse<typeof result> = {
    success: true,
    data: result,
    message: `超时检测完成：生成${result.newReminders.length}条催办，${result.escalatedReservations.length}个升级，${result.autoDecided.length}个自动裁决`,
  };
  res.json(resp);
});

router.get('/admin/rules', (_req: Request, res: Response) => {
  const rules = getRules();
  const resp: ApiResponse<typeof rules> = { success: true, data: rules };
  res.json(resp);
});

router.put('/admin/rules', (req: Request, res: Response) => {
  const rules = updateRules(req.body);
  const resp: ApiResponse<typeof rules> = { success: true, data: rules, message: '规则更新成功' };
  res.json(resp);
});

router.get('/users/current', (_req: Request, res: Response) => {
  const user = db.users.find((u) => u.id === db.currentUserId);
  const resp: ApiResponse<typeof user> = { success: true, data: user };
  res.json(resp);
});

router.post('/users/switch/:id', (req: Request, res: Response) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) {
    const resp: ApiResponse<null> = { success: false, error: '用户不存在' };
    return res.status(404).json(resp);
  }
  db.currentUserId = user.id;
  const resp: ApiResponse<typeof user> = { success: true, data: user, message: `已切换至${user.name}(${user.role})` };
  res.json(resp);
});

router.get('/users/advisors', (_req: Request, res: Response) => {
  const advisors = db.users.filter((u) => u.role === 'advisor');
  const resp: ApiResponse<typeof advisors> = { success: true, data: advisors };
  res.json(resp);
});

export default router;
