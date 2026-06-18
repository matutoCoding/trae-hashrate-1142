import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  MapPin,
  Users,
  ArrowRight,
  FlaskConical,
  Leaf,
  Atom,
  Monitor,
  Beaker,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import Empty from '../components/Empty';
import { cn } from '../lib/utils';
import type { BenchCategory, BenchStatus } from '../../shared/types';

const categories: { key: BenchCategory | 'all'; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: '全部', icon: <Filter className="w-4 h-4" /> },
  { key: '化学', label: '化学', icon: <FlaskConical className="w-4 h-4" /> },
  { key: '生物', label: '生物', icon: <Leaf className="w-4 h-4" /> },
  { key: '物理', label: '物理', icon: <Atom className="w-4 h-4" /> },
  { key: '计算机', label: '计算机', icon: <Monitor className="w-4 h-4" /> },
  { key: '材料', label: '材料', icon: <Beaker className="w-4 h-4" /> },
];

const statusOptions: { key: BenchStatus | 'all'; label: string }[] = [
  { key: 'all', label: '全部状态' },
  { key: 'available', label: '可用' },
  { key: 'maintenance', label: '维护中' },
  { key: 'disabled', label: '禁用' },
];

const categoryColorMap: Record<BenchCategory, string> = {
  化学: 'bg-blue-100 text-blue-700 border-blue-200',
  生物: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  物理: 'bg-violet-100 text-violet-700 border-violet-200',
  计算机: 'bg-sky-100 text-sky-700 border-sky-200',
  材料: 'bg-amber-100 text-amber-700 border-amber-200',
};

export default function BenchList() {
  const navigate = useNavigate();
  const { benches, loadBenches } = useAppStore();
  const [keyword, setKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BenchCategory | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<BenchStatus | 'all'>('all');

  useEffect(() => {
    loadBenches();
  }, [loadBenches]);

  const filteredBenches = useMemo(() => {
    return benches.filter((bench) => {
      const matchKeyword =
        !keyword ||
        bench.name.toLowerCase().includes(keyword.toLowerCase()) ||
        bench.code.toLowerCase().includes(keyword.toLowerCase()) ||
        bench.location.toLowerCase().includes(keyword.toLowerCase());
      const matchCategory = selectedCategory === 'all' || bench.category === selectedCategory;
      const matchStatus = selectedStatus === 'all' || bench.status === selectedStatus;
      return matchKeyword && matchCategory && matchStatus;
    });
  }, [benches, keyword, selectedCategory, selectedStatus]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">实验台列表</h1>
          <p className="text-slate-500 mt-1">浏览并预约实验室设备</p>
        </div>
      </div>

      <Card>
        <Card.Body className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索实验台名称、编号或位置..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border',
                    selectedCategory === cat.key
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as BenchStatus | 'all')}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card.Body>
      </Card>

      {filteredBenches.length === 0 ? (
        <Empty description="未找到符合条件的实验台" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBenches.map((bench) => (
            <Card
              key={bench.id}
              hoverable
              className="cursor-pointer overflow-hidden"
              onClick={() => navigate(`/benches/${bench.id}`)}
            >
              <div className="relative h-44 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden group">
                <img
                  src={bench.imageUrl}
                  alt={bench.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute top-3 left-3">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border',
                      categoryColorMap[bench.category]
                    )}
                  >
                    {bench.category}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  <StatusBadge status={bench.status} size="sm" />
                </div>
              </div>

              <Card.Body className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">{bench.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{bench.code}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPin className="w-4 h-4 flex-shrink-0 text-slate-400" />
                  <span className="truncate">{bench.location}</span>
                </div>

                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Users className="w-4 h-4 flex-shrink-0 text-slate-400" />
                  <span>容量 {bench.capacity} 人</span>
                </div>

                {bench.equipment.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {bench.equipment.slice(0, 4).map((eq, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-xs font-medium"
                      >
                        {eq}
                      </span>
                    ))}
                    {bench.equipment.length > 4 && (
                      <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-xs font-medium">
                        +{bench.equipment.length - 4}
                      </span>
                    )}
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    icon={<ArrowRight className="w-4 h-4" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/benches/${bench.id}`);
                    }}
                  >
                    查看详情
                  </Button>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
