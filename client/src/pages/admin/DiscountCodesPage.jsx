import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import adminApi from '../../services/adminApi';
import { useAdminAuth } from '../../context/AdminAuthContext';
import Modal from '../../components/admin/Modal';
import StatusBadge from '../../components/admin/StatusBadge';
import PageHeader from '../../components/admin/PageHeader';
import Table from '../../components/admin/Table';
import Button from '../../components/admin/Button';

const inputCls = 'w-full rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20';
const label = 'text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-1 block';

const PRODUCTS = [
  { value: 'ticket', label: 'Tickets' },
  { value: 'membership', label: 'Memberships' },
  { value: 'sponsorship', label: 'Sponsorships' },
];

function formatValue(code) {
  return code.type === 'percentage' ? `${code.value}% off` : `€${code.value} off`;
}

function formatProducts(code) {
  if (!code.applicableProducts?.length) return 'All products';
  return code.applicableProducts.map((p) => PRODUCTS.find((x) => x.value === p)?.label || p).join(', ');
}

export default function DiscountCodesPage() {
  const { admin } = useAdminAuth();
  const isSuperAdmin = admin?.role === 'super_admin';

  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // code object or 'new' or null
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    adminApi.get('/admin/discount-codes').then((r) => setCodes(r.data)).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function handleDelete(code) {
    if (!window.confirm(`Delete discount code "${code.code}"? Past redemptions keep their record either way.`)) return;
    try {
      await adminApi.delete(`/admin/discount-codes/${code._id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete discount code');
    }
  }

  return (
    <div>
      <PageHeader
        title="Discount Codes"
        description="Reusable coupon codes for ticket, membership, and sponsorship purchases."
        actions={isSuperAdmin && <Button variant="primary" onClick={() => setEditing('new')}><Plus /> New Code</Button>}
      />

      {error && <div className="mb-4 rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{error}</div>}

      <Table>
        <Table.Head>
          <Table.HeaderRow>
            <Table.Th>Code</Table.Th>
            <Table.Th>Discount</Table.Th>
            <Table.Th>Applies To</Table.Th>
            <Table.Th align="right">Redemptions</Table.Th>
            <Table.Th>Validity</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th></Table.Th>
          </Table.HeaderRow>
        </Table.Head>
        <Table.Body>
          {loading && <Table.Skeleton colSpan={7} />}
          {!loading && codes.length === 0 && <Table.Empty colSpan={7}>No discount codes yet.</Table.Empty>}
          {codes.map((c) => (
            <Table.Row key={c._id}>
              <Table.Cell className="font-mono font-semibold text-nia-navy-dark">{c.code}</Table.Cell>
              <Table.Cell className="font-medium text-nia-navy-dark">{formatValue(c)}</Table.Cell>
              <Table.Cell className="text-nia-text-muted">{formatProducts(c)}</Table.Cell>
              <Table.Cell align="right" className="tabular-nums text-nia-text-muted">
                {c.redemptionCount}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ''}
              </Table.Cell>
              <Table.Cell className="text-nia-text-faint">
                {c.startsAt || c.expiresAt
                  ? [c.startsAt && `From ${new Date(c.startsAt).toLocaleDateString()}`, c.expiresAt && `Until ${new Date(c.expiresAt).toLocaleDateString()}`].filter(Boolean).join(' · ')
                  : 'Always valid'}
              </Table.Cell>
              <Table.Cell><StatusBadge status={c.isActive ? 'active' : 'inactive'} /></Table.Cell>
              <Table.Cell align="right">
                {isSuperAdmin && (
                  <div className="flex gap-1.5 justify-end">
                    <Button variant="ghost" size="sm" icon onClick={() => setEditing(c)}><Pencil /></Button>
                    <Button variant="ghost" size="sm" icon className="text-nia-error" onClick={() => handleDelete(c)}><Trash2 /></Button>
                  </div>
                )}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      {editing && (
        <DiscountCodeFormModal
          code={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

const emptyForm = {
  code: '', description: '', type: 'percentage', value: '',
  applicableProducts: [], maxRedemptions: '', maxRedemptionsPerCustomer: 1,
  startsAt: '', expiresAt: '', isActive: true,
};

function DiscountCodeFormModal({ code, onClose, onSaved }) {
  const [form, setForm] = useState(code ? {
    code: code.code, description: code.description || '', type: code.type, value: code.value,
    applicableProducts: code.applicableProducts || [], maxRedemptions: code.maxRedemptions || '',
    maxRedemptionsPerCustomer: code.maxRedemptionsPerCustomer ?? 1,
    startsAt: code.startsAt ? code.startsAt.slice(0, 10) : '', expiresAt: code.expiresAt ? code.expiresAt.slice(0, 10) : '',
    isActive: code.isActive,
  } : emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  }

  function toggleProduct(value) {
    setForm((f) => ({
      ...f,
      applicableProducts: f.applicableProducts.includes(value)
        ? f.applicableProducts.filter((p) => p !== value)
        : [...f.applicableProducts, value],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSaving(true);
    const payload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      value: Number(form.value),
      maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
      maxRedemptionsPerCustomer: Number(form.maxRedemptionsPerCustomer),
      startsAt: form.startsAt || undefined,
      expiresAt: form.expiresAt || undefined,
    };
    try {
      if (code) await adminApi.put(`/admin/discount-codes/${code._id}`, payload);
      else await adminApi.post('/admin/discount-codes', payload);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save discount code');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={code ? `Edit ${code.code}` : 'New Discount Code'} onClose={onClose}>
      {error && <div className="mb-3 rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{error}</div>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div><label className={label}>Code</label><input className={inputCls + ' uppercase'} required value={form.code} onChange={update('code')} placeholder="e.g. WELCOME10" /></div>
        <div><label className={label}>Description</label><input className={inputCls} value={form.description} onChange={update('description')} placeholder="Admin note — not shown to customers" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Type</label>
            <select className={inputCls} value={form.type} onChange={update('type')}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
            </select>
          </div>
          <div>
            <label className={label}>Value ({form.type === 'percentage' ? '%' : '€'})</label>
            <input type="number" min="0" step="0.01" className={inputCls} required value={form.value} onChange={update('value')} />
          </div>
        </div>
        <div>
          <label className={label}>Applies To</label>
          <div className="flex flex-wrap gap-3">
            {PRODUCTS.map((p) => (
              <label key={p.value} className="flex items-center gap-1.5 text-sm text-nia-text-muted">
                <input type="checkbox" checked={form.applicableProducts.includes(p.value)} onChange={() => toggleProduct(p.value)} /> {p.label}
              </label>
            ))}
          </div>
          <p className="text-[11px] text-nia-text-faint mt-1">Leave all unchecked to allow this code on any product type.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>Max Total Redemptions</label><input type="number" min="0" className={inputCls} placeholder="Unlimited" value={form.maxRedemptions} onChange={update('maxRedemptions')} /></div>
          <div><label className={label}>Max Per Customer</label><input type="number" min="0" className={inputCls} value={form.maxRedemptionsPerCustomer} onChange={update('maxRedemptionsPerCustomer')} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>Starts At</label><input type="date" className={inputCls} value={form.startsAt} onChange={update('startsAt')} /></div>
          <div><label className={label}>Expires At</label><input type="date" className={inputCls} value={form.expiresAt} onChange={update('expiresAt')} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm text-nia-text-muted">
          <input type="checkbox" checked={form.isActive} onChange={update('isActive')} /> Active
        </label>
        <div className="flex justify-end gap-2 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving…' : 'Save Code'}</Button>
        </div>
      </form>
    </Modal>
  );
}
