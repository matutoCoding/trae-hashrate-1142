import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar, Clock, FileText, CheckCircle, ChevronRight, ChevronLeft,
  AlertCircle, Sparkles, Search, X, User, Users, MapPin,
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../store/useAppStore';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import type { User as UserType, OccupancyBlock } from '../../shared/types';

const STEPS = [
  { id: 1, label: '选择实验台', icon: Calendar },
  { id: 2, label: '选择时段', icon: Clock },
  { id: 3, label: '填写信息', icon: FileText },
  { id: 4, label: '确认提交', icon: CheckCircle },
];
const TIME_OPTS = Array.from({ length: 15 }, (_, i) => String(8 + i).padStart(2, '0') + ':00').concat(['22:00']);
const CATS = ['全部', '化学', '生物', '物理', '计算机', '材料'];
interface FD {
  benchId: string; date: string; startTime: string; endTime: string;
  projectName: string; description: string; advisorId: string;
  advisorName: string; participants: string[];
}
const isoD = (s: string) => new Date(s).toISOString().slice(0, 10);
const isoT = (s: string) => String(new Date(s).getHours()).padStart(2, '0') + ':00';
const ms = (d: string, t: string) => new Date(d + 'T' + t).getTime();

function conflict(bid: string, d: string, s: string, e: string, c: Record<string, OccupancyBlock[]>) {
  return (c[bid] || []).some((b) => b.status !== 'cancelled' && isoD(b.startTime) === d
    && ms(d, s) < new Date(b.endTime).getTime() && ms(d, e) > new Date(b.startTime).getTime());
}
function merge(bid: string, d: string, s: string, e: string, c: Record<string, OccupancyBlock[]>) {
  return (c[bid] || []).some((b) => {
    if (b.status === 'cancelled' || isoD(b.startTime) !== d) return false;
    const g = 60 * 1000, bs = new Date(b.startTime).getTime(), be = new Date(b.endTime).getTime();
    return Math.abs(ms(d, s) - be) <= g || Math.abs(ms(d, e) - bs) <= g;
  });
}
const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm';
const selCls = inputCls + ' bg-white';

export default function NewReservation() {
  const nav = useNavigate();
  const [p] = useSearchParams();
  const { benches, scheduleCache, loadBenches, loadSchedule } = useAppStore();
  const [step, setStep] = useState(1);
  const [kw, setKw] = useState('');
  const [cat, setCat] = useState('全部');
  const [advs, setAdvs] = useState<UserType[]>([]);
  const [pi, setPi] = useState('');
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<{ merged: boolean; ok: boolean } | null>(null);
  const ds = p.get('start');

  const [f, setF] = useState<FD>({
    benchId: p.get('benchId') || '',
    date: ds ? isoD(ds) : new Date().toISOString().slice(0, 10),
    startTime: ds ? isoT(ds) : '09:00',
    endTime: p.get('end') ? isoT(p.get('end')!) : '11:00',
    projectName: '', description: '', advisorId: '', advisorName: '', participants: [],
  });

  useEffect(() => {
    loadBenches();
    api.getAdvisors().then((r) => r.success && r.data && setAdvs(r.data));
  }, []);
  useEffect(() => { f.benchId && loadSchedule(f.benchId); }, [f.benchId]);

  const list = useMemo(() => benches.filter((b) => b.status === 'available'
    && (cat === '全部' || b.category === cat)
    && (!kw || (b.name + b.code).toLowerCase().includes(kw.toLowerCase()))
  ), [benches, cat, kw]);

  const b = benches.find((x) => x.id === f.benchId) || null;
  const hasC = useMemo(() => conflict(f.benchId, f.date, f.startTime, f.endTime, scheduleCache), [f, scheduleCache]);
  const hasM = useMemo(() => merge(f.benchId, f.date, f.startTime, f.endTime, scheduleCache), [f, scheduleCache]);

  const can = step === 1 ? !!f.benchId
    : step === 2 ? !hasC
    : step === 3 ? f.projectName.trim() && f.description.trim() && !!f.advisorId
    : true;

  const addP = () => {
    const v = pi.trim();
    if (v && !f.participants.includes(v)) {
      setF({ ...f, participants: [...f.participants, v] });
      setPi('');
    }
  };

  const submit = async () => {
    setLoading(true);
    try {
      const r = await api.createReservation({
        benchId: f.benchId, advisorId: f.advisorId, advisorName: f.advisorName,
        projectName: f.projectName, description: f.description, participants: f.participants,
        startTime: new Date(f.date + 'T' + f.startTime).toISOString(),
        endTime: new Date(f.date + 'T' + f.endTime).toISOString(),
      });
      if (r.success && r.data) {
        setRes({ merged: r.data.merged, ok: true });
        setTimeout(() => nav('/reservations'), 2500);
      } else setRes({ merged: false, ok: false });
    } catch { setRes({ merged: false, ok: false }); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">新建实验预约</h2>
        <div className="flex items-center justify-center mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon, done = step > s.id, active = step === s.id;
            return (
              <div key={s.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center transition-all',
                    done && 'bg-emerald-500 text-white',
                    active && 'bg-blue-600 text-white shadow-lg shadow-blue-200',
                    !done && !active && 'bg-slate-100 text-slate-400')}>
                    {done ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <div className={cn('text-xs mt-2 font-medium',
                    active ? 'text-blue-600' : done ? 'text-emerald-600' : 'text-slate-400')}>{s.label}</div>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn('w-16 md:w-24 h-0.5 mx-3 mb-6', done ? 'bg-emerald-500' : 'bg-slate-200')} />
                )}
              </div>
            );
          })}
        </div>

        <div className="min-h-[400px]">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input value={kw} onChange={(e) => setKw(e.target.value)}
                    placeholder="搜索实验台名称 / 编号" className={inputCls + ' pl-10'} />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {CATS.map((c) => (
                    <button key={c} onClick={() => setCat(c)} className={cn(
                      'px-3 py-2 rounded-xl text-sm font-medium transition-all',
                      cat === c ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>{c}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                {list.map((x) => {
                  const sel = f.benchId === x.id;
                  return (
                    <Card key={x.id} hoverable onClick={() => setF({ ...f, benchId: x.id })}
                      className={cn('p-4 cursor-pointer', sel && 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50/40')}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-slate-900">{x.name}</h4>
                          <p className="text-xs text-slate-500">{x.code}</p>
                        </div>
                        <StatusBadge status={x.status} size="sm" />
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />{x.category}</div>
                        <div className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400" />{x.building} {x.room}</div>
                        <div className="flex items-center"><Users className="w-3.5 h-3.5 mr-1.5 text-slate-400" />{x.capacity} 人</div>
                      </div>
                    </Card>
                  );
                })}
                {!list.length && (
                  <div className="col-span-full text-center py-12 text-slate-400">
                    <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>暂无符合条件的实验台</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Card className="p-5 space-y-5">
                <div className="flex items-center gap-3 text-sm text-slate-600 p-3 bg-slate-50 rounded-xl">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-800">{b?.name}</span>
                  <span className="text-slate-400">·</span><span>{b?.building} {b?.room}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">预约日期</label>
                  <input type="date" value={f.date} min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setF({ ...f, date: e.target.value })} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">开始时间</label>
                    <select value={f.startTime} onChange={(e) => setF({ ...f, startTime: e.target.value })} className={selCls}>
                      {TIME_OPTS.slice(0, -1).map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">结束时间</label>
                    <select value={f.endTime} onChange={(e) => setF({ ...f, endTime: e.target.value })} className={selCls}>
                      {TIME_OPTS.filter((t) => t > f.startTime).map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                {hasC && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div><p className="font-semibold">时段冲突</p><p className="text-rose-600 text-xs mt-0.5">该时段已有预约</p></div>
                  </div>
                )}
                {!hasC && hasM && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                    <Sparkles className="w-5 h-5 shrink-0 mt-0.5" />
                    <div><p className="font-semibold">相邻时段将自动合并</p><p className="text-amber-700 text-xs mt-0.5">提交后将合并为一个占用块</p></div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {step === 3 && (
            <div className="max-w-2xl mx-auto space-y-5">
              <Card className="p-5 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">项目名称 <span className="text-rose-500">*</span></label>
                  <input value={f.projectName} onChange={(e) => setF({ ...f, projectName: e.target.value })}
                    placeholder="请输入实验项目名称" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">项目描述 <span className="text-rose-500">*</span></label>
                  <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })}
                    placeholder="请详细描述实验内容" rows={4} className={inputCls + ' resize-none'} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">指导教师 <span className="text-rose-500">*</span></label>
                  <select value={f.advisorId} onChange={(e) => {
                    const a = advs.find((x) => x.id === e.target.value);
                    setF({ ...f, advisorId: e.target.value, advisorName: a?.name || '' });
                  }} className={selCls}>
                    <option value="">请选择指导教师</option>
                    {advs.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.department || '-'})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">参与人员</label>
                  <div className="flex gap-2 mb-2">
                    <input value={pi} onChange={(e) => setPi(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addP())}
                      placeholder="输入姓名后回车添加" className={inputCls + ' flex-1'} />
                    <Button variant="secondary" onClick={addP}>添加</Button>
                  </div>
                  {f.participants.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {f.participants.map((pp) => (
                        <span key={pp} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm border border-blue-200">
                          <User className="w-3.5 h-3.5" />{pp}
                          <button onClick={() => setF({ ...f, participants: f.participants.filter((x) => x !== pp) })} className="hover:text-rose-500 ml-1">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {step === 4 && (
            res ? (
              <div className="max-w-lg mx-auto text-center py-10">
                <div className={cn('w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center',
                  res.ok ? 'bg-emerald-100' : 'bg-rose-100')}>
                  {res.ok ? <CheckCircle className="w-10 h-10 text-emerald-600" />
                    : <AlertCircle className="w-10 h-10 text-rose-600" />}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{res.ok ? '预约提交成功！' : '提交失败'}</h3>
                <p className="text-slate-600 mb-4">
                  {res.ok ? (res.merged
                    ? <span className="inline-flex items-center gap-1.5 text-amber-600 font-medium">
                      <Sparkles className="w-4 h-4" /> 检测到相邻时段，已自动合并为一个占用块</span>
                    : '正在等待指导教师审批，即将跳转...') : '请稍后重试'}
                </p>
                {res.ok ? <p className="text-sm text-slate-400">2秒后自动跳转</p>
                  : <Button variant="outline" onClick={() => setRes(null)}>返回修改</Button>}
              </div>
            ) : (
              <div className="max-w-2xl mx-auto">
                <Card className="p-6">
                  <h3 className="font-bold text-lg text-slate-900 mb-5 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" /> 预约信息确认
                  </h3>
                  {[
                    ['实验台', `${b?.name} (${b?.code})`], ['位置', `${b?.building} ${b?.room}`],
                    ['日期', f.date], ['时段', `${f.startTime} ~ ${f.endTime}`],
                    ['项目名称', f.projectName], ['项目描述', f.description],
                    ['指导教师', f.advisorName], ['参与人员', f.participants.length ? f.participants.join('、') : '无'],
                  ].map(([lb, v], i) => (
                    <div key={i} className="grid grid-cols-4 gap-4 text-sm py-2 border-b last:border-0 border-slate-100">
                      <div className="text-slate-500">{lb}</div>
                      <div className="col-span-3 text-slate-800 font-medium break-words">{v}</div>
                    </div>
                  ))}
                </Card>
              </div>
            )
          )}
        </div>

        {step < 4 && !res && (
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
            <Button variant="outline" onClick={() => setStep(step - 1)} icon={<ChevronLeft className="w-4 h-4" />} disabled={step === 1}>上一步</Button>
            <Button onClick={step === 3 ? submit : () => setStep(step + 1)}
              icon={step === 3 ? undefined : <ChevronRight className="w-4 h-4" />}
              disabled={!can || (step === 3 && loading)} loading={step === 3 && loading}
              variant={step === 3 ? 'success' : 'primary'}>{step === 3 ? '确认提交' : '下一步'}</Button>
          </div>
        )}
        {step === 4 && !res && (
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
            <Button variant="outline" onClick={() => setStep(3)} icon={<ChevronLeft className="w-4 h-4" />}>返回修改</Button>
            <Button variant="success" onClick={submit} loading={loading} icon={<CheckCircle className="w-4 h-4" />}>确认提交预约</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
