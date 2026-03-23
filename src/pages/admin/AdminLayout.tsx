import { useState, useEffect } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { isAdmin, clearAdmin } from '@/lib/session';
import { useI18n } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import edawisLogo from '@/assets/edawis-logo.png';
import { LayoutDashboard, Users, CalendarDays, Settings, LogOut, Menu, X } from 'lucide-react';

export default function AdminLayout() {
  const navigate = useNavigate();
  const admin = isAdmin();
  const { t } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!admin) navigate('/');
  }, [admin, navigate]);

  if (!admin) return null;

  const navItems = [
    { to: '/admin', label: t('dashboard'), icon: LayoutDashboard, end: true },
    { to: '/admin/members', label: t('members'), icon: Users },
    { to: '/admin/meetings', label: t('meetings'), icon: CalendarDays },
    { to: '/admin/settings', label: t('settings'), icon: Settings },
  ];

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? 'bg-sidebar-primary/20 text-sidebar-primary'
        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
    }`;

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary/20 flex items-center justify-center">
          <img src={edawisLogo} alt="EDawis" className="w-6 h-6" />
        </div>
        <div>
          <div className="font-bold text-white text-sm leading-none">EDawis</div>
          <div className="text-xs text-sidebar-foreground/60 mt-0.5">{t('admin_panel')}</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={linkClass}
            onClick={() => setSidebarOpen(false)}
          >
            <item.icon size={16} strokeWidth={2} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-3">
        <div className="flex gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
        <button
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all w-full"
          onClick={() => { clearAdmin(); navigate('/'); }}
        >
          <LogOut size={16} strokeWidth={2} />
          {t('logout')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-col bg-sidebar fixed inset-y-0 left-0 z-30">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-sidebar z-50 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
              <span className="font-bold text-white text-sm">EDawis</span>
              <button
                className="text-sidebar-foreground hover:text-white p-1 rounded"
                onClick={() => setSidebarOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="md:hidden border-b bg-card px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <button
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <img src={edawisLogo} alt="EDawis" className="w-6 h-6" />
            <span className="font-bold text-sm">EDawis</span>
          </div>
          <div className="flex gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
