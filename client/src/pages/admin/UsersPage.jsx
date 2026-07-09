import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, UserCheck, KeyRound, User, Handshake, HeartHandshake, Landmark, Gavel, Crown } from 'lucide-react';
import adminApi from '../../services/adminApi';
import Modal from '../../components/admin/Modal';
import PageHeader from '../../components/admin/PageHeader';
import Table from '../../components/admin/Table';
import Button from '../../components/admin/Button';
import StatCard from '../../components/admin/StatCard';

const inputCls = 'w-full rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20';
const selectFilterCls = 'rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20 w-auto';
const label = 'text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-1 block';

const USER_TYPES = [
  { value: 'user', label: 'User', icon: User },
  { value: 'sponsor_partner', label: 'Sponsor/Partner', icon: Handshake },
  { value: 'friend_membership', label: 'Friend Membership', icon: HeartHandshake },
  { value: 'advisory_council', label: 'Advisory Council', icon: Landmark },
  { value: 'board_member', label: 'Board Member', icon: Gavel },
  { value: 'community_head', label: 'Community Head', icon: Crown },
];
const typeLabel = (v) => USER_TYPES.find((t) => t.value === v)?.label || v;

const emptyForm = { fullName: '', email: '', phone: '', userType: 'user', notes: '' };

export default function UsersPage() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [userType, setUserType] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [converting, setConverting] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    adminApi.get('/admin/contacts', { params: { search: search || undefined, userType: userType || undefined, page, limit: 25 } })
      .then((r) => setData(r.data));
  }, [search, userType, page]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(contact) {
    if (!window.confirm(`Delete "${contact.fullName}"? This cannot be undone.`)) return;
    try {
      await adminApi.delete(`/admin/contacts/${contact._id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  }

  async function handleResetAccount(contact) {
    if (!window.confirm(`Verify ${contact.fullName}'s email and send a password reset link to ${contact.email}?`)) return;
    setError('');
    try {
      const { data } = await adminApi.post(`/admin/contacts/${contact._id}/reset-member-account`);
      alert(data.message);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset account');
    }
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description="Community contact list — sponsors, advisors, board members and prospective users. Convert any of them into a full Member account."
        actions={<Button variant="primary" onClick={() => setShowAdd(true)}><Plus /> Add User</Button>}
      />

      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          {USER_TYPES.map((t) => (
            <StatCard
              key={t.value}
              icon={t.icon}
              label={t.label}
              value={data.byType?.[t.value] || 0}
              tone="orange"
              active={userType === t.value}
              onClick={() => { setUserType((v) => (v === t.value ? '' : t.value)); setPage(1); }}
            />
          ))}
        </div>
      )}

      {error && <div className="mb-4 rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-nia-text-faint text-xs" />
          <input
            className="w-full rounded-nia-btn border border-nia-border py-2 pl-8 pr-3 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20"
            placeholder="Search name, email, phone…"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className={selectFilterCls} value={userType} onChange={(e) => { setUserType(e.target.value); setPage(1); }}>
          <option value="">All types</option>
          {USER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <Table>
        <Table.Head>
          <Table.HeaderRow>
            <Table.Th>Name</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Phone</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th></Table.Th>
          </Table.HeaderRow>
        </Table.Head>
        <Table.Body>
          {!data && <Table.Skeleton colSpan={5} />}
          {data && data.items.length === 0 && <Table.Empty colSpan={5}>No users found.</Table.Empty>}
          {data?.items.map((c) => (
            <Table.Row key={c._id}>
              <Table.Cell className="font-medium text-nia-navy-dark">{c.fullName}</Table.Cell>
              <Table.Cell className="text-nia-text-faint">{c.email}</Table.Cell>
              <Table.Cell className="text-nia-text-muted">{c.phone || '—'}</Table.Cell>
              <Table.Cell className="text-nia-text-muted">{typeLabel(c.userType)}</Table.Cell>
              <Table.Cell align="right">
                <div className="flex justify-end gap-2">
                  {!c.linkedMember && (
                    <Button variant="secondary" size="sm" onClick={() => setConverting(c)}><UserCheck /> Mark as Member</Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => handleResetAccount(c)} title="Verify email & send a password reset link"><KeyRound /> Reset Account</Button>
                  <Button variant="secondary" size="sm" onClick={() => setEditing(c)}><Pencil /></Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(c)}><Trash2 /></Button>
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-nia-text-muted">
          <span>{data.total} users total</span>
          <div className="flex gap-2 items-center">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <span className="px-2">Page {page} of {data.pages}</span>
            <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {showAdd && (
        <UserFormModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />
      )}
      {editing && (
        <UserFormModal contact={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
      {converting && (
        <ConvertToMemberModal contact={converting} onClose={() => setConverting(null)} onConverted={() => { setConverting(null); load(); }} />
      )}
    </div>
  );
}

function UserFormModal({ contact, onClose, onSaved }) {
  const [form, setForm] = useState(contact ? {
    fullName: contact.fullName, email: contact.email, phone: contact.phone || '', userType: contact.userType, notes: contact.notes || '',
  } : emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function update(field) { return (e) => setForm((f) => ({ ...f, [field]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      if (contact) await adminApi.put(`/admin/contacts/${contact._id}`, form);
      else await adminApi.post('/admin/contacts', form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={contact ? 'Edit User' : 'Add User'} onClose={onClose}>
      {error && <div className="mb-3 rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{error}</div>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div><label className={label}>Full Name</label><input className={inputCls} required value={form.fullName} onChange={update('fullName')} /></div>
        <div><label className={label}>Email</label><input className={inputCls} type="email" required value={form.email} onChange={update('email')} /></div>
        <div><label className={label}>Phone</label><input className={inputCls} value={form.phone} onChange={update('phone')} /></div>
        <div>
          <label className={label}>User Type</label>
          <select className={inputCls} value={form.userType} onChange={update('userType')}>
            {USER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div><label className={label}>Notes (optional)</label><input className={inputCls} value={form.notes} onChange={update('notes')} /></div>
        <div className="flex justify-end gap-2 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function splitName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

function ConvertToMemberModal({ contact, onClose, onConverted }) {
  const [tiers, setTiers] = useState([]);
  const guess = splitName(contact.fullName);
  const [form, setForm] = useState({
    firstName: guess.firstName, lastName: guess.lastName, phone: contact.phone || '', membershipTier: '', membershipExpiresAt: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { adminApi.get('/admin/membership-tiers').then((r) => setTiers(r.data)); }, []);

  function update(field) { return (e) => setForm((f) => ({ ...f, [field]: e.target.value })); }

  function updateTier(e) {
    const tierId = e.target.value;
    setForm((f) => {
      if (!tierId) return { ...f, membershipTier: '', membershipExpiresAt: '' };
      const tier = tiers.find((t) => t._id === tierId);
      const days = tier?.billingPeriod === 'monthly' ? 30 : 365;
      const defaultExpiry = f.membershipExpiresAt || new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      return { ...f, membershipTier: tierId, membershipExpiresAt: defaultExpiry };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await adminApi.post(`/admin/contacts/${contact._id}/convert-to-member`, form);
      onConverted();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create member');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Mark as Member — ${contact.fullName}`} onClose={onClose}>
      {error && <div className="mb-3 rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{error}</div>}
      <p className="text-sm text-nia-text-muted mb-3">
        This creates a real Member account for <strong>{contact.email}</strong> — please confirm the name split below.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex gap-3">
          <input className={inputCls} placeholder="First name" required value={form.firstName} onChange={update('firstName')} />
          <input className={inputCls} placeholder="Last name" required value={form.lastName} onChange={update('lastName')} />
        </div>
        <input className={inputCls} placeholder="Phone (optional)" value={form.phone} onChange={update('phone')} />
        <select className={inputCls} value={form.membershipTier} onChange={updateTier}>
          <option value="">No tier assigned</option>
          {tiers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
        {form.membershipTier && (
          <div>
            <label className={label}>Membership Valid Until</label>
            <input type="date" className={inputCls} required value={form.membershipExpiresAt} onChange={update('membershipExpiresAt')} />
          </div>
        )}
        <p className="text-xs text-nia-text-faint">They'll receive an email to set their own password{form.membershipTier ? ', plus a membership confirmation with their tier benefits' : ''}.</p>
        <div className="flex justify-end gap-2 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Creating…' : 'Create Member'}</Button>
        </div>
      </form>
    </Modal>
  );
}
