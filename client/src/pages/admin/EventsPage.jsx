import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FaSearch, FaPlus, FaCopy, FaDownload } from 'react-icons/fa';
import adminApi from '../../services/adminApi';
import StatusBadge from '../../components/admin/StatusBadge';

const CATEGORIES = ['Cultural', 'Community', 'Workshop', 'Festival', 'Exhibition', 'Performance', 'Other'];
const btnPrimary = 'rounded-nia-btn bg-nia-orange px-4 py-2 text-sm font-semibold text-white hover:bg-nia-orange-dark transition-colors';
const btnSecondary = 'rounded-nia-btn border border-nia-border bg-white px-4 py-2 text-sm font-semibold text-nia-navy-dark hover:bg-nia-panel transition-colors';
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
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-extrabold text-nia-navy-dark">Events</h1>
        <Link to="/admin/events/new" className={btnPrimary}><FaPlus className="inline mr-1.5" />Create Event</Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-nia-text-faint text-xs" />
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

      <div className="rounded-nia-card border border-nia-border bg-white overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-nia-panel-alt text-left text-xs font-bold uppercase tracking-wide text-nia-text-muted">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Tickets</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {!loading && events.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-nia-text-faint">No events found.</td></tr>
            )}
            {events.map((e) => (
              <tr key={e._id} className="border-t border-nia-border hover:bg-nia-panel/40">
                <td className="px-4 py-3 font-medium">
                  <Link to={`/admin/events/${e._id}`} className="text-nia-navy-dark hover:underline hover:text-nia-orange">{e.title}</Link>
                </td>
                <td className="px-4 py-3 text-nia-text-muted whitespace-nowrap">{new Date(e.startDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-nia-text-muted">{e.category}</td>
                <td className="px-4 py-3 text-nia-text-muted whitespace-nowrap">{e.ticketsSold}/{e.ticketsTotal || '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={e.displayStatus} /></td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => handlePublishToggle(e)} className={btnSecondary}>
                      {e.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button onClick={() => handleDuplicate(e)} title="Duplicate" className="rounded-nia-btn border border-nia-border px-2.5 py-2 hover:bg-nia-panel"><FaCopy /></button>
                    <button onClick={() => exportAttendees(e)} title="Export attendees" className="rounded-nia-btn border border-nia-border px-2.5 py-2 hover:bg-nia-panel"><FaDownload /></button>
                    <button onClick={() => handleDelete(e)} className="rounded-nia-btn border border-nia-error px-2.5 py-2 text-nia-error hover:bg-red-50">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
