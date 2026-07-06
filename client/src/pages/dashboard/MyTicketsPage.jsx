import { useEffect, useState } from 'react';
import { Download, QrCode, X } from 'lucide-react';
import memberApi from '../../services/memberApi';
import StatusBadge from '../../components/admin/StatusBadge';
import Modal from '../../components/admin/Modal';
import PageHeader from '../../components/admin/PageHeader';
import Card from '../../components/admin/Card';
import Button from '../../components/admin/Button';

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
    const path = booking.source === 'legacy_ticket' ? `legacy/${booking._id}/ticket.pdf` : `${booking._id}/ticket.pdf`;
    const token = localStorage.getItem('nia_member_token');
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}/bookings/${path}`, {
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
    const path = booking.source === 'legacy_ticket' ? `legacy/${booking._id}/qrcode` : `${booking._id}/qrcode`;
    const { data } = await memberApi.get(`/bookings/${path}`);
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
      <PageHeader title="My Tickets" />

      {!loading && bookings.length === 0 && <p className="text-nia-text-faint">You haven't booked any tickets yet.</p>}

      <div className="flex flex-col gap-3">
        {bookings.map((b) => (
          <Card key={b._id} className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-bold text-nia-navy-dark">{b.event?.title}</p>
              <p className="text-sm text-nia-text-muted">{b.event?.startDate && new Date(b.event.startDate).toLocaleString()} · {b.event?.venueCity}</p>
              <p className="text-xs text-nia-text-faint font-mono mt-1">{b.bookingNumber} · {b.lines.map((l) => `${l.quantity}x ${l.name}`).join(', ')}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={statusFor(b)} />
              {b.status === 'paid' && (
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => showQr(b)}><QrCode />QR</Button>
                  <Button variant="secondary" size="sm" onClick={() => downloadPdf(b)}><Download />PDF</Button>
                  {b.source !== 'legacy_ticket' && b.event && new Date(b.event.startDate) > new Date() && (
                    <Button variant="danger" size="sm" onClick={() => handleCancel(b)}><X />Cancel</Button>
                  )}
                </div>
              )}
            </div>
          </Card>
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
