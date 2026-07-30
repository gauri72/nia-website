import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Minus, Plus, Tag, Sparkles, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { startTicketPayment } from '../../services/paymentService';
import { useMemberAuth } from '../../context/MemberAuthContext';
import PageHeader from '../../components/admin/PageHeader';
import Card from '../../components/admin/Card';
import Button from '../../components/admin/Button';

const inputCls = 'w-full rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20';

// Mirrors client/src/components/events/BookTickets.jsx's TICKETS and
// server/src/controllers/ticketController.js's TICKET_PRICES — this is the
// one real, live event (hardcoded on both sides, no admin-manageable Event
// record involved), so the ticket types/prices are hardcoded here too rather
// than fetched, exactly like the public booking page does.
const TICKETS = [
  { id: 'regular', label: 'Regular Entry', price: 20 },
  { id: 'vip', label: 'VIP Experience (Dinner & Drinks)', price: 45 },
  { id: 'child', label: 'Child (6–12 yrs)', price: 5 },
];

export default function DashboardEventsPage() {
  const { member } = useMemberAuth();
  const [qtys, setQtys] = useState({ regular: 0, vip: 0, child: 0 });
  const [attendeeNames, setAttendeeNames] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [discount, setDiscount] = useState(null);
  const [checkingDiscount, setCheckingDiscount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [freeSuccess, setFreeSuccess] = useState('');

  const isActiveMember = member?.membershipStatus === 'active';

  const selected = TICKETS.filter((tk) => qtys[tk.id] > 0);
  const totalTickets = selected.reduce((sum, tk) => sum + qtys[tk.id], 0);
  const subtotal = selected.reduce((sum, tk) => sum + tk.price * qtys[tk.id], 0);
  const total = discount?.valid ? discount.finalAmount : subtotal;

  function changeQty(id, delta) {
    setQtys((q) => ({ ...q, [id]: Math.max(0, q[id] + delta) }));
    setDiscount(null);
  }

  // The member's email is already known (they're logged in), so — unlike the
  // public guest flow, which only checks the automatic membership discount
  // once an email is typed at Step 1 — this can check live as quantities
  // change, using the same /tickets/preview-discount endpoint the public
  // page uses right before Review. Skipped while a manual discount code is
  // being tried, same precedence the server enforces (code always wins).
  useEffect(() => {
    if (selected.length === 0 || discountCode.trim() || !member?.email) {
      if (!discountCode.trim()) setDiscount(null);
      return;
    }
    let cancelled = false;
    setCheckingDiscount(true);
    api.post('/tickets/preview-discount', {
      email: member.email,
      tickets: selected.map((tk) => ({ ticket_type: tk.id, quantity: qtys[tk.id] })),
    }).then(({ data }) => {
      if (cancelled) return;
      setDiscount(data.finalAmount < data.subtotal
        ? { valid: true, discount_amount: data.discount_amount, finalAmount: data.finalAmount, source: data.source }
        : null);
    }).catch(() => {}).finally(() => { if (!cancelled) setCheckingDiscount(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(qtys), discountCode, member?.email]);

  async function handleApplyDiscountCode() {
    if (!discountCode.trim() || !member?.email || selected.length === 0) return;
    setCheckingDiscount(true);
    try {
      const { data } = await api.post('/tickets/preview-discount', {
        email: member.email,
        tickets: selected.map((tk) => ({ ticket_type: tk.id, quantity: qtys[tk.id] })),
        discountCode: discountCode.trim(),
      });
      if (data.finalAmount < data.subtotal) {
        setDiscount({ valid: true, discount_amount: data.discount_amount, finalAmount: data.finalAmount, source: data.source });
      } else {
        setDiscount({ valid: false, message: data.message || 'This code is not valid for this order.' });
      }
    } catch (err) {
      setDiscount({ valid: false, message: err.response?.data?.error || 'Could not validate this code right now.' });
    } finally {
      setCheckingDiscount(false);
    }
  }

  async function handleBook() {
    if (totalTickets > 1 && !attendeeNames.trim()) {
      setError(`Please list the names of all ${totalTickets} attendees.`);
      return;
    }
    setError(''); setBusy(true);
    try {
      const result = await startTicketPayment({
        name: `${member.firstName} ${member.lastName}`.trim(),
        email: member.email,
        phone: member.phone || undefined,
        attendeeNames: totalTickets > 1 ? attendeeNames.trim() : undefined,
        tickets: selected.map((tk) => ({ ticket_type: tk.id, quantity: qtys[tk.id] })),
        discountCode: discountCode.trim() || undefined,
      });
      if (result.free) {
        setFreeSuccess(result.message || 'Your booking is fully covered by the discount — no payment required.');
        setBusy(false);
      }
      // Otherwise startTicketPayment already redirected the browser to Mollie.
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start checkout');
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Events" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card>
            <span className="text-xs font-bold uppercase tracking-wide text-nia-orange">Festival</span>
            <h1 className="text-2xl font-extrabold text-nia-navy-dark mt-1">80th India Independence Day Celebration &amp; NIA 75th Anniversary</h1>
            <p className="text-nia-text-muted mt-2">
              Join us for a historic celebration as we mark India's 80th Independence Day and the 75th Anniversary of NIA —
              an evening of cultural performances, great food and togetherness. Theme: India, Netherlands and Water.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
              <div className="flex items-start gap-2">
                <Calendar className="text-nia-orange flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-sm font-semibold text-nia-navy-dark">15 August 2026</p>
                  <p className="text-xs text-nia-text-faint">Saturday</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="text-nia-orange flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-sm font-semibold text-nia-navy-dark">18:00</p>
                  <p className="text-xs text-nia-text-faint">Onwards</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="text-nia-orange flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-sm font-semibold text-nia-navy-dark">De Duinpan</p>
                  <p className="text-xs text-nia-text-faint">Sportlaan 34, 2191 XH De Zilk, Noordwijk</p>
                  <a href="https://maps.app.goo.gl/qSfRXG5iMBcR6exs8" target="_blank" rel="noopener noreferrer" className="text-xs text-nia-orange font-semibold hover:underline">View on map</a>
                </div>
              </div>
            </div>
          </Card>
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

              {!isActiveMember && (
                <div className="mb-4 rounded-nia-btn bg-nia-orange/10 border-l-4 border-nia-orange px-3 py-2.5 text-sm text-nia-navy-dark flex items-start gap-2">
                  <Sparkles className="text-nia-orange flex-shrink-0 mt-0.5" size={16} />
                  <span>
                    Active members get a discount on tickets.{' '}
                    <Link to="/dashboard/membership" className="font-semibold underline hover:text-nia-orange">Renew your membership</Link> to unlock member pricing.
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {TICKETS.map((tk) => (
                  <div key={tk.id} className="flex items-center justify-between border-b border-nia-border pb-2">
                    <div>
                      <p className="font-semibold text-sm text-nia-navy-dark">{tk.label}</p>
                      <p className="text-xs text-nia-text-faint">€{tk.price} · per person</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => changeQty(tk.id, -1)} className="w-7 h-7 rounded-full border border-nia-border flex items-center justify-center text-nia-navy-dark"><Minus className="text-xs" /></button>
                      <span className="w-5 text-center text-sm">{qtys[tk.id]}</span>
                      <button type="button" onClick={() => changeQty(tk.id, 1)} className="w-7 h-7 rounded-full border border-nia-border flex items-center justify-center text-nia-navy-dark"><Plus className="text-xs" /></button>
                    </div>
                  </div>
                ))}
              </div>

              {totalTickets > 1 && (
                <div className="mt-3">
                  <label className="text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-1 block">
                    Names of all {totalTickets} attendees
                  </label>
                  <textarea
                    className={inputCls}
                    rows={Math.max(2, totalTickets)}
                    placeholder={Array.from({ length: totalTickets }, (_, i) => `${i + 1}. Full Name`).join('\n')}
                    value={attendeeNames}
                    onChange={(e) => setAttendeeNames(e.target.value)}
                  />
                </div>
              )}

              <div className="mt-3">
                <label className="text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-1 block">Discount Code</label>
                <div className="flex gap-1.5">
                  <input
                    className={`${inputCls} flex-1`}
                    placeholder="Optional" value={discountCode}
                    onChange={(e) => { setDiscountCode(e.target.value); setDiscount(null); }}
                  />
                  <Button variant="secondary" size="sm" disabled={!discountCode.trim() || checkingDiscount || selected.length === 0} onClick={handleApplyDiscountCode}>
                    <Tag /> {checkingDiscount ? '…' : 'Apply'}
                  </Button>
                </div>
                {discount?.valid && (
                  <p className="text-xs text-nia-success mt-1">
                    ✓ {discount.source === 'membership' ? 'Membership discount' : 'Discount'} applied: −€{discount.discount_amount}
                  </p>
                )}
                {discount && !discount.valid && <p className="text-xs text-nia-error mt-1">{discount.message}</p>}
              </div>

              <div className="flex items-center justify-between mt-4 mb-3">
                <span className="text-sm font-semibold text-nia-text-muted">Total</span>
                <span className="text-xl font-extrabold text-nia-orange">€{total.toFixed(2)}</span>
              </div>
              <Button variant="primary" disabled={busy || selected.length === 0} onClick={handleBook} className="w-full justify-center">
                {busy ? 'Processing…' : 'Checkout'}
              </Button>
              <p className="text-xs text-nia-text-faint mt-2 flex items-center gap-1"><ShieldCheck size={12} /> Secure payment via Mollie</p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
