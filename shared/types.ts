export type UserRole = 'student' | 'advisor' | 'admin';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  department?: string;
  studentId?: string;
  advisorId?: string;
  avatar?: string;
}

export type BenchStatus = 'available' | 'maintenance' | 'disabled';
export type BenchCategory = '化学' | '生物' | '物理' | '计算机' | '材料';

export interface LabBench {
  id: string;
  name: string;
  code: string;
  location: string;
  building: string;
  room: string;
  category: BenchCategory;
  equipment: string[];
  capacity: number;
  status: BenchStatus;
  managerId: string;
  description: string;
  imageUrl: string;
}

export interface TimeSlot {
  start: string;
  end: string;
}

export type OccupancyStatus = 'pending' | 'confirmed' | 'cancelled';

export interface OccupancyBlock {
  id: string;
  benchId: string;
  reservationIds: string[];
  startTime: string;
  endTime: string;
  status: OccupancyStatus;
  mergedFrom?: string[];
  mergedAt?: string;
  splitFrom?: string;
  reservations?: Reservation[];
}

export type ReservationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';

export interface Reservation {
  id: string;
  benchId: string;
  benchName?: string;
  userId: string;
  userName: string;
  advisorId: string;
  advisorName: string;
  projectName: string;
  description: string;
  participants: string[];
  startTime: string;
  endTime: string;
  occupancyId: string;
  status: ReservationStatus;
  createdAt: string;
  approvalTrail: ApprovalNode[];
  splitHistory?: SplitRecord[];
  cancelledAt?: string;
  cancelReason?: string;
}

export type ApprovalNodeStatus = 'pending' | 'approved' | 'rejected' | 'timeout' | 'escalated';
export type ApproverRole = 'advisor' | 'department_head' | 'auto';

export interface ApprovalNode {
  id: string;
  reservationId: string;
  approverId: string;
  approverName: string;
  role: ApproverRole;
  level: number;
  status: ApprovalNodeStatus;
  comment?: string;
  createdAt: string;
  deadline: string;
  handledAt?: string;
  reminders: ReminderRecord[];
  reservation?: Reservation & { benchName?: string };
}

export type ReminderType = 'reminder' | 'escalation' | 'auto_decision';

export interface ReminderRecord {
  id: string;
  approvalId: string;
  type: ReminderType;
  level: number;
  sentAt: string;
  recipientId: string;
  recipientName: string;
  message: string;
  responsibleParty?: string;
}

export interface SplitRecord {
  id: string;
  originalOccupancyId: string;
  newOccupancyIds: string[];
  splitAt: string;
  reason: string;
  operatorId: string;
  operatorName: string;
}

export type ChangeLogType =
  | 'submit'
  | 'merge'
  | 'split'
  | 'approval'
  | 'reminder'
  | 'escalation'
  | 'auto_decision'
  | 'cancel';

export interface ChangeLogEntry {
  id: string;
  type: ChangeLogType;
  time: string;
  operatorId?: string;
  operatorName?: string;
  isSystem: boolean;
  title: string;
  description: string;
  details?: Record<string, unknown>;
}

export interface ApprovalRules {
  advisorTimeoutHours: number;
  firstReminderHours: number;
  escalationHours: number;
  autoDecisionHours: number;
  escalationTargetRole: string;
  autoDecisionAction: 'approve' | 'reject';
  cancellationDeadlineHours: number;
}

export interface DashboardStats {
  todayReservations: number;
  pendingApprovals: number;
  timeoutWarnings: number;
  utilizationRate: number;
  weeklyTrend: { day: string; count: number }[];
  categoryDistribution: { category: string; count: number }[];
  recentActivities: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'reservation' | 'approval' | 'reminder' | 'split';
  message: string;
  time: string;
  user: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
