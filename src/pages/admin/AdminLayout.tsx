import { useEffect } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { isAdmin, clearAdmin } from '@/lib/session';
import { useI18n } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import edawisLogo from '@/assets/edawis-logo.png';
import { LayoutDashboard, Users, CalendarDays, Settings, LogOut } from 'lucide-react';

export default function AdminLayout() {
  const navigate = useNavigate();
  const admin = isAdmin();
  const { t } = useI18n();

  useEffect(() => {
    if (!admin) navigate('/');
  }, [admin, navigate]);

  if (!admin) return null;

  const navItems = [
    { to: '/admin',          label: t('dashboard'), icon: LayoutDashboard, end: true },
    { to: '/admin/members',  label: t('members'),   icon: Users },
    { to: '/admin/meetings', label: t('meetings'),  icon: CalendarDays },
    { to: '/admin/settings', label: t('settings'),  icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">

      {/* ── Top header ─────────────────────────────────────────── */}
      <header className="border-b bg-card sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-6">

          {/* Logo row */}
          <div className="flex items-center justify-between py-3">
            {/* Logo + name */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <img src={edawisLogo} alt="EDawis" className="w-7 h-7" />
              </div>
              <div>
                <div className="font-bold text-xl leading-none">EDawis</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t('admin_panel')}</div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                onClick={() => { clearAdmin(); navigate('/'); }}
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">{t('logout')}</span>
              </button>
            </div>
          </div>

          {/* Tab nav */}
          <nav className="flex gap-0 -mb-px overflow-x-auto">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`
                }
              >
                <item.icon size={15} strokeWidth={2} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Page content ───────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
