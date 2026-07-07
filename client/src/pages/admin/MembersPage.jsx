import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Download, Plus } from 'lucide-react';
import adminApi from '../../services/adminApi';
import StatusBadge from '../../components/admin/StatusBadge';
import Modal from '../../components/admin/Modal';
import PageHeader from '../../components/admin/PageHeader';
import Table from '../../components/admin/Table';
import Button from '../../components/admin/Button';

const inputCls = 'w-full rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20';
const selectFilterCls = 'rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20 w-auto';

export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/admin/members', { params: { search, tier, page, limit: 20 } });
      setMembers(data.members);
      setPages(data.pages);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [search, tier, page]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);
  useEffect(() => { adminApi.get('/admin/membership-tiers').then((r) => setTiers(r.data)); }, []);

  function exportCsv() {
    const params = new URLSearchParams({ search, tier });
    const token = localStorage.getItem('nia_admin_token');
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}/admin/members/export?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'nia-members.csv';
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  return (
    <div>
      <PageHeader
        title="Members"
        actions={(
          <>
            <Button variant="secondary" onClick={exportCsv}><Download /> Export CSV</Button>
            <Button variant="primary" onClick={() => setShowAdd(true)}><Plus /> Add Member</Button>
          </>
        )}
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-nia-text-faint text-xs" />
          <input
            className="w-full rounded-nia-btn border border-nia-border py-2 pl-8 pr-3 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20"
            placeholder="Search name, email, member ID…"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className={selectFilterCls} value={tier} onChange={(e) => { setTier(e.target.value); setPage(1); }}>
          <option value="">All tiers</option>
          {tiers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
      </div>

      <Table>
        <Table.Head>
          <Table.HeaderRow>
            <Table.Th>Name</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Tier</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Joined</Table.Th>
            <Table.Th></Table.Th>
          </Table.HeaderRow>
        </Table.Head>
        <Table.Body>
          {loading && <Table.Skeleton colSpan={6} />}
          {!loading && members.length === 0 && <Table.Empty colSpan={6}>No members found.</Table.Empty>}
          {!loading && members.map((m) => (
            <Table.Row key={m._id}>
              <Table.Cell className="font-medium text-nia-navy-dark">{m.firstName} {m.lastName}</Table.Cell>
              <Table.Cell className="text-nia-text-faint">{m.email}</Table.Cell>
              <Table.Cell className="text-nia-text-muted">{m.membershipTier?.name || '—'}</Table.Cell>
              <Table.Cell><StatusBadge status={m.membershipStatus} /></Table.Cell>
              <Table.Cell className="text-nia-text-faint">
                {new Date(m.transactionDate || m.createdAt).toLocaleDateString()}
                {m.transactionDate && <span className="block text-[10px] text-nia-text-faint">via Mollie</span>}
              </Table.Cell>
              <Table.Cell align="right">
                <Button as={Link} to={`/admin/members/${m._id}`} variant="ghost" size="sm">View</Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-nia-text-muted">
          <span>{total} members total</span>
          <div className="flex gap-2 items-center">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <span className="px-2">Page {page} of {pages}</span>
            <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {showAdd && (
        <AddMemberModal tiers={tiers} onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); fetchMembers(); }} />
      )}
    </div>
  );
}

function AddMemberModal({ tiers, onClose, onCreated }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', membershipTier: '', membershipExpiresAt: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function update(field) { return (e) => setForm((f) => ({ ...f, [field]: e.target.value })); }

  function updateTier(e) {
    const tierId = e.target.value;
    setForm((f) => {
      if (!tierId) return { ...f, membershipTier: '', membershipExpiresAt: '' };
      // Default the validity date to a full billing period from today — admin can still edit it.
      const tier = tiers.find((t) => t._id === tierId);
      const days = tier?.billingPeriod === 'monthly' ? 30 : 365;
      const defaultExpiry = f.membershipExpiresAt || new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      return { ...f, membershipTier: tierId, membershipExpiresAt: defaultExpiry };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await adminApi.post('/admin/members', form);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add Member" onClose={onClose}>
      {error && <div className="mb-3 rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{error}</div>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex gap-3">
          <input className={inputCls} placeholder="First name" required value={form.firstName} onChange={update('firstName')} />
          <input className={inputCls} placeholder="Last name" required value={form.lastName} onChange={update('lastName')} />
        </div>
        <input className={inputCls} type="email" placeholder="Email" required value={form.email} onChange={update('email')} />
        <input className={inputCls} placeholder="Phone (optional)" value={form.phone} onChange={update('phone')} />
        <select className={inputCls} value={form.membershipTier} onChange={updateTier}>
          <option value="">No tier assigned</option>
          {tiers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
        {form.membershipTier && (
          <div>
            <label className="text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-1 block">Membership Valid Until</label>
            <input type="date" className={inputCls} required value={form.membershipExpiresAt} onChange={update('membershipExpiresAt')} />
          </div>
        )}
        <p className="text-xs text-nia-text-faint">The member will receive an email to set their own password{form.membershipTier ? ', plus a membership confirmation with their tier benefits' : ''}.</p>
        <div className="flex justify-end gap-2 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Adding…' : 'Add Member'}</Button>
        </div>
      </form>
    </Modal>
  );
}
