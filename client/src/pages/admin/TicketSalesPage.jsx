import { useEffect, useState, useCallback } from 'react';
import { Ticket, Euro, Users, FileText, QrCode, Send, Undo2, Search, Gift, Eye } from 'lucide-react';
import adminApi from '../../services/adminApi';
import StatusBadge from '../../components/admin/StatusBadge';
import StatCard from '../../components/admin/StatCard';
import Modal from '../../components/admin/Modal';
import PageHeader from '../../components/admin/PageHeader';
import Table from '../../components/admin/Table';
import Button from '../../components/admin/Button';

const inputCls = 'rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20';

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

async function downloadBlob(path, filename) {
  const token = localStorage.getItem('nia_admin_token');
  const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function TicketSalesPage() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const { toasts, push } = useToasts();

  const [vipOpen, setVipOpen] = useState(false);
  const [vipForm, setVipForm] = useState({ name: '', email: '', quantity: 1, guestNamesText: '' });
  const [vipBusy, setVipBusy] = useState(false);
  const [vipResult, setVipResult] = useState(null);

  function load() {
    setData(null);
    adminApi.get('/admin/legacy-tickets', { params: { search: search || undefined } })
      .then((r) => setData(r.data));
  }

  useEffect(() => { load(); }, []);

  async function openDetail(id) {
    const r = await adminApi.get(`/admin/legacy-tickets/${id}`);
    setDetail(r.data);
    const remaining = Math.round((r.data.amount - (r.data.refund_amount || 0)) * 100) / 100;
    setRefundAmount(remaining > 0 ? String(remaining) : '');
  }

  async function handleDownloadPdf(ticket) {
    try {
      await downloadBlob(`/admin/legacy-tickets/${ticket._id}/pdf`, `NIA-Ticket-${ticket.ticketNumber}.pdf`);
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function handleDownloadQr(ticket) {
    try {
      await downloadBlob(`/admin/legacy-tickets/${ticket._id}/qr`, `NIA-Ticket-${ticket.ticketNumber}-QR.png`);
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function handleResendEmail(ticket) {
    setBusy(true);
    try {
      const r = await adminApi.post(`/admin/legacy-tickets/${ticket._id}/resend-email`);
      push(r.data.message);
    } catch (err) {
      push(err.response?.data?.error || 'Could not resend email', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handlePreviewEmail(ticket) {
    try {
      const r = await adminApi.get(`/admin/legacy-tickets/${ticket._id}/email-preview`);
      const blob = new Blob([r.data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      push(err.response?.data?.error || 'Could not load email preview', 'error');
    }
  }

  async function handleRefund(ticket) {
    const amount = Number(refundAmount);
    const remaining = Math.round((ticket.amount - (ticket.refund_amount || 0)) * 100) / 100;
    if (!amount || amount <= 0 || amount > remaining) {
      push(`Enter an amount between €0.01 and €${remaining.toFixed(2)}`, 'error');
      return;
    }
    const isFull = amount >= remaining;
    if (!window.confirm(`Refund €${amount.toFixed(2)} to ${ticket.email} via Mollie? This cannot be undone.`)) return;

    setBusy(true);
    try {
      const r = await adminApi.post(`/admin/legacy-tickets/${ticket._id}/refund`, { amount });
      push(isFull ? 'Full refund processed' : `Partial refund of €${amount.toFixed(2)} processed`);
      setDetail(r.data);
      load();
    } catch (err) {
      push(err.response?.data?.error || 'Refund failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  function openVipModal() {
    setVipForm({ name: '', email: '', quantity: 1, guestNamesText: '' });
    setVipResult(null);
    setVipOpen(true);
  }

  async function handleCreateVip() {
    const quantity = parseInt(vipForm.quantity, 10);
    const guestNames = vipForm.guestNamesText.split('\n').map((n) => n.trim()).filter(Boolean);

    if (!vipForm.name.trim() || !vipForm.email.trim()) {
      push('Name and email are required', 'error');
      return;
    }
    if (!quantity || quantity < 1) {
      push('Quantity must be at least 1', 'error');
      return;
    }
    if (guestNames.length !== quantity) {
      push(`You listed ${guestNames.length} guest name${guestNames.length === 1 ? '' : 's'} but selected a quantity of ${quantity} — these must match, one name per line.`, 'error');
      return;
    }

    setVipBusy(true);
    try {
      const r = await adminApi.post('/admin/vip-passes', {
        name: vipForm.name.trim(),
        email: vipForm.email.trim(),
        quantity,
        guestNames,
      });
      setVipResult(r.data.ticket);
      push(r.data.message);
      load();
    } catch (err) {
      push(err.response?.data?.error || 'Could not create VIP passes', 'error');
    } finally {
      setVipBusy(false);
    }
  }

  return (
    <div>
      <ToastStack toasts={toasts} />
      <PageHeader
        title="Ticket Sales"
        description="Paid tickets booked through the public website's event page (niaonline.org/events)."
        actions={<Button variant="primary" onClick={openVipModal}><Gift /> Send VIP Passes</Button>}
      />

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <StatCard icon={Ticket} label="Paid Tickets" value={data.summary.paidCount} tone="orange" />
          <StatCard icon={Users} label="Seats Sold" value={data.summary.seats} tone="navy" />
          <StatCard icon={Euro} label="Revenue" value={`€${data.summary.revenue.toFixed(2)}`} tone="green" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-nia-text-faint text-xs" />
          <input
            className={`${inputCls} w-full pl-8`}
            placeholder="Search name, email, ticket number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
        </div>
        <Button variant="secondary" onClick={load}>Search</Button>
      </div>

      {!data && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 rounded-nia-btn bg-nia-panel-alt animate-pulse" />)}
        </div>
      )}

      {data && (
        <Table>
          <Table.Head>
            <Table.HeaderRow>
              <Table.Th>Ticket #</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Event</Table.Th>
              <Table.Th>Tickets</Table.Th>
              <Table.Th align="right">Amount</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Booked</Table.Th>
            </Table.HeaderRow>
          </Table.Head>
          <Table.Body>
            {data.items.map((t) => (
              <Table.Row key={t._id}>
                <Table.Cell>
                  <button onClick={() => openDetail(t._id)} className="border-0 bg-transparent font-mono text-xs text-nia-text-faint hover:text-nia-navy-dark transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-nia-orange/40 rounded">{t.ticketNumber}</button>
                </Table.Cell>
                <Table.Cell className="font-medium text-nia-navy-dark">{t.name}</Table.Cell>
                <Table.Cell className="text-nia-text-faint">{t.email}</Table.Cell>
                <Table.Cell className="text-nia-text-muted">{t.eventLabel}</Table.Cell>
                <Table.Cell className="text-nia-text-muted">{t.tickets.map((l) => `${l.quantity}× ${l.ticket_type}`).join(', ')}</Table.Cell>
                <Table.Cell align="right" className="font-semibold text-nia-navy-dark tabular-nums">€{t.amount.toFixed(2)}</Table.Cell>
                <Table.Cell>
                  <div className="flex flex-col gap-1 items-start">
                    <StatusBadge status={t.ticket_status} />
                    {t.payment_provider !== 'mollie' && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-nia-gold/15 text-nia-gold-dark uppercase tracking-wide">
                        <Gift size={10} /> Complimentary
                      </span>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell className="text-nia-text-faint">{new Date(t.createdAt).toLocaleDateString()}</Table.Cell>
              </Table.Row>
            ))}
            {data.items.length === 0 && <Table.Empty colSpan={8}>No ticket bookings found.</Table.Empty>}
          </Table.Body>
        </Table>
      )}

      {detail && (
        <Modal title={`Ticket ${detail.ticketNumber}`} onClose={() => setDetail(null)}>
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-nia-border">
            <span className="w-11 h-11 rounded-full bg-nia-navy/10 text-nia-navy flex items-center justify-center font-bold flex-shrink-0">
              {detail.name?.[0]?.toUpperCase() || '?'}
            </span>
            <div className="min-w-0">
              <p className="font-bold text-nia-navy-dark truncate">{detail.name}</p>
              <p className="text-xs text-nia-text-faint truncate">{detail.email}</p>
            </div>
            <div className="ml-auto text-right flex-shrink-0">
              <p className="text-lg font-extrabold text-nia-navy-dark">€{detail.amount.toFixed(2)}</p>
              <StatusBadge status={detail.ticket_status} />
              {detail.payment_provider !== 'mollie' && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-nia-gold/15 text-nia-gold-dark uppercase tracking-wide">
                  <Gift size={10} /> Complimentary
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            {detail.phone && <div className="flex justify-between"><span className="text-nia-text-faint">Phone</span><span className="text-nia-navy-dark">{detail.phone}</span></div>}
            {detail.attendee_names && <div className="flex justify-between"><span className="text-nia-text-faint">Attendees</span><span className="text-nia-navy-dark">{detail.attendee_names}</span></div>}
            <div className="flex justify-between"><span className="text-nia-text-faint">Event</span><span className="text-nia-navy-dark">{detail.eventLabel}</span></div>
            <hr className="border-nia-border my-1" />
            {detail.tickets.map((l, i) => (
              <div key={i} className="flex justify-between"><span className="text-nia-text-faint capitalize">{l.quantity}× {l.ticket_type}</span><span className="text-nia-navy-dark">€{l.line_total.toFixed(2)}</span></div>
            ))}
            {detail.discount_amount > 0 && (
              <div className="flex justify-between text-nia-success"><span>Discount ({detail.discount_code})</span><span>-€{detail.discount_amount.toFixed(2)}</span></div>
            )}
            <div className="flex justify-between font-bold"><span className="text-nia-navy-dark">Total</span><span className="text-nia-navy-dark">€{detail.amount.toFixed(2)}</span></div>
            <hr className="border-nia-border my-1" />
            {detail.paid_at && <div className="flex justify-between"><span className="text-nia-text-faint">Paid At</span><span className="text-nia-navy-dark">{new Date(detail.paid_at).toLocaleString()}</span></div>}
            <div className="flex justify-between"><span className="text-nia-text-faint">Booked</span><span className="text-nia-navy-dark">{new Date(detail.createdAt).toLocaleString()}</span></div>
            {detail.refund_amount > 0 && (
              <div className="flex justify-between text-nia-error"><span>Refunded</span><span>€{detail.refund_amount.toFixed(2)}</span></div>
            )}

            <hr className="border-nia-border my-1" />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => handleDownloadPdf(detail)}><FileText /> Download PDF</Button>
              <Button variant="secondary" size="sm" onClick={() => handleDownloadQr(detail)}><QrCode /> Download QR</Button>
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => handleResendEmail(detail)}><Send /> Resend Email</Button>
              <Button variant="secondary" size="sm" onClick={() => handlePreviewEmail(detail)}><Eye /> Preview Email</Button>
            </div>

            {detail.ticket_status !== 'refunded' && (
              <div className="mt-2 rounded-nia-btn border border-nia-border bg-nia-panel p-3">
                <p className="text-xs font-semibold text-nia-text-muted uppercase mb-2">Issue Refund</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-nia-text-faint">€</span>
                  <input
                    type="number" min="0.01" step="0.01" className={`${inputCls} w-28`}
                    value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)}
                  />
                  <Button variant="danger" size="sm" disabled={busy} onClick={() => handleRefund(detail)}><Undo2 /> Refund</Button>
                </div>
                <p className="text-[11px] text-nia-text-faint mt-1.5">
                  Remaining refundable: €{(detail.amount - (detail.refund_amount || 0)).toFixed(2)}. Enter a lower amount for a partial refund.
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {vipOpen && (
        <Modal title="Send VIP Passes" onClose={() => setVipOpen(false)}>
          {!vipResult ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-nia-text-faint">
                Issues one complimentary VIP entry (no charge) for the whole party, with a single consolidated PDF —
                one personalised page per guest, all sharing one QR code scannable at the door.
              </p>

              <div>
                <label className="text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-1 block">Primary Contact Name</label>
                <input className={`${inputCls} w-full`} value={vipForm.name} onChange={(e) => setVipForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Ambassador Sharma" />
              </div>
              <div>
                <label className="text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-1 block">Email (PDF will be sent here)</label>
                <input type="email" className={`${inputCls} w-full`} value={vipForm.email} onChange={(e) => setVipForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@email.com" />
              </div>
              <div>
                <label className="text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-1 block">Number of VIP Passes</label>
                <input type="number" min="1" max="50" className={`${inputCls} w-28`} value={vipForm.quantity} onChange={(e) => setVipForm((f) => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-1 block">
                  Guest Names — one per line, must match the quantity above
                </label>
                <textarea
                  className={`${inputCls} w-full`}
                  rows={Math.max(3, Number(vipForm.quantity) || 1)}
                  value={vipForm.guestNamesText}
                  onChange={(e) => setVipForm((f) => ({ ...f, guestNamesText: e.target.value }))}
                  placeholder={'1. Full Name\n2. Full Name'}
                />
              </div>

              <Button variant="primary" disabled={vipBusy} onClick={handleCreateVip}>
                <Gift /> {vipBusy ? 'Generating…' : 'Generate & Send VIP Passes'}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="rounded-nia-btn bg-nia-success/10 border-l-4 border-nia-success px-3 py-2.5 text-sm text-green-800">
                VIP passes created and emailed to {vipResult.email}.
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => handleDownloadPdf(vipResult)}><FileText /> Download PDF</Button>
                <Button variant="secondary" onClick={() => handlePreviewEmail(vipResult)}><Eye /> Preview Email</Button>
                <Button variant="secondary" onClick={() => setVipOpen(false)}>Close</Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
