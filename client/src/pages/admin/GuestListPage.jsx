import { useEffect, useState } from 'react';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import adminApi from '../../services/adminApi';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { EVENTS, DEFAULT_EVENT_SLUG } from '../../config/events';
import Modal from '../../components/admin/Modal';
import PageHeader from '../../components/admin/PageHeader';
import Table from '../../components/admin/Table';
import Button from '../../components/admin/Button';

const inputCls = 'w-full rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20';
const label = 'text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-1 block';

const CATEGORIES = [
  { value: 'artist', label: 'Artist' },
  { value: 'invited_guest', label: 'Invited Guest' },
  { value: 'chief_guest', label: 'Chief Guest' },
];

function categoryLabel(value) {
  return CATEGORIES.find((c) => c.value === value)?.label || value;
}

export default function GuestListPage() {
  const { admin } = useAdminAuth();
  const isSuperAdmin = admin?.role === 'super_admin';

  const [eventSlug, setEventSlug] = useState(DEFAULT_EVENT_SLUG);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    adminApi.get('/admin/guest-list', { params: { eventSlug } }).then((r) => setGuests(r.data)).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [eventSlug]);

  async function toggleCheckIn(guest) {
    try {
      const { data } = await adminApi.post(`/admin/guest-list/${guest._id}/check-in`);
      setGuests((gs) => gs.map((g) => (g._id === guest._id ? data : g)));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update check-in status');
    }
  }

  async function handleDelete(guest) {
    if (!window.confirm(`Remove "${guest.name}" from the guest list?`)) return;
    try {
      await adminApi.delete(`/admin/guest-list/${guest._id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove guest');
    }
  }

  const checkedInCount = guests.filter((g) => g.checkedInAt).length;

  return (
    <div>
      <PageHeader
        title="Guest List"
        description="Artists, invited guests and chief guests — complimentary attendees who count toward the real headcount without buying a ticket."
        actions={isSuperAdmin && <Button variant="primary" onClick={() => setShowAddModal(true)}><Plus /> Add Guest</Button>}
      />

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <select className={inputCls + ' max-w-xs'} value={eventSlug} onChange={(e) => setEventSlug(e.target.value)}>
          {Object.values(EVENTS).map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}
        </select>
        <div className="rounded-nia-btn bg-nia-panel px-4 py-2 text-sm font-semibold text-nia-navy-dark">
          Checked In: <span className="text-nia-orange">{checkedInCount}</span> / {guests.length}
        </div>
      </div>

      {error && <div className="mb-4 rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{error}</div>}

      <Table>
        <Table.Head>
          <Table.HeaderRow>
            <Table.Th>Name</Table.Th>
            <Table.Th>Category</Table.Th>
            <Table.Th>Contact</Table.Th>
            <Table.Th>Checked In</Table.Th>
            <Table.Th></Table.Th>
          </Table.HeaderRow>
        </Table.Head>
        <Table.Body>
          {loading && <Table.Skeleton colSpan={5} />}
          {!loading && guests.length === 0 && <Table.Empty colSpan={5}>No guests added yet.</Table.Empty>}
          {guests.map((g) => (
            <Table.Row key={g._id}>
              <Table.Cell className="font-semibold text-nia-navy-dark">{g.name}</Table.Cell>
              <Table.Cell className="text-nia-text-muted">{categoryLabel(g.tickets?.[0]?.ticket_type)}</Table.Cell>
              <Table.Cell className="text-nia-text-faint text-xs">
                {g.email?.endsWith('@nia.internal') ? '—' : g.email}{g.phone ? ` · ${g.phone}` : ''}
              </Table.Cell>
              <Table.Cell>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!g.checkedInAt} onChange={() => toggleCheckIn(g)} />
                  {g.checkedInAt ? (
                    <span className="flex items-center gap-1 text-nia-success font-semibold"><CheckCircle2 className="text-xs" /> {new Date(g.checkedInAt).toLocaleTimeString()}</span>
                  ) : (
                    <span className="text-nia-text-faint">Not yet</span>
                  )}
                </label>
              </Table.Cell>
              <Table.Cell align="right">
                {isSuperAdmin && (
                  <Button variant="ghost" size="sm" icon className="text-nia-error" onClick={() => handleDelete(g)}><Trash2 /></Button>
                )}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      {showAddModal && (
        <AddGuestModal
          eventSlug={eventSlug}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); load(); }}
        />
      )}
    </div>
  );
}

function AddGuestModal({ eventSlug, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', category: 'artist', email: '', phone: '', eventSlug });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await adminApi.post('/admin/guest-list', form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add guest');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add Guest" onClose={onClose} width="max-w-sm">
      {error && <div className="mb-3 rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{error}</div>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div><label className={label}>Name</label><input className={inputCls} required value={form.name} onChange={update('name')} placeholder="Full name" /></div>
        <div>
          <label className={label}>Category</label>
          <select className={inputCls} value={form.category} onChange={update('category')}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Event</label>
          <select className={inputCls} value={form.eventSlug} onChange={update('eventSlug')}>
            {Object.values(EVENTS).map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}
          </select>
        </div>
        <div><label className={label}>Email (optional)</label><input type="email" className={inputCls} value={form.email} onChange={update('email')} placeholder="For contacting them" /></div>
        <div><label className={label}>Phone (optional)</label><input className={inputCls} value={form.phone} onChange={update('phone')} /></div>
        <div className="flex justify-end gap-2 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving || !form.name.trim()}>{saving ? 'Adding…' : 'Add Guest'}</Button>
        </div>
      </form>
    </Modal>
  );
}
