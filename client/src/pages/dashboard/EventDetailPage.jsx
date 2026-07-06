import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Minus, Plus, Tag } from 'lucide-react';
import memberApi from '../../services/memberApi';
import api from '../../services/api';
import { useMemberAuth } from '../../context/MemberAuthContext';
import Card from '../../components/admin/Card';
import Button from '../../components/admin/Button';

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
  const [discountCode, setDiscountCode] = useState('');
  const [discount, setDiscount] = useState(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [freeSuccess, setFreeSuccess] = useState('');

  useEffect(() => { memberApi.get(`/events/${slug}`).then((r) => setEvent(r.data)); }, [slug]);

  const isEligibleForMemberPrice = member?.membershipStatus === 'active';

  function setQty(ttId, qty) {
    setQuantities((q) => ({ ...q, [ttId]: Math.max(0, qty) }));
  }

  const lines = event ? event.ticketTypes
    .map((tt) => ({ tt, qty: quantities[tt._id] || 0 }))
    .filter((l) => l.qty > 0) : [];

  const subtotal = lines.reduce((sum, l) => {
    const price = (l.tt.membershipDiscount && isEligibleForMemberPrice && l.tt.memberPrice != null) ? l.tt.memberPrice : l.tt.price;
    return sum + price * l.qty;
  }, 0);
  const total = discount?.valid ? discount.finalAmount : subtotal;

  async function handleApplyDiscount() {
    if (!discountCode.trim() || !member?.email) return;
    setApplyingDiscount(true);
    try {
      const { data } = await api.post('/discount-codes/preview', {
        code: discountCode.trim(), productType: 'ticket', email: member.email, originalAmount: subtotal,
      });
      setDiscount(data);
    } catch {
      setDiscount({ valid: false, message: 'Could not validate this code right now.' });
    } finally {
      setApplyingDiscount(false);
    }
  }

  async function handleCheckout() {
    setError(''); setBusy(true);
    try {
      const { data } = await memberApi.post('/bookings/create', {
        eventId: event._id,
        lines: lines.map((l) => ({ ticketTypeId: l.tt._id, quantity: l.qty })),
        discountCode: discountCode.trim() || undefined,
      });
      if (data.free) {
        setFreeSuccess(data.message || 'Your booking is fully covered by the discount — no payment required.');
        setBusy(false);
      } else {
        goToCheckout(data.paymentId, data.checkoutUrl);
      }
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

        <Card className="h-fit sticky top-20">
          {freeSuccess ? (
            <>
              <h2 className="font-bold text-nia-navy-dark mb-2">You're all set!</h2>
              <p className="text-sm text-nia-text-muted">{freeSuccess}</p>
            </>
          ) : (
            <>
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

              <div className="mt-3">
                <label className="text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-1 block">Discount Code</label>
                <div className="flex gap-1.5">
                  <input
                    className="flex-1 rounded-nia-btn border border-nia-border px-3 py-1.5 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20"
                    placeholder="Optional" value={discountCode}
                    onChange={(e) => { setDiscountCode(e.target.value); setDiscount(null); }}
                  />
                  <Button variant="secondary" size="sm" disabled={!discountCode.trim() || applyingDiscount} onClick={handleApplyDiscount}>
                    <Tag /> {applyingDiscount ? '…' : 'Apply'}
                  </Button>
                </div>
                {discount?.valid && <p className="text-xs text-nia-success mt-1">✓ €{discount.discount_amount} discount applied</p>}
                {discount && !discount.valid && <p className="text-xs text-nia-error mt-1">{discount.message}</p>}
              </div>

              <div className="flex items-center justify-between mt-4 mb-3">
                <span className="text-sm font-semibold text-nia-text-muted">Total</span>
                <span className="text-xl font-extrabold text-nia-orange">€{total.toFixed(2)}</span>
              </div>
              <Button variant="primary" disabled={busy || lines.length === 0} onClick={handleCheckout} className="w-full">
                {busy ? 'Processing…' : 'Checkout'}
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
