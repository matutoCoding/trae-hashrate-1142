import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, XCircle, ArrowUpCircle, Timer, AlertCircle, ShieldAlert, Loader2, FlaskConical, User, FileText, CalendarDays, Clock, Search, Filter, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import type { ApprovalNode, Reservation, ApprovalNodeStatus } from '../../shared/types';

type TabKey = 'pending' | 'processed' | 'all';
const tabs: { key: TabKey; label: string }[] = [
  { key: 'pending', label: '待审批' },
  { key: 'processed', label: '已处理' },
  { key: 'all', label: '全部' },
];
const statusBadge: Record<string, { label: string; cls: string }> = {
  approved: { label: '已通过', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rejected: { label: '已驳回', cls: 'bg-rose-100 text-rose-700 border-rose-200' },
  timeout: { label: '超时裁决', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  escalated: { label: '已升级', cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  pending: { label: '待审批', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
};

type ApprovalNodeEx = ApprovalNode & {
  reservation?: Reservation & { benchName?: string };
};

const getUrgency = (d: string) => {
  const h = (new Date(d).getTime() - Date.now()) / 36e5;
  return h < 6 ? 'bg-rose-500' : h < 12 ? 'bg-orange-500' : 'bg-emerald-500';
};
const getCountdown = (d: string) => {
  const ms = new Date(d).getTime() - Date.now();
  const h = Math.max(0, ms / 36e5);
  if (ms <= 0) return { t: '已超时', c: 'bg-rose-100 text-rose-700 border-rose-200' };
  if (h < 1) return { t: `剩余${Math.ceil(h * 60)}分钟`, c: 'bg-rose-100 text-rose-700 border-rose-200' };
  if (h < 6) return { t: `剩余${h.toFixed(1)}小时`, c: 'bg-rose-100 text-rose-700 border-rose-200' };
  if (h < 12) return { t: `剩余${h.toFixed(0)}小时`, c: 'bg-orange-100 text-orange-700 border-orange-200' };
  if (h < 24) return { t: `剩余${h.toFixed(0)}小时`, c: 'bg-amber-100 text-amber-700 border-amber-200' };
  return { t: `剩余${(h / 24).toFixed(1)}天`, c: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
};
const fmt = (s: string) => {
  const d = new Date(s);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const fmtSlot = (a: string, b: string) => {
  const s = new Date(a);
  const e = new Date(b);
  return `${s.getMonth() + 1}/${s.getDate()} ${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')} - ${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`;
};

function CommentModal({
  open,
  title,
  onClose,
  onConfirm,
  loading,
  variant = 'success',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onConfirm: (c: string) => void;
  loading?: boolean;
  variant?: 'success' | 'danger';
}) {
  const [comment, setComment] = useState('');
  useEffect(() => {
    if (open) setComment('');
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div
          className={cn(
            'px-6 py-4 flex items-center gap-3',
            variant === 'success'
              ? 'bg-emerald-50 border-b border-emerald-100'
              : 'bg-rose-50 border-b border-rose-100'
          )}
        >
          <div
            className={cn(
              'p-2 rounded-xl',
              variant === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
            )}
          >
            {variant === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          </div>
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        </div>
        <div className="p-6">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-2 block">审批意见</span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="请输入审批意见（选填）"
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none text-sm"
            />
          </label>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button variant={variant} onClick={() => onConfirm(comment)} loading={loading}>
            {variant === 'success' ? '确认通过' : '确认驳回'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  full = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 p-3 bg-white/60 rounded-xl border border-slate-100',
        full && 'col-span-full'
      )}
    >
      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</div>
        <div className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{value}</div>
      </div>
    </div>
  );
}

function PendingCard({
  node,
  onApprove,
  onReject,
  onEscalate,
  escalating,
}: {
  node: ApprovalNodeEx;
  onApprove: (n: ApprovalNodeEx) => void;
  onReject: (n: ApprovalNodeEx) => void;
  onEscalate: (n: ApprovalNodeEx) => void;
  escalating: boolean;
}) {
  const urgency = getUrgency(node.deadline);
  const cd = getCountdown(node.deadline);
  const r = node.reservation;
  return (
    <div className="relative flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5">
      <div className={cn('w-1.5 flex-shrink-0', urgency)} />
      <div className="flex-1 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-500" />
                <h3 className="text-base font-bold text-slate-800">{r?.userName ?? '—'}</h3>
              </div>
              <span className="text-slate-300">·</span>
              <p className="text-sm font-bold text-blue-700 truncate">{r?.projectName ?? '—'}</p>
            </div>
            <p className="text-xs text-slate-400 mt-1">申请编号 {node.reservationId.slice(0, 12)}</p>
          </div>
          <div
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border flex-shrink-0',
              cd.c
            )}
          >
            <Timer className="w-3.5 h-3.5" />
            <span>{cd.t}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InfoRow
            icon={<FlaskConical className="w-4 h-4 text-blue-600" />}
            label="实验台"
            value={r?.benchName ?? '—'}
          />
          <InfoRow
            icon={<CalendarDays className="w-4 h-4 text-emerald-600" />}
            label="预约时段"
            value={r?.startTime && r?.endTime ? fmtSlot(r.startTime, r.endTime) : '—'}
          />
          <InfoRow
            icon={<Clock className="w-4 h-4 text-purple-600" />}
            label="提交时间"
            value={fmt(r?.createdAt ?? node.createdAt)}
          />
          <InfoRow
            icon={<User className="w-4 h-4 text-amber-600" />}
            label="参与人数"
            value={r?.participants ? `${r.participants.length} 人` : '—'}
          />
        </div>

        {r?.description && (
          <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-xl border border-slate-100">
            <div className="flex items-center gap-1.5 mb-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                实验描述
              </span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">{r.description}</p>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <Button
            variant="success"
            size="sm"
            icon={<CheckCircle className="w-4 h-4" />}
            onClick={() => onApprove(node)}
          >
            通过
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={<XCircle className="w-4 h-4" />}
            onClick={() => onReject(node)}
          >
            驳回
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={
              escalating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowUpCircle className="w-4 h-4" />
              )
            }
            onClick={() => onEscalate(node)}
            disabled={escalating}
          >
            升级审批
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProcessedCard({ node }: { node: ApprovalNodeEx }) {
  const badge = statusBadge[node.status] ?? statusBadge.pending;
  const r = node.reservation;
  return (
    <div className="relative flex overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50 shadow-sm opacity-95">
      <div className="w-1.5 flex-shrink-0 bg-slate-300" />
      <div className="flex-1 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-500" />
                <h3 className="text-base font-bold text-slate-600">{r?.userName ?? '—'}</h3>
              </div>
              <span className="text-slate-300">·</span>
              <p className="text-sm font-medium text-slate-500 truncate">{r?.projectName ?? '—'}</p>
            </div>
          </div>
          <div
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border flex-shrink-0',
              badge.cls
            )}
          >
            {badge.label}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <InfoRow
            icon={<FlaskConical className="w-3.5 h-3.5 text-slate-500" />}
            label="实验台"
            value={r?.benchName ?? '—'}
          />
          <InfoRow
            icon={<CalendarDays className="w-3.5 h-3.5 text-slate-500" />}
            label="预约时段"
            value={r?.startTime && r?.endTime ? fmtSlot(r.startTime, r.endTime) : '—'}
          />
          <InfoRow
            icon={<Clock className="w-3.5 h-3.5 text-slate-500" />}
            label="处理时间"
            value={node.handledAt ? fmt(node.handledAt) : '—'}
          />
        </div>

        {r?.description && (
          <p className="text-sm text-slate-500 line-clamp-2 bg-white p-3 rounded-xl border border-slate-100">
            {r.description}
          </p>
        )}
        {node.comment && (
          <div className="p-3 bg-white rounded-xl border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              审批意见
              {node.role === 'auto' && (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">
                  系统自动
                </span>
              )}
            </p>
            <p className="text-sm text-slate-600">{node.comment}</p>
          </div>
        )}
        <p className="text-xs text-slate-400">
          审批人：{node.approverName} · 提交 {fmt(r?.createdAt ?? node.createdAt)}
        </p>
      </div>
    </div>
  );
}

function FilterBar({
  filters,
  setFilters,
  benches,
}: {
  filters: { benchId: string; userName: string; projectName: string; status: string };
  setFilters: (f: { benchId: string; userName: string; projectName: string; status: string }) => void;
  benches: { id: string; name: string }[];
}) {
  const hasFilter = filters.benchId || filters.userName || filters.projectName || filters.status;
  const statusOptions: { key: ApprovalNodeStatus | 'all'; label: string }[] = [
    { key: 'all', label: '全部状态' },
    { key: 'pending', label: '待审批' },
    { key: 'approved', label: '已通过' },
    { key: 'rejected', label: '已驳回' },
    { key: 'timeout', label: '超时裁决' },
    { key: 'escalated', label: '已升级' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="font-semibold">筛选</span>
        {hasFilter && (
          <button
            onClick={() => setFilters({ benchId: '', userName: '', projectName: '', status: '' })}
            className="ml-auto text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            清除筛选
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <select
            value={filters.benchId}
            onChange={(e) => setFilters({ ...filters, benchId: e.target.value })}
            className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm appearance-none cursor-pointer"
          >
            <option value="">全部实验台</option>
            {benches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <FlaskConical className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索申请人..."
            value={filters.userName}
            onChange={(e) => setFilters({ ...filters, userName: e.target.value })}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
          />
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索项目名..."
            value={filters.projectName}
            onChange={(e) => setFilters({ ...filters, projectName: e.target.value })}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
          />
        </div>

        <div className="relative">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm appearance-none cursor-pointer"
          >
            {statusOptions.map((s) => (
              <option key={s.key} value={s.key === 'all' ? '' : s.key}>{s.label}</option>
            ))}
          </select>
          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}

export default function ApprovalCenter() {
  const [tab, setTab] = useState<TabKey>('pending');
  const [modal, setModal] = useState<{
    open: boolean;
    type: 'approve' | 'reject';
    node: ApprovalNodeEx | null;
  }>({ open: false, type: 'approve', node: null });
  const [modalLoading, setModalLoading] = useState(false);
  const [escalatingId, setEscalatingId] = useState<string | null>(null);
  const [timeoutLoading, setTimeoutLoading] = useState(false);
  const [toast, setToast] = useState<{ m: string; t: 'success' | 'error' } | null>(null);
  const [filters, setFilters] = useState({
    benchId: '',
    userName: '',
    projectName: '',
    status: '',
  });
  const { pendingApprovals, allApprovals, loadPendingApprovals, loadAllApprovals, benches, loadBenches } = useAppStore();

  useEffect(() => {
    loadBenches();
  }, [loadBenches]);

  useEffect(() => {
    const f = {
      benchId: filters.benchId || undefined,
      userName: filters.userName || undefined,
      projectName: filters.projectName || undefined,
      status: (filters.status || undefined) as ApprovalNodeStatus | undefined,
    };
    loadPendingApprovals({ benchId: f.benchId, userName: f.userName, projectName: f.projectName });
    loadAllApprovals(f);
  }, [filters, tab, loadPendingApprovals, loadAllApprovals]);

  const showToast = (m: string, t: 'success' | 'error' = 'success') => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 2500);
  };
  const refresh = () => {
    const f = {
      benchId: filters.benchId || undefined,
      userName: filters.userName || undefined,
      projectName: filters.projectName || undefined,
      status: (filters.status || undefined) as ApprovalNodeStatus | undefined,
    };
    loadPendingApprovals({ benchId: f.benchId, userName: f.userName, projectName: f.projectName });
    loadAllApprovals(f);
  };
  const handleConfirm = async (comment: string) => {
    if (!modal.node) return;
    setModalLoading(true);
    try {
      const fn = modal.type === 'approve' ? api.approve : api.reject;
      const res = await fn(modal.node.id, comment || undefined);
      if (res.success) {
        showToast(modal.type === 'approve' ? '审批通过成功' : '已驳回申请');
        refresh();
      } else showToast(res.error || '操作失败', 'error');
    } catch {
      showToast('操作失败', 'error');
    } finally {
      setModalLoading(false);
      setModal({ open: false, type: 'approve', node: null });
    }
  };
  const handleEscalate = async (node: ApprovalNodeEx) => {
    setEscalatingId(node.id);
    try {
      const res = await api.escalate(node.id);
      if (res.success) {
        showToast('升级成功，已通知上级审批人');
        refresh();
      } else showToast(res.error || '升级失败', 'error');
    } catch {
      showToast('升级失败', 'error');
    } finally {
      setEscalatingId(null);
    }
  };
  const handleTimeoutCheck = async () => {
    setTimeoutLoading(true);
    try {
      const res = await api.triggerTimeoutCheck();
      if (res.success) {
        showToast(
          `超时检测完成：新增催办${res.data?.newReminders.length ?? 0}条，升级${res.data?.escalatedReservations?.length ?? 0}个，自动裁决${res.data?.autoDecided?.length ?? 0}个`
        );
        refresh();
      } else showToast(res.error || '检测失败', 'error');
    } catch {
      showToast('检测失败', 'error');
    } finally {
      setTimeoutLoading(false);
    }
  };
  const list = useMemo(() => {
    if (tab === 'pending') return pendingApprovals;
    if (tab === 'processed') return allApprovals.filter((n) => n.status !== 'pending');
    return allApprovals;
  }, [tab, pendingApprovals, allApprovals]);

  const benchOptions = useMemo(
    () => benches.map((b) => ({ id: b.id, name: b.name })),
    [benches]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">审批中心</h1>
          <p className="text-slate-500 mt-1">审核学生实验预约申请，超时自动升级与裁决</p>
        </div>
        <Button
          variant="primary"
          icon={
            timeoutLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )
          }
          onClick={handleTimeoutCheck}
          loading={timeoutLoading}
        >
          触发超时检测
        </Button>
      </div>
      <Card>
        <div className="p-5 border-b border-slate-100">
          <FilterBar filters={filters} setFilters={setFilters} benches={benchOptions} />
        </div>
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-5 py-3.5 text-sm font-semibold relative transition-colors whitespace-nowrap',
                tab === t.key ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {t.label}
              <span
                className="ml-1.5 text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: tab === t.key ? '#eff6ff' : '#f1f5f9',
                  color: tab === t.key ? '#2563eb' : '#64748b',
                }}
              >
                {t.key === 'pending'
                  ? pendingApprovals.length
                  : t.key === 'processed'
                    ? allApprovals.filter((n) => n.status !== 'pending').length
                    : allApprovals.length}
              </span>
              {tab === t.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
              )}
            </button>
          ))}
        </div>
        <div className="p-5 space-y-4">
          {list.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                <ShieldAlert className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm">
                {tab === 'pending'
                  ? '暂无待审批申请'
                  : tab === 'processed'
                    ? '暂无已处理记录'
                    : '暂无审批记录'}
              </p>
            </div>
          ) : (
            list.map((node) =>
              tab === 'pending' || node.status === 'pending' ? (
                <PendingCard
                  key={node.id}
                  node={node as ApprovalNodeEx}
                  onApprove={(n) => setModal({ open: true, type: 'approve', node: n })}
                  onReject={(n) => setModal({ open: true, type: 'reject', node: n })}
                  onEscalate={handleEscalate}
                  escalating={escalatingId === node.id}
                />
              ) : (
                <ProcessedCard key={node.id} node={node as ApprovalNodeEx} />
              )
            )
          )}
        </div>
      </Card>
      <CommentModal
        open={modal.open}
        title={modal.type === 'approve' ? '通过审批' : '驳回申请'}
        variant={modal.type === 'approve' ? 'success' : 'danger'}
        loading={modalLoading}
        onClose={() => !modalLoading && setModal({ open: false, type: 'approve', node: null })}
        onConfirm={handleConfirm}
      />
      {toast && (
        <div
          className={cn(
            'fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2',
            toast.t === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          )}
        >
          {toast.t === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">{toast.m}</span>
        </div>
      )}
    </div>
  );
}
