import { useEffect, useState, useCallback } from 'react';
import {
  FaSyncAlt, FaDownload, FaCheck, FaTimes, FaExclamationTriangle, FaHistory,
} from 'react-icons/fa';
import adminApi from '../../services/adminApi';
import StatusBadge from '../../components/admin/StatusBadge';

const TABS = [
  { key: 'sync', label: 'Sync & Import' },
  { key: 'history', label: 'Import History' },
  { key: 'review', label: 'Manual Review Queue' },
  { key: 'webhooks', label: 'Webhook Log' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'tiers', label: 'Tier Mapping' },
];

const btnPrimary = 'rounded-nia-btn bg-nia-orange px-4 py-2 text-sm font-semibold text-white hover:bg-nia-orange-dark transition-colors disabled:bg-nia-border disabled:text-nia-text-faint';
const btnSecondary = 'rounded-nia-btn border border-nia-border bg-white px-3 py-1.5 text-xs font-semibold text-nia-navy-dark hover:bg-nia-panel transition-colors disabled:opacity-50';
const inputCls = 'rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20';

function Skeleton({ rows = 4 }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded-nia-btn bg-nia-panel-alt animate-pulse" />
      ))}
    </div>
  );
}

// ── Lightweight page-local toast stack (no new dependency for one page) ──
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
        <div
          key={t.id}
          className={`rounded-nia-btn px-4 py-2.5 text-sm font-semibold shadow-lg text-white ${
            t.type === 'error' ? 'bg-nia-error' : 'bg-nia-success'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

export default function AdminMollieImportPage() {
  const [tab, setTab] = useState('sync');
  const [reviewCount, setReviewCount] = useState(0);
  const { toasts, push } = useToasts();

  useEffect(() => {
    adminApi.get('/admin/mollie/review-queue?status=pending')
      .then((r) => setReviewCount(r.data.length))
      .catch(() => {});
  }, [tab]);

  return (
    <div>
      <ToastStack toasts={toasts} />
      <h1 className="text-2xl font-extrabold text-nia-navy-dark mb-2">Mollie Import</h1>
      <p className="text-sm text-nia-text-faint mb-5">Fetch past Mollie transactions and turn them into real member accounts.</p>

      <div className="flex gap-1 border-b border-nia-border mb-5 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors flex items-center gap-1.5 focus:outline-none ${
              tab === t.key ? 'border-nia-orange text-nia-navy-dark' : 'border-transparent text-nia-text-muted hover:text-nia-navy-dark'
            }`}
          >
            {t.label}
            {t.key === 'review' && reviewCount > 0 && (
              <span className="bg-nia-warning text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center">{reviewCount}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'sync' && <SyncTab push={push} />}
      {tab === 'history' && <HistoryTab push={push} />}
      {tab === 'review' && <ReviewTab push={push} onResolved={() => setTab((t) => t)} />}
      {tab === 'webhooks' && <WebhookTab />}
      {tab === 'transactions' && <TransactionsTab />}
      {tab === 'tiers' && <TiersTab push={push} />}
    </div>
  );
}

// ── Sync & Import ────────────────────────────────────────────────────
function SyncTab({ push }) {
  const [connected, setConnected] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [rows, setRows] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    adminApi.get('/admin/mollie/status').then((r) => setConnected(r.data.connected)).catch(() => setConnected(false));
  }, []);

  async function handleSync() {
    setSyncing(true);
    setRows(null);
    try {
      const r = await adminApi.post('/admin/mollie/sync');
      const fetched = r.data.transactions;
      setRows(fetched);
      setSelected(new Set(fetched.filter((t) => !t.alreadyImported && t.localMatch).map((t) => t.paymentId)));
      push(`Fetched ${fetched.length} paid transaction(s) from Mollie`);
    } catch (err) {
      push(err.response?.data?.error || 'Sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  }

  function toggle(paymentId) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(paymentId)) next.delete(paymentId);
      else next.add(paymentId);
      return next;
    });
  }

  async function handleImport() {
    setImporting(true);
    try {
      const log = await adminApi.post('/admin/mollie/import', { paymentIds: Array.from(selected) });
      push(`Import complete — ${log.data.created} created, ${log.data.updated} updated, ${log.data.flagged} flagged, ${log.data.skipped} skipped`);
      setRows(null);
      setSelected(new Set());
    } catch (err) {
      push(err.response?.data?.error || 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  }

  if (connected === false) {
    return (
      <div className="rounded-nia-card border border-nia-warning/40 bg-nia-warning/10 p-5 text-sm text-nia-navy-dark flex items-center gap-2">
        <FaExclamationTriangle className="text-nia-warning" />
        Mollie is not connected yet. Add an API key in <span className="font-semibold">Settings</span> first.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={handleSync} disabled={syncing || connected === null} className={btnPrimary}>
          <FaSyncAlt className={`inline mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Fetching from Mollie…' : 'Sync Now'}
        </button>
        {rows && (
          <button onClick={handleImport} disabled={importing || selected.size === 0} className={btnPrimary}>
            {importing ? 'Importing…' : `Confirm Import (${selected.size} selected)`}
          </button>
        )}
      </div>

      {syncing && <Skeleton rows={6} />}

      {rows && !syncing && (
        <div className="rounded-nia-card border border-nia-border bg-white overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-nia-panel-alt text-left text-xs font-bold uppercase text-nia-text-muted">
                <th className="px-3 py-3"></th>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Description</th>
                <th className="px-3 py-3">Paid At</th>
                <th className="px-3 py-3">Match</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.paymentId} className={`border-t border-nia-border ${t.alreadyImported ? 'opacity-40' : ''}`}>
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(t.paymentId)}
                      disabled={t.alreadyImported}
                      onChange={() => toggle(t.paymentId)}
                    />
                  </td>
                  <td className="px-3 py-2.5 font-medium text-nia-navy-dark">{t.name || '—'}</td>
                  <td className="px-3 py-2.5 text-nia-text-muted">{t.email || '—'}</td>
                  <td className="px-3 py-2.5 text-nia-text-muted">{t.type || 'unknown'}</td>
                  <td className="px-3 py-2.5 text-nia-text-muted">€{t.amount.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-nia-text-muted">{t.description}</td>
                  <td className="px-3 py-2.5 text-nia-text-muted">{t.paidAt ? new Date(t.paidAt).toLocaleDateString() : '—'}</td>
                  <td className="px-3 py-2.5">
                    {t.alreadyImported ? <StatusBadge status="canceled" /> // reuse neutral "already" styling
                      : t.localMatch ? <StatusBadge status="active" /> : <StatusBadge status="pending" />}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-nia-text-faint">No paid transactions found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Import History ───────────────────────────────────────────────────
function HistoryTab() {
  const [logs, setLogs] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    adminApi.get('/admin/mollie/import-history').then((r) => setLogs(r.data.logs));
  }, []);

  async function openDetail(id) {
    const r = await adminApi.get(`/admin/mollie/import-history/${id}`);
    setDetail(r.data);
  }

  if (!logs) return <Skeleton rows={5} />;

  if (detail) {
    return (
      <div>
        <button onClick={() => setDetail(null)} className={`${btnSecondary} mb-4`}>&larr; Back to history</button>
        <h2 className="font-bold text-nia-navy-dark mb-3">Run detail — {new Date(detail.log.createdAt).toLocaleString()}</h2>
        <div className="rounded-nia-card border border-nia-border bg-white overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-nia-panel-alt text-left text-xs font-bold uppercase text-nia-text-muted"><th className="px-3 py-3">Payment ID</th><th className="px-3 py-3">Email</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">Result</th></tr></thead>
            <tbody>
              {detail.transactions.map((t) => (
                <tr key={t._id} className="border-t border-nia-border">
                  <td className="px-3 py-2.5 font-mono text-xs text-nia-text-muted">{t.paymentId}</td>
                  <td className="px-3 py-2.5 text-nia-text-muted">{t.email || '—'}</td>
                  <td className="px-3 py-2.5 text-nia-text-muted">€{t.amount.toFixed(2)}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={t.importStatus === 'created' || t.importStatus === 'updated' ? 'active' : t.importStatus === 'flagged' ? 'pending' : 'canceled'} /> <span className="text-xs text-nia-text-faint ml-1 capitalize">{t.importStatus}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-nia-card border border-nia-border bg-white overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-nia-panel-alt text-left text-xs font-bold uppercase text-nia-text-muted">
            <th className="px-3 py-3">Date</th><th className="px-3 py-3">Triggered By</th><th className="px-3 py-3">Fetched</th>
            <th className="px-3 py-3">Created</th><th className="px-3 py-3">Updated</th><th className="px-3 py-3">Flagged</th>
            <th className="px-3 py-3">Skipped</th><th className="px-3 py-3">Status</th><th className="px-3 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l._id} className="border-t border-nia-border">
              <td className="px-3 py-2.5 text-nia-text-muted">{new Date(l.createdAt).toLocaleString()}</td>
              <td className="px-3 py-2.5 text-nia-text-muted capitalize">{l.triggeredBy}</td>
              <td className="px-3 py-2.5 text-nia-text-muted">{l.totalFetched}</td>
              <td className="px-3 py-2.5 text-nia-success font-semibold">{l.created}</td>
              <td className="px-3 py-2.5 text-nia-text-muted">{l.updated}</td>
              <td className="px-3 py-2.5 text-nia-warning font-semibold">{l.flagged}</td>
              <td className="px-3 py-2.5 text-nia-text-muted">{l.skipped}</td>
              <td className="px-3 py-2.5"><StatusBadge status={l.status === 'completed' ? 'active' : l.status === 'failed' ? 'suspended' : 'pending'} /></td>
              <td className="px-3 py-2.5">
                <button onClick={() => openDetail(l._id)} className="text-xs font-semibold text-nia-orange hover:underline focus:outline-none">View</button>
              </td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr><td colSpan={9} className="px-3 py-6 text-center text-nia-text-faint">No import runs yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Manual Review Queue ────────────────────────────────────────────
function ReviewTab({ push, onResolved }) {
  const [items, setItems] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [drafts, setDrafts] = useState({});

  function load() {
    adminApi.get('/admin/mollie/review-queue?status=pending').then((r) => setItems(r.data));
  }

  useEffect(() => {
    load();
    adminApi.get('/admin/membership-tiers').then((r) => setTiers(r.data.tiers || r.data)).catch(() => {});
  }, []);

  function updateDraft(id, field, value) {
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] || {}), [field]: value } }));
  }

  async function resolve(id, action) {
    const draft = drafts[id] || {};
    try {
      await adminApi.put(`/admin/mollie/review-queue/${id}`, {
        action, email: draft.email, name: draft.name, membershipTierId: draft.membershipTierId,
      });
      push(action === 'ignore' ? 'Record ignored' : 'Record resolved');
      load();
      onResolved?.();
    } catch (err) {
      push(err.response?.data?.error || 'Could not resolve record', 'error');
    }
  }

  if (!items) return <Skeleton rows={4} />;

  if (items.length === 0) {
    return <div className="rounded-nia-card border border-nia-border bg-white p-6 text-center text-nia-text-faint">Nothing needs manual review.</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <div key={item._id} className="rounded-nia-card border border-nia-border bg-white p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-semibold text-nia-navy-dark">€{item.amount?.toFixed(2)} — {item.transaction?.paymentId}</p>
              <p className="text-xs text-nia-text-faint">{item.description}</p>
              <p className="text-xs text-nia-warning font-semibold mt-1"><FaExclamationTriangle className="inline mr-1" />{item.reason}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            <input placeholder="Email" className={inputCls} value={drafts[item._id]?.email || item.email || ''} onChange={(e) => updateDraft(item._id, 'email', e.target.value)} />
            <input placeholder="Name" className={inputCls} value={drafts[item._id]?.name || item.name || ''} onChange={(e) => updateDraft(item._id, 'name', e.target.value)} />
            <select className={inputCls} value={drafts[item._id]?.membershipTierId || ''} onChange={(e) => updateDraft(item._id, 'membershipTierId', e.target.value)}>
              <option value="">— Assign tier —</option>
              {tiers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => resolve(item._id, 'assign_tier')} className={btnSecondary}><FaCheck className="inline mr-1" />Assign Tier & Create Member</button>
            <button onClick={() => resolve(item._id, 'mark_processed')} className={btnSecondary}>Mark Processed</button>
            <button onClick={() => resolve(item._id, 'ignore')} className={btnSecondary}><FaTimes className="inline mr-1" />Ignore</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Webhook Log ──────────────────────────────────────────────────────
function WebhookTab() {
  const [logs, setLogs] = useState(null);

  useEffect(() => {
    adminApi.get('/admin/mollie/webhook-log').then((r) => setLogs(r.data));
  }, []);

  if (!logs) return <Skeleton rows={4} />;

  return (
    <div className="rounded-nia-card border border-nia-border bg-white overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="bg-nia-panel-alt text-left text-xs font-bold uppercase text-nia-text-muted"><th className="px-3 py-3">Received</th><th className="px-3 py-3">Payment ID</th><th className="px-3 py-3">Action</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Attempts</th></tr></thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l._id} className="border-t border-nia-border">
              <td className="px-3 py-2.5 text-nia-text-muted">{new Date(l.receivedAt).toLocaleString()}</td>
              <td className="px-3 py-2.5 font-mono text-xs text-nia-text-muted">{l.paymentId}</td>
              <td className="px-3 py-2.5 text-nia-text-muted capitalize">{l.action}</td>
              <td className="px-3 py-2.5"><StatusBadge status={l.status === 'success' ? 'active' : l.status === 'retrying' ? 'pending' : 'suspended'} /></td>
              <td className="px-3 py-2.5 text-nia-text-muted">{l.attempts}</td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr><td colSpan={5} className="px-3 py-6 text-center text-nia-text-faint">
              <FaHistory className="inline mr-2" />No webhook events received yet.
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Imported Transactions ────────────────────────────────────────────
function TransactionsTab() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');

  function load(searchValue = search) {
    setData(null);
    adminApi.get('/admin/mollie/transactions', { params: { search: searchValue || undefined } }).then((r) => setData(r.data));
  }

  useEffect(() => { load(''); }, []);

  function handleExport() {
    const token = localStorage.getItem('nia_admin_token');
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}/admin/mollie/transactions/export`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.blob()).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'mollie-transactions.csv'; a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <input
          className={`${inputCls} max-w-xs`}
          placeholder="Search email, name, payment ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
        <div className="flex gap-2">
          <button onClick={() => load()} className={btnSecondary}>Search</button>
          <button onClick={handleExport} className={btnSecondary}><FaDownload className="inline mr-1.5" />Export CSV</button>
        </div>
      </div>

      {!data && <Skeleton rows={6} />}

      {data && (
        <div className="rounded-nia-card border border-nia-border bg-white overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-nia-panel-alt text-left text-xs font-bold uppercase text-nia-text-muted"><th className="px-3 py-3">Email</th><th className="px-3 py-3">Name</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">Result</th><th className="px-3 py-3">Date</th></tr></thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t._id} className="border-t border-nia-border">
                  <td className="px-3 py-2.5 text-nia-navy-dark font-medium">{t.email || '—'}</td>
                  <td className="px-3 py-2.5 text-nia-text-muted">{t.name || '—'}</td>
                  <td className="px-3 py-2.5 text-nia-text-muted">{t.type || 'unknown'}</td>
                  <td className="px-3 py-2.5 text-nia-text-muted">€{t.amount.toFixed(2)}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={t.importStatus === 'created' || t.importStatus === 'updated' ? 'active' : t.importStatus === 'flagged' ? 'pending' : 'canceled'} /></td>
                  <td className="px-3 py-2.5 text-nia-text-muted">{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-nia-text-faint">No transactions imported yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tier Mapping Rules ────────────────────────────────────────────────
function TiersTab({ push }) {
  const [rules, setRules] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [form, setForm] = useState({ matchType: 'keyword', matchValue: '', membershipTier: '' });

  function load() {
    adminApi.get('/admin/mollie/tier-mapping').then((r) => setRules(r.data));
  }

  useEffect(() => {
    load();
    adminApi.get('/admin/membership-tiers').then((r) => setTiers(r.data.tiers || r.data)).catch(() => {});
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.matchValue || !form.membershipTier) return;
    try {
      await adminApi.post('/admin/mollie/tier-mapping', form);
      setForm({ matchType: 'keyword', matchValue: '', membershipTier: '' });
      push('Mapping rule added');
      load();
    } catch (err) {
      push(err.response?.data?.error || 'Could not add rule', 'error');
    }
  }

  async function handleDelete(id) {
    await adminApi.delete(`/admin/mollie/tier-mapping/${id}`);
    push('Mapping rule removed');
    load();
  }

  return (
    <div>
      <p className="text-xs text-nia-text-faint mb-4 max-w-2xl">
        Used only as a fallback for orphaned Mollie transactions with no matching local record — payments created
        through NIA&rsquo;s own checkout flows are already matched reliably via their stored reference, so most imports never need this.
      </p>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-2 mb-5 items-end">
        <div>
          <label className="text-xs font-semibold text-nia-text-muted uppercase block mb-1">Match Type</label>
          <select className={inputCls} value={form.matchType} onChange={(e) => setForm((f) => ({ ...f, matchType: e.target.value }))}>
            <option value="keyword">Description keyword</option>
            <option value="amount">Exact amount</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-nia-text-muted uppercase block mb-1">Value</label>
          <input className={inputCls} placeholder={form.matchType === 'amount' ? '25.00' : 'vip'} value={form.matchValue} onChange={(e) => setForm((f) => ({ ...f, matchValue: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-semibold text-nia-text-muted uppercase block mb-1">Membership Tier</label>
          <select className={inputCls} value={form.membershipTier} onChange={(e) => setForm((f) => ({ ...f, membershipTier: e.target.value }))}>
            <option value="">Select tier…</option>
            {tiers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
        </div>
        <button type="submit" className={btnPrimary}>Add Rule</button>
      </form>

      {!rules && <Skeleton rows={3} />}

      {rules && (
        <div className="rounded-nia-card border border-nia-border bg-white overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-nia-panel-alt text-left text-xs font-bold uppercase text-nia-text-muted"><th className="px-3 py-3">Match Type</th><th className="px-3 py-3">Value</th><th className="px-3 py-3">Tier</th><th className="px-3 py-3"></th></tr></thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r._id} className="border-t border-nia-border">
                  <td className="px-3 py-2.5 text-nia-text-muted capitalize">{r.matchType}</td>
                  <td className="px-3 py-2.5 text-nia-navy-dark font-medium">{r.matchValue}</td>
                  <td className="px-3 py-2.5 text-nia-text-muted">{r.membershipTier?.name}</td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => handleDelete(r._id)} className="text-xs font-semibold text-nia-error hover:underline focus:outline-none">Delete</button>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-nia-text-faint">No mapping rules configured.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
