import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, MapPin, Users, ChevronLeft, ChevronRight,
  Sparkles, AlertCircle, X, FlaskConical, User, FileText,
  CheckCircle, XCircle, AlertTriangle,
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../store/useAppStore';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import type { LabBench, OccupancyBlock, Reservation } from '../../shared/types';

const HS = 8, HE = 22, HN = HE - HS;
const WD = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const getMon = (d: Date) => {
  const x = new Date(d); const dy = x.getDay();
  x.setDate(x.getDate() + (dy === 0 ? -6 : 1 - dy));
  x.setHours(0, 0, 0, 0); return x;
};
const getSun = (d: Date) => {
  const x = getMon(d);
  x.setDate(x.getDate() + 6);
  x.setHours(23, 59, 59, 999);
  return x;
};
const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
const fmtDT = (d: Date) => d.toISOString().slice(0, 16);
const fmtDT2 = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const fmtTime = (iso: string) => new Date(iso).toTimeString().slice(0, 5);
const fmtSlot = (a: string, b: string) =>
  `${new Date(a).getMonth() + 1}/${new Date(a).getDate()} ${fmtTime(a)} - ${fmtTime(b)}`;
const pT = (iso: string) => { const d = new Date(iso); return d.getHours() + d.getMinutes() / 60; };
const sD = (iso: string, d: Date) => {
  const x = new Date(iso);
  return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth() && x.getDate() === d.getDate();
};
const SG: Record<string, string> = {
  pending: 'from-amber-400/90 to-amber-500/90 text-amber-950',
  confirmed: 'from-blue-400/90 to-blue-600/90 text-white',
  cancelled: 'from-slate-300/90 to-slate-400/90 text-slate-700',
};
const SGT: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  rejected: 'bg-rose-100 text-rose-700 border-rose-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
  completed: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};
const SGL: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  confirmed: '已确认',
  rejected: '已驳回',
  cancelled: '已取消',
  completed: '已完成',
};
interface SS { di: number; sh: number; eh: number; }

function ApprovalMiniTimeline({ reservation }: { reservation: Reservation }) {
  const trail = reservation.approvalTrail || [];
  if (trail.length === 0) return null;

  const statusColor = (s: string) => {
    switch (s) {
      case 'approved': return { dot: 'bg-emerald-500', ring: 'ring-emerald-200', text: 'text-emerald-700' };
      case 'rejected': return { dot: 'bg-rose-500', ring: 'ring-rose-200', text: 'text-rose-700' };
      case 'timeout': return { dot: 'bg-orange-500', ring: 'ring-orange-200', text: 'text-orange-700' };
      case 'escalated': return { dot: 'bg-amber-500', ring: 'ring-amber-200', text: 'text-amber-700' };
      case 'pending': return { dot: 'bg-blue-500', ring: 'ring-blue-200', text: 'text-blue-700' };
      default: return { dot: 'bg-slate-400', ring: 'ring-slate-200', text: 'text-slate-500' };
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'approved': return '已通过';
      case 'rejected': return '已驳回';
      case 'timeout': return '超时裁决';
      case 'escalated': return '已升级';
      case 'pending': return '待审批';
      default: return s;
    }
  };

  const roleLabel = (r: string) => {
    switch (r) {
      case 'advisor': return '指导教师';
      case 'department_head': return '系主任';
      case 'auto': return '系统自动';
      default: return r;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 mb-2">
        <CheckCircle className="w-4 h-4 text-indigo-600" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">审批进度</span>
      </div>
      <div className="relative pl-2">
        {trail.map((node, i) => {
          const c = statusColor(node.status);
          const isLast = i === trail.length - 1;
          return (
            <div key={node.id} className="relative pb-3 last:pb-0">
              {!isLast && (
                <div className="absolute left-[7px] top-5 bottom-0 w-px bg-slate-200" />
              )}
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-4 h-4 rounded-full ring-2 ring-offset-2 flex-shrink-0 mt-0.5',
                  c.dot, c.ring
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-xs font-semibold', c.text)}>
                      {statusLabel(node.status)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                      {roleLabel(node.role)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {node.approverName}
                    </span>
                  </div>
                  {node.comment && (
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                      {node.comment}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {fmtDT2(node.status === 'pending' ? node.createdAt : (node.handledAt || node.createdAt))}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReservationCard({
  reservation,
  index,
  onClick,
}: {
  reservation: Reservation;
  index?: number;
  onClick: () => void;
}) {
  const c = (s: string) => {
    switch (s) {
      case 'approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'rejected': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'cancelled': return 'bg-slate-100 text-slate-500 border-slate-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };
  const l = (s: string) => {
    switch (s) {
      case 'approved': return '已通过';
      case 'rejected': return '已驳回';
      case 'pending': return '待审批';
      case 'cancelled': return '已取消';
      default: return s;
    }
  };

  return (
    <div
      className="p-3 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {typeof index === 'number' && (
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {index}
              </span>
            )}
            <p className="text-sm font-bold text-slate-800 truncate">{reservation.projectName}</p>
          </div>
          <div className="ml-0 space-y-1">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <User className="w-3 h-3" />
              <span>申请人：{reservation.userName}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <User className="w-3 h-3 text-purple-500" />
              <span>导师：{reservation.advisorName}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <Clock className="w-3 h-3" />
              <span>{fmtTime(reservation.startTime)} - {fmtTime(reservation.endTime)}</span>
            </div>
          </div>
        </div>
        <span className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0',
          c(reservation.status)
        )}>
          {l(reservation.status)}
        </span>
      </div>
      {reservation.approvalTrail && reservation.approvalTrail.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1">
            {reservation.approvalTrail.slice(0, 4).map((n, i) => (
              <div
                key={n.id}
                className={cn(
                  'w-5 h-5 rounded-full border-2 -ml-1 first:ml-0 bg-white flex items-center justify-center',
                  n.status === 'approved' ? 'border-emerald-500 text-emerald-500' :
                  n.status === 'rejected' ? 'border-rose-500 text-rose-500' :
                  n.status === 'pending' ? 'border-blue-500 text-blue-500' :
                  'border-slate-400 text-slate-400'
                )}
              >
                {n.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                {n.status === 'rejected' && <XCircle className="w-3 h-3" />}
                {n.status === 'pending' && <Clock className="w-3 h-3" />}
                {n.status === 'escalated' && <AlertTriangle className="w-3 h-3" />}
              </div>
            ))}
            <span className="text-[10px] text-slate-400 ml-2">
              共 {reservation.approvalTrail.length} 级审批
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function OccupancyPopover({
  block,
  benchName,
  onClose,
  onGoReservation,
}: {
  block: OccupancyBlock;
  benchName: string;
  onClose: () => void;
  onGoReservation: (id: string) => void;
}) {
  const primary = block.reservations?.[0] as Reservation | undefined;
  const merged = !!block.mergedFrom && block.mergedFrom.length > 0;
  const multi = (block.reservations?.length || 0) > 1;
  const status = block.status;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold truncate">
                  {multi ? '合并预约占用' : primary?.projectName || '预约占用'}
                </h3>
                {merged && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-bold backdrop-blur-sm">
                    <Sparkles className="w-3 h-3" />
                    合并占用
                  </span>
                )}
              </div>
              <p className="text-xs text-white/70 mt-1">占用编号 {block.id.slice(0, 12)}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-xl border border-slate-100">
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">占用时段</span>
            </div>
            <p className="text-base font-bold text-slate-800">{fmtSlot(block.startTime, block.endTime)}</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1.5 text-xs">
                <FlaskConical className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-slate-600">{benchName}</span>
              </div>
              <span className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border',
                SGT[status]
              )}>
                {SGL[status]}
              </span>
            </div>
          </div>

          {!multi && primary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">申请人</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{primary.userName}</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <User className="w-3.5 h-3.5 text-purple-600" />
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">导师</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{primary.advisorName}</p>
                </div>
              </div>

              {primary.description && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">实验描述</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{primary.description}</p>
                </div>
              )}

              <div className="p-4 bg-gradient-to-br from-indigo-50/50 to-blue-50/30 rounded-xl border border-indigo-100">
                <ApprovalMiniTimeline reservation={primary} />
              </div>
            </div>
          )}

          {multi && block.reservations && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-bold text-slate-700">
                  包含 {block.reservations.length} 个连续预约
                </p>
              </div>
              <div className="space-y-2">
                {block.reservations.map((r, idx) => (
                  <ReservationCard
                    key={r.id}
                    reservation={r}
                    index={idx + 1}
                    onClick={() => onGoReservation(r.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-3 flex-shrink-0">
          {primary && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onGoReservation(primary.id)}
            >
              查看预约详情
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={onClose}>关闭</Button>
        </div>
      </div>
    </div>
  );
}

export default function BenchDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { benches, scheduleCache, loadSchedule } = useAppStore();
  const [bench, setBench] = useState<LabBench | null>(null);
  const [wb, setWb] = useState<Date>(() => getMon(new Date()));
  const [sel, setSel] = useState<SS | null>(null);
  const [ing, setIng] = useState<{ di: number; sh: number } | null>(null);
  const [popBlock, setPopBlock] = useState<OccupancyBlock | null>(null);

  const wDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => { const d = new Date(wb); d.setDate(d.getDate() + i); return d; }), [wb]);
  const weekStart = useMemo(() => wb.toISOString(), [wb]);
  const weekEnd = useMemo(() => getSun(wb).toISOString(), [wb]);
  const cacheKey = id ? `${id}_${weekStart}` : '';
  const occ = useMemo(() => (cacheKey ? scheduleCache[cacheKey] : []) || [], [scheduleCache, cacheKey]);

  useEffect(() => {
    if (!id) return;
    api.getBench(id).then((r) => r.success && r.data && setBench(r.data));
    const ex = benches.find((b) => b.id === id);
    if (!bench && ex) setBench(ex);
    loadSchedule(id, weekStart, weekEnd);
  }, [id, wb, weekStart, weekEnd]);

  const md = (di: number, h: number) => { setIng({ di, sh: h }); setSel({ di, sh: h, eh: h + 1 }); };
  const me = (di: number, h: number) => {
    if (!ing || ing.di !== di) return;
    const s = Math.min(ing.sh, h), e = Math.max(ing.sh, h) + 1;
    setSel({ di, sh: s, eh: e });
  };
  const mu = () => setIng(null);

  const bD = (d: Date) => occ.filter((b) => sD(b.startTime, d));
  const isB = (di: number, h: number) => bD(wDays[di]).some((b) => {
    const s = pT(b.startTime), e = pT(b.endTime);
    return h + 1 > s && h < e && b.status !== 'cancelled';
  });

  const prev = () => { const d = new Date(wb); d.setDate(d.getDate() - 7); setWb(d); setSel(null); };
  const next = () => { const d = new Date(wb); d.setDate(d.getDate() + 7); setWb(d); setSel(null); };

  const cr = () => {
    if (!sel || !id) return;
    const d = wDays[sel.di];
    const s = new Date(d); s.setHours(sel.sh, 0, 0, 0);
    const e = new Date(d); e.setHours(sel.eh, 0, 0, 0);
    const q = new URLSearchParams({ benchId: id, start: fmtDT(s), end: fmtDT(e) });
    nav(`/reservations/new?${q.toString()}`);
  };

  const onBlockClick = (e: React.MouseEvent, blk: OccupancyBlock) => {
    e.stopPropagation();
    setPopBlock(blk);
  };
  const onGoReservation = (rid: string) => {
    setPopBlock(null);
    nav(`/reservations/${rid}`);
  };

  if (!bench) return (
    <div className="flex h-full items-center justify-center py-20 text-slate-500">
      <AlertCircle className="w-5 h-5 mr-2" /> 加载中...
    </div>
  );

  return (
    <div className="grid grid-cols-12 gap-6" onMouseUp={mu}>
      <Card className="col-span-12 lg:col-span-4 p-0 overflow-hidden">
        <div className="h-48 bg-gradient-to-br from-blue-500 to-indigo-600 relative">
          {bench.imageUrl && <img src={bench.imageUrl} alt={bench.name} className="w-full h-full object-cover" />}
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{bench.name}</h2>
              <p className="text-sm text-slate-500">{bench.code}</p>
            </div>
            <StatusBadge status={bench.status} />
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center text-slate-600"><Calendar className="w-4 h-4 mr-2 text-slate-400" />分类：<span className="ml-1 font-medium text-slate-800">{bench.category}</span></div>
            <div className="flex items-center text-slate-600"><MapPin className="w-4 h-4 mr-2 text-slate-400" />位置：<span className="ml-1 font-medium text-slate-800">{bench.building} {bench.room} ({bench.location})</span></div>
            <div className="flex items-center text-slate-600"><Users className="w-4 h-4 mr-2 text-slate-400" />容量：<span className="ml-1 font-medium text-slate-800">{bench.capacity} 人</span></div>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-700 mb-2">设备清单</div>
            <div className="flex flex-wrap gap-1.5">
              {bench.equipment.map((eq) => (
                <span key={eq} className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs">{eq}</span>
              ))}
            </div>
          </div>
          {bench.description && (
            <div>
              <div className="text-sm font-medium text-slate-700 mb-2">实验台描述</div>
              <p className="text-sm text-slate-600 leading-relaxed">{bench.description}</p>
            </div>
          )}
        </div>
      </Card>

      <Card className="col-span-12 lg:col-span-8 p-0 overflow-hidden">
        <Card.Header>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-slate-900">排期日历</h3>
              <p className="text-xs text-slate-500">{fmt(wDays[0])} ~ {fmt(wDays[6])}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={<ChevronLeft className="w-4 h-4" />} onClick={prev}>上一周</Button>
            <Button variant="ghost" size="sm" onClick={() => { setWb(getMon(new Date())); setSel(null); }}>本周</Button>
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
                  <div className={cn('text-sm font-semibold mt-0.5', d.toDateString() === new Date().toDateString() ? 'text-blue-600' : 'text-slate-800')}>{fmt(d)}</div>
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
                <div key={di} className="relative border-l border-slate-100">
                  {Array.from({ length: HN }, (_, hi) => {
                    const h = HS + hi, bk = isB(di, h);
                    const is = sel && sel.di === di && h >= sel.sh && h < sel.eh;
                    return (
                      <div key={hi} className={cn(
                        'h-12 border-b border-slate-50 transition-colors',
                        !bk && 'cursor-pointer hover:bg-blue-50/50',
                        is && 'bg-blue-500/15',
                        bk && 'cursor-not-allowed',
                      )}
                        onMouseDown={() => !bk && md(di, h)}
                        onMouseEnter={() => !bk && me(di, h)} />
                    );
                  })}
                  {bD(day).map((blk) => {
                    const top = (pT(blk.startTime) - HS) * 48;
                    const ht = (pT(blk.endTime) - pT(blk.startTime)) * 48;
                    const mg = !!blk.mergedFrom && blk.mergedFrom.length > 0;
                    return (
                      <div
                        key={blk.id}
                        className={cn(
                          'absolute left-1 right-1 rounded-lg px-2 py-1 text-xs overflow-hidden shadow-sm bg-gradient-to-br cursor-pointer transition-all hover:shadow-md hover:scale-[1.01]',
                          SG[blk.status] || SG.confirmed,
                          mg && 'ring-2 ring-amber-400 ring-offset-1',
                        )}
                        style={{ top, height: ht }}
                        onClick={(e) => onBlockClick(e, blk)}
                      >
                        {mg && <span className="absolute top-0.5 right-1 flex items-center gap-0.5 text-[10px] font-bold"><Sparkles className="w-3 h-3" />合并</span>}
                        <div className="font-semibold truncate">
                          {fmtTime(blk.startTime)} ~ {fmtTime(blk.endTime)}
                        </div>
                        <div className="text-[11px] opacity-90 truncate mt-0.5">
                          {blk.reservations?.[0]?.projectName || SGL[blk.status] || '占用中'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        {sel && (
          <Card.Footer className="flex items-center justify-between bg-blue-50/50">
            <div className="text-sm text-slate-700">
              <span className="font-semibold text-blue-700">{WD[sel.di]} {fmt(wDays[sel.di])}</span>
              <span className="mx-2 text-slate-400">·</span>
              <span>{String(sel.sh).padStart(2, '0')}:00 ~ {String(sel.eh).padStart(2, '0')}:00</span>
              <span className="ml-3 text-slate-500">共 {(sel.eh - sel.sh)} 小时</span>
            </div>
            <Button size="sm" onClick={cr}>新建预约</Button>
          </Card.Footer>
        )}
      </Card>

      {popBlock && (
        <OccupancyPopover
          block={popBlock}
          benchName={bench.name}
          onClose={() => setPopBlock(null)}
          onGoReservation={onGoReservation}
        />
      )}
    </div>
  );
}
