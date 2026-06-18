import { cn } from '../lib/utils';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusMap: Record<string, { label: string; className: string }> = {
  available: { label: '可用', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  maintenance: { label: '维护中', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  disabled: { label: '禁用', className: 'bg-slate-100 text-slate-600 border-slate-200' },

  pending: { label: '待审批', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  approved: { label: '已通过', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  confirmed: { label: '已确认', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  rejected: { label: '已驳回', className: 'bg-rose-100 text-rose-700 border-rose-200' },
  cancelled: { label: '已取消', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  completed: { label: '已完成', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },

  timeout: { label: '已超时', className: 'bg-rose-100 text-rose-700 border-rose-200' },
  escalated: { label: '已升级', className: 'bg-orange-100 text-orange-700 border-orange-200' },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const cfg = statusMap[status] || {
    label: status,
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center border rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        cfg.className
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          cfg.className.includes('emerald') && 'bg-emerald-500',
          cfg.className.includes('amber') && 'bg-amber-500',
          cfg.className.includes('rose') && 'bg-rose-500',
          cfg.className.includes('slate') && 'bg-slate-400',
          cfg.className.includes('blue') && 'bg-blue-500',
          cfg.className.includes('indigo') && 'bg-indigo-500',
          cfg.className.includes('orange') && 'bg-orange-500'
        )}
      />
      {cfg.label}
    </span>
  );
}
