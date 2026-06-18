import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronRight,
  XCircle,
  Clock,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  CalendarPlus,
  X,
  ChevronLeft,
  Calendar,
  LayoutList,
  CalendarDays,
  Sparkles,
  History,
  Scissors,
  Bell,
  AlertOctagon,
  Zap,
  Loader2,
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../store/useAppStore';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import Empty from '../components/Empty';
import type { Reservation, ReservationStatus, ApprovalNode, ChangeLogEntry } from '../../shared/types';

type TabKey = 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled';
type ViewMode = 'list' | 'calendar';

const TABS: { key: TabKey; label: string; status?: ReservationStatus }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审批', status: 'pending' },
  { key: 'approved', label: '已通过', status: 'approved' },
  { key: 'rejected', label: '已驳回', status: 'rejected' },
  { key: 'cancelled', label: '已取消', status: 'cancelled' },
];

const HS = 8, HE = 22, HN = HE - HS;
const WD = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const statusColor: Record<ReservationStatus, string> = {
  pending: 'from-amber-400 to-amber-500',
  approved: 'from-emerald-400 to-emerald-500',
  rejected: 'from-rose-400 to-rose-500',
  cancelled: 'from-slate-400 to-slate-500',
  completed: 'from-indigo-400 to-indigo-500',
};
const SGB: Record<ReservationStatus, string> = {
  pending: 'from-amber-400/90 to-amber-500/90 text-amber-950',
  approved: 'from-emerald-400/90 to-emerald-600/90 text-white',
  rejected: 'from-rose-400/90 to-rose-600/90 text-white',
  cancelled: 'from-slate-300/90 to-slate-400/90 text-slate-700',
  completed: 'from-indigo-400/90 to-indigo-600/90 text-white',
};
const SGL: Record<ReservationStatus, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
  cancelled: '已取消',
  completed: '已完成',
};

const BENCH_COLORS = [
  'from-blue-400 to-blue-600',
  'from-emerald-400 to-emerald-600',
  'from-purple-400 to-purple-600',
  'from-orange-400 to-orange-600',
  'from-pink-400 to-pink-600',
  'from-cyan-400 to-cyan-600',
  'from-violet-400 to-violet-600',
  'from-rose-400 to-rose-600',
];

const BENCH_COLORS_SOFT = [
  'from-blue-400/90 to-blue-600/90 text-white',
  'from-emerald-400/90 to-emerald-600/90 text-white',
  'from-purple-400/90 to-purple-600/90 text-white',
  'from-orange-400/90 to-orange-600/90 text-white',
  'from-pink-400/90 to-pink-600/90 text-white',
  'from-cyan-400/90 to-cyan-600/90 text-white',
  'from-violet-400/90 to-violet-600/90 text-white',
  'from-rose-400/90 to-rose-600/90 text-white',
];

const getMon = (d: Date) => {
  const x = new Date(d); const dy = x.getDay();
  x.setDate(x.getDate() + (dy === 0 ? -6 : 1 - dy));
  x.setHours(0, 0, 0, 0); return x;
};
const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
const fmtTime = (iso: string) => new Date(iso).toTimeString().slice(0, 5);
const pT = (iso: string) => { const d = new Date(iso); return d.getHours() + d.getMinutes() / 60; };
const sD = (iso: string, d: Date) => {
  const x = new Date(iso);
  return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth() && x.getDate() === d.getDate();
};

function formatTimeSlot(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const date = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`;
  const time = `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')} - ${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`;
  return { date, time };
}

function formatCreatedAt(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function ApprovalTimeline({ trail }: { trail: ApprovalNode[] }) {
  const nodeIcon = (node: ApprovalNode) => {
    switch (node.status) {
      case 'approved':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-rose-500" />;
      case 'timeout':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'escalated':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400 animate-pulse" />;
    }
  };

  return (
    <div className="flex items-center gap-1 py-1">
      {trail.map((node, i) => {
        const isLast = i === trail.length - 1;
        const done = node.status === 'approved' || node.status === 'rejected';
        return (
          <div key={node.id} className="flex items-center">
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all',
                done
                  ? node.status === 'approved'
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-rose-50 border-rose-200'
                  : node.status === 'pending'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-slate-50 border-slate-200'
              )}
            >
              {nodeIcon(node)}
            </div>
            {!isLast && (
              <div
                className={cn(
                  'w-6 h-0.5 mx-0.5',
                  done ? 'bg-emerald-300' : 'bg-slate-200'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function changeLogStyle(type: string) {
  switch (type) {
    case 'submit':
      return { icon: CalendarPlus, color: 'text-blue-600', bg: 'bg-blue-100', ring: 'ring-blue-200', line: 'bg-blue-300', label: '提交' };
    case 'approval':
      return { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100', ring: 'ring-emerald-200', line: 'bg-emerald-300', label: '审批' };
    case 'merge':
      return { icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-100', ring: 'ring-amber-200', line: 'bg-amber-300', label: '合并' };
    case 'split':
      return { icon: Scissors, color: 'text-purple-600', bg: 'bg-purple-100', ring: 'ring-purple-200', line: 'bg-purple-300', label: '拆分' };
    case 'reminder':
      return { icon: Bell, color: 'text-orange-600', bg: 'bg-orange-100', ring: 'ring-orange-200', line: 'bg-orange-300', label: '催办' };
    case 'escalation':
      return { icon: AlertOctagon, color: 'text-rose-600', bg: 'bg-rose-100', ring: 'ring-rose-200', line: 'bg-rose-300', label: '升级' };
    case 'auto_decision':
      return { icon: Zap, color: 'text-violet-600', bg: 'bg-violet-100', ring: 'ring-violet-200', line: 'bg-violet-300', label: '自动裁决' };
    case 'cancel':
      return { icon: XCircle, color: 'text-slate-600', bg: 'bg-slate-100', ring: 'ring-slate-200', line: 'bg-slate-300', label: '退订' };
    default:
      return { icon: History, color: 'text-slate-500', bg: 'bg-slate-100', ring: 'ring-slate-200', line: 'bg-slate-300', label: '记录' };
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
                style.ring, style.bg
              )}>
                <Icon className={cn('w-5 h-5', style.color)} />
              </div>
              {!isLast && <div className={cn('w-0.5 flex-1 my-1', style.line)} />}
            </div>
            <div className="flex-1 pb-6">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-slate-800 text-sm">{entry.title}</h4>
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                  entry.isSystem ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
                )}>
                  {entry.isSystem ? '系统' : '人工'}
                </span>
                <span className="text-[11px] text-slate-400 ml-auto">
                  {new Date(entry.time).toLocaleString('zh-CN')}
                </span>
              </div>
              {entry.operatorName && (
                <p className="text-xs text-slate-500 mt-1">操作人：{entry.operatorName}</p>
              )}
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{entry.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChangeLogModal({
  open,
  onClose,
  reservationId,
  reservationTitle,
}: {
  open: boolean;
  onClose: () => void;
  reservationId: string;
  reservationTitle: string;
}) {
  const [log, setLog] = useState<ChangeLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && reservationId) {
      setLoading(true);
      api.getChangeLog(reservationId)
        .then((res) => { if (res.success) setLog(res.data || []); })
        .finally(() => setLoading(false));
    }
  }, [open, reservationId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold truncate">变更记录</h3>
              <p className="text-xs text-white/70 truncate">{reservationTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <ChangeLogTimeline log={log} />
          )}
        </div>
      </div>
    </div>
  );
}

function ListView({
  reservations,
  navigate,
  setCancelTarget,
  onViewChangeLog,
}: {
  reservations: Reservation[];
  navigate: (p: string) => void;
  setCancelTarget: (r: Reservation | null) => void;
  onViewChangeLog: (r: Reservation) => void;
}) {
  if (reservations.length === 0) {
    return (
      <Card>
        <Card.Body>
          <Empty description="暂无预约记录" />
          <div className="flex justify-center -mt-6 pb-6">
            <Button
              size="sm"
              icon={<CalendarPlus className="w-4 h-4" />}
              onClick={() => navigate('/reservations/new')}
            >
              去预约
            </Button>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reservations.map((r) => {
        const { date, time } = formatTimeSlot(r.startTime, r.endTime);
        const canCancel = r.status === 'pending' || r.status === 'approved';
        return (
          <Card key={r.id} hoverable className="overflow-hidden group">
            <div className="flex">
              <div
                className={cn(
                  'w-1.5 bg-gradient-to-b shrink-0 transition-all duration-300 group-hover:w-2',
                  statusColor[r.status]
                )}
              />
              <div className="flex-1 min-w-0">
                <Card.Header className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">{r.projectName}</h3>
                    <StatusBadge status={r.status} size="sm" />
                  </div>
                </Card.Header>
                <Card.Body className="py-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{r.benchName || '-'} </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>
                        {date} {time}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 md:col-span-2">
                      <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>导师：{r.advisorName}</span>
                    </div>
                  </div>
                  {r.approvalTrail.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-xs text-slate-400 mb-1.5">审批进度</p>
                      <ApprovalTimeline trail={r.approvalTrail} />
                    </div>
                  )}
                </Card.Body>
                <Card.Footer className="flex items-center justify-between flex-wrap gap-3">
                  <span className="text-xs text-slate-400">创建于 {formatCreatedAt(r.createdAt)}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<History className="w-4 h-4" />}
                      onClick={() => onViewChangeLog(r)}
                    >
                      变更记录
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<ChevronRight className="w-4 h-4" />}
                      onClick={() => navigate(`/reservations/${r.id}`)}
                    >
                      查看详情
                    </Button>
                    {canCancel && (
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<XCircle className="w-4 h-4" />}
                        onClick={() => setCancelTarget(r)}
                      >
                        退订
                      </Button>
                    )}
                  </div>
                </Card.Footer>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function CalendarView({
  reservations,
  navigate,
  colorMode,
  benchColors,
  filterBenchId,
  filterStatus,
  onFilterBenchChange,
  onFilterStatusChange,
  onColorModeChange,
  allBenches,
  onViewChangeLog,
}: {
  reservations: Reservation[];
  navigate: (p: string) => void;
  colorMode: 'status' | 'bench';
  benchColors: Record<string, string>;
  filterBenchId: string;
  filterStatus: string;
  onFilterBenchChange: (id: string) => void;
  onFilterStatusChange: (s: string) => void;
  onColorModeChange: (m: 'status' | 'bench') => void;
  allBenches: { id: string; name: string }[];
  onViewChangeLog: (r: Reservation) => void;
}) {
  const [wb, setWb] = useState<Date>(() => getMon(new Date()));
  const [selected, setSelected] = useState<Reservation | null>(null);

  const wDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => { const d = new Date(wb); d.setDate(d.getDate() + i); return d; }),
    [wb]
  );

  const prev = () => { const d = new Date(wb); d.setDate(d.getDate() - 7); setWb(d); };
  const next = () => { const d = new Date(wb); d.setDate(d.getDate() + 7); setWb(d); };

  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      if (filterBenchId && r.benchId !== filterBenchId) return false;
      if (filterStatus && filterStatus !== 'all' && r.status !== filterStatus) return false;
      return true;
    });
  }, [reservations, filterBenchId, filterStatus]);

  const bD = (d: Date) => filteredReservations.filter((r) => sD(r.startTime, d));

  const getBlockColor = (r: Reservation) => {
    if (colorMode === 'bench') {
      return benchColors[r.benchId] || SGB[r.status] || SGB.pending;
    }
    return SGB[r.status] || SGB.pending;
  };

  const hasFilter = filterBenchId || (filterStatus && filterStatus !== 'all');

  return (
    <Card className="p-0 overflow-hidden">
      <Card.Header className="pb-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-slate-900">周日历</h3>
              <p className="text-xs text-slate-500">{fmt(wDays[0])} ~ {fmt(wDays[6])}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-1 justify-end flex-wrap">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => onFilterStatusChange('all')}
                className={cn(
                  'px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all',
                  filterStatus === 'all' || !filterStatus
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                全部
              </button>
              <button
                onClick={() => onFilterStatusChange('pending')}
                className={cn(
                  'px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all',
                  filterStatus === 'pending'
                    ? 'bg-amber-100 text-amber-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                待审批
              </button>
              <button
                onClick={() => onFilterStatusChange('approved')}
                className={cn(
                  'px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all',
                  filterStatus === 'approved'
                    ? 'bg-emerald-100 text-emerald-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                已通过
              </button>
              <button
                onClick={() => onFilterStatusChange('rejected')}
                className={cn(
                  'px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all',
                  filterStatus === 'rejected'
                    ? 'bg-rose-100 text-rose-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                已驳回
              </button>
              <button
                onClick={() => onFilterStatusChange('cancelled')}
                className={cn(
                  'px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all',
                  filterStatus === 'cancelled'
                    ? 'bg-slate-200 text-slate-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                已取消
              </button>
              <button
                onClick={() => onFilterStatusChange('completed')}
                className={cn(
                  'px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all',
                  filterStatus === 'completed'
                    ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                已完成
              </button>
            </div>
            <select
              value={filterBenchId}
              onChange={(e) => onFilterBenchChange(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">全部实验台</option>
              {allBenches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => onColorModeChange('status')}
                className={cn(
                  'px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all',
                  colorMode === 'status'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
                title="按状态着色"
              >
                状态
              </button>
              <button
                onClick={() => onColorModeChange('bench')}
                className={cn(
                  'px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all',
                  colorMode === 'bench'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
                title="按实验台着色"
              >
                实验台
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          <Button variant="ghost" size="sm" icon={<ChevronLeft className="w-4 h-4" />} onClick={prev}>上一周</Button>
          <Button variant="ghost" size="sm" onClick={() => setWb(getMon(new Date()))}>本周</Button>
          <Button variant="ghost" size="sm" icon={<ChevronRight className="w-4 h-4" />} onClick={next}>下一周</Button>
          <div className="flex-1" />
          <span className="text-[11px] text-slate-400">
            显示 {filteredReservations.length} 条预约
            {hasFilter && ' · 已筛选'}
          </span>
        </div>
      </Card.Header>

      <div className="p-4 overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-slate-200">
            <div />
            {wDays.map((d, i) => (
              <div key={i} className="py-2 text-center border-l border-slate-100">
                <div className="text-xs text-slate-500">{WD[i]}</div>
                <div className={cn(
                  'text-sm font-semibold mt-0.5',
                  d.toDateString() === new Date().toDateString() ? 'text-blue-600' : 'text-slate-800'
                )}>
                  {fmt(d)}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[80px_repeat(7,1fr)] relative">
            <div>
              {Array.from({ length: HN }, (_, i) => (
                <div key={i} className="h-12 border-b border-slate-100 pr-2 text-right text-xs text-slate-400 pt-0.5">
                  {String(HS + i).padStart(2, '0')}:00
                </div>
              ))}
            </div>
            {wDays.map((day, di) => (
              <div key={di} className="relative border-l border-slate-100 min-h-[168px]">
                {Array.from({ length: HN }, (_, hi) => (
                  <div
                    key={hi}
                    className="h-12 border-b border-slate-50 hover:bg-blue-50/30 transition-colors"
                  />
                ))}
                {bD(day).map((r) => {
                  const top = Math.max(0, (pT(r.startTime) - HS) * 48);
                  const ht = Math.max(24, (pT(r.endTime) - pT(r.startTime)) * 48);
                  return (
                    <div
                      key={r.id}
                      className={cn(
                        'absolute left-1 right-1 rounded-lg px-2 py-1 text-xs overflow-hidden shadow-sm bg-gradient-to-br cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] z-10',
                        getBlockColor(r)
                      )}
                      style={{ top, height: ht }}
                      onClick={() => setSelected(r)}
                    >
                      <div className="font-semibold truncate">{r.projectName}</div>
                      <div className="text-[10px] opacity-90 truncate mt-0.5">
                        {fmtTime(r.startTime)} ~ {fmtTime(r.endTime)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div
              className={cn(
                'px-6 py-4 bg-gradient-to-r text-white',
                statusColor[selected.status] || statusColor.pending
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold truncate">{selected.projectName}</h3>
                  <p className="text-xs text-white/70 mt-1">预约编号 {selected.id.slice(0, 12)}</p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">实验台</div>
                  <p className="text-sm font-semibold text-slate-800">{selected.benchName}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">状态</div>
                  <StatusBadge status={selected.status} size="sm" />
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 col-span-2">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">时段</div>
                  <p className="text-sm font-semibold text-slate-800">{formatTimeSlot(selected.startTime, selected.endTime).time}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">导师</div>
                  <p className="text-sm font-semibold text-slate-800">{selected.advisorName}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">创建于</div>
                  <p className="text-sm font-semibold text-slate-800">{formatCreatedAt(selected.createdAt)}</p>
                </div>
              </div>
              {selected.description && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    实验描述
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{selected.description}</p>
                </div>
              )}
            </div>
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-between">
              <Button
                variant="outline"
                size="sm"
                icon={<History className="w-4 h-4" />}
                onClick={() => { if (selected) { setSelected(null); onViewChangeLog(selected); } }}
              >
                变更记录
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={() => setSelected(null)}>关闭</Button>
                <Button variant="primary" size="sm" onClick={() => { setSelected(null); navigate(`/reservations/${selected.id}`); }}>
                  查看详情
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function MyReservations() {
  const navigate = useNavigate();
  const { reservations, loadMyReservations, benches, loadBenches } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [keyword, setKeyword] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [canceling, setCanceling] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [colorMode, setColorMode] = useState<'status' | 'bench'>('status');
  const [filterBenchId, setFilterBenchId] = useState('');
  const [calendarFilterStatus, setCalendarFilterStatus] = useState('all');
  const [changeLogModal, setChangeLogModal] = useState<{ open: boolean; reservation: Reservation | null }>({
    open: false,
    reservation: null,
  });

  const handleViewChangeLog = (r: Reservation) => {
    setChangeLogModal({ open: true, reservation: r });
  };

  useEffect(() => {
    loadMyReservations(TABS.find((t) => t.key === activeTab)?.status);
    loadBenches();
  }, [activeTab, loadMyReservations, loadBenches]);

  const benchColors = useMemo(() => {
    const map: Record<string, string> = {};
    benches.forEach((b, i) => {
      map[b.id] = BENCH_COLORS_SOFT[i % BENCH_COLORS_SOFT.length];
    });
    return map;
  }, [benches]);

  const benchList = useMemo(() => {
    return benches.map((b) => ({ id: b.id, name: b.name }));
  }, [benches]);

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      if (keyword && !r.projectName.toLowerCase().includes(keyword.toLowerCase())) return false;
      return true;
    });
  }, [reservations, keyword]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCanceling(true);
    try {
      const res = await api.cancelReservation(cancelTarget.id, cancelReason.trim() || undefined);
      if (res.success) {
        await loadMyReservations(TABS.find((t) => t.key === activeTab)?.status);
        setCancelTarget(null);
        setCancelReason('');
      }
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">我的预约</h1>
          <p className="text-slate-500 mt-1">查看和管理您的实验预约记录</p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              viewMode === 'list'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            )}
          >
            <LayoutList className="w-4 h-4" />
            列表
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              viewMode === 'calendar'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            )}
          >
            <CalendarDays className="w-4 h-4" />
            日历
          </button>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-1.5 flex-wrap">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/25'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索项目名称..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all"
            />
          </div>
        </div>
      </Card>

      {viewMode === 'list' ? (
        <ListView
          reservations={filtered}
          navigate={navigate}
          setCancelTarget={setCancelTarget}
          onViewChangeLog={handleViewChangeLog}
        />
      ) : (
        <CalendarView
          reservations={filtered}
          navigate={navigate}
          colorMode={colorMode}
          benchColors={benchColors}
          filterBenchId={filterBenchId}
          filterStatus={calendarFilterStatus}
          onFilterBenchChange={setFilterBenchId}
          onFilterStatusChange={setCalendarFilterStatus}
          onColorModeChange={setColorMode}
          allBenches={benchList}
          onViewChangeLog={handleViewChangeLog}
        />
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50 to-pink-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">确认退订</h3>
                  <p className="text-xs text-slate-500">{cancelTarget.projectName}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setCancelTarget(null);
                  setCancelReason('');
                }}
                className="p-2 rounded-lg text-slate-400 hover:bg-white/60 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">您确定要取消此预约吗？取消后将无法恢复。</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">退订原因（可选）</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="请输入退订原因..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none text-sm resize-none transition-all"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <Button
                variant="outline"
                onClick={() => {
                  setCancelTarget(null);
                  setCancelReason('');
                }}
              >
                取消
              </Button>
              <Button variant="danger" onClick={handleCancel} loading={canceling}>
                确认退订
              </Button>
            </div>
          </div>
        </div>
      )}

      <ChangeLogModal
        open={changeLogModal.open}
        onClose={() => setChangeLogModal({ open: false, reservation: null })}
        reservationId={changeLogModal.reservation?.id || ''}
        reservationTitle={changeLogModal.reservation?.projectName || ''}
      />
    </div>
  );
}
