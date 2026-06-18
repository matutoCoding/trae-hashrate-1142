import { create } from 'zustand';
import type {
  User,
  LabBench,
  Reservation,
  ApprovalNode,
  ReminderRecord,
  DashboardStats,
  ApprovalRules,
  OccupancyBlock,
  ApprovalNodeStatus,
} from '../../shared/types';
import { api } from '../lib/api';

interface AppState {
  currentUser: User | null;
  users: User[];
  benches: LabBench[];
  reservations: Reservation[];
  pendingApprovals: ApprovalNode[];
  allApprovals: ApprovalNode[];
  reminders: ReminderRecord[];
  dashboardStats: DashboardStats | null;
  rules: ApprovalRules | null;
  scheduleCache: Record<string, OccupancyBlock[]>;

  loadCurrentUser: () => Promise<void>;
  switchUser: (id: string) => Promise<void>;
  loadBenches: (params?: { category?: string; status?: string; keyword?: string }) => Promise<void>;
  loadSchedule: (benchId: string, start?: string, end?: string) => Promise<void>;
  loadDashboard: () => Promise<void>;
  loadMyReservations: (status?: string) => Promise<void>;
  loadAllReservations: () => Promise<void>;
  loadPendingApprovals: (filters?: { benchId?: string; userName?: string; projectName?: string }) => Promise<void>;
  loadAllApprovals: (filters?: {
    benchId?: string;
    userName?: string;
    projectName?: string;
    status?: ApprovalNodeStatus;
  }) => Promise<void>;
  loadReminders: () => Promise<void>;
  loadRules: () => Promise<void>;
  updateRules: (rules: Partial<ApprovalRules>) => Promise<void>;
  setDashboardStats: (s: DashboardStats | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  users: [],
  benches: [],
  reservations: [],
  pendingApprovals: [],
  allApprovals: [],
  reminders: [],
  dashboardStats: null,
  rules: null,
  scheduleCache: {},

  loadCurrentUser: async () => {
    const res = await api.getCurrentUser();
    if (res.success && res.data) {
      set({ currentUser: res.data });
    }
  },
  switchUser: async (id: string) => {
    const res = await api.switchUser(id);
    if (res.success && res.data) {
      set({ currentUser: res.data });
    }
  },
  loadBenches: async (params) => {
    const res = await api.getBenches(params);
    if (res.success && res.data) {
      set({ benches: res.data });
    }
  },
  loadSchedule: async (benchId: string, start?: string, end?: string) => {
    const cacheKey = start ? `${benchId}_${start}` : benchId;
    const res = await api.getBenchSchedule(benchId, start, end);
    if (res.success && res.data) {
      set((s) => ({
        scheduleCache: { ...s.scheduleCache, [cacheKey]: res.data as OccupancyBlock[] },
      }));
    }
  },
  loadDashboard: async () => {
    const res = await api.getDashboardStats();
    if (res.success && res.data) {
      set({ dashboardStats: res.data });
    }
  },
  loadMyReservations: async (status) => {
    const res = await api.getMyReservations(status);
    if (res.success && res.data) {
      set({ reservations: res.data });
    }
  },
  loadAllReservations: async () => {
    const res = await api.getAllReservations();
    if (res.success && res.data) {
      set({ reservations: res.data });
    }
  },
  loadPendingApprovals: async (filters) => {
    const res = await api.getPendingApprovals(filters);
    if (res.success && res.data) {
      set({ pendingApprovals: res.data });
    }
  },
  loadAllApprovals: async (filters) => {
    const res = await api.getAllApprovals(filters);
    if (res.success && res.data) {
      set({ allApprovals: res.data });
    }
  },
  loadReminders: async () => {
    const res = await api.getReminders();
    if (res.success && res.data) {
      set({ reminders: res.data });
    }
  },
  loadRules: async () => {
    const res = await api.getRules();
    if (res.success && res.data) {
      set({ rules: res.data });
    }
  },
  updateRules: async (rules) => {
    const res = await api.updateRules(rules);
    if (res.success && res.data) {
      set({ rules: res.data });
    }
  },
  setDashboardStats: (s) => set({ dashboardStats: s }),
}));
