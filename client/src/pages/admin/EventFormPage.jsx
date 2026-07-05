import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import adminApi from '../../services/adminApi';
import Modal from '../../components/admin/Modal';

const CATEGORIES = ['Cultural', 'Community', 'Workshop', 'Festival', 'Exhibition', 'Performance', 'Other'];
const inputCls = 'w-full rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20';
const btnPrimary = 'rounded-nia-btn bg-nia-orange px-4 py-2 text-sm font-semibold text-white hover:bg-nia-orange-dark transition-colors disabled:bg-nia-border disabled:text-nia-text-faint';
const btnSecondary = 'rounded-nia-btn border border-nia-border bg-white px-4 py-2 text-sm font-semibold text-nia-navy-dark hover:bg-nia-panel transition-colors';
const label = 'text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-1 block';

const emptyForm = {
  title: '', description: '', shortDescription: '', category: 'Cultural',
  startDate: '', venueName: '', venueAddress: '', venueCity: '', coverImageUrl: '', capacity: '', memberDiscountPct: 0,
};

function toLocalInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventFormPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showTTModal, setShowTTModal] = useState(null); // ticketType object or 'new' or null

  useEffect(() => {
    if (isNew) return;
    adminApi.get(`/admin/events/${id}`).then((r) => {
      const e = r.data;
      setForm({
        title: e.title, description: e.description || '', shortDescription: e.shortDescription || '',
        category: e.category, startDate: toLocalInputValue(e.startDate), venueName: e.venueName || '',
        venueAddress: e.venueAddress || '', venueCity: e.venueCity || '', coverImageUrl: e.coverImageUrl || '',
        capacity: e.capacity || '', memberDiscountPct: e.memberDiscountPct || 0,
      });
      setTicketTypes(e.ticketTypes || []);
    }).finally(() => setLoading(false));
  }, [id, isNew]);

  function update(field) { return (e) => setForm((f) => ({ ...f, [field]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setMessage(''); setSaving(true);
    try {
      const payload = { ...form, capacity: form.capacity ? Number(form.capacity) : undefined, memberDiscountPct: Number(form.memberDiscountPct) };
      if (isNew) {
        const { data } = await adminApi.post('/admin/events', payload);
        navigate(`/admin/events/${data._id}`, { replace: true });
      } else {
        await adminApi.patch(`/admin/events/${id}`, payload);
        setMessage('Saved successfully');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  }

  function refreshTicketTypes() {
    adminApi.get(`/admin/events/${id}`).then((r) => setTicketTypes(r.data.ticketTypes || []));
  }

  async function handleDeleteTT(tt) {
    if (!window.confirm(`Delete ticket type "${tt.name}"?`)) return;
    try {
      await adminApi.delete(`/admin/ticket-types/${tt._id}`);
      refreshTicketTypes();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete ticket type');
    }
  }

  if (loading) return <div className="text-nia-text-muted">Loading…</div>;

  return (
    <div>
      <Link to="/admin/events" className="inline-flex items-center gap-1.5 text-sm text-nia-text-muted hover:text-nia-navy-dark mb-4">
        <ArrowLeft /> Back to Events
      </Link>
      <h1 className="text-2xl font-extrabold text-nia-navy-dark mb-5">{isNew ? 'Create Event' : form.title}</h1>

      {message && <div className="mb-4 rounded bg-green-50 border-l-4 border-nia-success px-3 py-2 text-sm text-green-700">{message}</div>}
      {error && <div className="mb-4 rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <form onSubmit={handleSubmit} className="lg:col-span-2 rounded-nia-card border border-nia-border bg-white p-5 flex flex-col gap-4">
          <div><label className={label}>Title</label><input className={inputCls} required value={form.title} onChange={update('title')} /></div>
          <div><label className={label}>Short Description</label><input className={inputCls} value={form.shortDescription} onChange={update('shortDescription')} /></div>
          <div><label className={label}>Description</label><textarea className={inputCls} rows={4} value={form.description} onChange={update('description')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Category</label>
              <select className={inputCls} value={form.category} onChange={update('category')}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className={label}>Date & Time</label><input type="datetime-local" className={inputCls} required value={form.startDate} onChange={update('startDate')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Venue Name</label><input className={inputCls} value={form.venueName} onChange={update('venueName')} /></div>
            <div><label className={label}>City</label><input className={inputCls} value={form.venueCity} onChange={update('venueCity')} /></div>
          </div>
          <div><label className={label}>Venue Address</label><input className={inputCls} value={form.venueAddress} onChange={update('venueAddress')} /></div>
          <div><label className={label}>Cover Image URL</label><input className={inputCls} value={form.coverImageUrl} onChange={update('coverImageUrl')} placeholder="/uploads/media/..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Capacity</label><input type="number" min="0" className={inputCls} value={form.capacity} onChange={update('capacity')} /></div>
            <div><label className={label}>Member Discount %</label><input type="number" min="0" max="100" className={inputCls} value={form.memberDiscountPct} onChange={update('memberDiscountPct')} /></div>
          </div>
          <div className="flex justify-end mt-2">
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : isNew ? 'Create Event' : 'Save Changes'}</button>
          </div>
        </form>

        <div className="rounded-nia-card border border-nia-border bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-nia-navy-dark">Ticket Types</h2>
            {!isNew && <button onClick={() => setShowTTModal('new')} className="text-nia-orange text-sm font-semibold hover:underline"><Plus className="inline mr-1" />Add</button>}
          </div>
          {isNew && <p className="text-sm text-nia-text-faint">Save the event first to add ticket types.</p>}
          {!isNew && ticketTypes.length === 0 && <p className="text-sm text-nia-text-faint">No ticket types yet.</p>}
          <div className="flex flex-col gap-2">
            {ticketTypes.map((tt) => (
              <div key={tt._id} className="rounded-nia-btn border border-nia-border p-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-nia-navy-dark text-sm">{tt.name}</p>
                  <p className="text-xs text-nia-text-faint">€{tt.price}{tt.membershipDiscount ? ` (€${tt.memberPrice} members)` : ''} · {tt.quantitySold}/{tt.quantityTotal} sold</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => setShowTTModal(tt)} className="text-xs font-semibold text-nia-navy-dark hover:underline">Edit</button>
                  <button onClick={() => handleDeleteTT(tt)} className="text-nia-error"><Trash2 className="text-xs" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showTTModal && (
        <TicketTypeModal
          eventId={id} ticketType={showTTModal === 'new' ? null : showTTModal}
          onClose={() => setShowTTModal(null)}
          onSaved={() => { setShowTTModal(null); refreshTicketTypes(); }}
        />
      )}
    </div>
  );
}

function TicketTypeModal({ eventId, ticketType, onClose, onSaved }) {
  const [form, setForm] = useState(ticketType ? {
    name: ticketType.name, price: ticketType.price, memberPrice: ticketType.memberPrice ?? '',
    quantityTotal: ticketType.quantityTotal, maxPerOrder: ticketType.maxPerOrder, membershipDiscount: ticketType.membershipDiscount,
  } : { name: '', price: '', memberPrice: '', quantityTotal: '', maxPerOrder: 10, membershipDiscount: false });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSaving(true);
    const payload = {
      ...form, price: Number(form.price), quantityTotal: Number(form.quantityTotal), maxPerOrder: Number(form.maxPerOrder),
      memberPrice: form.memberPrice !== '' ? Number(form.memberPrice) : undefined,
    };
    try {
      if (ticketType) await adminApi.put(`/admin/ticket-types/${ticketType._id}`, payload);
      else await adminApi.post(`/admin/events/${eventId}/ticket-types`, payload);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save ticket type');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={ticketType ? `Edit ${ticketType.name}` : 'Add Ticket Type'} onClose={onClose}>
      {error && <div className="mb-3 rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{error}</div>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div><label className={label}>Name</label><input className={inputCls} required placeholder="General Admission, VIP, Early Bird…" value={form.name} onChange={update('name')} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>Price (€)</label><input type="number" min="0" step="0.01" className={inputCls} required value={form.price} onChange={update('price')} /></div>
          <div><label className={label}>Quantity Available</label><input type="number" min="0" className={inputCls} required value={form.quantityTotal} onChange={update('quantityTotal')} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm text-nia-text-muted">
          <input type="checkbox" checked={form.membershipDiscount} onChange={update('membershipDiscount')} /> Offer a member discount price
        </label>
        {form.membershipDiscount && (
          <div><label className={label}>Member Price (€)</label><input type="number" min="0" step="0.01" className={inputCls} value={form.memberPrice} onChange={update('memberPrice')} /></div>
        )}
        <div><label className={label}>Max Per Order</label><input type="number" min="1" className={inputCls} value={form.maxPerOrder} onChange={update('maxPerOrder')} /></div>
        <div className="flex justify-end gap-2 mt-2">
          <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
          <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}
