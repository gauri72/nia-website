import { useEffect, useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Ticket, FileText, Images, MailOpen, BarChart3, MessageCircle, Bell, Settings, LogOut, RefreshCw, Receipt } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import adminApi from '../services/adminApi';
import Button from '../components/admin/Button';
import '../styles/admin-tailwind.css';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Members & Events',
    items: [
      { to: '/admin/members', label: 'Members', icon: Users },
      { to: '/admin/events', label: 'Events', icon: Calendar },
      { to: '/admin/bookings', label: 'Tickets & Bookings', icon: Ticket },
      { to: '/admin/ticket-sales', label: 'Ticket Sales', icon: Receipt },
    ],
  },
  {
    label: 'Content & Comms',
    items: [
      { to: '/admin/content', label: 'Content Management', icon: FileText },
      { to: '/admin/media', label: 'Media Manager', icon: Images },
      { to: '/admin/broadcasting', label: 'Email Broadcasting', icon: MailOpen },
      { to: '/admin/messages', label: 'Messages', icon: MessageCircle },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/mollie-import', label: 'Mollie Import', icon: RefreshCw },
      { to: '/admin/notifications', label: 'Notifications', icon: Bell },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    adminApi.get('/admin/notifications').then((r) => setUnreadCount(r.data.unreadCount)).catch(() => {});
  }, []);

  const linkClasses = ({ isActive }) =>
    `group relative flex items-center gap-3 mx-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-nia-navy/[0.06] text-nia-navy-dark font-semibold'
        : 'text-nia-text-muted hover:text-nia-navy-dark hover:bg-nia-panel-alt'
    }`;

  const initials = `${admin?.firstName?.[0] || ''}${admin?.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="nia-app-root min-h-screen flex bg-nia-canvas">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-nia-panel border-r border-nia-border flex flex-col">
        <Link to="/admin" className="font-nia px-6 py-6 text-lg font-extrabold text-nia-navy-dark block tracking-tight">
          NIA <span className="text-nia-orange">Admin</span>
        </Link>

        <nav className="flex-1 overflow-y-auto pb-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-1">
              <p className="px-6 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-nia-text-faint">{group.label}</p>
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className={linkClasses}>
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-nia-orange" />}
                      <Icon className={`text-base flex-shrink-0 ${isActive ? 'text-nia-orange' : 'text-nia-text-faint group-hover:text-nia-navy-dark'}`} />
                      <span className="flex-1">{label}</span>
                      {to === '/admin/notifications' && unreadCount > 0 && (
                        <span className="bg-nia-orange text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">{unreadCount}</span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <Link
          to="/admin/profile"
          className="flex items-center gap-3 mx-3 mb-3 px-3 py-2.5 rounded-xl text-sm font-medium text-nia-text-muted hover:text-nia-navy-dark hover:bg-nia-panel-alt transition-colors border-t border-nia-border pt-4"
        >
          <span className="w-7 h-7 rounded-lg bg-nia-orange/15 text-nia-orange flex items-center justify-center flex-shrink-0 text-[11px] font-bold">
            {initials || <Settings className="text-[12px]" />}
          </span>
          <span>Profile</span>
        </Link>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/80 backdrop-blur-sm border-b border-nia-border px-6 py-3.5 flex items-center justify-between shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-nia-navy to-nia-navy-dark text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              {initials || 'A'}
            </span>
            <div className="text-sm leading-tight">
              <p className="font-semibold text-nia-navy-dark">{admin?.firstName} {admin?.lastName}</p>
              <p className="text-xs text-nia-text-faint">{admin?.role === 'super_admin' ? 'Super Admin' : 'Content Manager'}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={logout} className="hover:border-nia-error/30 hover:text-nia-error">
            <LogOut /> Logout
          </Button>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-nia-main mx-auto p-6 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
