import type {
  User,
  LabBench,
  OccupancyBlock,
  Reservation,
  ApprovalNode,
  ReminderRecord,
  SplitRecord,
  ApprovalRules,
} from '../../shared/types.js';
import { addHours, genId } from '../utils/dateUtils.js';

export interface Database {
  users: User[];
  benches: LabBench[];
  occupancies: OccupancyBlock[];
  reservations: Reservation[];
  approvals: ApprovalNode[];
  reminders: ReminderRecord[];
  splits: SplitRecord[];
  rules: ApprovalRules;
  currentUserId: string;
}

const now = new Date();

export const createSeedData = (): Database => {
  const users: User[] = [
    {
      id: 'stu_001',
      name: '张明',
      role: 'student',
      email: 'zhangming@uni.edu',
      department: '计算机学院',
      studentId: '2024010001',
    },
    {
      id: 'adv_001',
      name: '李教授',
      role: 'advisor',
      email: 'liprof@uni.edu',
      department: '计算机学院',
      advisorId: 'ADV2024001',
    },
    {
      id: 'admin_001',
      name: '王管理员',
      role: 'admin',
      email: 'admin@lab.uni.edu',
      department: '实验管理中心',
    },
    {
      id: 'dept_head_001',
      name: '系主任王教授',
      role: 'advisor',
      email: 'depthead@uni.edu',
      department: '计算机学院',
      advisorId: 'ADV2024002',
    },
  ];

  const benches: LabBench[] = [
    {
      id: 'bench_001',
      name: '化学分析台 A1',
      code: 'CHEM-A1-001',
      location: '化学实验楼',
      building: '化学楼',
      room: '301室',
      category: '化学',
      equipment: ['高效液相色谱仪', '电子天平', 'pH计', '离心机'],
      capacity: 2,
      status: 'available',
      managerId: 'admin_001',
      description: '标准化学分析实验台，配备常用分析仪器，适合基础化学实验教学与科研使用。',
      imageUrl: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800',
    },
    {
      id: 'bench_002',
      name: '生物安全台 B2',
      code: 'BIO-B2-002',
      location: '生物实验楼',
      building: '生命科学楼',
      room: '205室',
      category: '生物',
      equipment: ['生物安全柜', 'CO2培养箱', '倒置显微镜', '-80℃冰箱'],
      capacity: 3,
      status: 'available',
      managerId: 'admin_001',
      description: '二级生物安全实验台，支持细胞培养、微生物操作等生物实验。',
      imageUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800',
    },
    {
      id: 'bench_003',
      name: '光学实验台 P3',
      code: 'PHY-P3-003',
      location: '物理实验楼',
      building: '物理楼',
      room: '412室',
      category: '物理',
      equipment: ['激光器', '光谱仪', '光学平台', 'CCD探测器'],
      capacity: 4,
      status: 'available',
      managerId: 'admin_001',
      description: '精密光学实验台，含主动隔振系统，适合光谱学和激光物理实验。',
      imageUrl: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=800',
    },
    {
      id: 'bench_004',
      name: 'AI计算工作站 C1',
      code: 'CS-C1-004',
      location: '计算机实验楼',
      building: '信息楼',
      room: '508室',
      category: '计算机',
      equipment: ['NVIDIA A100 GPU×2', '256GB内存', '4TB SSD', '万兆网卡'],
      capacity: 1,
      status: 'available',
      managerId: 'admin_001',
      description: '高性能AI计算工作站，支持深度学习模型训练、大数据分析等计算密集型任务。',
      imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800',
    },
    {
      id: 'bench_005',
      name: '材料合成台 M1',
      code: 'MAT-M1-005',
      location: '材料实验楼',
      building: '材料楼',
      room: '108室',
      category: '材料',
      equipment: ['管式炉', '球磨机', '真空手套箱', 'XRD样品台'],
      capacity: 2,
      status: 'available',
      managerId: 'admin_001',
      description: '材料合成制备实验台，支持高温烧结、粉末冶金等样品制备工艺。',
      imageUrl: 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=800',
    },
    {
      id: 'bench_006',
      name: '化学合成台 A3',
      code: 'CHEM-A3-006',
      location: '化学实验楼',
      building: '化学楼',
      room: '305室',
      category: '化学',
      equipment: ['磁力搅拌器', '旋转蒸发仪', '真空干燥箱', '紫外分析仪'],
      capacity: 2,
      status: 'maintenance',
      managerId: 'admin_001',
      description: '有机化学合成实验台，正在进行通风系统维护，预计明日恢复。',
      imageUrl: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=800',
    },
  ];

  const t = (hoursFromNow: number): string => addHours(now, hoursFromNow).toISOString();
  const tPast = (hoursAgo: number): string => addHours(now, -hoursAgo).toISOString();

  const occupancies: OccupancyBlock[] = [
    {
      id: 'occ_001',
      benchId: 'bench_001',
      reservationIds: ['res_001'],
      startTime: t(48),
      endTime: t(52),
      status: 'confirmed',
    },
    {
      id: 'occ_002',
      benchId: 'bench_004',
      reservationIds: ['res_002', 'res_003'],
      startTime: t(24),
      endTime: t(32),
      status: 'confirmed',
      mergedFrom: ['occ_old_001', 'occ_old_002'],
    },
    {
      id: 'occ_003',
      benchId: 'bench_002',
      reservationIds: ['res_004'],
      startTime: t(72),
      endTime: t(76),
      status: 'pending',
    },
    {
      id: 'occ_004',
      benchId: 'bench_003',
      reservationIds: ['res_005'],
      startTime: t(96),
      endTime: t(100),
      status: 'pending',
    },
  ];

  const reservations: Reservation[] = [
    {
      id: 'res_001',
      benchId: 'bench_001',
      benchName: '化学分析台 A1',
      userId: 'stu_001',
      userName: '张明',
      advisorId: 'adv_001',
      advisorName: '李教授',
      projectName: '食品中防腐剂含量检测',
      description: '使用高效液相色谱法检测市售果汁中的苯甲酸和山梨酸含量，进行方法学验证。',
      participants: ['张明', '李华'],
      startTime: t(48),
      endTime: t(52),
      occupancyId: 'occ_001',
      status: 'approved',
      createdAt: tPast(24),
      approvalTrail: [
        {
          id: 'app_001',
          reservationId: 'res_001',
          approverId: 'adv_001',
          approverName: '李教授',
          role: 'advisor',
          level: 1,
          status: 'approved',
          comment: '实验方案合理，注意规范操作。',
          createdAt: tPast(24),
          deadline: tPast(0),
          handledAt: tPast(22),
          reminders: [],
        },
      ],
    },
    {
      id: 'res_002',
      benchId: 'bench_004',
      benchName: 'AI计算工作站 C1',
      userId: 'stu_001',
      userName: '张明',
      advisorId: 'adv_001',
      advisorName: '李教授',
      projectName: '医学图像分割模型训练',
      description: '使用PyTorch训练U-Net模型进行肝脏CT图像分割，预计需8小时GPU计算。',
      participants: ['张明'],
      startTime: t(24),
      endTime: t(28),
      occupancyId: 'occ_002',
      status: 'approved',
      createdAt: tPast(48),
      approvalTrail: [
        {
          id: 'app_002',
          reservationId: 'res_002',
          approverId: 'adv_001',
          approverName: '李教授',
          role: 'advisor',
          level: 1,
          status: 'approved',
          comment: '同意，请注意监控GPU温度。',
          createdAt: tPast(48),
          deadline: tPast(24),
          handledAt: tPast(45),
          reminders: [],
        },
      ],
    },
    {
      id: 'res_003',
      benchId: 'bench_004',
      benchName: 'AI计算工作站 C1',
      userId: 'stu_001',
      userName: '张明',
      advisorId: 'adv_001',
      advisorName: '李教授',
      projectName: '模型调优与消融实验',
      description: '接续上一段预约，进行模型参数调优和消融对比实验。',
      participants: ['张明'],
      startTime: t(28),
      endTime: t(32),
      occupancyId: 'occ_002',
      status: 'approved',
      createdAt: tPast(36),
      approvalTrail: [
        {
          id: 'app_003',
          reservationId: 'res_003',
          approverId: 'adv_001',
          approverName: '李教授',
          role: 'advisor',
          level: 1,
          status: 'approved',
          comment: '连续实验安排合理，同意。',
          createdAt: tPast(36),
          deadline: tPast(12),
          handledAt: tPast(34),
          reminders: [],
        },
      ],
    },
    {
      id: 'res_004',
      benchId: 'bench_002',
      benchName: '生物安全台 B2',
      userId: 'stu_001',
      userName: '张明',
      advisorId: 'adv_001',
      advisorName: '李教授',
      projectName: 'Hela细胞培养与传代',
      description: '进行Hela细胞的复苏、传代和冻存操作，准备后续转染实验。',
      participants: ['张明', '王芳'],
      startTime: t(72),
      endTime: t(76),
      occupancyId: 'occ_003',
      status: 'pending',
      createdAt: tPast(20),
      approvalTrail: [
        {
          id: 'app_004',
          reservationId: 'res_004',
          approverId: 'adv_001',
          approverName: '李教授',
          role: 'advisor',
          level: 1,
          status: 'pending',
          createdAt: tPast(20),
          deadline: t(4),
          reminders: [],
        },
      ],
    },
    {
      id: 'res_005',
      benchId: 'bench_003',
      benchName: '光学实验台 P3',
      userId: 'stu_001',
      userName: '张明',
      advisorId: 'adv_001',
      advisorName: '李教授',
      projectName: '拉曼光谱样品检测',
      description: '使用显微拉曼光谱仪对碳纳米管样品进行表征分析。',
      participants: ['张明'],
      startTime: t(96),
      endTime: t(100),
      occupancyId: 'occ_004',
      status: 'pending',
      createdAt: tPast(2),
      approvalTrail: [
        {
          id: 'app_005',
          reservationId: 'res_005',
          approverId: 'adv_001',
          approverName: '李教授',
          role: 'advisor',
          level: 1,
          status: 'pending',
          createdAt: tPast(2),
          deadline: t(22),
          reminders: [],
        },
      ],
    },
  ];

  const approvals: ApprovalNode[] = reservations.flatMap((r) => r.approvalTrail);

  const reminders: ReminderRecord[] = [];

  const splits: SplitRecord[] = [
    {
      id: 'split_001',
      originalOccupancyId: 'occ_merged_old',
      newOccupancyIds: ['occ_new_1', 'occ_new_2'],
      splitAt: tPast(72),
      reason: '用户退订中间时段预约',
      operatorId: 'stu_001',
      operatorName: '张明',
    },
  ];

  const rules: ApprovalRules = {
    advisorTimeoutHours: 24,
    firstReminderHours: 12,
    escalationHours: 24,
    autoDecisionHours: 48,
    escalationTargetRole: 'department_head',
    autoDecisionAction: 'approve',
    cancellationDeadlineHours: 6,
  };

  return {
    users,
    benches,
    occupancies,
    reservations,
    approvals,
    reminders,
    splits,
    rules,
    currentUserId: 'stu_001',
  };
};

export const db: Database = createSeedData();

export const resetDb = (): void => {
  const fresh = createSeedData();
  Object.assign(db, fresh);
};
