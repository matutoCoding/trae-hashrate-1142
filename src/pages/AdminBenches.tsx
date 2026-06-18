import { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  X,
  Ban,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import Empty from '../components/Empty';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import type {
  BenchCategory,
  BenchStatus,
  LabBench,
} from '../../shared/types';

const categoryOptions: BenchCategory[] = ['化学', '生物', '物理', '计算机', '材料'];
const statusOptions: BenchStatus[] = ['available', 'maintenance', 'disabled'];

interface BenchForm {
  name: string;
  code: string;
  category: BenchCategory;
  building: string;
  room: string;
  capacity: number;
  equipment: string[];
  status: BenchStatus;
  description: string;
  imageUrl: string;
}

const defaultForm: BenchForm = {
  name: '',
  code: '',
  category: '化学',
  building: '',
  room: '',
  capacity: 10,
  equipment: [],
  status: 'available',
  description: '',
  imageUrl: '',
};

export default function AdminBenches() {
  const { benches, loadBenches } = useAppStore();
  const [keyword, setKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState<BenchCategory | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<BenchStatus | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBench, setEditingBench] = useState<LabBench | null>(null);
  const [form, setForm] = useState<BenchForm>(defaultForm);
  const [tagInput, setTagInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      const matchCategory = filterCategory === 'all' || bench.category === filterCategory;
      const matchStatus = filterStatus === 'all' || bench.status === filterStatus;
      return matchKeyword && matchCategory && matchStatus;
    });
  }, [benches, keyword, filterCategory, filterStatus]);

  const openModal = (bench?: LabBench) => {
    if (bench) {
      setEditingBench(bench);
      setForm({
        name: bench.name,
        code: bench.code,
        category: bench.category,
        building: bench.building,
        room: bench.room,
        capacity: bench.capacity,
        equipment: [...bench.equipment],
        status: bench.status,
        description: bench.description,
        imageUrl: bench.imageUrl,
      });
    } else {
      setEditingBench(null);
      setForm(defaultForm);
    }
    setTagInput('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingBench(null);
    setForm(defaultForm);
    setTagInput('');
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!form.equipment.includes(tagInput.trim())) {
        setForm({ ...form, equipment: [...form.equipment, tagInput.trim()] });
      }
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setForm({ ...form, equipment: form.equipment.filter((t) => t !== tag) });
  };

  const handleSubmit = async () => {
    if (!form.name || !form.code || !form.building || !form.room) return;
    setLoading(true);
    const location = `${form.building}${form.room}`;
    const payload = {
      ...form,
      location,
      managerId: useAppStore.getState().currentUser?.id || 'admin',
    };
    try {
      if (editingBench) {
        await api.updateBench(editingBench.id, payload);
      } else {
        await api.createBench(payload);
      }
      await loadBenches();
      closeModal();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.deleteBench(id);
    await loadBenches();
    setConfirmDelete(null);
  };

  const handleToggleStatus = async (bench: LabBench) => {
    const newStatus: BenchStatus = bench.status === 'disabled' ? 'available' : 'disabled';
    await api.updateBench(bench.id, { status: newStatus });
    await loadBenches();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">实验台管理</h1>
          <p className="text-slate-500 mt-1">管理实验室设备与配置</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => openModal()}>
          新增实验台
        </Button>
      </div>

      <Card>
        <Card.Body className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索名称、编号或位置..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as BenchCategory | 'all')}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="all">全部分类</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as BenchStatus | 'all')}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="all">全部状态</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s === 'available' ? '可用' : s === 'maintenance' ? '维护中' : '禁用'}
                </option>
              ))}
            </select>
          </div>
        </Card.Body>
      </Card>

      <Card className="overflow-hidden">
        {filteredBenches.length === 0 ? (
          <Empty description="暂无实验台数据" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 sticky top-0 z-10">
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    编号
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    名称
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    分类
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    位置
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    容量
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBenches.map((bench, idx) => (
                  <tr
                    key={bench.id}
                    className={cn(
                      'transition-colors hover:bg-blue-50/50',
                      idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                    )}
                  >
                    <td className="px-6 py-4 text-sm font-mono text-slate-500">{bench.code}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">{bench.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{bench.category}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{bench.location}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={bench.status} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{bench.capacity}人</td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Pencil className="w-4 h-4" />}
                          onClick={() => openModal(bench)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Ban className="w-4 h-4" />}
                          onClick={() => handleToggleStatus(bench)}
                          className={bench.status === 'disabled' ? 'text-emerald-600' : 'text-amber-600'}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 className="w-4 h-4 text-rose-500" />}
                          onClick={() => setConfirmDelete(bench.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                {editingBench ? '编辑实验台' : '新增实验台'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">名称</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="请输入实验台名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">编号</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                    placeholder="如：CHEM-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">分类</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as BenchCategory })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">容量（人）</label>
                  <input
                    type="number"
                    min="1"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">建筑</label>
                  <input
                    type="text"
                    value={form.building}
                    onChange={(e) => setForm({ ...form, building: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="如：理学楼"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">房间号</label>
                  <input
                    type="text"
                    value={form.room}
                    onChange={(e) => setForm({ ...form, room: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="如：301"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    位置（自动拼接）
                  </label>
                  <input
                    type="text"
                    value={`${form.building}${form.room}`}
                    disabled
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">状态</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as BenchStatus })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="available">可用</option>
                    <option value="maintenance">维护中</option>
                    <option value="disabled">禁用</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">图片URL</label>
                  <input
                    type="text"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="https://..."
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    设备（回车添加）
                  </label>
                  <div className="flex flex-wrap gap-2 p-2.5 border border-slate-200 rounded-xl min-h-[44px] focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
                    {form.equipment.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-0.5 hover:text-blue-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      placeholder={form.equipment.length === 0 ? '输入后按回车添加...' : ''}
                      className="flex-1 min-w-[120px] px-1 py-0.5 text-sm focus:outline-none bg-transparent"
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">描述</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                    placeholder="实验台详细描述..."
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <Button variant="secondary" onClick={closeModal}>
                取消
              </Button>
              <Button onClick={handleSubmit} loading={loading}>
                {editingBench ? '保存修改' : '创建实验台'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">确认删除</h3>
            <p className="text-sm text-slate-500 mb-6">
              删除后无法恢复，确定要删除该实验台吗？
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
                取消
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDelete(confirmDelete)}
              >
                确认删除
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
