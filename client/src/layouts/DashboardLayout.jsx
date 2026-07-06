import { useEffect, useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { Home, IdCard, Calendar, Ticket, UserCircle, Bell, LogOut } from 'lucide-react';
import { useMemberAuth } from '../context/MemberAuthContext';
import memberApi from '../services/memberApi';
import Button from '../components/admin/Button';
import '../styles/admin-tailwind.css';

const NAV_ITEMS = [
  { to: '/dashboard',               label: 'Dashboard',     icon: Home, end: true },
  { to: '/dashboard/membership',    label: 'My Membership', icon: IdCard },
  { to: '/dashboard/events',        label: 'Events',        icon: Calendar },
  { to: '/dashboard/tickets',       label: 'My Tickets',    icon: Ticket },
  { to: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { to: '/dashboard/profile',       label: 'Profile',       icon: UserCircle },
];

export default function DashboardLayout() {
  const { member, logout } = useMemberAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    memberApi.get('/member/notifications').then((r) => setUnreadCount(r.data.unreadCount)).catch(() => {});
  }, []);

  const linkClasses = ({ isActive }) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-nia-btn text-sm font-medium border-b-2 transition-colors ${
      isActive ? 'border-nia-orange text-nia-navy-dark' : 'border-transparent text-nia-text-muted hover:text-nia-navy-dark hover:border-nia-border'
    }`;

  return (
    <div className="nia-app-root min-h-screen flex flex-col bg-nia-canvas">
      <header className="bg-white border-b border-nia-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between flex-wrap gap-3">
          <Link to="/dashboard" className="font-nia font-extrabold text-lg text-nia-navy">
            NIA <span className="text-nia-orange">Member Portal</span>
          </Link>
          <nav className="flex gap-1 flex-wrap">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={linkClasses}>
                <Icon className="text-sm" /> {label}
                {to === '/dashboard/notifications' && unreadCount > 0 && (
                  <span className="bg-nia-orange text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center">{unreadCount}</span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-nia-text-muted hidden sm:inline">Hi, {member?.firstName}</span>
            <Button variant="secondary" size="sm" onClick={logout}><LogOut /> Logout</Button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-5 py-6">
        <Outlet />
      </main>
    </div>
  );
}
