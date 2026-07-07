import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Download, Check, X, AlertTriangle, History } from 'lucide-react';
import adminApi from '../../services/adminApi';
import StatusBadge from '../../components/admin/StatusBadge';
import PageHeader from '../../components/admin/PageHeader';
import Tabs from '../../components/admin/Tabs';
import Table from '../../components/admin/Table';
import Card from '../../components/admin/Card';
import Button from '../../components/admin/Button';

const TABS = [
  { key: 'sync', label: 'Sync & Import' },
  { key: 'history', label: 'Import History' },
  { key: 'review', label: 'Manual Review Queue' },
  { key: 'webhooks', label: 'Webhook Log' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'tiers', label: 'Tier Mapping' },
];

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

  const tabsWithBadge = TABS.map((t) => (t.key === 'review' ? { ...t, badge: reviewCount } : t));

  return (
    <div>
      <ToastStack toasts={toasts} />
      <PageHeader title="Mollie Import" description="Fetch past Mollie transactions and turn them into real member accounts." />

      <Tabs tabs={tabsWithBadge} active={tab} onChange={setTab} />

      {tab === 'sync' && <SyncTab push={push} />}
      {tab === 'history' && <HistoryTab push={push} />}
      {tab === 'review' && <ReviewTab push={push} onResolved={() => setTab((t) => t)} />}
      {tab === 'webhooks' && <WebhookTab />}
      {tab === 'transactions' && <TransactionsTab push={push} />}
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
        <AlertTriangle className="text-nia-warning" />
        Mollie is not connected yet. Add an API key in <span className="font-semibold">Settings</span> first.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button variant="primary" disabled={syncing || connected === null} onClick={handleSync}>
          <RefreshCw className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Fetching from Mollie…' : 'Sync Now'}
        </Button>
        {rows && (
          <Button variant="primary" disabled={importing || selected.size === 0} onClick={handleImport}>
            {importing ? 'Importing…' : `Confirm Import (${selected.size} selected)`}
          </Button>
        )}
      </div>

      {syncing && <Skeleton rows={6} />}

      {rows && !syncing && (
        <Table>
          <Table.Head>
            <Table.HeaderRow>
              <Table.Th></Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th align="right">Amount</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Paid At</Table.Th>
              <Table.Th>Match</Table.Th>
            </Table.HeaderRow>
          </Table.Head>
          <Table.Body>
            {rows.map((t) => (
              <Table.Row key={t.paymentId} className={t.alreadyImported ? 'opacity-40' : ''}>
                <Table.Cell>
                  <input
                    type="checkbox"
                    checked={selected.has(t.paymentId)}
                    disabled={t.alreadyImported}
                    onChange={() => toggle(t.paymentId)}
                  />
                </Table.Cell>
                <Table.Cell className="font-medium text-nia-navy-dark">{t.name || '—'}</Table.Cell>
                <Table.Cell className="text-nia-text-faint">{t.email || '—'}</Table.Cell>
                <Table.Cell className="text-nia-text-muted">{t.type || 'unknown'}</Table.Cell>
                <Table.Cell align="right" className="font-semibold text-nia-navy-dark tabular-nums">€{t.amount.toFixed(2)}</Table.Cell>
                <Table.Cell className="text-nia-text-muted">{t.description}</Table.Cell>
                <Table.Cell className="text-nia-text-muted">{t.paidAt ? new Date(t.paidAt).toLocaleDateString() : '—'}</Table.Cell>
                <Table.Cell>
                  {t.alreadyImported ? <StatusBadge status="canceled" /> // reuse neutral "already" styling
                    : t.localMatch ? <StatusBadge status="active" /> : <StatusBadge status="pending" />}
                </Table.Cell>
              </Table.Row>
            ))}
            {rows.length === 0 && <Table.Empty colSpan={8}>No paid transactions found.</Table.Empty>}
          </Table.Body>
        </Table>
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
        <Button variant="secondary" size="sm" className="mb-4" onClick={() => setDetail(null)}>&larr; Back to history</Button>
        <h2 className="font-bold text-nia-navy-dark mb-3">Run detail — {new Date(detail.log.createdAt).toLocaleString()}</h2>
        <Table>
          <Table.Head>
            <Table.HeaderRow>
              <Table.Th>Payment ID</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th align="right">Amount</Table.Th>
              <Table.Th>Result</Table.Th>
            </Table.HeaderRow>
          </Table.Head>
          <Table.Body>
            {detail.transactions.map((t) => (
              <Table.Row key={t._id}>
                <Table.Cell className="font-mono text-xs text-nia-text-faint">{t.paymentId}</Table.Cell>
                <Table.Cell className="text-nia-text-faint">{t.email || '—'}</Table.Cell>
                <Table.Cell align="right" className="font-semibold text-nia-navy-dark tabular-nums">€{t.amount.toFixed(2)}</Table.Cell>
                <Table.Cell><StatusBadge status={t.importStatus === 'created' || t.importStatus === 'updated' ? 'active' : t.importStatus === 'flagged' ? 'pending' : 'canceled'} /> <span className="text-xs text-nia-text-faint ml-1 capitalize">{t.importStatus}</span></Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    );
  }

  return (
    <Table>
      <Table.Head>
        <Table.HeaderRow>
          <Table.Th>Date</Table.Th><Table.Th>Triggered By</Table.Th><Table.Th>Fetched</Table.Th>
          <Table.Th>Created</Table.Th><Table.Th>Updated</Table.Th><Table.Th>Flagged</Table.Th>
          <Table.Th>Skipped</Table.Th><Table.Th>Status</Table.Th><Table.Th></Table.Th>
        </Table.HeaderRow>
      </Table.Head>
      <Table.Body>
        {logs.map((l) => (
          <Table.Row key={l._id}>
            <Table.Cell className="text-nia-text-muted">{new Date(l.createdAt).toLocaleString()}</Table.Cell>
            <Table.Cell className="text-nia-text-muted capitalize">{l.triggeredBy}</Table.Cell>
            <Table.Cell className="text-nia-text-muted">{l.totalFetched}</Table.Cell>
            <Table.Cell className="text-nia-success font-semibold">{l.created}</Table.Cell>
            <Table.Cell className="text-nia-text-muted">{l.updated}</Table.Cell>
            <Table.Cell className="text-nia-warning font-semibold">{l.flagged}</Table.Cell>
            <Table.Cell className="text-nia-text-muted">{l.skipped}</Table.Cell>
            <Table.Cell><StatusBadge status={l.status === 'completed' ? 'active' : l.status === 'failed' ? 'suspended' : 'pending'} /></Table.Cell>
            <Table.Cell>
              <Button variant="ghost" size="sm" onClick={() => openDetail(l._id)}>View</Button>
            </Table.Cell>
          </Table.Row>
        ))}
        {logs.length === 0 && <Table.Empty colSpan={9}>No import runs yet.</Table.Empty>}
      </Table.Body>
    </Table>
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
    return <Card className="text-center text-nia-text-faint">Nothing needs manual review.</Card>;
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <Card key={item._id} padded={false} className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-semibold text-nia-navy-dark">€{item.amount?.toFixed(2)} — {item.transaction?.paymentId}</p>
              <p className="text-xs text-nia-text-faint">{item.description}</p>
              {(item.transaction?.paidAt || item.transaction?.mollieCreatedAt) && (
                <p className="text-xs text-nia-text-faint">
                  {item.transaction?.paidAt ? 'Paid' : 'Created'}: {new Date(item.transaction?.paidAt || item.transaction?.mollieCreatedAt).toLocaleString()}
                </p>
              )}
              <p className="text-xs text-nia-warning font-semibold mt-1"><AlertTriangle className="inline mr-1" />{item.reason}</p>
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
            <Button variant="secondary" size="sm" onClick={() => resolve(item._id, 'assign_tier')}><Check /> Assign Tier & Create Member</Button>
            <Button variant="secondary" size="sm" onClick={() => resolve(item._id, 'mark_processed')}>Mark Processed</Button>
            <Button variant="secondary" size="sm" onClick={() => resolve(item._id, 'ignore')}><X /> Ignore</Button>
          </div>
        </Card>
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
    <Table>
      <Table.Head>
        <Table.HeaderRow>
          <Table.Th>Received</Table.Th><Table.Th>Payment ID</Table.Th><Table.Th>Action</Table.Th><Table.Th>Status</Table.Th><Table.Th>Attempts</Table.Th>
        </Table.HeaderRow>
      </Table.Head>
      <Table.Body>
        {logs.map((l) => (
          <Table.Row key={l._id}>
            <Table.Cell className="text-nia-text-muted">{new Date(l.receivedAt).toLocaleString()}</Table.Cell>
            <Table.Cell className="font-mono text-xs text-nia-text-faint">{l.paymentId}</Table.Cell>
            <Table.Cell className="text-nia-text-muted capitalize">{l.action}</Table.Cell>
            <Table.Cell><StatusBadge status={l.status === 'success' ? 'active' : l.status === 'retrying' ? 'pending' : 'suspended'} /></Table.Cell>
            <Table.Cell className="text-nia-text-muted">{l.attempts}</Table.Cell>
          </Table.Row>
        ))}
        {logs.length === 0 && (
          <Table.Empty colSpan={5}><History className="inline mr-2" />No webhook events received yet.</Table.Empty>
        )}
      </Table.Body>
    </Table>
  );
}

// ── Imported Transactions ────────────────────────────────────────────
const SETTLED_OPTIONS = [
  { value: 'paid_settled', label: 'Paid & Settled' },
  { value: 'paid_only', label: 'Paid Only (any settlement)' },
  { value: 'all', label: 'All (incl. failed/expired/pending)' },
];

function TransactionsTab({ push }) {
  const [data, setData] = useState(null);
  const [years, setYears] = useState([]);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('');
  const [settled, setSettled] = useState('paid_settled');
  const [refreshing, setRefreshing] = useState(false);

  function load(params = {}) {
    setData(null);
    adminApi.get('/admin/mollie/transactions', {
      params: { search: search || undefined, year: year || undefined, settled, ...params },
    }).then((r) => setData(r.data));
  }

  useEffect(() => { adminApi.get('/admin/mollie/transactions/years').then((r) => setYears(r.data)); }, []);
  useEffect(() => { load(); }, [year, settled]);

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

  async function handleRefreshSettlements() {
    setRefreshing(true);
    try {
      const r = await adminApi.post('/admin/mollie/transactions/refresh-settlements', { year: year || undefined });
      push(`Checked ${r.data.checked} paid transaction(s) — ${r.data.updated} newly settled`);
      load();
    } catch (err) {
      push(err.response?.data?.error || 'Could not refresh settlement status', 'error');
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
        <div className="flex flex-wrap gap-2">
          <input
            className={`${inputCls} max-w-xs`}
            placeholder="Search email, name, payment ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
          <select className={inputCls} value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className={inputCls} value={settled} onChange={(e) => setSettled(e.target.value)}>
            {SETTLED_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => load()}>Search</Button>
          <Button variant="secondary" size="sm" onClick={handleRefreshSettlements} disabled={refreshing}>
            <RefreshCw /> {refreshing ? 'Checking…' : 'Refresh Settlement Status'}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExport}><Download /> Export CSV</Button>
        </div>
      </div>

      {!data && <Skeleton rows={6} />}

      {data && (
        <Table>
          <Table.Head>
            <Table.HeaderRow>
              <Table.Th>Email</Table.Th><Table.Th>Name</Table.Th><Table.Th>Type</Table.Th>
              <Table.Th align="right">Amount</Table.Th><Table.Th>Result</Table.Th><Table.Th>Settled</Table.Th><Table.Th>Date</Table.Th>
            </Table.HeaderRow>
          </Table.Head>
          <Table.Body>
            {data.items.map((t) => (
              <Table.Row key={t._id}>
                <Table.Cell className="text-nia-navy-dark font-medium">{t.email || '—'}</Table.Cell>
                <Table.Cell className="text-nia-text-muted">{t.name || '—'}</Table.Cell>
                <Table.Cell className="text-nia-text-muted">{t.type || 'unknown'}</Table.Cell>
                <Table.Cell align="right" className="font-semibold text-nia-navy-dark tabular-nums">€{t.amount.toFixed(2)}</Table.Cell>
                <Table.Cell><StatusBadge status={t.importStatus === 'created' || t.importStatus === 'updated' ? 'active' : t.importStatus === 'flagged' ? 'pending' : 'canceled'} /></Table.Cell>
                <Table.Cell>{t.settlementId ? <span className="text-nia-success font-semibold">✓ Settled</span> : <span className="text-nia-text-faint">—</span>}</Table.Cell>
                <Table.Cell className="text-nia-text-muted">{t.paidAt ? new Date(t.paidAt).toLocaleDateString() : new Date(t.createdAt).toLocaleDateString()}</Table.Cell>
              </Table.Row>
            ))}
            {data.items.length === 0 && <Table.Empty colSpan={7}>No transactions found for this filter.</Table.Empty>}
          </Table.Body>
        </Table>
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
        <Button type="submit" variant="primary">Add Rule</Button>
      </form>

      {!rules && <Skeleton rows={3} />}

      {rules && (
        <Table>
          <Table.Head>
            <Table.HeaderRow>
              <Table.Th>Match Type</Table.Th><Table.Th>Value</Table.Th><Table.Th>Tier</Table.Th><Table.Th></Table.Th>
            </Table.HeaderRow>
          </Table.Head>
          <Table.Body>
            {rules.map((r) => (
              <Table.Row key={r._id}>
                <Table.Cell className="text-nia-text-muted capitalize">{r.matchType}</Table.Cell>
                <Table.Cell className="text-nia-navy-dark font-medium">{r.matchValue}</Table.Cell>
                <Table.Cell className="text-nia-text-muted">{r.membershipTier?.name}</Table.Cell>
                <Table.Cell>
                  <Button variant="ghost" size="sm" className="text-nia-error hover:bg-nia-error/10" onClick={() => handleDelete(r._id)}>Delete</Button>
                </Table.Cell>
              </Table.Row>
            ))}
            {rules.length === 0 && <Table.Empty colSpan={4}>No mapping rules configured.</Table.Empty>}
          </Table.Body>
        </Table>
      )}
    </div>
  );
}
