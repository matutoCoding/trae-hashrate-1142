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

const TABS: { key: TabKey; label: string; status?: ReservationStatus }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审批', status: 'pending' },
  { key: 'approved', label: '已通过', status: 'approved' },
  { key: 'rejected', label: '已驳回', status: 'rejected' },
  { key: 'cancelled', label: '已取消', status: 'cancelled' },
];

const statusColor: Record<ReservationStatus, string> = {
  pending: 'from-amber-400 to-amber-500',
  approved: 'from-emerald-400 to-emerald-500',
  rejected: 'from-rose-400 to-rose-500',
  cancelled: 'from-slate-400 to-slate-500',
  completed: 'from-indigo-400 to-indigo-500',
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

export default function MyReservations() {
  const navigate = useNavigate();
  const { reservations, loadMyReservations } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [keyword, setKeyword] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [canceling, setCanceling] = useState(false);

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

  const canCancel = (r: Reservation) => r.status === 'pending' || r.status === 'approved';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">我的预约</h1>
        <p className="text-slate-500 mt-1">查看和管理您的实验预约记录</p>
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

      <div className="space-y-4">
        {filtered.length === 0 ? (
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
        ) : (
          filtered.map((r) => {
            const { date, time } = formatTimeSlot(r.startTime, r.endTime);
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
                        {canCancel(r) && (
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
          })
        )}
      </div>

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
