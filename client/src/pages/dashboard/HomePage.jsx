import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Ticket, IdCard } from 'lucide-react';
import memberApi from '../../services/memberApi';
import { useMemberAuth } from '../../context/MemberAuthContext';
import StatusBadge from '../../components/admin/StatusBadge';
import PageHeader from '../../components/admin/PageHeader';
import Card from '../../components/admin/Card';
import Button from '../../components/admin/Button';

export default function DashboardHomePage() {
  const { member } = useMemberAuth();
  const [data, setData] = useState(null);

  useEffect(() => { memberApi.get('/member/dashboard').then((r) => setData(r.data)); }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Welcome, ${member?.firstName}! \u{1F44B}`}
        description="Here's what's happening with your NIA membership."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-nia-navy-dark flex items-center gap-2"><IdCard className="text-nia-orange" />Membership</h2>
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
          <Button as={Link} to="/dashboard/membership" variant="secondary" className="mt-3">Manage Membership</Button>
        </Card>

        <Card>
          <h2 className="font-bold text-nia-navy-dark flex items-center gap-2 mb-3"><Ticket className="text-nia-orange" />Upcoming Events</h2>
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
          <Button as={Link} to="/dashboard/tickets" variant="secondary" className="mt-3">View My Tickets</Button>
        </Card>
      </div>

      <Card>
        <h2 className="font-bold text-nia-navy-dark mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button as={Link} to="/dashboard/events" variant="primary"><Calendar />Browse Events</Button>
          <Button as={Link} to="/dashboard/membership" variant="secondary">Renew Membership</Button>
          <Button as={Link} to="/dashboard/tickets" variant="secondary">View My Tickets</Button>
        </div>
      </Card>

      <Card>
        <h2 className="font-bold text-nia-navy-dark mb-2">Latest Announcements</h2>
        <p className="text-sm text-nia-text-faint">Announcements are coming in a later milestone.</p>
      </Card>
    </div>
  );
}
