import { useEffect, useState } from 'react';
import {
  Save,
  RotateCcw,
  Settings,
  Clock,
  AlertTriangle,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { cn } from '../lib/utils';
import type { ApprovalRules } from '../../shared/types';

const escalationRoles = [
  { value: 'department_head', label: '系主任' },
  { value: 'dean', label: '院长' },
  { value: 'admin', label: '系统管理员' },
];

const autoDecisionActions = [
  { value: 'approve', label: '自动通过' },
  { value: 'reject', label: '自动驳回' },
];

const defaultRules: ApprovalRules = {
  advisorTimeoutHours: 48,
  firstReminderHours: 24,
  escalationHours: 36,
  autoDecisionHours: 72,
  escalationTargetRole: 'department_head',
  autoDecisionAction: 'reject',
  cancellationDeadlineHours: 24,
};

export default function AdminRules() {
  const { rules, loadRules, updateRules } = useAppStore();
  const [form, setForm] = useState<ApprovalRules>(defaultRules);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  useEffect(() => {
    if (rules) {
      setForm(rules);
    }
  }, [rules]);

  const handleChange = <K extends keyof ApprovalRules>(
    key: K,
    value: ApprovalRules[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleReset = () => {
    if (rules) {
      setForm(rules);
    } else {
      setForm(defaultRules);
    }
    setSaved(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateRules(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">审批规则配置</h1>
          <p className="text-slate-500 mt-1">配置审批流程的时限与策略规则</p>
        </div>
      </div>

      <div className="grid gap-5">
        <Card className="overflow-hidden">
          <Card.Header>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">审批时限</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  控制各阶段的时间阈值，超时后将触发相应动作
                </p>
              </div>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  导师审批时限
                  <span className="text-slate-400 font-normal">（小时）</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.advisorTimeoutHours}
                  onChange={(e) =>
                    handleChange('advisorTimeoutHours', Number(e.target.value))
                  }
                  className={cn(
                    'w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all'
                  )}
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  导师在此时间内未处理，审批将视为超时
                </p>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  首次催办时间
                  <span className="text-slate-400 font-normal">（小时）</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.firstReminderHours}
                  onChange={(e) =>
                    handleChange('firstReminderHours', Number(e.target.value))
                  }
                  className={cn(
                    'w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all'
                  )}
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  超过此时限未处理，系统将发送首次催办通知
                </p>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                  <UserCheck className="w-4 h-4 text-orange-500" />
                  升级处理时限
                  <span className="text-slate-400 font-normal">（小时）</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.escalationHours}
                  onChange={(e) =>
                    handleChange('escalationHours', Number(e.target.value))
                  }
                  className={cn(
                    'w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all'
                  )}
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  超过此时限未处理，将自动升级至上级角色
                </p>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                  <XCircle className="w-4 h-4 text-rose-500" />
                  自动裁决时限
                  <span className="text-slate-400 font-normal">（小时）</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.autoDecisionHours}
                  onChange={(e) =>
                    handleChange('autoDecisionHours', Number(e.target.value))
                  }
                  className={cn(
                    'w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all'
                  )}
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  超过此时限仍未处理，将执行自动裁决
                </p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card className="overflow-hidden">
          <Card.Header>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">升级策略</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  审批超时升级时的目标角色与自动裁决动作
                </p>
              </div>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                  <UserCheck className="w-4 h-4 text-slate-400" />
                  升级目标角色
                </label>
                <select
                  value={form.escalationTargetRole}
                  onChange={(e) =>
                    handleChange('escalationTargetRole', e.target.value)
                  }
                  className={cn(
                    'w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm cursor-pointer',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all'
                  )}
                >
                  {escalationRoles.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1.5">
                  升级后的审批将由此角色负责处理
                </p>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                  <Settings className="w-4 h-4 text-slate-400" />
                  自动裁决动作
                </label>
                <select
                  value={form.autoDecisionAction}
                  onChange={(e) =>
                    handleChange(
                      'autoDecisionAction',
                      e.target.value as 'approve' | 'reject'
                    )
                  }
                  className={cn(
                    'w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm cursor-pointer',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all'
                  )}
                >
                  {autoDecisionActions.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1.5">
                  自动裁决时限到达后执行的默认操作
                </p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card className="overflow-hidden">
          <Card.Header>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">退订规则</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  用户取消预约的时间限制策略
                </p>
              </div>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="max-w-sm">
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                退订截止
                <span className="text-slate-400 font-normal">（开始前X小时）</span>
              </label>
              <input
                type="number"
                min="0"
                value={form.cancellationDeadlineHours}
                onChange={(e) =>
                  handleChange('cancellationDeadlineHours', Number(e.target.value))
                }
                className={cn(
                  'w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all'
                )}
              />
              <p className="text-xs text-slate-400 mt-1.5">
                预约开始前不足此时间的，用户无法自行取消预约
              </p>
            </div>
          </Card.Body>
        </Card>
      </div>

      <Card>
        <Card.Footer className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                保存成功
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              icon={<RotateCcw className="w-4 h-4" />}
              onClick={handleReset}
            >
              重置
            </Button>
            <Button
              icon={<Save className="w-4 h-4" />}
              onClick={handleSave}
              loading={loading}
            >
              保存配置
            </Button>
          </div>
        </Card.Footer>
      </Card>
    </div>
  );
}
