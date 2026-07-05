import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaUsers, FaIdCard, FaCalendarAlt, FaTicketAlt, FaEuroSign, FaPlus, FaRobot, FaChartBar } from 'react-icons/fa';
import adminApi from '../../services/adminApi';
import StatusBadge from '../../components/admin/StatusBadge';
import StatCard from '../../components/admin/StatCard';
import RevenueChart from '../../components/admin/RevenueChart';

const btnPrimary = 'rounded-nia-btn bg-nia-orange px-4 py-2 text-sm font-semibold text-white hover:bg-nia-orange-dark transition-colors';
const btnSecondary = 'rounded-nia-btn border border-nia-border bg-white px-4 py-2 text-sm font-semibold text-nia-navy-dark hover:bg-nia-panel transition-colors';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);

  useEffect(() => { adminApi.get('/admin/dashboard').then((r) => setData(r.data)); }, []);

  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-8 w-48 rounded-nia-btn bg-nia-panel-alt animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 rounded-nia-card bg-nia-panel-alt animate-pulse" />)}
        </div>
        <div className="h-64 rounded-nia-card bg-nia-panel-alt animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-nia-navy-dark">Dashboard</h1>
        <p className="text-sm text-nia-text-faint mt-0.5">A snapshot of members, events and revenue across the NIA platform.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={FaUsers} label="Total Members" value={data.totalMembers} tone="navy" />
        <StatCard icon={FaIdCard} label="Active Memberships" value={data.activeMemberships} tone="green" />
        <StatCard icon={FaCalendarAlt} label="Upcoming Events" value={data.upcomingEventsCount} tone="gold" />
        <StatCard icon={FaTicketAlt} label="Tickets Sold" value={data.ticketsSold} tone="orange" />
        <StatCard icon={FaEuroSign} label="Total Revenue" value={`€${data.totalRevenue.toLocaleString()}`} tone="orange" />
      </div>

      <div className="rounded-nia-card border border-nia-border bg-white p-5">
        <h2 className="font-bold text-nia-navy-dark mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nia-orange/10 text-nia-orange flex items-center justify-center"><FaChartBar className="text-sm" /></span>
          Monthly Revenue (Tickets + Memberships)
        </h2>
        <RevenueChart data={data.revenueChart} />
      </div>

      <div className="rounded-nia-card border border-nia-border bg-white p-5">
        <h2 className="font-bold text-nia-navy-dark mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/events/new" className={btnPrimary}><FaPlus className="inline mr-1.5" />Create Event</Link>
          <Link to="/admin/members" className={btnSecondary}><FaPlus className="inline mr-1.5" />Add Member</Link>
          <Link to="/admin/broadcasting/compose" className={btnSecondary}><FaRobot className="inline mr-1.5" />Create Broadcast</Link>
          <Link to="/admin/reports" className={btnSecondary}>View Reports</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-nia-card border border-nia-border bg-white overflow-hidden">
          <h2 className="font-bold text-nia-navy-dark p-4 pb-2">Recent Bookings</h2>
          <table className="w-full text-sm">
            <tbody>
              {data.recentBookings.length === 0 && <tr><td className="px-4 py-4 text-nia-text-faint text-center">No bookings yet.</td></tr>}
              {data.recentBookings.map((b) => (
                <tr key={b._id} className="border-t border-nia-border">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-nia-navy-dark">{b.member?.firstName} {b.member?.lastName}</p>
                    <p className="text-xs text-nia-text-faint">{b.event?.title}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-nia-navy-dark">€{b.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-nia-card border border-nia-border bg-white overflow-hidden">
          <h2 className="font-bold text-nia-navy-dark p-4 pb-2">Upcoming Events</h2>
          <table className="w-full text-sm">
            <tbody>
              {data.upcomingEvents.length === 0 && <tr><td className="px-4 py-4 text-nia-text-faint text-center">No upcoming events.</td></tr>}
              {data.upcomingEvents.map((e) => (
                <tr key={e._id} className="border-t border-nia-border">
                  <td className="px-4 py-2.5">
                    <Link to={`/admin/events/${e._id}`} className="font-medium text-nia-navy-dark hover:text-nia-orange hover:underline">{e.title}</Link>
                    <p className="text-xs text-nia-text-faint">{new Date(e.startDate).toLocaleDateString()}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right"><StatusBadge status="published" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
