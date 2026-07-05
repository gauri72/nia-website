import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import adminApi from '../../services/adminApi';
import { useAdminAuth } from '../../context/AdminAuthContext';
import StatusBadge from '../../components/admin/StatusBadge';

const inputCls = 'w-full rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20';
const btnPrimary = 'rounded-nia-btn bg-nia-orange px-4 py-2 text-sm font-semibold text-white hover:bg-nia-orange-dark transition-colors disabled:bg-nia-border disabled:text-nia-text-faint';
const btnSecondary = 'rounded-nia-btn border border-nia-border bg-white px-4 py-2 text-sm font-semibold text-nia-navy-dark hover:bg-nia-panel transition-colors';
const label = 'text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-1 block';

export default function MemberDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  const isSuperAdmin = admin?.role === 'super_admin';

  const [member, setMember] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.get(`/admin/members/${id}`).then((r) => {
      setMember(r.data);
      setForm({
        firstName: r.data.firstName, lastName: r.data.lastName, phone: r.data.phone || '', address: r.data.address || '',
        membershipTier: r.data.membershipTier?._id || '', membershipStatus: r.data.membershipStatus,
        membershipExpiresAt: r.data.membershipExpiresAt ? r.data.membershipExpiresAt.slice(0, 10) : '',
        autoRenew: r.data.autoRenew,
      });
    });
    adminApi.get('/admin/membership-tiers').then((r) => setTiers(r.data));
  }, [id]);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError(''); setMessage(''); setSaving(true);
    try {
      const { data } = await adminApi.patch(`/admin/members/${id}`, form);
      setMember(data);
      setMessage('Saved successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(status) {
    if (!window.confirm(`Are you sure you want to set this member's account to "${status}"?`)) return;
    try {
      const { data } = await adminApi.patch(`/admin/members/${id}/status`, { status });
      setMember(data);
      setMessage(`Account status set to ${status}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status');
    }
  }

  if (!member || !form) return <div className="text-nia-text-muted">Loading…</div>;

  return (
    <div>
      <Link to="/admin/members" className="inline-flex items-center gap-1.5 text-sm text-nia-text-muted hover:text-nia-navy-dark mb-4">
        <ArrowLeft /> Back to Members
      </Link>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-nia-navy-dark">{member.firstName} {member.lastName}</h1>
          <p className="text-sm text-nia-text-faint">
            {member.memberId} · Joined {new Date(member.transactionDate || member.createdAt).toLocaleDateString()}
            {member.transactionDate && ' (via Mollie transaction)'}
          </p>
        </div>
        <StatusBadge status={member.status === 'active' ? member.membershipStatus : member.status} />
      </div>

      {message && <div className="mb-4 rounded bg-green-50 border-l-4 border-nia-success px-3 py-2 text-sm text-green-700">{message}</div>}
      {error && <div className="mb-4 rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <form onSubmit={handleSave} className="lg:col-span-2 rounded-nia-card border border-nia-border bg-white p-5 flex flex-col gap-4">
          <h2 className="font-bold text-nia-navy-dark">Personal Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>First Name</label><input className={inputCls} value={form.firstName} onChange={update('firstName')} /></div>
            <div><label className={label}>Last Name</label><input className={inputCls} value={form.lastName} onChange={update('lastName')} /></div>
          </div>
          <div><label className={label}>Email</label><input className={inputCls + ' bg-nia-panel-alt'} value={member.email} disabled /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Phone</label><input className={inputCls} value={form.phone} onChange={update('phone')} /></div>
            <div><label className={label}>Address</label><input className={inputCls} value={form.address} onChange={update('address')} /></div>
          </div>

          <h2 className="font-bold text-nia-navy-dark mt-2">Membership</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Tier</label>
              <select className={inputCls} value={form.membershipTier} onChange={update('membershipTier')}>
                <option value="">No tier</option>
                {tiers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Membership Status</label>
              <select className={inputCls} value={form.membershipStatus} onChange={update('membershipStatus')}>
                {['none', 'active', 'pending', 'expired', 'suspended', 'canceled'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div><label className={label}>Expiry Date</label><input type="date" className={inputCls} value={form.membershipExpiresAt} onChange={update('membershipExpiresAt')} /></div>
            <label className="flex items-center gap-2 text-sm text-nia-text-muted pb-2">
              <input type="checkbox" checked={form.autoRenew} onChange={update('autoRenew')} /> Auto-renewal enabled
            </label>
          </div>

          <div className="flex justify-end mt-2">
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </form>

        <div className="flex flex-col gap-5">
          <div className="rounded-nia-card border border-nia-border bg-white p-5">
            <h2 className="font-bold text-nia-navy-dark mb-3">Account Actions</h2>
            {isSuperAdmin ? (
              <div className="flex flex-col gap-2">
                <button onClick={() => handleStatusChange('active')} disabled={member.status === 'active'} className={btnSecondary + ' disabled:opacity-40'}>Activate</button>
                <button onClick={() => handleStatusChange('suspended')} disabled={member.status === 'suspended'} className={btnSecondary + ' disabled:opacity-40'}>Suspend</button>
                <button onClick={() => handleStatusChange('deleted')} disabled={member.status === 'deleted'} className="rounded-nia-btn border border-nia-error px-4 py-2 text-sm font-semibold text-nia-error hover:bg-red-50 transition-colors disabled:opacity-40">Delete Account</button>
              </div>
            ) : (
              <p className="text-sm text-nia-text-faint">Only Super Admins can activate, suspend or delete accounts.</p>
            )}
          </div>

          <div className="rounded-nia-card border border-nia-border bg-white p-5">
            <h2 className="font-bold text-nia-navy-dark mb-2">Booking History</h2>
            <p className="text-sm text-nia-text-faint">No bookings yet — event ticketing arrives in the next milestone.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
