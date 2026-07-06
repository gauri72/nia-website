import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, IdCard, Calendar, Ticket, Euro, Plus, Bot, BarChart3 } from 'lucide-react';
import adminApi from '../../services/adminApi';
import StatusBadge from '../../components/admin/StatusBadge';
import StatCard from '../../components/admin/StatCard';
import RevenueChart from '../../components/admin/RevenueChart';
import PageHeader from '../../components/admin/PageHeader';
import Card from '../../components/admin/Card';
import Table from '../../components/admin/Table';
import Button from '../../components/admin/Button';

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
      <PageHeader title="Dashboard" description="A snapshot of members, events and revenue across the NIA platform." />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Users} label="Total Members" value={data.totalMembers} tone="navy" />
        <StatCard icon={IdCard} label="Active Memberships" value={data.activeMemberships} tone="green" />
        <StatCard icon={Calendar} label="Upcoming Events" value={data.upcomingEventsCount} tone="gold" />
        <StatCard icon={Ticket} label="Tickets Sold" value={data.ticketsSold} tone="orange" />
        <StatCard icon={Euro} label="Total Revenue" value={`€${data.totalRevenue.toLocaleString()}`} tone="orange" />
      </div>

      <Card>
        <h2 className="font-bold text-nia-navy-dark mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nia-orange/10 text-nia-orange flex items-center justify-center"><BarChart3 className="text-sm" /></span>
          Monthly Revenue (Tickets + Memberships)
        </h2>
        <RevenueChart data={data.revenueChart} />
      </Card>

      <Card>
        <h2 className="font-bold text-nia-navy-dark mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button as={Link} to="/admin/events/new" variant="primary"><Plus /> Create Event</Button>
          <Button as={Link} to="/admin/members" variant="secondary"><Plus /> Add Member</Button>
          <Button as={Link} to="/admin/broadcasting/compose" variant="secondary"><Bot /> Create Broadcast</Button>
          <Button as={Link} to="/admin/reports" variant="secondary">View Reports</Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card padded={false}>
          <h2 className="font-bold text-nia-navy-dark p-4 pb-2">Recent Bookings</h2>
          <Table bare>
            <Table.Body>
              {data.recentBookings.length === 0 && <Table.Empty colSpan={2}>No bookings yet.</Table.Empty>}
              {data.recentBookings.map((b) => (
                <Table.Row key={b._id}>
                  <Table.Cell>
                    <p className="font-medium text-nia-navy-dark">{b.member?.firstName} {b.member?.lastName}</p>
                    <p className="text-xs text-nia-text-faint">{b.event?.title}</p>
                  </Table.Cell>
                  <Table.Cell align="right" className="font-semibold text-nia-navy-dark">€{b.amount.toFixed(2)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card>

        <Card padded={false}>
          <h2 className="font-bold text-nia-navy-dark p-4 pb-2">Upcoming Events</h2>
          <Table bare>
            <Table.Body>
              {data.upcomingEvents.length === 0 && <Table.Empty colSpan={2}>No upcoming events.</Table.Empty>}
              {data.upcomingEvents.map((e) => (
                <Table.Row key={e._id}>
                  <Table.Cell>
                    <Link to={`/admin/events/${e._id}`} className="font-medium text-nia-navy-dark hover:text-nia-orange hover:underline">{e.title}</Link>
                    <p className="text-xs text-nia-text-faint">{new Date(e.startDate).toLocaleDateString()}</p>
                  </Table.Cell>
                  <Table.Cell align="right"><StatusBadge status="published" /></Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card>
      </div>
    </div>
  );
}
