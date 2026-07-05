import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Minus, Plus } from 'lucide-react';
import memberApi from '../../services/memberApi';
import { useMemberAuth } from '../../context/MemberAuthContext';

const btnPrimary = 'rounded-nia-btn bg-nia-orange px-4 py-2 text-sm font-semibold text-white hover:bg-nia-orange-dark transition-colors disabled:bg-nia-border disabled:text-nia-text-faint';

function goToCheckout(paymentId, checkoutUrl) {
  sessionStorage.setItem('nia_pending_payment_id', paymentId);
  window.location.href = checkoutUrl;
}

export default function DashboardEventDetailPage() {
  const { slug } = useParams();
  const { member } = useMemberAuth();
  const [event, setEvent] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { memberApi.get(`/events/${slug}`).then((r) => setEvent(r.data)); }, [slug]);

  const isEligibleForMemberPrice = member?.membershipStatus === 'active';

  function setQty(ttId, qty) {
    setQuantities((q) => ({ ...q, [ttId]: Math.max(0, qty) }));
  }

  const lines = event ? event.ticketTypes
    .map((tt) => ({ tt, qty: quantities[tt._id] || 0 }))
    .filter((l) => l.qty > 0) : [];

  const total = lines.reduce((sum, l) => {
    const price = (l.tt.membershipDiscount && isEligibleForMemberPrice && l.tt.memberPrice != null) ? l.tt.memberPrice : l.tt.price;
    return sum + price * l.qty;
  }, 0);

  async function handleCheckout() {
    setError(''); setBusy(true);
    try {
      const { data } = await memberApi.post('/bookings/create', {
        eventId: event._id,
        lines: lines.map((l) => ({ ticketTypeId: l.tt._id, quantity: l.qty })),
      });
      goToCheckout(data.paymentId, data.checkoutUrl);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start checkout');
      setBusy(false);
    }
  }

  if (!event) return <div className="text-nia-text-muted">Loading…</div>;

  return (
    <div>
      <Link to="/dashboard/events" className="inline-flex items-center gap-1.5 text-sm text-nia-text-muted hover:text-nia-navy-dark mb-4">
        <ArrowLeft /> Back to Events
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          {event.coverImageUrl && <img src={event.coverImageUrl} alt={event.title} className="w-full rounded-nia-card object-cover max-h-72" />}
          <span className="text-xs font-bold uppercase tracking-wide text-nia-orange">{event.category}</span>
          <h1 className="text-2xl font-extrabold text-nia-navy-dark">{event.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-nia-text-muted">
            <span className="flex items-center gap-1.5"><Calendar />{new Date(event.startDate).toLocaleString()}</span>
            {event.venueName && <span className="flex items-center gap-1.5"><MapPin />{event.venueName}{event.venueCity ? `, ${event.venueCity}` : ''}</span>}
          </div>
          <p className="text-nia-text-muted whitespace-pre-line">{event.description}</p>
        </div>

        <div className="rounded-nia-card border border-nia-border bg-white p-5 h-fit sticky top-20">
          <h2 className="font-bold text-nia-navy-dark mb-3">Book Tickets</h2>
          {error && <div className="mb-3 rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{error}</div>}
          {event.ticketTypes.length === 0 && <p className="text-sm text-nia-text-faint">No ticket types available yet.</p>}
          <div className="flex flex-col gap-3">
            {event.ticketTypes.map((tt) => {
              const price = (tt.membershipDiscount && isEligibleForMemberPrice && tt.memberPrice != null) ? tt.memberPrice : tt.price;
              return (
                <div key={tt._id} className="flex items-center justify-between border-b border-nia-border pb-2">
                  <div>
                    <p className="font-semibold text-sm text-nia-navy-dark">{tt.name}</p>
                    <p className="text-xs text-nia-text-faint">
                      €{price}{tt.membershipDiscount && isEligibleForMemberPrice ? ' (member price)' : ''} · {tt.remaining} left
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setQty(tt._id, (quantities[tt._id] || 0) - 1)} className="w-7 h-7 rounded-full border border-nia-border flex items-center justify-center text-nia-navy-dark"><Minus className="text-xs" /></button>
                    <span className="w-5 text-center text-sm">{quantities[tt._id] || 0}</span>
                    <button type="button" onClick={() => setQty(tt._id, Math.min(tt.remaining, tt.maxPerOrder, (quantities[tt._id] || 0) + 1))} className="w-7 h-7 rounded-full border border-nia-border flex items-center justify-center text-nia-navy-dark"><Plus className="text-xs" /></button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-4 mb-3">
            <span className="text-sm font-semibold text-nia-text-muted">Total</span>
            <span className="text-xl font-extrabold text-nia-orange">€{total.toFixed(2)}</span>
          </div>
          <button onClick={handleCheckout} disabled={busy || lines.length === 0} className={btnPrimary + ' w-full'}>
            {busy ? 'Redirecting…' : 'Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
}
