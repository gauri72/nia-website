import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Minus, Plus, Tag, ShieldCheck, IdCard, PiggyBank, Sparkles } from 'lucide-react';
import api from '../../services/api';
import memberApi from '../../services/memberApi';
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

function computeMemberPrice(tk, tier) {
  if (!tier?.ticketDiscountType) return tk.price;
  const value = tier.ticketDiscountValue || 0;
  const discounted = tier.ticketDiscountType === 'percentage' ? tk.price * (1 - value / 100) : tk.price - value;
  return Math.max(0, discounted);
}

export default function DashboardEventsPage() {
  const { member } = useMemberAuth();
  const [qtys, setQtys] = useState({ regular: 0, vip: 0, child: 0 });
  const [attendeeNames, setAttendeeNames] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [freeSuccess, setFreeSuccess] = useState('');

  // ── Ticket-only flow (already-active members) ──────────────────────
  const [discountCode, setDiscountCode] = useState('');
  const [discount, setDiscount] = useState(null);
  const [checkingDiscount, setCheckingDiscount] = useState(false);

  // ── Bundle flow (no active membership — join/renew + book together) ──
  const [tiers, setTiers] = useState([]);
  const [selectedTierId, setSelectedTierId] = useState('');
  const [bundlePreview, setBundlePreview] = useState(null);
  const [checkingBundle, setCheckingBundle] = useState(false);

  const isActiveMember = member?.membershipStatus === 'active';

  const selected = TICKETS.filter((tk) => qtys[tk.id] > 0);
  const totalTickets = selected.reduce((sum, tk) => sum + qtys[tk.id], 0);
  const subtotal = selected.reduce((sum, tk) => sum + tk.price * qtys[tk.id], 0);
  const total = discount?.valid ? discount.finalAmount : subtotal;

  function changeQty(id, delta) {
    setQtys((q) => ({ ...q, [id]: Math.max(0, q[id] + delta) }));
    setDiscount(null);
  }

  useEffect(() => {
    if (isActiveMember) return;
    api.get('/membership-tiers').then((r) => {
      setTiers(r.data);
      if (r.data.length > 0) setSelectedTierId((id) => id || r.data[0]._id);
    });
  }, [isActiveMember]);

  // The member's email is already known (they're logged in), so — unlike the
  // public guest flow, which only checks the automatic membership discount
  // once an email is typed at Step 1 — this can check live as quantities
  // change, using the same /tickets/preview-discount endpoint the public
  // page uses right before Review. Skipped while a manual discount code is
  // being tried, same precedence the server enforces (code always wins).
  // Only runs for already-active members — non-active members get the
  // bundle preview below instead, which already includes the ticket discount
  // the tier they're about to join would unlock.
  useEffect(() => {
    if (!isActiveMember) return;
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
  }, [isActiveMember, JSON.stringify(qtys), discountCode, member?.email]);

  // Live bundle price breakdown — recomputed as the member picks a tier or
  // adjusts ticket quantities, using the exact same server-side calculation
  // the real checkout will charge (server/src/controllers/member/memberBundleController.js).
  useEffect(() => {
    if (isActiveMember || !selectedTierId || selected.length === 0) { setBundlePreview(null); return; }
    let cancelled = false;
    setCheckingBundle(true);
    memberApi.post('/member/bundle/preview', {
      tierId: selectedTierId,
      tickets: selected.map((tk) => ({ ticket_type: tk.id, quantity: qtys[tk.id] })),
    }).then(({ data }) => { if (!cancelled) setBundlePreview(data); })
      .catch(() => { if (!cancelled) setBundlePreview(null); })
      .finally(() => { if (!cancelled) setCheckingBundle(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActiveMember, selectedTierId, JSON.stringify(qtys)]);

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

  async function handleBundleCheckout() {
    if (!selectedTierId) { setError('Please choose a membership tier.'); return; }
    if (selected.length === 0) { setError('Please select at least one ticket.'); return; }
    if (totalTickets > 1 && !attendeeNames.trim()) {
      setError(`Please list the names of all ${totalTickets} attendees.`);
      return;
    }
    setError(''); setBusy(true);
    try {
      const { data } = await memberApi.post('/member/bundle/create', {
        tierId: selectedTierId,
        tickets: selected.map((tk) => ({ ticket_type: tk.id, quantity: qtys[tk.id] })),
        attendeeNames: totalTickets > 1 ? attendeeNames.trim() : undefined,
      });
      if (data.free) {
        setFreeSuccess(data.message || 'Your membership and tickets are fully covered — no payment required.');
        setBusy(false);
      } else {
        sessionStorage.setItem('nia_pending_payment_id', data.paymentId);
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start checkout');
      setBusy(false);
    }
  }

  const bundleTotal = bundlePreview?.amount ?? null;

  return (
    <div>
      <PageHeader title="Events" />

      {!isActiveMember && tiers.length > 0 && (
        <Card className="mb-6">
          <label className="text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-1.5 block">Price Comparison — Without vs. With Membership</label>
          <div className="overflow-hidden rounded-nia-btn border border-nia-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-nia-panel">
                  <th className="text-left px-3 py-2 font-semibold text-nia-text-muted">Ticket</th>
                  <th className="text-right px-3 py-2 font-semibold text-nia-text-muted">Without Membership</th>
                  {tiers.map((tier) => (
                    <th key={tier._id} className="text-right px-3 py-2 font-semibold text-nia-success">With {tier.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TICKETS.map((tk) => (
                  <tr key={tk.id} className="border-t border-nia-border">
                    <td className="px-3 py-2 text-nia-navy-dark">{tk.label}</td>
                    <td className="px-3 py-2 text-right text-nia-text-faint">€{tk.price.toFixed(2)}</td>
                    {tiers.map((tier) => {
                      const memberPrice = computeMemberPrice(tk, tier);
                      const savesAmount = tk.price - memberPrice;
                      return (
                        <td key={tier._id} className="px-3 py-2 text-right font-semibold text-nia-success">
                          €{memberPrice.toFixed(2)}
                          {savesAmount > 0 && <span className="block text-[11px] font-normal text-nia-text-faint">save €{savesAmount.toFixed(2)}</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-nia-border bg-nia-panel">
                  <td className="px-3 py-2 font-semibold text-nia-navy-dark" colSpan={2}>Membership price</td>
                  {tiers.map((tier) => (
                    <td key={tier._id} className="px-3 py-2 text-right font-semibold text-nia-navy-dark">€{tier.price.toFixed(2)}/yr</td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-[11px] text-nia-text-faint mt-1.5">
            Member ticket pricing is capped at a limited number of discounted tickets per member for this event — additional tickets are full price. Choose a tier below to join &amp; book.
          </p>
        </Card>
      )}

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
              <h2 className={`font-bold text-nia-navy-dark ${isActiveMember ? 'mb-3' : 'mb-2'}`}>{isActiveMember ? 'Book Tickets' : 'Join & Book Tickets'}</h2>
              {!isActiveMember && (
                <div className="mb-4 rounded-nia-btn bg-nia-success/10 border-l-4 border-nia-success px-3 py-2.5 text-sm text-nia-navy-dark flex items-start gap-2 animate-pulse">
                  <Sparkles className="text-nia-success flex-shrink-0 mt-0.5" size={16} />
                  <span className="font-semibold">Join and book your tickets &amp; membership together in one checkout — save time with a single payment instead of two.</span>
                </div>
              )}
              {error && <div className="mb-3 rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{error}</div>}

              {!isActiveMember && (
                <div className="mb-4">
                  <label className="text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <IdCard size={13} className="text-nia-orange" /> Choose a Membership
                  </label>
                  <div className="flex flex-col gap-2">
                    {tiers.map((tier) => (
                      <button
                        key={tier._id}
                        type="button"
                        onClick={() => setSelectedTierId(tier._id)}
                        className={`text-left rounded-nia-btn border px-3 py-2.5 transition-colors ${selectedTierId === tier._id ? 'border-nia-orange bg-nia-orange/10' : 'border-nia-border bg-white hover:bg-nia-panel'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-nia-navy-dark">{tier.name}</span>
                          <span className="font-bold text-sm text-nia-orange">€{tier.price}/yr</span>
                        </div>
                        {tier.description && <p className="text-xs text-nia-text-faint mt-0.5">{tier.description}</p>}
                      </button>
                    ))}
                  </div>
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

              {isActiveMember && (
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
              )}

              {!isActiveMember && bundlePreview?.savings > 0 && (
                <div className="mt-3 rounded-nia-btn bg-nia-success/10 border-l-4 border-nia-success px-3 py-2.5 flex items-center gap-2">
                  <PiggyBank className="text-nia-success flex-shrink-0" size={18} />
                  <span className="text-sm font-semibold text-nia-success">You save €{bundlePreview.savings.toFixed(2)} on tickets by joining as a {bundlePreview.tier.name}!</span>
                </div>
              )}

              {!isActiveMember && bundlePreview && (
                <div className="mt-3 flex flex-col gap-1 text-sm">
                  <div className="flex justify-between text-nia-text-muted">
                    <span>Membership ({bundlePreview.tier.name})</span>
                    <span>€{bundlePreview.membershipAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-nia-text-muted">
                    <span>Tickets</span>
                    <span>€{bundlePreview.ticketSubtotal.toFixed(2)}</span>
                  </div>
                  {bundlePreview.ticketDiscountAmount > 0 && (
                    <div className="flex justify-between text-nia-success">
                      <span>Membership discount on tickets</span>
                      <span>−€{bundlePreview.ticketDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between mt-4 mb-3">
                <span className="text-sm font-semibold text-nia-text-muted">Total</span>
                <span className="text-xl font-extrabold text-nia-orange">
                  €{(isActiveMember ? total : (bundleTotal ?? 0)).toFixed(2)}
                </span>
              </div>

              {isActiveMember ? (
                <Button variant="primary" disabled={busy || selected.length === 0} onClick={handleBook} className="w-full justify-center">
                  {busy ? 'Processing…' : 'Checkout'}
                </Button>
              ) : (
                <Button variant="primary" disabled={busy || selected.length === 0 || !selectedTierId || checkingBundle} onClick={handleBundleCheckout} className="w-full justify-center">
                  {busy ? 'Processing…' : 'Join & Checkout'}
                </Button>
              )}
              <p className="text-xs text-nia-text-faint mt-2 flex items-center gap-1"><ShieldCheck size={12} /> Secure payment via Mollie</p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
