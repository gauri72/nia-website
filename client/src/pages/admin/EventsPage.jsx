import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Copy, Download } from 'lucide-react';
import adminApi from '../../services/adminApi';
import StatusBadge from '../../components/admin/StatusBadge';
import PageHeader from '../../components/admin/PageHeader';
import Table from '../../components/admin/Table';
import Button from '../../components/admin/Button';

const CATEGORIES = ['Cultural', 'Community', 'Workshop', 'Festival', 'Exhibition', 'Performance', 'Other'];
const selectFilterCls = 'rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20 w-auto';

export default function AdminEventsPage() {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/admin/events', { params: { search, status, category, limit: 50 } });
      setEvents(data.events);
    } finally {
      setLoading(false);
    }
  }, [search, status, category]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  async function handlePublishToggle(event) {
    const action = event.status === 'published' ? 'unpublish' : 'publish';
    await adminApi.patch(`/admin/events/${event._id}/${action}`);
    fetchEvents();
  }

  async function handleDuplicate(event) {
    await adminApi.post(`/admin/events/${event._id}/duplicate`);
    fetchEvents();
  }

  async function handleDelete(event) {
    if (!window.confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
    try {
      await adminApi.delete(`/admin/events/${event._id}`);
      fetchEvents();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete event');
    }
  }

  function exportAttendees(event) {
    const token = localStorage.getItem('nia_admin_token');
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}/admin/events/${event._id}/attendees/export`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.blob()).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `attendees-${event.slug}.csv`; a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div>
      <PageHeader
        title="Events"
        actions={<Button as={Link} to="/admin/events/new" variant="primary"><Plus /> Create Event</Button>}
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-nia-text-faint text-xs" />
          <input
            className="w-full rounded-nia-btn border border-nia-border py-2 pl-8 pr-3 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20"
            placeholder="Search events, venue…" value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className={selectFilterCls} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {['draft', 'published', 'unpublished', 'cancelled', 'completed'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={selectFilterCls} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <Table>
        <Table.Head>
          <Table.HeaderRow>
            <Table.Th>Title</Table.Th>
            <Table.Th>Date</Table.Th>
            <Table.Th>Category</Table.Th>
            <Table.Th>Tickets</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th></Table.Th>
          </Table.HeaderRow>
        </Table.Head>
        <Table.Body>
          {!loading && events.length === 0 && <Table.Empty colSpan={6}>No events found.</Table.Empty>}
          {events.map((e) => (
            <Table.Row key={e._id}>
              <Table.Cell className="font-medium">
                <Link to={`/admin/events/${e._id}`} className="text-nia-navy-dark hover:underline hover:text-nia-orange">{e.title}</Link>
              </Table.Cell>
              <Table.Cell className="text-nia-text-muted whitespace-nowrap">{new Date(e.startDate).toLocaleDateString()}</Table.Cell>
              <Table.Cell className="text-nia-text-muted">{e.category}</Table.Cell>
              <Table.Cell className="text-nia-text-muted whitespace-nowrap">{e.ticketsSold}/{e.ticketsTotal || '—'}</Table.Cell>
              <Table.Cell><StatusBadge status={e.displayStatus} /></Table.Cell>
              <Table.Cell align="right" className="whitespace-nowrap">
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" size="sm" onClick={() => handlePublishToggle(e)}>
                    {e.status === 'published' ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button variant="secondary" size="sm" icon title="Duplicate" onClick={() => handleDuplicate(e)}><Copy /></Button>
                  <Button variant="secondary" size="sm" icon title="Export attendees" onClick={() => exportAttendees(e)}><Download /></Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(e)}>Delete</Button>
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
}
