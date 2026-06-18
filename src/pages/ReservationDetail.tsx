import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  UserCheck,
  Bell,
  FileText,
  Users,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Scissors,
  MessageSquare,
  MapPin,
  History,
  Sparkles,
  CalendarPlus,
  AlertOctagon,
  Zap,
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../store/useAppStore';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import Empty from '../components/Empty';
import type {
  Reservation,
  OccupancyBlock,
  ApprovalNode,
  ReminderRecord,
  SplitRecord,
  ChangeLogEntry,
} from '../../shared/types';

function fmtDT(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtSlot(start: string, end: string) {
  const s = new Date(start), e = new Date(end);
  return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')} ${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')} ~ ${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`;
}

const roleLabel: Record<string, string> = {
  advisor: '指导教师',
  department_head: '系主任',
  auto: '系统自动',
};

const reminderLabel: Record<number, { text: string; className: string }> = {
  1: { text: '1级催办', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  2: { text: '2级升级', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  3: { text: '3级自动裁决', className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

function nodeColor(status: string) {
  switch (status) {
    case 'approved':
      return {
        dot: 'bg-emerald-500 border-emerald-300',
        ring: 'bg-emerald-100',
        line: 'bg-emerald-300',
      };
    case 'rejected':
      return {
        dot: 'bg-rose-500 border-rose-300',
        ring: 'bg-rose-100',
        line: 'bg-rose-300',
      };
    case 'timeout':
      return {
        dot: 'bg-orange-500 border-orange-300',
        ring: 'bg-orange-100',
        line: 'bg-orange-300',
      };
    case 'escalated':
      return {
        dot: 'bg-amber-500 border-amber-300',
        ring: 'bg-amber-100',
        line: 'bg-amber-300',
      };
    default:
      return {
        dot: 'bg-slate-400 border-slate-300',
        ring: 'bg-slate-100',
        line: 'bg-slate-200',
      };
  }
}

function nodeIcon(status: string) {
  switch (status) {
    case 'approved':
      return <CheckCircle2 className="w-4 h-4 text-white" />;
    case 'rejected':
      return <XCircle className="w-4 h-4 text-white" />;
    case 'timeout':
    case 'escalated':
      return <AlertTriangle className="w-4 h-4 text-white" />;
    default:
      return <Clock className="w-4 h-4 text-white animate-pulse" />;
  }
}

function ReminderTag({ r }: { r: ReminderRecord }) {
  const cfg = reminderLabel[r.level] || reminderLabel[1];
  return (
    <div
      className={cn(
        'flex items-start gap-2 p-3 rounded-xl border mt-2',
        cfg.className
      )}
    >
      <Bell className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold">{cfg.text}</span>
          <span className="text-[11px] opacity-75">{fmtDT(r.sentAt)}</span>
        </div>
        {r.responsibleParty && (
          <p className="text-[11px] mt-0.5 opacity-75">责任人：{r.responsibleParty}</p>
        )}
        {r.message && <p className="text-xs mt-1 opacity-80">{r.message}</p>}
      </div>
    </div>
  );
}

function TimelineNode({ node, isLast }: { node: ApprovalNode; isLast: boolean }) {
  const c = nodeColor(node.status);
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center border-4 z-10', c.dot)}>
          {nodeIcon(node.status)}
        </div>
        {!isLast && <div className={cn('flex-1 w-0.5 mt-1', c.line)} />}
      </div>
      <div className={cn('flex-1 pb-6 rounded-2xl p-4 -mt-1 ml-1', c.ring)}>
        <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-800">{node.approverName}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/70 text-slate-600">
                {roleLabel[node.role] || node.role} · 第{node.level}级
              </span>
            </div>
          </div>
          <StatusBadge status={node.status} size="sm" />
        </div>
        <div className="space-y-1 text-xs text-slate-500 mb-2">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>提交：{fmtDT(node.createdAt)}</span>
            <span className="text-slate-300">|</span>
            <span>截止：{fmtDT(node.deadline)}</span>
          </div>
          {node.handledAt && (
            <div className="flex items-center gap-1.5">
              <UserCheck className="w-3 h-3" />
              <span>处理：{fmtDT(node.handledAt)}</span>
            </div>
          )}
        </div>
        {node.comment && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-white/80 border border-white mt-2">
            <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-700">{node.comment}</p>
          </div>
        )}
        {node.reminders?.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {node.reminders.map((r) => (
              <ReminderTag key={r.id} r={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SplitRecordCard({ s }: { s: SplitRecord }) {
  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
          <Scissors className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <h4 className="font-semibold text-slate-800">拆分记录</h4>
            <span className="text-xs text-slate-500">{fmtDT(s.splitAt)}</span>
          </div>
          <p className="text-sm text-slate-600 mb-2">
            操作人：<span className="font-medium text-slate-700">{s.operatorName}</span>
            <span className="mx-2 text-slate-300">|</span>
            拆分后占用块数：
            <span className="font-semibold text-purple-600">{s.newOccupancyIds.length}</span>
          </p>
          {s.reason && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white/70 text-sm">
              <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-slate-600">{s.reason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function changeLogStyle(type: string) {
  switch (type) {
    case 'submit':
      return {
        icon: CalendarPlus,
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        ring: 'ring-blue-200',
        line: 'bg-blue-300',
        label: '提交',
      };
    case 'approval':
      return {
        icon: CheckCircle2,
        color: 'text-emerald-600',
        bg: 'bg-emerald-100',
        ring: 'ring-emerald-200',
        line: 'bg-emerald-300',
        label: '审批',
      };
    case 'merge':
      return {
        icon: Sparkles,
        color: 'text-amber-600',
        bg: 'bg-amber-100',
        ring: 'ring-amber-200',
        line: 'bg-amber-300',
        label: '合并',
      };
    case 'split':
      return {
        icon: Scissors,
        color: 'text-purple-600',
        bg: 'bg-purple-100',
        ring: 'ring-purple-200',
        line: 'bg-purple-300',
        label: '拆分',
      };
    case 'reminder':
      return {
        icon: Bell,
        color: 'text-orange-600',
        bg: 'bg-orange-100',
        ring: 'ring-orange-200',
        line: 'bg-orange-300',
        label: '催办',
      };
    case 'escalation':
      return {
        icon: AlertOctagon,
        color: 'text-rose-600',
        bg: 'bg-rose-100',
        ring: 'ring-rose-200',
        line: 'bg-rose-300',
        label: '升级',
      };
    case 'auto_decision':
      return {
        icon: Zap,
        color: 'text-violet-600',
        bg: 'bg-violet-100',
        ring: 'ring-violet-200',
        line: 'bg-violet-300',
        label: '自动裁决',
      };
    case 'cancel':
      return {
        icon: XCircle,
        color: 'text-slate-600',
        bg: 'bg-slate-100',
        ring: 'ring-slate-200',
        line: 'bg-slate-300',
        label: '退订',
      };
    default:
      return {
        icon: History,
        color: 'text-slate-500',
        bg: 'bg-slate-100',
        ring: 'ring-slate-200',
        line: 'bg-slate-300',
        label: '记录',
      };
  }
}

function ChangeLogTimeline({ log }: { log: ChangeLogEntry[] }) {
  if (log.length === 0) return <Empty description="暂无变更记录" />;

  return (
    <div className="relative">
      {log.map((entry, i) => {
        const style = changeLogStyle(entry.type);
        const Icon = style.icon;
        const isLast = i === log.length - 1;
        return (
          <div key={entry.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center ring-4 z-10 bg-white',
                style.ring
              )}>
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center', style.bg)}>
                  <Icon className={cn('w-4 h-4', style.color)} />
                </div>
              </div>
              {!isLast && <div className={cn('flex-1 w-0.5 mt-1', style.line)} />}
            </div>
            <div className="flex-1 pb-6 -mt-1">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('text-sm font-bold', style.color)}>{entry.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                    {style.label}
                  </span>
                  {entry.isSystem && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 border border-violet-100">
                      系统自动
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 whitespace-nowrap">
                  {fmtDT(entry.time)}
                </span>
              </div>
              {entry.operatorName && (
                <p className="text-[11px] text-slate-500 mb-1">
                  操作人：<span className="font-medium text-slate-600">{entry.operatorName}</span>
                </p>
              )}
              <p className="text-xs text-slate-600 leading-relaxed">
                {entry.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ReservationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loadMyReservations } = useAppStore();
  const [data, setData] = useState<Reservation | null>(null);
  const [occupancy, setOccupancy] = useState<OccupancyBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'timeline' | 'log'>('timeline');

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const res = await api.getReservation(id);
      if (res.success && res.data) {
        setData(res.data);
        const occData = (res.data as Reservation & { occupancy?: OccupancyBlock }).occupancy;
        if (occData) setOccupancy(occData);
      }
      const logRes = await api.getChangeLog(id);
      if (logRes.success && logRes.data) setChangeLog(logRes.data);
      setLoading(false);
    })();
  }, [id]);

  const doAction = async (fn: () => Promise<unknown>) => {
    setActing(true);
    await fn();
    if (id) {
      const res = await api.getReservation(id);
      if (res.success && res.data) {
        setData(res.data);
        const occData = (res.data as Reservation & { occupancy?: OccupancyBlock }).occupancy;
        if (occData) setOccupancy(occData);
        else setOccupancy(null);
      }
      const logRes = await api.getChangeLog(id);
      if (logRes.success && logRes.data) setChangeLog(logRes.data);
      loadMyReservations();
    }
    setActing(false);
  };

  const handleCancel = () =>
    doAction(async () => {
      await api.cancelReservation(id!, cancelReason.trim() || undefined);
      setShowCancel(false);
      setCancelReason('');
    });

  const handleEscalate = (nodeId: string) =>
    doAction(() => api.escalate(nodeId));

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card>
          <Card.Body>
            <Empty description="加载中..." />
          </Card.Body>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card>
          <Card.Body>
            <Empty description="预约不存在或已被删除" />
            <div className="flex justify-center -mt-6 pb-6">
              <Button size="sm" variant="outline" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/reservations')}>
                返回列表
              </Button>
            </div>
          </Card.Body>
        </Card>
      </div>
    );
  }

  const canCancel = data.status === 'pending' || data.status === 'approved';
  const pendingNode = data.approvalTrail.find((n) => n.status === 'pending');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/reservations')}>
        返回我的预约
      </Button>

      <Card className="overflow-hidden">
        <div className="px-8 py-7 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white relative">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-16 w-24 h-24 bg-white/10 rounded-full translate-y-1/2" />
          <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-bold tracking-tight truncate">{data.projectName}</h1>
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm',
                    data.status === 'approved' && 'bg-emerald-400/30 text-emerald-50 border-emerald-300/50',
                    data.status === 'pending' && 'bg-amber-400/30 text-amber-50 border-amber-300/50',
                    data.status === 'rejected' && 'bg-rose-400/30 text-rose-50 border-rose-300/50',
                    data.status === 'cancelled' && 'bg-slate-400/30 text-slate-50 border-slate-300/50',
                    data.status === 'completed' && 'bg-indigo-400/30 text-indigo-50 border-indigo-300/50'
                  )}
                >
                  {({ pending: '待审批', approved: '已通过', rejected: '已驳回', cancelled: '已取消', completed: '已完成' } as Record<string, string>)[data.status]}
                </span>
              </div>
              <p className="text-white/70 text-sm flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                创建于 {fmtDT(data.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2">
          <Card.Header>
            <div>
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                基本信息
              </h3>
            </div>
          </Card.Header>
          <Card.Body className="space-y-5">
            {[
              { icon: MapPin, label: '实验台', value: data.benchName || '-' },
              { icon: Clock, label: '预约时段', value: fmtSlot(data.startTime, data.endTime) },
              { icon: UserCheck, label: '指导教师', value: data.advisorName },
              {
                icon: Users,
                label: '参与人员',
                value: data.participants?.length ? data.participants.join('、') : '无',
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-xs text-slate-400 mb-0.5">{item.label}</p>
                  <p className="text-sm font-medium text-slate-700 break-words">{item.value}</p>
                </div>
              </div>
            ))}
            <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-xs text-slate-400 mb-1">项目描述</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{data.description}</p>
              </div>
            </div>
            {occupancy && (
              <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-xs text-slate-400 mb-1">占用段</p>
                  {occupancy.mergedFrom && occupancy.mergedFrom.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-purple-700">
                        合并占用 · {fmtSlot(occupancy.startTime, occupancy.endTime)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        含 {occupancy.reservationIds.length} 条预约，本条占用 {fmtSlot(data.startTime, data.endTime)}
                      </p>
                    </div>
                  ) : occupancy.reservationIds.length > 1 ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-purple-700">
                        合并占用 · {fmtSlot(occupancy.startTime, occupancy.endTime)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        含 {occupancy.reservationIds.length} 条预约，本条占用 {fmtSlot(data.startTime, data.endTime)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-slate-700">
                      {fmtSlot(occupancy.startTime, occupancy.endTime)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </Card.Body>
        </Card>

        <Card className="lg:col-span-3">
          <Card.Header className="pb-0">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-500" />
                  全量追踪
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">从提交到当前的完整记录</p>
              </div>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                    activeTab === 'timeline'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                  onClick={() => setActiveTab('timeline')}
                >
                  审批轨迹
                </button>
                <button
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                    activeTab === 'log'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                  onClick={() => setActiveTab('log')}
                >
                  变更记录
                </button>
              </div>
            </div>
          </Card.Header>
          <Card.Body>
            {activeTab === 'timeline' ? (
              data.approvalTrail.length === 0 ? (
                <Empty description="暂无审批记录" />
              ) : (
                <div className="space-y-0.5 pt-2">
                  {data.approvalTrail.map((node, i) => (
                    <TimelineNode key={node.id} node={node} isLast={i === data.approvalTrail.length - 1} />
                  ))}
                </div>
              )
            ) : (
              <div className="pt-2">
                <ChangeLogTimeline log={changeLog} />
              </div>
            )}
          </Card.Body>
        </Card>
      </div>

      {data.splitHistory && data.splitHistory.length > 0 && (
        <Card>
          <Card.Header>
            <div>
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-purple-500" />
                拆分历史
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">占用块调整记录</p>
            </div>
          </Card.Header>
          <Card.Body className="space-y-3">
            {data.splitHistory.map((s: SplitRecord) => (
              <SplitRecordCard key={s.id} s={s} />
            ))}
          </Card.Body>
        </Card>
      )}

      <Card className="sticky bottom-4 shadow-xl">
        <Card.Body className="py-4 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-slate-500">
            当前状态：
            <span className="font-medium text-slate-700 ml-1">
              {({ pending: '待审批中', approved: '预约已通过', rejected: '预约已驳回', cancelled: '已取消', completed: '已完成' } as Record<string, string>)[data.status]}
            </span>
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {pendingNode && (
              <Button
                size="sm"
                variant="secondary"
                icon={<Bell className="w-4 h-4" />}
                loading={acting}
                onClick={() => handleEscalate(pendingNode.id)}
              >
                催办上级
              </Button>
            )}
            {canCancel && (
              <Button
                size="sm"
                variant="danger"
                icon={<XCircle className="w-4 h-4" />}
                onClick={() => setShowCancel(true)}
              >
                退订预约
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>

      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50 to-pink-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-rose-600" />
                </div>
                <h3 className="font-bold text-slate-800">确认退订</h3>
              </div>
              <button
                onClick={() => {
                  setShowCancel(false);
                  setCancelReason('');
                }}
                className="p-2 rounded-lg text-slate-400 hover:bg-white/60 hover:text-slate-600 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">确定要取消预约「{data.projectName}」吗？</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">退订原因（可选）</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="请输入退订原因..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none text-sm resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCancel(false);
                  setCancelReason('');
                }}
              >
                取消
              </Button>
              <Button variant="danger" onClick={handleCancel} loading={acting}>
                确认退订
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
