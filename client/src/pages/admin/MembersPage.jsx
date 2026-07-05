import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FaSearch, FaDownload, FaPlus, FaLayerGroup } from 'react-icons/fa';
import adminApi from '../../services/adminApi';
import StatusBadge from '../../components/admin/StatusBadge';
import Modal from '../../components/admin/Modal';

const STATUS_OPTIONS = ['active', 'expired', 'pending', 'suspended', 'none', 'canceled'];
const inputCls = 'w-full rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20';
const selectFilterCls = 'rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20 w-auto';
const btnPrimary = 'rounded-nia-btn bg-nia-orange px-4 py-2 text-sm font-semibold text-white hover:bg-nia-orange-dark transition-colors disabled:bg-nia-border disabled:text-nia-text-faint';
const btnSecondary = 'rounded-nia-btn border border-nia-border bg-white px-4 py-2 text-sm font-semibold text-nia-navy-dark hover:bg-nia-panel transition-colors';

export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [tier, setTier] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/admin/members', { params: { search, status, tier, page, limit: 20 } });
      setMembers(data.members);
      setPages(data.pages);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [search, status, tier, page]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);
  useEffect(() => { adminApi.get('/admin/membership-tiers').then((r) => setTiers(r.data)); }, []);

  function exportCsv() {
    const params = new URLSearchParams({ search, status, tier });
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
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-extrabold text-nia-navy-dark">Members</h1>
        <div className="flex gap-2">
          <Link to="/admin/membership-tiers" className={btnSecondary}><FaLayerGroup className="inline mr-1.5" />Membership Tiers</Link>
          <button onClick={exportCsv} className={btnSecondary}><FaDownload className="inline mr-1.5" />Export CSV</button>
          <button onClick={() => setShowAdd(true)} className={btnPrimary}><FaPlus className="inline mr-1.5" />Add Member</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-nia-text-faint text-xs" />
          <input
            className="w-full rounded-nia-btn border border-nia-border py-2 pl-8 pr-3 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20"
            placeholder="Search name, email, member ID…"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className={selectFilterCls} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={selectFilterCls} value={tier} onChange={(e) => { setTier(e.target.value); setPage(1); }}>
          <option value="">All tiers</option>
          {tiers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
      </div>

      <div className="rounded-nia-card border border-nia-border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-nia-panel-alt text-left text-xs font-bold uppercase tracking-wide text-nia-text-muted">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-t border-nia-border animate-pulse">
                  <td className="px-4 py-3" colSpan={6}><div className="h-4 bg-nia-panel-alt rounded w-full" /></td>
                </tr>
              ))
            )}
            {!loading && members.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-nia-text-faint">No members found.</td></tr>
            )}
            {!loading && members.map((m) => (
              <tr key={m._id} className="border-t border-nia-border hover:bg-nia-panel/40">
                <td className="px-4 py-3 font-medium text-nia-navy-dark">{m.firstName} {m.lastName}</td>
                <td className="px-4 py-3 text-nia-text-muted">{m.email}</td>
                <td className="px-4 py-3 text-nia-text-muted">{m.membershipTier?.name || '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={m.membershipStatus} /></td>
                <td className="px-4 py-3 text-nia-text-muted">
                  {new Date(m.transactionDate || m.createdAt).toLocaleDateString()}
                  {m.transactionDate && <span className="block text-[10px] text-nia-text-faint">via Mollie</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/admin/members/${m._id}`} className="text-nia-orange font-semibold hover:underline">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-nia-text-muted">
          <span>{total} members total</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={btnSecondary + ' disabled:opacity-40'}>Prev</button>
            <span className="px-2 py-2">Page {page} of {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className={btnSecondary + ' disabled:opacity-40'}>Next</button>
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
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', membershipTier: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function update(field) { return (e) => setForm((f) => ({ ...f, [field]: e.target.value })); }

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
        <select className={inputCls} value={form.membershipTier} onChange={update('membershipTier')}>
          <option value="">No tier assigned</option>
          {tiers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
        <p className="text-xs text-nia-text-faint">The member will receive an email to set their own password.</p>
        <div className="flex justify-end gap-2 mt-2">
          <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
          <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Adding…' : 'Add Member'}</button>
        </div>
      </form>
    </Modal>
  );
}
