import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FlaskConical,
  CalendarPlus,
  ClipboardList,
  CheckSquare,
  Bell,
  Settings,
  Users,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import type { User } from '../../shared/types';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { to: '/', label: '仪表盘', icon: LayoutDashboard, roles: ['student', 'advisor', 'admin'] },
  { to: '/benches', label: '实验台', icon: FlaskConical, roles: ['student', 'advisor', 'admin'] },
  { to: '/reservations/new', label: '新建预约', icon: CalendarPlus, roles: ['student'] },
  { to: '/reservations', label: '我的预约', icon: ClipboardList, roles: ['student', 'advisor', 'admin'] },
  { to: '/approvals', label: '审批中心', icon: CheckSquare, roles: ['advisor', 'admin'] },
  { to: '/reminders', label: '催办记录', icon: Bell, roles: ['advisor', 'admin'] },
  { to: '/admin/benches', label: '实验台管理', icon: Settings, roles: ['admin'] },
  { to: '/admin/rules', label: '规则配置', icon: Settings, roles: ['admin'] },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, loadCurrentUser } = useAppStore();
  const [users, setUsers] = useState<User[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userSwitcherOpen, setUserSwitcherOpen] = useState(false);

  useEffect(() => {
    loadCurrentUser();
    api.getAdvisors().then((res) => {
      if (res.success && res.data) {
        setUsers([
          { id: 'stu_001', name: '张明（学生）', role: 'student', email: 'z@u.edu' },
          { id: 'adv_001', name: '李教授（导师）', role: 'advisor', email: 'l@u.edu' },
          { id: 'admin_001', name: '王管理员（管理员）', role: 'admin', email: 'a@u.edu' },
          ...res.data.filter((u) => u.id !== 'adv_001').map((u) => ({ ...u, name: u.name + '（导师）' })),
        ]);
      }
    });
  }, [loadCurrentUser]);

  const handleSwitchUser = async (id: string) => {
    await useAppStore.getState().switchUser(id);
    setUserSwitcherOpen(false);
    navigate('/');
    window.location.reload();
  };

  const visibleItems = navItems.filter((i) => currentUser && i.roles.includes(currentUser.role));

  const roleLabels: Record<string, string> = {
    student: '学生',
    advisor: '导师',
    admin: '管理员',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex">
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 h-screen z-40 bg-white/95 backdrop-blur-md border-r border-slate-200 flex flex-col transition-all duration-300 shadow-xl lg:shadow-none',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        <div className="h-20 flex items-center px-5 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <div className="ml-3 flex-1 min-w-0">
              <h1 className="text-base font-bold text-slate-800 truncate">实验室预约</h1>
              <p className="text-[11px] text-slate-500 truncate">Lab Reservation System</p>
            </div>
          )}
        </div>

        <nav className="flex-1 py-4 overflow-y-auto px-3 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group',
                  active
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/25'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className={cn('w-5 h-5 flex-shrink-0', active ? '' : 'text-slate-400 group-hover:text-slate-600')} />
                {sidebarOpen && <span className="ml-3">{item.label}</span>}
                {sidebarOpen && active && <ChevronRight className="w-4 h-4 ml-auto opacity-75" />}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <div className="relative">
            <button
              onClick={() => setUserSwitcherOpen(!userSwitcherOpen)}
              className="w-full flex items-center p-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {currentUser?.name?.[0] || 'U'}
              </div>
              {sidebarOpen && (
                <div className="ml-2.5 flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-slate-800 truncate">{currentUser?.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {currentUser?.role ? roleLabels[currentUser.role] : ''}
                  </p>
                </div>
              )}
            </button>

            {userSwitcherOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-100">
                  切换角色（演示用）
                </div>
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleSwitchUser(u.id)}
                    className={cn(
                      'w-full flex items-center px-3 py-2.5 hover:bg-blue-50 transition-colors text-left',
                      currentUser?.id === u.id && 'bg-blue-50 text-blue-700'
                    )}
                  >
                    <Users className="w-4 h-4 mr-2 text-slate-400" />
                    <span className="text-sm">{u.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mt-2 w-full p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors hidden lg:flex items-center justify-center"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <h2 className="ml-2 text-lg font-bold text-slate-800">
              {visibleItems.find((i) => i.to === location.pathname)?.label || '实验室预约系统'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              系统运行中
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
