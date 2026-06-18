import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  AlertTriangle,
  TrendingUp,
  Activity,
  ArrowRight,
  Clock,
  CheckCircle2,
  Bell,
  Scissors,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { cn } from '../lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  unit?: string;
  gradient: string;
  icon: React.ReactNode;
  indicator?: { value: number; label: string };
}

function StatCard({ title, value, unit, gradient, icon, indicator }: StatCardProps) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl p-6 text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1', gradient)}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">{icon}</div>
          {indicator && (
            <div className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold', indicator.value >= 0 ? 'bg-white/20' : 'bg-rose-500/30')}>
              <TrendingUp className={cn('w-3 h-3', indicator.value < 0 && 'rotate-180')} />
              <span>{indicator.value >= 0 ? '+' : ''}{indicator.value}% {indicator.label}</span>
            </div>
          )}
        </div>
        <p className="text-white/80 text-sm font-medium mb-1">{title}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold tracking-tight">{value}</span>
          {unit && <span className="text-white/70 text-sm">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

function WeeklyChart({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const points = data.map((d, i) => ({ x: (i / (data.length - 1)) * 100, y: 100 - (d.count / max) * 80 - 10, ...d }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return (
    <div className="h-64 flex flex-col">
      <div className="flex-1 relative">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs><linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0" /></linearGradient></defs>
          {[0, 25, 50, 75, 100].map((y) => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#e2e8f0" strokeWidth="0.3" strokeDasharray="1 1" />)}
          <path d={`${pathD} L 100 100 L 0 100 Z`} fill="url(#areaG)" />
          <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="1.8" fill="white" stroke="#3b82f6" strokeWidth="1" />)}
        </svg>
      </div>
      <div className="flex justify-between mt-3 px-1">
        {data.map((d) => (
          <div key={d.day} className="flex flex-col items-center gap-1.5">
            <div className="w-8 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md transition-all duration-300 hover:from-blue-600 hover:to-blue-500" style={{ height: `${(d.count / max) * 40 + 8}px` }} />
            <span className="text-xs text-slate-500 font-medium">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ data }: { data: { category: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  let cum = 0;
  const R = 40;
  const C = 2 * Math.PI * R;
  const segs = data.map((d, i) => {
    const p = (d.count / total) * 100;
    const off = cum;
    cum += p;
    return { ...d, p, off, color: colors[i % colors.length], da: `${(p / 100) * C} ${C}`, do: -(off / 100) * C };
  });
  return (
    <div className="flex items-center gap-6">
      <div className="relative w-40 h-40 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" stroke="#f1f5f9" strokeWidth="12" />
          {segs.map((s, i) => <circle key={i} cx="50" cy="50" r={R} fill="none" stroke={s.color} strokeWidth="12" strokeDasharray={s.da} strokeDashoffset={s.do} className="transition-all duration-500" />)}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-800">{total}</span>
          <span className="text-xs text-slate-500">总计</span>
        </div>
      </div>
      <div className="flex-1 space-y-2.5">
        {segs.map((s, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-sm text-slate-700 font-medium">{s.category}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">{s.count}</span>
              <span className="text-xs text-slate-400">{s.p.toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const actIcon: Record<string, React.ReactNode> = { reservation: <Clock className="w-4 h-4" />, approval: <CheckCircle2 className="w-4 h-4" />, reminder: <Bell className="w-4 h-4" />, split: <Scissors className="w-4 h-4" /> };
const actColor: Record<string, string> = { reservation: 'bg-blue-100 text-blue-600', approval: 'bg-emerald-100 text-emerald-600', reminder: 'bg-amber-100 text-amber-600', split: 'bg-purple-100 text-purple-600' };

const defaultWeekly = [{ day: '周一', count: 12 }, { day: '周二', count: 19 }, { day: '周三', count: 15 }, { day: '周四', count: 22 }, { day: '周五', count: 28 }, { day: '周六', count: 18 }, { day: '周日', count: 8 }];
const defaultCategory = [{ category: '化学', count: 24 }, { category: '生物', count: 18 }, { category: '物理', count: 15 }, { category: '计算机', count: 20 }, { category: '材料', count: 12 }];

export default function Dashboard() {
  const navigate = useNavigate();
  const { dashboardStats, loadDashboard } = useAppStore();
  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  const s = dashboardStats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">仪表盘</h1>
        <p className="text-slate-500 mt-1">欢迎回来，查看实验室最新动态</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="今日预约" value={s?.todayReservations ?? 0} unit="个" gradient="bg-gradient-to-br from-blue-600 to-blue-400" icon={<FlaskConical className="w-6 h-6" />} indicator={{ value: 12, label: '同比' }} />
        <StatCard title="待审批" value={s?.pendingApprovals ?? 0} unit="条" gradient="bg-gradient-to-br from-amber-500 to-orange-400" icon={<AlertTriangle className="w-6 h-6" />} indicator={{ value: 5, label: '新增' }} />
        <StatCard title="超时预警" value={s?.timeoutWarnings ?? 0} unit="条" gradient="bg-gradient-to-br from-rose-500 to-pink-500" icon={<Bell className="w-6 h-6" />} indicator={{ value: -3, label: '同比' }} />
        <StatCard title="利用率" value={s?.utilizationRate ?? 0} unit="%" gradient="bg-gradient-to-br from-emerald-500 to-teal-400" icon={<Activity className="w-6 h-6" />} indicator={{ value: 8, label: '同比' }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <Card.Header>
            <div><h3 className="font-semibold text-slate-800">本周预约趋势</h3><p className="text-xs text-slate-500 mt-0.5">近7天预约数量统计</p></div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/reservations')}>查看全部 <ArrowRight className="w-4 h-4" /></Button>
          </Card.Header>
          <Card.Body><WeeklyChart data={s?.weeklyTrend ?? defaultWeekly} /></Card.Body>
        </Card>
        <Card>
          <Card.Header><div><h3 className="font-semibold text-slate-800">分类分布</h3><p className="text-xs text-slate-500 mt-0.5">各学科实验台占比</p></div></Card.Header>
          <Card.Body><DonutChart data={s?.categoryDistribution ?? defaultCategory} /></Card.Body>
        </Card>
      </div>

      <Card>
        <Card.Header>
          <div><h3 className="font-semibold text-slate-800">最近活动</h3><p className="text-xs text-slate-500 mt-0.5">系统最新动态记录</p></div>
          <Button variant="outline" size="sm">查看全部</Button>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="divide-y divide-slate-100">
            {(s?.recentActivities ?? []).map((a) => (
              <div key={a.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer">
                <div className={cn('p-2.5 rounded-xl flex-shrink-0', actColor[a.type] ?? 'bg-slate-100 text-slate-600')}>{actIcon[a.type] ?? <Activity className="w-4 h-4" />}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 font-medium truncate">{a.user}</p>
                  <p className="text-sm text-slate-500 truncate mt-0.5">{a.message}</p>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">{a.time}</span>
              </div>
            ))}
            {(!s?.recentActivities || s.recentActivities.length === 0) && (
              <div className="px-6 py-12 text-center text-slate-400 text-sm">暂无活动记录</div>
            )}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
