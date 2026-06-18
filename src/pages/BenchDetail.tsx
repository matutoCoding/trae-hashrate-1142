import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, MapPin, Users, ChevronLeft, ChevronRight,
  Sparkles, AlertCircle,
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../store/useAppStore';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import type { LabBench, OccupancyBlock } from '../../shared/types';

const HS = 8, HE = 22, HN = HE - HS;
const WD = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const getMon = (d: Date) => {
  const x = new Date(d); const dy = x.getDay();
  x.setDate(x.getDate() + (dy === 0 ? -6 : 1 - dy));
  x.setHours(0, 0, 0, 0); return x;
};
const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
const fmtDT = (d: Date) => d.toISOString().slice(0, 16);
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
interface SS { di: number; sh: number; eh: number; }

export default function BenchDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { benches, scheduleCache, loadSchedule } = useAppStore();
  const [bench, setBench] = useState<LabBench | null>(null);
  const [wb, setWb] = useState<Date>(() => getMon(new Date()));
  const [sel, setSel] = useState<SS | null>(null);
  const [ing, setIng] = useState<{ di: number; sh: number } | null>(null);

  const wDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => { const d = new Date(wb); d.setDate(d.getDate() + i); return d; }), [wb]);
  const occ = (id ? scheduleCache[id] : []) || [];

  useEffect(() => {
    if (!id) return;
    api.getBench(id).then((r) => r.success && r.data && setBench(r.data));
    const ex = benches.find((b) => b.id === id);
    if (!bench && ex) setBench(ex);
    loadSchedule(id);
  }, [id]);

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
                      <div key={blk.id} className={cn(
                        'absolute left-1 right-1 rounded-lg px-2 py-1 text-xs overflow-hidden shadow-sm bg-gradient-to-br',
                        SG[blk.status] || SG.confirmed,
                        mg && 'ring-2 ring-amber-400 ring-offset-1',
                      )} style={{ top, height: ht }}>
                        {mg && <span className="absolute top-0.5 right-1 flex items-center gap-0.5 text-[10px] font-bold"><Sparkles className="w-3 h-3" />合并</span>}
                        <div className="font-semibold truncate">
                          {new Date(blk.startTime).toTimeString().slice(0, 5)} ~ {new Date(blk.endTime).toTimeString().slice(0, 5)}
                        </div>
                        <div className="text-[11px] opacity-90 truncate mt-0.5">
                          {blk.status === 'pending' && '待审批'}
                          {blk.status === 'confirmed' && '已确认'}
                          {blk.status === 'cancelled' && '已取消'}
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
    </div>
  );
}
