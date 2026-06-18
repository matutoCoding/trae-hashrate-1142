import { Router, Request, Response } from 'express';
import type { ApiResponse } from '../../shared/types.js';
import {
  getAllBenches,
  getBenchById,
  getBenchSchedule,
  createBench,
  updateBench,
  deleteBench,
  getDashboardStats,
} from '../services/BenchService.js';

const router = Router();

router.get('/benches', (req: Request, res: Response) => {
  const { category, status, keyword } = req.query as Record<string, string>;
  const benches = getAllBenches({ category, status, keyword });
  const resp: ApiResponse<typeof benches> = { success: true, data: benches };
  res.json(resp);
});

router.get('/benches/:id', (req: Request, res: Response) => {
  const bench = getBenchById(req.params.id);
  if (!bench) {
    const resp: ApiResponse<null> = { success: false, error: '实验台不存在' };
    return res.status(404).json(resp);
  }
  const resp: ApiResponse<typeof bench> = { success: true, data: bench };
  res.json(resp);
});

router.get('/benches/:id/schedule', (req: Request, res: Response) => {
  const { start, end } = req.query as Record<string, string>;
  const schedule = getBenchSchedule(req.params.id, start, end);
  const resp: ApiResponse<typeof schedule> = { success: true, data: schedule };
  res.json(resp);
});

router.post('/admin/benches', (req: Request, res: Response) => {
  const bench = createBench(req.body);
  const resp: ApiResponse<typeof bench> = { success: true, data: bench, message: '实验台创建成功' };
  res.status(201).json(resp);
});

router.put('/admin/benches/:id', (req: Request, res: Response) => {
  const bench = updateBench(req.params.id, req.body);
  if (!bench) {
    const resp: ApiResponse<null> = { success: false, error: '实验台不存在' };
    return res.status(404).json(resp);
  }
  const resp: ApiResponse<typeof bench> = { success: true, data: bench, message: '实验台更新成功' };
  res.json(resp);
});

router.delete('/admin/benches/:id', (req: Request, res: Response) => {
  const ok = deleteBench(req.params.id);
  if (!ok) {
    const resp: ApiResponse<null> = { success: false, error: '实验台不存在' };
    return res.status(404).json(resp);
  }
  const resp: ApiResponse<null> = { success: true, message: '实验台删除成功' };
  res.json(resp);
});

router.get('/dashboard/stats', (_req: Request, res: Response) => {
  const stats = getDashboardStats();
  const resp: ApiResponse<typeof stats> = { success: true, data: stats };
  res.json(resp);
});

export default router;
