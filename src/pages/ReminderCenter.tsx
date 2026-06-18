import { useEffect, useMemo, useState } from 'react';
import { Bell, TrendingUp, Zap, ShieldAlert, User, Activity, BarChart3, AlertTriangle, Search, ChevronDown, Timer, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { cn } from '../lib/utils';
import type { ReminderRecord, ApprovalNode } from '../../shared/types';

type TabKey = 'list' | 'board';
type FilterType = 'all' | 'reminder' | 'escalation' | 'auto_decision';

const typeIcon: Record<string, React.ReactNode> = { reminder: <Bell className="w-4 h-4" />, escalation: <TrendingUp className="w-4 h-4" />, auto_decision: <Zap className="w-4 h-4" /> };
const typeBadge: Record<string, { l: string; c: string; b: string }> = { reminder: { l: '催办', c: 'text-amber-700', b: 'bg-amber-100 border-amber-200' }, escalation: { l: '升级', c: 'text-purple-700', b: 'bg-purple-100 border-purple-200' }, auto_decision: { l: '自动裁决', c: 'text-sky-700', b: 'bg-sky-100 border-sky-200' } };
const levelColors: Record<number, string> = { 1: 'bg-emerald-500', 2: 'bg-blue-500', 3: 'bg-amber-500', 4: 'bg-orange-500', 5: 'bg-rose-500' };
const filterOpts: { k: FilterType; l: string }[] = [{ k: 'all', l: '全部类型' }, { k: 'reminder', l: '催办' }, { k: 'escalation', l: '升级' }, { k: 'auto_decision', l: '自动裁决' }];
const tabs: { k: TabKey; l: string; i: React.ReactNode }[] = [{ k: 'list', l: '催办列表', i: <Activity className="w-4 h-4" /> }, { k: 'board', l: '超时看板', i: <BarChart3 className="w-4 h-4" /> }];

const fmt = (s: string) => { const d = new Date(s); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

function StatCard({ t, v, g, i, u }: { t: string; v: number; g: string; i: React.ReactNode; u?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl p-5 text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-1', g)}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3"><div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">{i}</div></div>
        <p className="text-white/80 text-xs font-medium mb-1">{t}</p>
        <div className="flex items-baseline gap-1"><span className="text-2xl font-bold tracking-tight">{v}</span>{u && <span className="text-white/70 text-xs">{u}</span>}</div>
      </div>
    </div>
  );
}

function ReminderItem({ r }: { r: ReminderRecord }) {
  const b = typeBadge[r.type] ?? typeBadge.reminder;
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200 transition-all">
      <div className={cn('p-2.5 rounded-xl border flex-shrink-0', b.b, b.c)}>{typeIcon[r.type] ?? <Bell className="w-4 h-4" />}</div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border', b.b, b.c)}>{b.l}</div>
          <div className={cn('w-2 h-2 rounded-full', levelColors[r.level] ?? 'bg-slate-400')} /><span className="text-xs text-slate-400">L{r.level}</span>
          <span className="text-xs text-slate-400 ml-auto">{fmt(r.sentAt)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /><span className="text-slate-700 font-medium">接收人：{r.recipientName}</span>
          {r.responsibleParty && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold border border-indigo-100 ml-auto"><ShieldAlert className="w-3 h-3" />责任人：{r.responsibleParty}</span>}
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">{r.message}</p>
      </div>
    </div>
  );
}

function BarChart({ data }: { data: { level: number; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 h-48 px-2">
        {data.map((d) => {
          const h = (d.count / max) * 100;
          return (
            <div key={d.level} className="flex-1 flex flex-col items-center gap-2 group">
              <div className="text-xs font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">{d.count}</div>
              <div className={cn('w-full rounded-t-xl transition-all duration-500 relative overflow-hidden', levelColors[d.level] ?? 'bg-slate-400')} style={{ height: `${Math.max(h, 4)}%` }}><div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between gap-3 px-2">{['L1', 'L2', 'L3', 'L4', 'L5'].map((l, i) => <div key={l} className="flex-1 text-center"><span className="text-xs font-semibold text-slate-500">{l}</span><span className="text-xs text-slate-400 ml-1 block">{data[i]?.count ?? 0}条</span></div>)}</div>
    </div>
  );
}

function RankCard({ it, idx }: { it: { name: string; count: number; rate: number }; idx: number }) {
  const mc = ['from-amber-400 to-yellow-500', 'from-slate-300 to-slate-400', 'from-orange-400 to-amber-600'];
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-white hover:shadow-md hover:border-slate-200 transition-all">
      <div className={cn('w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md', idx < 3 ? `bg-gradient-to-br ${mc[idx]}` : 'bg-gradient-to-br from-slate-400 to-slate-500')}>{idx < 3 ? idx + 1 : <User className="w-5 h-5" />}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2"><p className="font-bold text-slate-800 truncate">{it.name}</p>{idx < 3 && <span className="text-xs text-slate-400">#{idx + 1}</span>}</div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className={cn('h-full rounded-full transition-all duration-700', it.rate >= 80 ? 'bg-emerald-500' : it.rate >= 60 ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: `${it.rate}%` }} /></div>
          <span className="text-xs font-semibold text-slate-600 w-10 text-right">{it.rate}%</span>
        </div>
      </div>
      <div className="text-right flex-shrink-0"><p className="text-lg font-bold text-slate-800">{it.count}</p><p className="text-xs text-slate-400">次超时</p></div>
    </div>
  );
}

function WarningLight({ it }: { it: { node: ApprovalNode; hours: number } }) {
  const u = it.hours < 6;
  const r = (it.node as ApprovalNode & { reservation?: { benchName?: string; userName?: string; projectName?: string } }).reservation;
  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-xl border transition-all', u ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200')}>
      <div className={cn('relative p-2 rounded-xl flex-shrink-0', u ? 'bg-rose-100' : 'bg-amber-100')}>
        <AlertTriangle className={cn('w-5 h-5', u ? 'text-rose-600' : 'text-amber-600')} />
        <span className={cn('absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full animate-ping', u ? 'bg-rose-500' : 'bg-amber-500')} />
        <span className={cn('absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full', u ? 'bg-rose-500' : 'bg-amber-500')} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2"><p className="text-sm font-semibold text-slate-800 truncate">{r?.userName ?? it.node.approverName}</p><span className="text-xs text-slate-500 truncate">· {r?.projectName ?? '审批节点'}</span></div>
        <p className="text-xs text-slate-500 mt-0.5 truncate">实验台：{r?.benchName ?? '—'} · 审批人：{it.node.approverName}</p>
      </div>
      <div className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0', u ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')}><Timer className="w-3 h-3" />{it.hours < 1 ? `${Math.ceil(it.hours * 60)}分` : `${it.hours.toFixed(1)}时`}</div>
    </div>
  );
}

export default function ReminderCenter() {
  const [tab, setTab] = useState<TabKey>('list');
  const [ft, setFt] = useState<FilterType>('all');
  const [sr, setSr] = useState('');
  const [fo, setFo] = useState(false);
  const { reminders, pendingApprovals, loadReminders, loadPendingApprovals } = useAppStore();
  useEffect(() => { loadReminders(); loadPendingApprovals(); }, [loadReminders, loadPendingApprovals]);

  const stats = useMemo(() => ({ total: reminders.length, esc: reminders.filter((r) => r.type === 'escalation').length, auto: reminders.filter((r) => r.type === 'auto_decision').length, parties: new Set(reminders.map((r) => r.responsibleParty).filter(Boolean) as string[]).size }), [reminders]);
  const filtered = useMemo(() => reminders.filter((r) => (ft === 'all' || r.type === ft) && (!sr || r.recipientName.toLowerCase().includes(sr.toLowerCase()))).sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()), [reminders, ft, sr]);
  const ld = useMemo(() => [1, 2, 3, 4, 5].map((level) => ({ level, count: reminders.filter((r) => r.level === level).length })), [reminders]);
  const rl = useMemo(() => { const m = new Map<string, number>(); reminders.forEach((r) => { if (r.responsibleParty) m.set(r.responsibleParty, (m.get(r.responsibleParty) ?? 0) + 1); }); const a = Array.from(m.entries()).map(([name, count]) => ({ name, count, rate: Math.min(99, Math.max(40, 100 - count * 8)) })); a.sort((x, y) => y.count - x.count); return a.slice(0, 6); }, [reminders]);
  const ws = useMemo(() => { const n = Date.now(); return pendingApprovals.map((node) => ({ node, hours: (new Date(node.deadline).getTime() - n) / 36e5 })).filter((w) => w.hours < 24 && w.hours > -24).sort((a, b) => a.hours - b.hours).slice(0, 8); }, [pendingApprovals]);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-800">催办记录</h1><p className="text-slate-500 mt-1">跟踪审批催办、升级与自动裁决记录，监控超时风险</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard t="催办总数" v={stats.total} g="bg-gradient-to-br from-blue-600 to-blue-400" i={<Bell className="w-5 h-5" />} u="条" />
        <StatCard t="升级数" v={stats.esc} g="bg-gradient-to-br from-purple-600 to-purple-400" i={<TrendingUp className="w-5 h-5" />} u="次" />
        <StatCard t="自动裁决数" v={stats.auto} g="bg-gradient-to-br from-sky-600 to-cyan-400" i={<Zap className="w-5 h-5" />} u="次" />
        <StatCard t="涉及责任人" v={stats.parties} g="bg-gradient-to-br from-emerald-600 to-teal-400" i={<ShieldAlert className="w-5 h-5" />} u="人" />
      </div>
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-1">
            {tabs.map((t) => <button key={t.k} onClick={() => setTab(t.k)} className={cn('inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all', tab === t.k ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700')}>{t.i}{t.l}</button>)}
          </div>
          {tab === 'list' && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <button onClick={() => setFo(!fo)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">{filterOpts.find((o) => o.k === ft)?.l}<ChevronDown className={cn('w-4 h-4 transition-transform', fo && 'rotate-180')} /></button>
                {fo && <div className="absolute top-full left-0 mt-1.5 w-36 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-20">{filterOpts.map((o) => <button key={o.k} onClick={() => { setFt(o.k); setFo(false); }} className={cn('w-full px-3.5 py-2.5 text-left text-sm transition-colors', ft === o.k ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-700 hover:bg-slate-50')}>{o.l}</button>)}</div>}
              </div>
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={sr} onChange={(e) => setSr(e.target.value)} placeholder="搜索责任人..." className="pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 w-44 transition-all" /></div>
            </div>
          )}
        </div>
        <div className="p-5">
          {tab === 'list' ? (filtered.length === 0 ? <div className="py-16 text-center"><div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center"><Bell className="w-8 h-8 text-slate-400" /></div><p className="text-slate-500 text-sm">暂无催办记录</p></div> : <div className="space-y-3">{filtered.map((r) => <ReminderItem key={r.id} r={r} />)}</div>) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-800 flex items-center gap-2"><BarChart3 className="w-4.5 h-4.5 text-blue-600" />时效分析</h3><p className="text-xs text-slate-500 mt-0.5">各级别超时数量统计</p></div><span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">共 {ld.reduce((s, d) => s + d.count, 0)} 条</span></div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><BarChart data={ld} /></div>
              </div>
              <div className="space-y-4">
                <div><h3 className="font-bold text-slate-800 flex items-center gap-2"><ShieldAlert className="w-4.5 h-4.5 text-purple-600" />责任人排名</h3><p className="text-xs text-slate-500 mt-0.5">按超时次数排序</p></div>
                {rl.length === 0 ? <div className="py-12 text-center"><CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" /><p className="text-slate-500 text-sm">暂无责任人超时记录</p></div> : <div className="space-y-2.5">{rl.map((it, idx) => <RankCard key={it.name} it={it} idx={idx} />)}</div>}
              </div>
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-800 flex items-center gap-2"><AlertTriangle className="w-4.5 h-4.5 text-amber-500" />预警指示灯</h3><p className="text-xs text-slate-500 mt-0.5">当前即将超时的审批节点（24小时内）</p></div><span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">{ws.length} 个节点</span></div>
                {ws.length === 0 ? <div className="py-12 text-center p-8 bg-emerald-50 rounded-2xl border border-emerald-100"><CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" /><p className="text-emerald-700 font-semibold">全部正常</p><p className="text-emerald-600 text-sm mt-1">暂无即将超时的审批节点</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{ws.map((w) => <WarningLight key={w.node.id} it={w} />)}</div>}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
