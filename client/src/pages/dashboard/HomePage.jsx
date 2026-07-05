import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaCalendarAlt, FaTicketAlt, FaIdCard } from 'react-icons/fa';
import memberApi from '../../services/memberApi';
import { useMemberAuth } from '../../context/MemberAuthContext';
import StatusBadge from '../../components/admin/StatusBadge';

const btnPrimary = 'rounded-nia-btn bg-nia-orange px-4 py-2 text-sm font-semibold text-white hover:bg-nia-orange-dark transition-colors';
const btnSecondary = 'rounded-nia-btn border border-nia-border bg-white px-4 py-2 text-sm font-semibold text-nia-navy-dark hover:bg-nia-panel transition-colors';

export default function DashboardHomePage() {
  const { member } = useMemberAuth();
  const [data, setData] = useState(null);

  useEffect(() => { memberApi.get('/member/dashboard').then((r) => setData(r.data)); }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-nia-navy-dark">Welcome, {member?.firstName}! 👋</h1>
        <p className="text-nia-text-muted">Here's what's happening with your NIA membership.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-nia-card border border-nia-border bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-nia-navy-dark flex items-center gap-2"><FaIdCard className="text-nia-orange" />Membership</h2>
            {data && <StatusBadge status={data.member.membershipStatus} />}
          </div>
          {data?.member.membershipTier ? (
            <>
              <p className="text-lg font-bold text-nia-navy">{data.member.membershipTier.name}</p>
              {data.member.membershipExpiresAt && (
                <p className="text-sm text-nia-text-muted">Valid until {new Date(data.member.membershipExpiresAt).toLocaleDateString()}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-nia-text-faint">You don't have an active membership yet.</p>
          )}
          <Link to="/dashboard/membership" className={btnSecondary + ' inline-block mt-3'}>Manage Membership</Link>
        </div>

        <div className="rounded-nia-card border border-nia-border bg-white p-5">
          <h2 className="font-bold text-nia-navy-dark flex items-center gap-2 mb-3"><FaTicketAlt className="text-nia-orange" />Upcoming Events</h2>
          {data?.upcomingBookings?.length ? (
            <ul className="flex flex-col gap-2">
              {data.upcomingBookings.map((b) => (
                <li key={b._id} className="text-sm">
                  <span className="font-semibold text-nia-navy-dark">{b.event.title}</span>
                  <span className="text-nia-text-faint"> — {new Date(b.event.startDate).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-nia-text-faint">No upcoming bookings.</p>
          )}
          <Link to="/dashboard/tickets" className={btnSecondary + ' inline-block mt-3'}>View My Tickets</Link>
        </div>
      </div>

      <div className="rounded-nia-card border border-nia-border bg-white p-5">
        <h2 className="font-bold text-nia-navy-dark mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/dashboard/events" className={btnPrimary}><FaCalendarAlt className="inline mr-1.5" />Browse Events</Link>
          <Link to="/dashboard/membership" className={btnSecondary}>Renew Membership</Link>
          <Link to="/dashboard/tickets" className={btnSecondary}>View My Tickets</Link>
        </div>
      </div>

      <div className="rounded-nia-card border border-nia-border bg-white p-5">
        <h2 className="font-bold text-nia-navy-dark mb-2">Latest Announcements</h2>
        <p className="text-sm text-nia-text-faint">Announcements are coming in a later milestone.</p>
      </div>
    </div>
  );
}
