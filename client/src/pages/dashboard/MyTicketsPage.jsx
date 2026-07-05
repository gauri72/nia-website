import { useEffect, useState } from 'react';
import { Download, QrCode, X } from 'lucide-react';
import memberApi from '../../services/memberApi';
import StatusBadge from '../../components/admin/StatusBadge';
import Modal from '../../components/admin/Modal';

const btnSecondary = 'rounded-nia-btn border border-nia-border bg-white px-3 py-1.5 text-xs font-semibold text-nia-navy-dark hover:bg-nia-panel transition-colors';

function statusFor(booking) {
  if (booking.status === 'refunded') return 'Cancelled';
  if (booking.status !== 'paid') return booking.status;
  if (booking.event && new Date(booking.event.startDate) < new Date()) return 'Past';
  return 'Confirmed';
}

export default function MyTicketsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrBooking, setQrBooking] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  function load() {
    setLoading(true);
    memberApi.get('/bookings/mine').then((r) => setBookings(r.data)).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function downloadPdf(booking) {
    const token = localStorage.getItem('nia_member_token');
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}/bookings/${booking._id}/ticket.pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.blob()).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `NIA-Ticket-${booking.bookingNumber}.pdf`; a.click();
      URL.revokeObjectURL(url);
    });
  }

  async function showQr(booking) {
    setQrBooking(booking);
    const { data } = await memberApi.get(`/bookings/${booking._id}/qrcode`);
    setQrDataUrl(data.dataUrl);
  }

  async function handleCancel(booking) {
    if (!window.confirm('Cancel this booking and request a refund?')) return;
    try {
      await memberApi.post(`/bookings/${booking._id}/cancel`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Cancellation failed');
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-nia-navy-dark mb-5">My Tickets</h1>

      {!loading && bookings.length === 0 && <p className="text-nia-text-faint">You haven't booked any tickets yet.</p>}

      <div className="flex flex-col gap-3">
        {bookings.map((b) => (
          <div key={b._id} className="rounded-nia-card border border-nia-border bg-white p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-bold text-nia-navy-dark">{b.event?.title}</p>
              <p className="text-sm text-nia-text-muted">{b.event?.startDate && new Date(b.event.startDate).toLocaleString()} · {b.event?.venueCity}</p>
              <p className="text-xs text-nia-text-faint font-mono mt-1">{b.bookingNumber} · {b.lines.map((l) => `${l.quantity}x ${l.name}`).join(', ')}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={statusFor(b)} />
              {b.status === 'paid' && (
                <div className="flex gap-2">
                  <button onClick={() => showQr(b)} className={btnSecondary}><QrCode className="inline mr-1" />QR</button>
                  <button onClick={() => downloadPdf(b)} className={btnSecondary}><Download className="inline mr-1" />PDF</button>
                  {b.event && new Date(b.event.startDate) > new Date() && (
                    <button onClick={() => handleCancel(b)} className="rounded-nia-btn border border-nia-error px-3 py-1.5 text-xs font-semibold text-nia-error hover:bg-red-50"><X className="inline mr-1" />Cancel</button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {qrBooking && (
        <Modal title={`Ticket QR — ${qrBooking.bookingNumber}`} onClose={() => setQrBooking(null)} width="max-w-sm">
          <div className="flex flex-col items-center gap-3">
            {qrDataUrl ? <img src={qrDataUrl} alt="QR code" className="w-48 h-48" /> : <p className="text-nia-text-faint">Loading…</p>}
            <p className="text-sm text-nia-text-faint">Scan at event entry</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
