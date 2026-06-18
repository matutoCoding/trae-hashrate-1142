import { Router, Request, Response } from 'express';
import type { ApiResponse } from '../../shared/types.js';
import {
  createReservation,
  getReservationsByUser,
  getReservationById,
  cancelReservation,
  getAllReservations,
} from '../services/ReservationService.js';
import { getChangeLog } from '../services/ChangeLogService.js';
import { db } from '../data/database.js';

const router = Router();

router.post('/reservations', (req: Request, res: Response) => {
  const userId = db.currentUserId;
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    const resp: ApiResponse<null> = { success: false, error: '用户未登录' };
    return res.status(401).json(resp);
  }

  const result = createReservation({
    ...req.body,
    userId,
    userName: user.name,
  });

  if (!result.success) {
    const resp: ApiResponse<null> = { success: false, error: result.conflict };
    return res.status(400).json(resp);
  }

  const resp: ApiResponse<typeof result> = {
    success: true,
    data: result,
    message: result.merged ? '预约成功，相邻时段已自动合并' : '预约成功，等待导师审批',
  };
  res.status(201).json(resp);
});

router.get('/reservations', (req: Request, res: Response) => {
  const userId = db.currentUserId;
  const { status } = req.query as Record<string, string>;
  const reservations = getReservationsByUser(userId, status);
  const resp: ApiResponse<typeof reservations> = { success: true, data: reservations };
  res.json(resp);
});

router.get('/reservations/all', (_req: Request, res: Response) => {
  const reservations = getAllReservations();
  const resp: ApiResponse<typeof reservations> = { success: true, data: reservations };
  res.json(resp);
});

router.get('/reservations/:id', (req: Request, res: Response) => {
  const reservation = getReservationById(req.params.id);
  if (!reservation) {
    const resp: ApiResponse<null> = { success: false, error: '预约不存在' };
    return res.status(404).json(resp);
  }
  const resp: ApiResponse<typeof reservation> = { success: true, data: reservation };
  res.json(resp);
});

router.get('/reservations/:id/changelog', (req: Request, res: Response) => {
  const log = getChangeLog(req.params.id);
  const resp: ApiResponse<typeof log> = { success: true, data: log };
  res.json(resp);
});

router.post('/reservations/:id/cancel', (req: Request, res: Response) => {
  const userId = db.currentUserId;
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    const resp: ApiResponse<null> = { success: false, error: '用户未登录' };
    return res.status(401).json(resp);
  }

  const { reason } = req.body as { reason?: string };
  const result = cancelReservation(req.params.id, userId, user.name, reason);

  if (!result.success) {
    const resp: ApiResponse<null> = { success: false, error: result.error };
    return res.status(400).json(resp);
  }

  const resp: ApiResponse<typeof result> = {
    success: true,
    data: result,
    message: result.split ? '退订成功，占用区间已拆分' : '退订成功',
  };
  res.json(resp);
});

export default router;
