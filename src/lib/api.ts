import type {
  User,
  LabBench,
  OccupancyBlock,
  Reservation,
  ApprovalNode,
  ReminderRecord,
  ApprovalRules,
  DashboardStats,
  ApiResponse,
  SplitRecord,
} from '../../shared/types';

const API_BASE = '/api';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  return res.json();
}

export const api = {
  getCurrentUser: () => request<User>('/users/current'),
  switchUser: (id: string) => request<User>(`/users/switch/${id}`, { method: 'POST' }),
  getAdvisors: () => request<User[]>('/users/advisors'),

  getBenches: (params?: { category?: string; status?: string; keyword?: string }) => {
    const qs = params
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : '';
    return request<LabBench[]>(`/benches${qs}`);
  },
  getBench: (id: string) => request<LabBench>(`/benches/${id}`),
  getBenchSchedule: (id: string, start?: string, end?: string) => {
    const qs = start || end ? `?start=${start || ''}&end=${end || ''}` : '';
    return request<OccupancyBlock[]>(`/benches/${id}/schedule${qs}`);
  },
  createBench: (data: Omit<LabBench, 'id'>) =>
    request<LabBench>('/admin/benches', { method: 'POST', body: JSON.stringify(data) }),
  updateBench: (id: string, data: Partial<LabBench>) =>
    request<LabBench>(`/admin/benches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteBench: (id: string) =>
    request<null>(`/admin/benches/${id}`, { method: 'DELETE' }),

  getDashboardStats: () => request<DashboardStats>('/dashboard/stats'),

  createReservation: (data: {
    benchId: string;
    advisorId: string;
    advisorName: string;
    projectName: string;
    description: string;
    participants: string[];
    startTime: string;
    endTime: string;
  }) =>
    request<{
      reservation: Reservation;
      merged: boolean;
      mergedOccupancy: OccupancyBlock;
    }>('/reservations', { method: 'POST', body: JSON.stringify(data) }),
  getMyReservations: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return request<Reservation[]>(`/reservations${qs}`);
  },
  getAllReservations: () => request<Reservation[]>('/reservations/all'),
  getReservation: (id: string) => request<Reservation>(`/reservations/${id}`),
  cancelReservation: (id: string, reason?: string) =>
    request<{ reservation: Reservation; split?: SplitRecord }>(
      `/reservations/${id}/cancel`,
      { method: 'POST', body: JSON.stringify({ reason }) }
    ),

  getPendingApprovals: (filters?: { benchId?: string; userName?: string; projectName?: string }) => {
    const qs = filters ? '?' + new URLSearchParams(filters as Record<string, string>).toString() : '';
    return request<ApprovalNode[]>(`/approvals/pending${qs}`);
  },
  getAllApprovals: (filters?: {
    benchId?: string;
    userName?: string;
    projectName?: string;
    status?: string;
  }) => {
    const qs = filters ? '?' + new URLSearchParams(filters as Record<string, string>).toString() : '';
    return request<ApprovalNode[]>(`/approvals/all${qs}`);
  },
  approve: (id: string, comment?: string) =>
    request<{ node: ApprovalNode; reservation: Reservation }>(`/approvals/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),
  reject: (id: string, comment?: string) =>
    request<{ node: ApprovalNode; reservation: Reservation }>(`/approvals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),
  escalate: (id: string) =>
    request<{ node: ApprovalNode; reservation: Reservation }>(`/approvals/${id}/escalate`, {
      method: 'POST',
    }),

  getReminders: (params?: { recipientId?: string; type?: string }) => {
    const qs = params
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : '';
    return request<ReminderRecord[]>(`/reminders${qs}`);
  },
  triggerTimeoutCheck: () =>
    request<{
      newReminders: ReminderRecord[];
      escalatedReservations: unknown[];
      autoDecided: unknown[];
    }>('/reminders/timeout-check', { method: 'POST' }),

  getRules: () => request<ApprovalRules>('/admin/rules'),
  updateRules: (rules: Partial<ApprovalRules>) =>
    request<ApprovalRules>('/admin/rules', {
      method: 'PUT',
      body: JSON.stringify(rules),
    }),
};
