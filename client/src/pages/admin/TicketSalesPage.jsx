import { useEffect, useState, useCallback } from 'react';
import { Ticket, Euro, Users, FileText, QrCode, Send, Undo2, Search } from 'lucide-react';
import adminApi from '../../services/adminApi';
import StatusBadge from '../../components/admin/StatusBadge';
import StatCard from '../../components/admin/StatCard';
import Modal from '../../components/admin/Modal';

const inputCls = 'rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20';
const btnAction = 'rounded-nia-btn border border-nia-border bg-white px-3 py-2 text-xs font-semibold text-nia-navy-dark hover:bg-nia-panel transition-colors disabled:opacity-50 flex items-center gap-1.5';

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

  return (
    <div>
      <ToastStack toasts={toasts} />
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-nia-navy-dark">Ticket Sales</h1>
        <p className="text-sm text-nia-text-faint mt-0.5">Paid tickets booked through the public website&rsquo;s event page (niaonline.org/events).</p>
      </div>

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
        <button onClick={load} className="rounded-nia-btn border border-nia-border bg-white px-4 py-2 text-sm font-semibold text-nia-navy-dark hover:bg-nia-panel transition-colors">Search</button>
      </div>

      {!data && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 rounded-nia-btn bg-nia-panel-alt animate-pulse" />)}
        </div>
      )}

      {data && (
        <div className="rounded-nia-card border border-nia-border bg-white overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-nia-panel-alt text-left text-xs font-bold uppercase tracking-wide text-nia-text-muted">
                <th className="px-4 py-3">Ticket #</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Tickets</th>
                <th className="pl-4 pr-8 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Booked</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t._id} className="border-t border-nia-border">
                  <td className="px-4 py-3">
                    <button onClick={() => openDetail(t._id)} className="font-mono text-xs text-nia-text-faint hover:text-nia-navy-dark transition-colors focus:outline-none">{t.ticketNumber}</button>
                  </td>
                  <td className="px-4 py-3 font-medium text-nia-navy-dark">{t.name}</td>
                  <td className="px-4 py-3 text-nia-text-faint">{t.email}</td>
                  <td className="px-4 py-3 text-nia-text-muted">{t.eventLabel}</td>
                  <td className="px-4 py-3 text-nia-text-muted">{t.tickets.map((l) => `${l.quantity}× ${l.ticket_type}`).join(', ')}</td>
                  <td className="pl-4 pr-8 py-3 font-semibold text-nia-navy-dark text-right tabular-nums">€{t.amount.toFixed(2)}</td>
                  <td className="px-4 py-3"><StatusBadge status={t.ticket_status} /></td>
                  <td className="px-4 py-3 text-nia-text-faint">{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-nia-text-faint">No ticket bookings found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
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
              <button onClick={() => handleDownloadPdf(detail)} className={btnAction}><FileText /> Download PDF</button>
              <button onClick={() => handleDownloadQr(detail)} className={btnAction}><QrCode /> Download QR</button>
              <button onClick={() => handleResendEmail(detail)} disabled={busy} className={btnAction}><Send /> Resend Email</button>
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
                  <button onClick={() => handleRefund(detail)} disabled={busy} className={`${btnAction} bg-nia-error/10 text-nia-error border-nia-error/30 hover:bg-nia-error/20`}>
                    <Undo2 /> Refund
                  </button>
                </div>
                <p className="text-[11px] text-nia-text-faint mt-1.5">
                  Remaining refundable: €{(detail.amount - (detail.refund_amount || 0)).toFixed(2)}. Enter a lower amount for a partial refund.
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
