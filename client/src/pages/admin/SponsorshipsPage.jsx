import { useEffect, useState, useCallback } from 'react';
import { Handshake, Euro, Search, Plus, Pencil, Trash2, Medal, Star, Crown, Gem, Trophy, Award, Send, Ticket as TicketIcon } from 'lucide-react';
import adminApi from '../../services/adminApi';
import { useAdminAuth } from '../../context/AdminAuthContext';
import Modal from '../../components/admin/Modal';
import StatusBadge from '../../components/admin/StatusBadge';
import StatCard from '../../components/admin/StatCard';
import PageHeader from '../../components/admin/PageHeader';
import Table from '../../components/admin/Table';
import Button from '../../components/admin/Button';
import Card from '../../components/admin/Card';
import Tabs from '../../components/admin/Tabs';

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  return { toasts, push };
}

function ToastStack({ toasts }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div key={t.id} className={`rounded-nia-btn px-4 py-2.5 text-sm font-semibold shadow-lg text-white ${t.type === 'error' ? 'bg-nia-error' : 'bg-nia-success'}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

const inputCls = 'w-full rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20';
const label = 'text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-1 block';

const ICONS = { medal: Medal, star: Star, crown: Crown, gem: Gem, trophy: Trophy, award: Award };

export default function SponsorshipsPage() {
  const [tab, setTab] = useState('transactions');

  return (
    <div>
      <PageHeader title="Sponsorships" description="Sponsorship transactions and editable packages." />
      <Tabs
        tabs={[{ key: 'transactions', label: 'Transactions' }, { key: 'tiers', label: 'Tiers' }]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'transactions' ? <TransactionsTab /> : <TiersTab />}
    </div>
  );
}

function TransactionsTab() {
  const { admin } = useAdminAuth();
  const isSuperAdmin = admin?.role === 'super_admin';

  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [ticketModal, setTicketModal] = useState(null);
  const { toasts, push } = useToasts();

  function load() {
    setData(null);
    adminApi.get('/admin/sponsorships', { params: { search: search || undefined } }).then((r) => setData(r.data));
  }
  useEffect(() => { load(); }, []);

  async function handleResendEmail(s) {
    setBusyId(s._id);
    try {
      const r = await adminApi.post(`/admin/sponsorships/${s._id}/resend-email`);
      push(r.data.message);
    } catch (err) {
      push(err.response?.data?.error || 'Could not resend email', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function openTicketModal(s) {
    const r = await adminApi.get(`/admin/sponsorships/${s._id}`);
    setTicketModal(r.data);
  }

  return (
    <div>
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <StatCard icon={Handshake} label="Paid Sponsorships" value={data.summary.paidCount} tone="orange" />
          <StatCard icon={Euro} label="Revenue" value={`€${data.summary.revenue.toFixed(2)}`} tone="green" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-nia-text-faint text-xs" />
          <input
            className={`${inputCls} pl-8`}
            placeholder="Search sponsor, company, email…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
        </div>
        <Button variant="secondary" onClick={load}>Search</Button>
      </div>

      <Table>
        <Table.Head>
          <Table.HeaderRow>
            <Table.Th>Reference</Table.Th>
            <Table.Th>Sponsor</Table.Th>
            <Table.Th>Company</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Package</Table.Th>
            <Table.Th align="right">Amount</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Date</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.HeaderRow>
        </Table.Head>
        <Table.Body>
          {!data && <Table.Skeleton colSpan={9} />}
          {data && data.items.length === 0 && <Table.Empty colSpan={9}>No paid sponsorships found.</Table.Empty>}
          {data?.items.map((s) => (
            <Table.Row key={s._id}>
              <Table.Cell className="font-mono text-xs text-nia-text-faint">{s.referenceNumber}</Table.Cell>
              <Table.Cell className="font-medium text-nia-navy-dark">{s.sponsorName}</Table.Cell>
              <Table.Cell className="text-nia-text-muted">{s.companyName || '—'}</Table.Cell>
              <Table.Cell className="text-nia-text-faint">{s.email}</Table.Cell>
              <Table.Cell className="text-nia-text-muted">{s.packageName}</Table.Cell>
              <Table.Cell align="right" className="font-semibold text-nia-navy-dark tabular-nums">€{s.amount.toFixed(2)}</Table.Cell>
              <Table.Cell><StatusBadge status={s.status} /></Table.Cell>
              <Table.Cell className="text-nia-text-faint">{new Date(s.paid_at || s.createdAt).toLocaleDateString()}</Table.Cell>
              <Table.Cell>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={busyId === s._id} onClick={() => handleResendEmail(s)}>
                    <Send /> Resend Email
                  </Button>
                  {isSuperAdmin && (
                    <Button variant="secondary" size="sm" onClick={() => openTicketModal(s)}>
                      <TicketIcon /> Send Tickets
                    </Button>
                  )}
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      {ticketModal && (
        <ComplimentaryTicketsModal
          sponsorship={ticketModal}
          onClose={() => setTicketModal(null)}
          onSent={(message) => { setTicketModal(null); push(message); }}
        />
      )}

      <ToastStack toasts={toasts} />
    </div>
  );
}

const TICKET_TYPES = [
  { value: 'regular', label: 'Regular' },
  { value: 'vip', label: 'VIP' },
  { value: 'child', label: 'Child' },
];

function ComplimentaryTicketsModal({ sponsorship, onClose, onSent }) {
  const [ticketType, setTicketType] = useState('vip');
  const [quantity, setQuantity] = useState(sponsorship.sponsorshipTier?.ticketCount || 1);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const alreadySent = sponsorship.complimentaryTickets?.reduce((sum, c) => sum + c.quantity, 0) || 0;

  async function handleSend(e) {
    e.preventDefault();
    setError(''); setSending(true);
    try {
      const r = await adminApi.post(`/admin/sponsorships/${sponsorship._id}/complimentary-tickets`, { ticketType, quantity: Number(quantity) });
      onSent(r.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send complimentary tickets');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal title={`Send Complimentary Tickets — ${sponsorship.sponsorName}`} onClose={onClose} width="max-w-sm">
      {error && <div className="mb-3 rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{error}</div>}
      <p className="text-sm text-nia-text-muted mb-3">
        Tickets will be emailed directly to <strong>{sponsorship.email}</strong> — no payment is charged.
      </p>
      {sponsorship.sponsorshipTier?.ticketCount > 0 && (
        <p className="text-xs text-nia-text-faint mb-3">
          The {sponsorship.packageName} package includes {sponsorship.sponsorshipTier.ticketCount} complimentary ticket{sponsorship.sponsorshipTier.ticketCount === 1 ? '' : 's'}.
        </p>
      )}
      {alreadySent > 0 && (
        <p className="text-xs text-nia-text-faint mb-3">{alreadySent} complimentary ticket{alreadySent === 1 ? '' : 's'} already sent to this sponsor so far.</p>
      )}
      <form onSubmit={handleSend} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Ticket Type</label>
            <select className={inputCls} value={ticketType} onChange={(e) => setTicketType(e.target.value)}>
              {TICKET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Quantity</label>
            <input type="number" min="1" className={inputCls} required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={sending}>{sending ? 'Sending…' : 'Send Tickets'}</Button>
        </div>
      </form>
    </Modal>
  );
}

const emptyForm = { name: '', description: '', price: '', ticketCount: '', perks: '', icon: 'medal', color: '#1a2b5e', isActive: true };

function TiersTab() {
  const { admin } = useAdminAuth();
  const isSuperAdmin = admin?.role === 'super_admin';

  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  function fetchTiers() {
    setLoading(true);
    adminApi.get('/admin/sponsorship-tiers').then((r) => setTiers(r.data)).finally(() => setLoading(false));
  }
  useEffect(() => { fetchTiers(); }, []);

  async function handleDelete(tier) {
    if (!window.confirm(`Delete the "${tier.name}" package? This cannot be undone.`)) return;
    try {
      await adminApi.delete(`/admin/sponsorship-tiers/${tier._id}`);
      fetchTiers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete package');
    }
  }

  return (
    <div>
      {isSuperAdmin && (
        <div className="flex justify-end mb-4">
          <Button variant="primary" onClick={() => setEditing('new')}><Plus /> Add Package</Button>
        </div>
      )}

      {error && <div className="mb-4 rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{error}</div>}
      {loading && <p className="text-nia-text-faint">Loading…</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiers.map((t) => {
          const Icon = ICONS[t.icon] || Medal;
          return (
            <Card key={t._id} className="flex flex-col gap-2" style={{ borderTop: `4px solid ${t.color}` }}>
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${t.color}1A` }}>
                  <Icon style={{ color: t.color }} />
                </div>
                {!t.isActive && <span className="text-xs font-semibold text-nia-text-faint bg-nia-panel-alt rounded-full px-2 py-0.5">Inactive</span>}
              </div>
              <h3 className="font-bold text-nia-navy-dark">{t.name}</h3>
              <p className="text-2xl font-extrabold text-nia-orange">€{t.price.toLocaleString()}</p>
              <p className="text-sm text-nia-text-muted">{t.description}</p>
              <p className="text-sm text-nia-text-muted">{t.ticketCount} complimentary tickets</p>
              {t.perks?.length > 0 && (
                <ul className="text-sm text-nia-text-muted list-disc list-inside flex-1">
                  {t.perks.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              )}
              {isSuperAdmin && (
                <div className="flex gap-2 mt-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setEditing(t)}><Pencil /> Edit</Button>
                  <Button variant="danger" icon onClick={() => handleDelete(t)}><Trash2 /></Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {editing && (
        <TierFormModal
          tier={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); fetchTiers(); }}
        />
      )}
    </div>
  );
}

function TierFormModal({ tier, onClose, onSaved }) {
  const [form, setForm] = useState(tier ? {
    name: tier.name, description: tier.description || '', price: tier.price, ticketCount: tier.ticketCount || '',
    perks: (tier.perks || []).join('\n'), icon: tier.icon, color: tier.color, isActive: tier.isActive,
  } : emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSaving(true);
    const payload = {
      ...form,
      price: Number(form.price),
      ticketCount: form.ticketCount ? Number(form.ticketCount) : 0,
      perks: form.perks.split('\n').map((p) => p.trim()).filter(Boolean),
    };
    try {
      if (tier) await adminApi.put(`/admin/sponsorship-tiers/${tier._id}`, payload);
      else await adminApi.post('/admin/sponsorship-tiers', payload);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save package');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={tier ? `Edit ${tier.name}` : 'Add Sponsorship Package'} onClose={onClose}>
      {error && <div className="mb-3 rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{error}</div>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div><label className={label}>Name</label><input className={inputCls} required value={form.name} onChange={update('name')} /></div>
        <div><label className={label}>Description</label><input className={inputCls} value={form.description} onChange={update('description')} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>Price (€)</label><input type="number" min="0" step="0.01" className={inputCls} required value={form.price} onChange={update('price')} /></div>
          <div><label className={label}>Complimentary Tickets</label><input type="number" min="0" className={inputCls} value={form.ticketCount} onChange={update('ticketCount')} /></div>
        </div>
        <div><label className={label}>Additional Perks (one per line, optional)</label>
          <textarea className={inputCls} rows={3} value={form.perks} onChange={update('perks')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Icon</label>
            <select className={inputCls} value={form.icon} onChange={update('icon')}>
              {Object.keys(ICONS).map((key) => <option key={key} value={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</option>)}
            </select>
          </div>
          <div><label className={label}>Badge Color</label><input type="color" className="w-full h-9 rounded-nia-btn border border-nia-border" value={form.color} onChange={update('color')} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm text-nia-text-muted">
          <input type="checkbox" checked={form.isActive} onChange={update('isActive')} /> Active (shown on the public sponsorship page)
        </label>
        <div className="flex justify-end gap-2 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving…' : 'Save Package'}</Button>
        </div>
      </form>
    </Modal>
  );
}
