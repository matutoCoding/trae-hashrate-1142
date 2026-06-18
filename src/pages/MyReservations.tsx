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
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../store/useAppStore';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import Empty from '../components/Empty';
import type { Reservation, ReservationStatus, ApprovalNode } from '../../shared/types';

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

function ListView({
  reservations,
  navigate,
  setCancelTarget,
}: {
  reservations: Reservation[];
  navigate: (p: string) => void;
  setCancelTarget: (r: Reservation | null) => void;
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
}: {
  reservations: Reservation[];
  navigate: (p: string) => void;
}) {
  const [wb, setWb] = useState<Date>(() => getMon(new Date()));
  const [selected, setSelected] = useState<Reservation | null>(null);

  const wDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => { const d = new Date(wb); d.setDate(d.getDate() + i); return d; }),
    [wb]
  );

  const prev = () => { const d = new Date(wb); d.setDate(d.getDate() - 7); setWb(d); };
  const next = () => { const d = new Date(wb); d.setDate(d.getDate() + 7); setWb(d); };

  const bD = (d: Date) => reservations.filter((r) => sD(r.startTime, d));

  return (
    <Card className="p-0 overflow-hidden">
      <Card.Header>
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-semibold text-slate-900">周日历</h3>
            <p className="text-xs text-slate-500">{fmt(wDays[0])} ~ {fmt(wDays[6])}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<ChevronLeft className="w-4 h-4" />} onClick={prev}>上一周</Button>
          <Button variant="ghost" size="sm" onClick={() => setWb(getMon(new Date()))}>本周</Button>
          <Button variant="ghost" size="sm" icon={<ChevronRight className="w-4 h-4" />} onClick={next}>下一周</Button>
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
                        SGB[r.status] || SGB.pending
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
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>关闭</Button>
              <Button variant="primary" size="sm" onClick={() => { setSelected(null); navigate(`/reservations/${selected.id}`); }}>
                查看详情
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function MyReservations() {
  const navigate = useNavigate();
  const { reservations, loadMyReservations } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [keyword, setKeyword] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [canceling, setCanceling] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  useEffect(() => {
    loadMyReservations(TABS.find((t) => t.key === activeTab)?.status);
  }, [activeTab, loadMyReservations]);

  const filtered = useMemo(() => {
    return reservations.filter((r) =>
      keyword ? r.projectName.toLowerCase().includes(keyword.toLowerCase()) : true
    );
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
        />
      ) : (
        <CalendarView reservations={filtered} navigate={navigate} />
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
    </div>
  );
}
