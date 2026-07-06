import { useEffect, useState, useCallback } from 'react';
import { Plus, Download } from 'lucide-react';
import adminApi from '../../services/adminApi';
import StatusBadge from '../../components/admin/StatusBadge';
import Modal from '../../components/admin/Modal';
import PageHeader from '../../components/admin/PageHeader';
import Table from '../../components/admin/Table';
import Button from '../../components/admin/Button';

const inputCls = 'w-full rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20';
const selectFilterCls = 'rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20 w-auto';
const label = 'text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-1 block';

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventFilter, setEventFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showManual, setShowManual] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/admin/bookings', { params: { event: eventFilter, status: statusFilter, search, limit: 50 } });
      setBookings(data.bookings);
    } finally {
      setLoading(false);
    }
  }, [eventFilter, statusFilter, search]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  useEffect(() => { adminApi.get('/admin/events', { params: { limit: 100 } }).then((r) => setEvents(r.data.events)); }, []);

  async function handleRefund(booking) {
    if (!window.confirm(`Refund €${booking.amount.toFixed(2)} for booking ${booking.bookingNumber}?`)) return;
    try {
      await adminApi.post(`/admin/bookings/${booking._id}/refund`);
      fetchBookings();
    } catch (err) {
      alert(err.response?.data?.error || 'Refund failed');
    }
  }

  function downloadPdf(booking) {
    const token = localStorage.getItem('nia_admin_token');
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}/admin/bookings/${booking._id}/ticket.pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.blob()).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `NIA-Ticket-${booking.bookingNumber}.pdf`; a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div>
      <PageHeader
        title="Tickets & Bookings"
        actions={<Button variant="primary" onClick={() => setShowManual(true)}><Plus /> Manual Booking</Button>}
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          className="flex-1 min-w-[200px] rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20"
          placeholder="Search booking ref, member…" value={search} onChange={(e) => setSearch(e.target.value)}
        />
        <select className={selectFilterCls} value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
          <option value="">All events</option>
          {events.map((e) => <option key={e._id} value={e._id}>{e.title}</option>)}
        </select>
        <select className={selectFilterCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['pending_payment', 'paid', 'failed', 'expired', 'canceled', 'refunded'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <Table>
        <Table.Head>
          <Table.HeaderRow>
            <Table.Th>Reference</Table.Th>
            <Table.Th>Member</Table.Th>
            <Table.Th>Event</Table.Th>
            <Table.Th align="right">Amount</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Booked</Table.Th>
            <Table.Th></Table.Th>
          </Table.HeaderRow>
        </Table.Head>
        <Table.Body>
          {!loading && bookings.length === 0 && <Table.Empty colSpan={7}>No bookings found.</Table.Empty>}
          {bookings.map((b) => (
            <Table.Row key={b._id}>
              <Table.Cell className="font-mono text-xs text-nia-text-faint">{b.bookingNumber}</Table.Cell>
              <Table.Cell className="font-medium text-nia-navy-dark">{b.member?.firstName} {b.member?.lastName}</Table.Cell>
              <Table.Cell className="text-nia-text-muted">{b.event?.title}</Table.Cell>
              <Table.Cell align="right" className="font-semibold text-nia-navy-dark tabular-nums">€{b.amount.toFixed(2)}</Table.Cell>
              <Table.Cell><StatusBadge status={b.status} /></Table.Cell>
              <Table.Cell className="text-nia-text-faint whitespace-nowrap">{new Date(b.createdAt).toLocaleDateString()}</Table.Cell>
              <Table.Cell align="right" className="whitespace-nowrap">
                <div className="flex gap-2 justify-end">
                  {b.status === 'paid' && (
                    <Button variant="secondary" size="sm" icon title="Download PDF" onClick={() => downloadPdf(b)}><Download /></Button>
                  )}
                  {b.status === 'paid' && (
                    <Button variant="danger" size="sm" onClick={() => handleRefund(b)}>Refund</Button>
                  )}
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      {showManual && (
        <ManualBookingModal events={events} onClose={() => setShowManual(false)} onCreated={() => { setShowManual(false); fetchBookings(); }} />
      )}
    </div>
  );
}

function ManualBookingModal({ events, onClose, onCreated }) {
  const [eventId, setEventId] = useState('');
  const [ticketTypes, setTicketTypes] = useState([]);
  const [ticketTypeId, setTicketTypeId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [customer, setCustomer] = useState({ firstName: '', lastName: '', email: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!eventId) { setTicketTypes([]); return; }
    adminApi.get(`/admin/events/${eventId}/ticket-types`).then((r) => setTicketTypes(r.data));
  }, [eventId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await adminApi.post('/admin/bookings/manual', {
        eventId, lines: [{ ticketTypeId, quantity: Number(quantity) }], ...customer,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create booking');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Manual Booking (Walk-in / Offline)" onClose={onClose}>
      {error && <div className="mb-3 rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{error}</div>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className={label}>Event</label>
          <select className={inputCls} required value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">Select an event…</option>
            {events.map((e) => <option key={e._id} value={e._id}>{e.title}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Ticket Type</label>
            <select className={inputCls} required value={ticketTypeId} onChange={(e) => setTicketTypeId(e.target.value)} disabled={!eventId}>
              <option value="">Select…</option>
              {ticketTypes.map((t) => <option key={t._id} value={t._id}>{t.name} (€{t.price})</option>)}
            </select>
          </div>
          <div><label className={label}>Quantity</label><input type="number" min="1" className={inputCls} value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input className={inputCls} placeholder="First name" required value={customer.firstName} onChange={(e) => setCustomer((c) => ({ ...c, firstName: e.target.value }))} />
          <input className={inputCls} placeholder="Last name" required value={customer.lastName} onChange={(e) => setCustomer((c) => ({ ...c, lastName: e.target.value }))} />
        </div>
        <input className={inputCls} type="email" placeholder="Email" required value={customer.email} onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))} />
        <p className="text-xs text-nia-text-faint">Existing members are matched by email; new customers get an account with a password-setup email.</p>
        <div className="flex justify-end gap-2 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Creating…' : 'Create Booking (Paid)'}</Button>
        </div>
      </form>
    </Modal>
  );
}
