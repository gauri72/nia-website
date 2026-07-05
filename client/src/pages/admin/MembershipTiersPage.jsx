import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaEdit, FaTrash, FaArrowLeft } from 'react-icons/fa';
import adminApi from '../../services/adminApi';
import { useAdminAuth } from '../../context/AdminAuthContext';
import Modal from '../../components/admin/Modal';

const inputCls = 'w-full rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20';
const btnPrimary = 'rounded-nia-btn bg-nia-orange px-4 py-2 text-sm font-semibold text-white hover:bg-nia-orange-dark transition-colors disabled:bg-nia-border disabled:text-nia-text-faint';
const btnSecondary = 'rounded-nia-btn border border-nia-border bg-white px-4 py-2 text-sm font-semibold text-nia-navy-dark hover:bg-nia-panel transition-colors';
const label = 'text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-1 block';

const emptyForm = { name: '', description: '', price: '', billingPeriod: 'annual', benefits: '', maxMembers: '', color: '#1a2b5e', isActive: true, renewalReminderDays: 7, gracePeriodDays: 0 };

export default function MembershipTiersPage() {
  const { admin } = useAdminAuth();
  const isSuperAdmin = admin?.role === 'super_admin';

  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // tier object or 'new' or null
  const [error, setError] = useState('');

  function fetchTiers() {
    setLoading(true);
    adminApi.get('/admin/membership-tiers').then((r) => setTiers(r.data)).finally(() => setLoading(false));
  }
  useEffect(() => { fetchTiers(); }, []);

  async function handleDelete(tier) {
    if (!window.confirm(`Delete the "${tier.name}" tier? This cannot be undone.`)) return;
    try {
      await adminApi.delete(`/admin/membership-tiers/${tier._id}`);
      fetchTiers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete tier');
    }
  }

  return (
    <div>
      <Link to="/admin/members" className="inline-flex items-center gap-1.5 text-sm text-nia-text-muted hover:text-nia-navy-dark mb-4">
        <FaArrowLeft /> Back to Members
      </Link>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-extrabold text-nia-navy-dark">Membership Tiers</h1>
        {isSuperAdmin && (
          <button onClick={() => setEditing('new')} className={btnPrimary}><FaPlus className="inline mr-1.5" />Add Tier</button>
        )}
      </div>

      {error && <div className="mb-4 rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{error}</div>}

      {loading && <p className="text-nia-text-faint">Loading…</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiers.map((t) => (
          <div key={t._id} className="rounded-nia-card border border-nia-border bg-white p-5 flex flex-col gap-2" style={{ borderTop: `4px solid ${t.color}` }}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-nia-navy-dark">{t.name}</h3>
              {!t.isActive && <span className="text-xs font-semibold text-nia-text-faint bg-nia-panel-alt rounded-full px-2 py-0.5">Inactive</span>}
            </div>
            <p className="text-2xl font-extrabold text-nia-orange">€{t.price}<span className="text-sm font-medium text-nia-text-faint">/{t.billingPeriod === 'annual' ? 'yr' : 'mo'}</span></p>
            <p className="text-sm text-nia-text-muted">{t.description}</p>
            <ul className="text-sm text-nia-text-muted list-disc list-inside flex-1">
              {t.benefits.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
            <p className="text-xs text-nia-text-faint">{t.activeMemberCount} active member{t.activeMemberCount === 1 ? '' : 's'}{t.maxMembers ? ` / ${t.maxMembers} max` : ''}</p>
            {isSuperAdmin && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => setEditing(t)} className={btnSecondary + ' flex-1'}><FaEdit className="inline mr-1" />Edit</button>
                <button onClick={() => handleDelete(t)} className="rounded-nia-btn border border-nia-error px-3 py-2 text-sm font-semibold text-nia-error hover:bg-red-50"><FaTrash /></button>
              </div>
            )}
          </div>
        ))}
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
    name: tier.name, description: tier.description || '', price: tier.price, billingPeriod: tier.billingPeriod,
    benefits: tier.benefits.join('\n'), maxMembers: tier.maxMembers || '', color: tier.color, isActive: tier.isActive,
    renewalReminderDays: tier.renewalReminderDays, gracePeriodDays: tier.gracePeriodDays,
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
      maxMembers: form.maxMembers ? Number(form.maxMembers) : undefined,
      benefits: form.benefits.split('\n').map((b) => b.trim()).filter(Boolean),
      renewalReminderDays: Number(form.renewalReminderDays),
      gracePeriodDays: Number(form.gracePeriodDays),
    };
    try {
      if (tier) await adminApi.put(`/admin/membership-tiers/${tier._id}`, payload);
      else await adminApi.post('/admin/membership-tiers', payload);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save tier');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={tier ? `Edit ${tier.name}` : 'Add Membership Tier'} onClose={onClose}>
      {error && <div className="mb-3 rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{error}</div>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div><label className={label}>Name</label><input className={inputCls} required value={form.name} onChange={update('name')} /></div>
        <div><label className={label}>Description</label><input className={inputCls} value={form.description} onChange={update('description')} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>Price (€)</label><input type="number" min="0" step="0.01" className={inputCls} required value={form.price} onChange={update('price')} /></div>
          <div>
            <label className={label}>Billing Period</label>
            <select className={inputCls} value={form.billingPeriod} onChange={update('billingPeriod')}>
              <option value="annual">Annual</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
        <div><label className={label}>Benefits (one per line)</label>
          <textarea className={inputCls} rows={4} value={form.benefits} onChange={update('benefits')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>Max Members</label><input type="number" min="0" className={inputCls} placeholder="Unlimited" value={form.maxMembers} onChange={update('maxMembers')} /></div>
          <div><label className={label}>Badge Color</label><input type="color" className="w-full h-9 rounded-nia-btn border border-nia-border" value={form.color} onChange={update('color')} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>Renewal Reminder (days before)</label><input type="number" min="0" className={inputCls} value={form.renewalReminderDays} onChange={update('renewalReminderDays')} /></div>
          <div><label className={label}>Grace Period (days)</label><input type="number" min="0" className={inputCls} value={form.gracePeriodDays} onChange={update('gracePeriodDays')} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm text-nia-text-muted">
          <input type="checkbox" checked={form.isActive} onChange={update('isActive')} /> Active (available for assignment)
        </label>
        <div className="flex justify-end gap-2 mt-2">
          <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
          <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Save Tier'}</button>
        </div>
      </form>
    </Modal>
  );
}
