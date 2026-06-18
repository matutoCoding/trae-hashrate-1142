import { db } from '../data/database.js';
import type { LabBench, OccupancyBlock, DashboardStats, ActivityItem } from '../../shared/types.js';
import { getStartOfDay, getEndOfDay, genId } from '../utils/dateUtils.js';

export const getAllBenches = (filters?: {
  category?: string;
  status?: string;
  keyword?: string;
}): LabBench[] => {
  let result = [...db.benches];

  if (filters?.category && filters.category !== 'all') {
    result = result.filter((b) => b.category === filters.category);
  }
  if (filters?.status && filters.status !== 'all') {
    result = result.filter((b) => b.status === filters.status);
  }
  if (filters?.keyword) {
    const kw = filters.keyword.toLowerCase();
    result = result.filter(
      (b) =>
        b.name.toLowerCase().includes(kw) ||
        b.code.toLowerCase().includes(kw) ||
        b.location.toLowerCase().includes(kw)
    );
  }

  return result;
};

export const getBenchById = (id: string): LabBench | undefined => {
  return db.benches.find((b) => b.id === id);
};

export const getBenchSchedule = (
  benchId: string,
  startDate?: string,
  endDate?: string
): OccupancyBlock[] => {
  const start = startDate ? new Date(startDate) : getStartOfDay(new Date());
  const end = endDate ? new Date(endDate) : getEndOfDay(new Date(Date.now() + 7 * 86400000));

  return db.occupancies.filter((o) => {
    if (o.benchId !== benchId) return false;
    if (o.status === 'cancelled') return false;
    const os = new Date(o.startTime).getTime();
    const oe = new Date(o.endTime).getTime();
    return os < end.getTime() && oe > start.getTime();
  });
};

export const createBench = (
  data: Omit<LabBench, 'id'>
): LabBench => {
  const bench: LabBench = {
    ...data,
    id: genId(),
  };
  db.benches.push(bench);
  return bench;
};

export const updateBench = (
  id: string,
  data: Partial<LabBench>
): LabBench | null => {
  const idx = db.benches.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  db.benches[idx] = { ...db.benches[idx], ...data };
  return db.benches[idx];
};

export const deleteBench = (id: string): boolean => {
  const idx = db.benches.findIndex((b) => b.id === id);
  if (idx === -1) return false;
  db.benches.splice(idx, 1);
  return true;
};

export const getDashboardStats = (): DashboardStats => {
  const today = getStartOfDay(new Date());
  const todayEnd = getEndOfDay(new Date());
  const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  const todayReservations = db.reservations.filter((r) => {
    const s = new Date(r.startTime).getTime();
    return s >= today.getTime() && s <= todayEnd.getTime();
  }).length;

  const pendingApprovals = db.approvals.filter(
    (a) => a.status === 'pending' && a.approverId === db.currentUserId
  ).length;

  const timeoutWarnings = db.approvals.filter((a) => {
    if (a.status !== 'pending') return false;
    return new Date(a.deadline).getTime() < Date.now() + 6 * 3600 * 1000;
  }).length;

  const totalSlots = db.benches.length * 14 * 7;
  const occupiedSlots = db.occupancies
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => {
      const hours =
        (new Date(o.endTime).getTime() - new Date(o.startTime).getTime()) / 3600000;
      return sum + Math.max(0, hours);
    }, 0);
  const utilizationRate = Math.min(100, Math.round((occupiedSlots / (db.benches.length * 14 * 7)) * 100));

  const weeklyTrend = weekDays.map((day, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - today.getDay() + 1 + i);
    const ds = getStartOfDay(d).getTime();
    const de = getEndOfDay(d).getTime();
    const count = db.reservations.filter((r) => {
      const rs = new Date(r.startTime).getTime();
      return rs >= ds && rs <= de;
    }).length;
    return { day, count };
  });

  const categories = ['化学', '生物', '物理', '计算机', '材料'];
  const categoryDistribution = categories.map((cat) => ({
    category: cat,
    count: db.reservations.filter((r) => {
      const bench = db.benches.find((b) => b.id === r.benchId);
      return bench?.category === cat;
    }).length,
  }));

  const recentActivities: ActivityItem[] = [
    {
      id: 'act_1',
      type: 'approval',
      message: '李教授 通过了预约 [食品中防腐剂含量检测]',
      time: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      user: '李教授',
    },
    {
      id: 'act_2',
      type: 'reservation',
      message: '张明 提交了新预约 [拉曼光谱样品检测]',
      time: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      user: '张明',
    },
    {
      id: 'act_3',
      type: 'split',
      message: '预约时段拆分：occ_merged_old → occ_new_1, occ_new_2',
      time: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      user: '张明',
    },
    {
      id: 'act_4',
      type: 'reminder',
      message: '系统自动发送催办通知：生物安全台 B2 预约待审批',
      time: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      user: '系统',
    },
    {
      id: 'act_5',
      type: 'reservation',
      message: '连续预约合并：AI计算工作站 C1 两个相邻时段已合并',
      time: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
      user: '系统',
    },
  ];

  return {
    todayReservations,
    pendingApprovals,
    timeoutWarnings,
    utilizationRate,
    weeklyTrend,
    categoryDistribution,
    recentActivities,
  };
};
