import { useState } from 'react';
import {
  FaUser, FaChild, FaStar, FaShieldAlt, FaTag, FaIdCard,
  FaRobot, FaArrowRight, FaArrowLeft, FaLock, FaCheckCircle,
} from 'react-icons/fa';
import { startTicketPayment } from '../../services/paymentService';
import api from '../../services/api';
import './BookTickets.css';

const TICKETS = [
  { id: 'regular', icon: <FaUser />,  type: 'Regular Entry',    perks: ['No drinks included', 'No food included'],   price: 20, badge: null,         highlight: false, color: 'navy'   },
  { id: 'vip',     icon: <FaStar />,  type: 'VIP Experience',   perks: ['2 drinks included', 'Food included'],       price: 45, badge: 'BEST VALUE', highlight: true,  color: 'orange' },
  { id: 'child',   icon: <FaChild />, type: 'Child (6–12 yrs)', perks: ['Per child', 'Accompanied by adult'],        price: 5,  badge: null,         highlight: false, color: 'green'  },
];


function StepBar({ step }) {
  const STEPS = ['Select Tickets', 'Your Details', 'Review Order', 'Payment'];
  return (
    <div className="bt-steps">
      {STEPS.map((label, i) => (
        <div key={i} className={`bt-step${step === i ? ' bt-step--active' : ''}${step > i ? ' bt-step--done' : ''}`}>
          <div className="bt-step__circle">{step > i ? '✓' : i + 1}</div>
          <span className="bt-step__label">{label}</span>
          {i < STEPS.length - 1 && <div className="bt-step__line" />}
        </div>
      ))}
    </div>
  );
}

function AIHint({ ticket, qty, discount }) {
  if (qty < 1) return null;
  const saved = discount > 0 ? Math.round(ticket.price * qty * discount) : 0;
  if (ticket.id === 'vip' && qty >= 2)
    return <span className="bt-ai-hint"><FaRobot /> Great choice — VIP for {qty} saves time at the bar!</span>;
  if (ticket.id === 'regular' && qty >= 4)
    return <span className="bt-ai-hint"><FaRobot /> Tip: upgrading to VIP for {qty} is only €{((45 - 20) * qty)} more and includes food &amp; drinks.</span>;
  if (saved > 0)
    return <span className="bt-ai-hint"><FaRobot /> Discount applied — you save €{saved}!</span>;
  return null;
}

export default function BookTickets() {
  const [step, setStep] = useState(0);

  // Step 0 — ticket selection
  const [qtys, setQtys]               = useState({ regular: 0, vip: 0, child: 0 });
  const [membershipCode, setMembershipCode] = useState('');

  // Step 1 — attendee details + discount code (needs email, so validated here, not step 0)
  const [attendee, setAttendee] = useState({ name: '', email: '', phone: '' });
  const [attendeeNames, setAttendeeNames] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [discount, setDiscount] = useState(null); // { valid, discount_amount, finalAmount, message }
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  const [paying, setPaying]   = useState(false);
  const [payError, setPayError] = useState('');
  const [freeSuccess, setFreeSuccess] = useState('');

  // ── Derived totals ──
  const selectedTickets = TICKETS.filter(t => qtys[t.id] > 0);
  const subtotal    = selectedTickets.reduce((sum, t) => sum + t.price * qtys[t.id], 0);
  const totalSaved  = discount?.valid ? discount.discount_amount : 0;
  const grandTotal   = discount?.valid ? discount.finalAmount : subtotal;
  const hasTickets  = selectedTickets.length > 0;
  const totalTickets = selectedTickets.reduce((sum, t) => sum + qtys[t.id], 0);

  async function handleApplyDiscount() {
    if (!discountCode.trim() || !attendee.email.trim()) return;
    setApplyingDiscount(true);
    try {
      const { data } = await api.post('/discount-codes/preview', {
        code: discountCode.trim(), productType: 'ticket', email: attendee.email.trim(), originalAmount: subtotal,
      });
      setDiscount(data);
    } catch {
      setDiscount({ valid: false, message: 'Could not validate this code right now.' });
    } finally {
      setApplyingDiscount(false);
    }
  }

  // Ticket composition changed — any previously computed discount (code or
  // automatic membership) no longer matches the new subtotal, so it must be
  // invalidated here. This also makes handleContinueToReview's `!discount?.valid`
  // guard re-fetch a fresh preview instead of reusing a stale one.
  function changeQty(id, delta) {
    setQtys(q => ({ ...q, [id]: Math.max(0, q[id] + delta) }));
    setDiscount(null);
  }

  function handleAttendeeField(e) {
    setAttendee(a => ({ ...a, [e.target.name]: e.target.value }));
    if (e.target.name === 'email') setDiscount(null); // re-validate against the new email if changed
  }

  const canProceedStep1 = attendee.name.trim() && attendee.email.trim()
    && (totalTickets <= 1 || attendeeNames.trim());

  // If a discount code was already applied above, that wins server-side too — no
  // need to also check for an automatic membership discount. Otherwise, check once
  // here (now that the email is known) so the Review/Pay screens show the buyer's
  // real total instead of only finding out at Mollie's checkout.
  async function handleContinueToReview() {
    if (!discount?.valid) {
      setApplyingDiscount(true);
      try {
        const { data } = await api.post('/tickets/preview-discount', {
          email: attendee.email.trim(),
          tickets: selectedTickets.map(t => ({ ticket_type: t.id, quantity: qtys[t.id] })),
          discountCode: discountCode.trim() || undefined,
        });
        if (data.finalAmount < data.subtotal) {
          setDiscount({ valid: true, discount_amount: data.discount_amount, finalAmount: data.finalAmount, source: data.source });
        } else if (data.message) {
          setDiscount({ valid: false, message: data.message });
        }
      } catch {
        // Preview is best-effort — the real charge is always computed correctly
        // server-side at final submission regardless of whether this succeeded.
      } finally {
        setApplyingDiscount(false);
      }
    }
    setStep(2);
  }

  async function handlePay() {
    setPayError('');
    setPaying(true);
    try {
      const ticketLines = selectedTickets.map(t => ({
        ticket_type: t.id,
        quantity: qtys[t.id],
      }));
      const result = await startTicketPayment({
        name: attendee.name.trim(),
        email: attendee.email.trim(),
        phone: attendee.phone.trim() || undefined,
        attendeeNames: totalTickets > 1 ? attendeeNames.trim() : undefined,
        tickets: ticketLines,
        discountCode: discountCode.trim() || undefined,
      });
      // A fully-discounted order is finalized immediately server-side — there's no
      // Mollie checkout to redirect to. Anything else redirects the browser away.
      if (result.free) {
        setFreeSuccess(result.message || 'Your tickets are fully covered by the discount — no payment required.');
        setPaying(false);
      }
    } catch (err) {
      setPayError(err?.response?.data?.error || 'Payment failed. Please try again.');
      setPaying(false);
    }
  }

  return (
    <section className="book-tickets" id="tickets">
      <div className="book-tickets__inner">

        <div className="book-tickets__header">
          <h2 className="book-tickets__heading">Book Your Tickets</h2>
          <p className="book-tickets__sub">Secure your spot at our upcoming event in just a few steps.</p>
        </div>

        <StepBar step={step} />

        {/* ══════════════════════════════
            STEP 0 — Select Tickets
            ══════════════════════════════ */}
        {step === 0 && (
          <>
            {/* Shared codes */}
            <div className="bt-codes">
              <div className="bt-codes__field">
                <label className="bt-field__label"><FaIdCard /> Membership Code</label>
                <input className="bt-code-input bt-code-input--full" placeholder="Member ID" value={membershipCode} onChange={e => setMembershipCode(e.target.value)} />
              </div>
            </div>

            {/* Ticket rows */}
            <div className="book-tickets__rows">
              {TICKETS.map((t) => {
                const qty       = qtys[t.id];
                const lineTotal = t.price * qty;

                return (
                  <div key={t.id} className={`bt-row${t.highlight ? ' bt-row--highlight' : ''}${qty > 0 ? ' bt-row--active' : ''}`}>
                    {t.badge && <span className="bt-row__badge">{t.badge}</span>}

                    <div className="bt-row__identity">
                      <div className={`bt-row__icon-wrap bt-row__icon-wrap--${t.color}`}>{t.icon}</div>
                      <div>
                        <p className="bt-row__type">{t.type}</p>
                        <ul className="bt-row__perks">{t.perks.map(p => <li key={p}>{p}</li>)}</ul>
                      </div>
                    </div>

                    <div className="bt-row__controls">
                      <div className="bt-row__price-wrap">
                        <span className={`bt-row__price bt-row__price--${t.color}`}>€{t.price}</span>
                        <span className="bt-row__price-unit">/ person</span>
                      </div>
                      <div className="bt-field bt-field--qty">
                        <label className="bt-field__label">Qty</label>
                        <div className="bt-qty">
                          <button className="bt-qty__btn" onClick={() => changeQty(t.id, -1)} aria-label="Decrease">−</button>
                          <span className="bt-qty__num">{qty}</span>
                          <button className="bt-qty__btn" onClick={() => changeQty(t.id, 1)} aria-label="Increase">+</button>
                        </div>
                      </div>
                      <AIHint ticket={t} qty={qty} discount={0} />
                    </div>

                    <div className="bt-row__action">
                      <div className="bt-row__total-wrap">
                        <span className={`bt-row__total bt-row__total--${t.color}`}>{qty > 0 ? `€${lineTotal}` : '—'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="book-tickets__note">
              <FaShieldAlt className="book-tickets__note-icon" />
              Secure Booking &nbsp;|&nbsp; Limited Seats — Book Early! Have a discount code? You'll enter it on the next step.
            </p>

            <div className="bt-bottom">
              {hasTickets && (
                <p className="bt-bottom__summary">
                  {selectedTickets.map(t => `${t.type} × ${qtys[t.id]}`).join(' + ')}
                  {' '}&nbsp;=&nbsp; <strong>€{subtotal}</strong>
                </p>
              )}
              <button
                className="bt-continue-btn"
                disabled={!hasTickets}
                onClick={() => setStep(1)}
              >
                Continue <FaArrowRight />
              </button>
            </div>
          </>
        )}

        {/* ══════════════════════════════
            STEP 1 — Attendee Details
            ══════════════════════════════ */}
        {step === 1 && (
          <div className="bt-form-step">
            <h3 className="bt-form-step__heading">Your Details</h3>
            <p className="bt-form-step__sub">We'll send your tickets to the email address below.</p>

            <div className="bt-pfield bt-pfield--full">
              <label className="bt-pfield__label">Full Name <span className="bt-required">*</span></label>
              <input className="bt-pfield__input" name="name" type="text" placeholder="Your full name" value={attendee.name} onChange={handleAttendeeField} required />
            </div>

            <div className="bt-pfield bt-pfield--full">
              <label className="bt-pfield__label">Email Address <span className="bt-required">*</span></label>
              <input className="bt-pfield__input" name="email" type="email" placeholder="you@email.com" value={attendee.email} onChange={handleAttendeeField} required />
            </div>

            <div className="bt-pfield bt-pfield--full">
              <label className="bt-pfield__label">Phone Number <span className="bt-optional">(optional)</span></label>
              <input className="bt-pfield__input" name="phone" type="tel" placeholder="+31 6 12345678" value={attendee.phone} onChange={handleAttendeeField} />
            </div>

            <div className="bt-pfield bt-pfield--full">
              <label className="bt-pfield__label"><FaTag /> Discount Code <span className="bt-optional">(optional)</span></label>
              <div className="bt-code-wrap">
                <input
                  className="bt-code-input" placeholder="e.g. NIA10"
                  value={discountCode}
                  onChange={e => { setDiscountCode(e.target.value); setDiscount(null); }}
                />
                <button className="bt-code-apply" disabled={!discountCode.trim() || !attendee.email.trim() || applyingDiscount} onClick={handleApplyDiscount}>
                  {applyingDiscount ? 'Checking…' : 'Apply'}
                </button>
              </div>
              {discount?.valid && <span className="bt-codes__applied">✓ €{discount.discount_amount} discount applied</span>}
              {discount && !discount.valid && <span style={{ color: '#e74c3c', fontSize: '0.85rem' }}>{discount.message}</span>}
              {!attendee.email.trim() && <span className="bt-pfield__hint">Enter your email above first.</span>}
            </div>

            {totalTickets > 1 && (
              <div className="bt-pfield bt-pfield--full">
                <label className="bt-pfield__label">
                  Names of Other Attendees ({totalTickets - 1} {totalTickets - 1 === 1 ? 'person' : 'people'}) <span className="bt-required">*</span>
                </label>
                <textarea
                  className="bt-pfield__input bt-pfield__textarea"
                  placeholder={Array.from({ length: totalTickets - 1 }, (_, i) => `${i + 1}. Full Name`).join('\n')}
                  value={attendeeNames}
                  onChange={e => setAttendeeNames(e.target.value)}
                  rows={totalTickets}
                />
                <span className="bt-pfield__hint">Please list the other {totalTickets - 1} {totalTickets - 1 === 1 ? 'attendee' : 'attendees'}, one name per line.</span>
              </div>
            )}

            <div className="bt-nav">
              <button className="bt-back-btn" onClick={() => setStep(0)}><FaArrowLeft /> Back</button>
              <button className="bt-continue-btn" disabled={!canProceedStep1 || applyingDiscount} onClick={handleContinueToReview}>
                {applyingDiscount ? 'Checking…' : <>Continue <FaArrowRight /></>}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════
            STEP 2 — Review Order
            ══════════════════════════════ */}
        {step === 2 && (
          <div className="bt-review">
            <h3 className="bt-form-step__heading">Review Your Order</h3>
            <p className="bt-form-step__sub">Check your tickets before proceeding to payment.</p>

            <div className="bt-review__table">
              <div className="bt-review__thead">
                <span>Ticket</span>
                <span>Price</span>
                <span>Qty</span>
                <span>Total</span>
              </div>
              {selectedTickets.map(t => {
                const lineTotal = t.price * qtys[t.id];
                return (
                  <div key={t.id} className="bt-review__row">
                    <span className="bt-review__ticket-name">
                      <span className={`bt-review__dot bt-review__dot--${t.color}`} />
                      {t.type}
                    </span>
                    <span>€{t.price}</span>
                    <span>{qtys[t.id]}</span>
                    <span className="bt-review__line-total">€{lineTotal}</span>
                  </div>
                );
              })}
              {discount?.valid && (
                <div className="bt-review__discount-row">
                  <span>{discount.source === 'membership' ? 'Membership Discount' : `Discount (${discountCode.trim().toUpperCase()})`}</span>
                  <span />
                  <span />
                  <span className="bt-review__saved-amt">−€{totalSaved}</span>
                </div>
              )}
              {discount && !discount.valid && discount.message && (
                <div className="bt-review__discount-row">
                  <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{discount.message}</span>
                  <span /><span /><span />
                </div>
              )}
              <div className="bt-review__total-row">
                <span>Total Payable</span>
                <span />
                <span />
                <span className="bt-review__grand-total">€{grandTotal}</span>
              </div>
            </div>

            <div className="bt-review__attendee">
              <p className="bt-review__attendee-label">Tickets for</p>
              <p className="bt-review__attendee-name">{attendee.name}</p>
              <p className="bt-review__attendee-email">{attendee.email}</p>
              {attendee.phone && <p className="bt-review__attendee-email">{attendee.phone}</p>}
            </div>

            {totalTickets > 1 && attendeeNames.trim() && (
              <div className="bt-review__attendee">
                <p className="bt-review__attendee-label">All Attendees ({totalTickets})</p>
                <p className="bt-review__attendee-email">1. {attendee.name} (you)</p>
                {attendeeNames.trim().split('\n').filter(n => n.trim()).map((n, i) => (
                  <p key={i} className="bt-review__attendee-email">{i + 2}. {n.trim()}</p>
                ))}
              </div>
            )}

            <div className="bt-nav">
              <button className="bt-back-btn" onClick={() => setStep(1)}><FaArrowLeft /> Back</button>
              <button className="bt-continue-btn" onClick={() => setStep(3)}>
                Pay €{grandTotal} <FaArrowRight />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════
            STEP 3 — Confirm & Pay
            ══════════════════════════════ */}
        {step === 3 && freeSuccess && (
          <div className="bt-payment-step">
            <h3 className="bt-form-step__heading"><FaCheckCircle style={{ color: '#2ecc71' }} /> You're all set!</h3>
            <p className="bt-form-step__sub">{freeSuccess}</p>
            <p className="bt-payment__disclaimer">Your tickets have been emailed to {attendee.email}.</p>
          </div>
        )}

        {step === 3 && !freeSuccess && (
          <div className="bt-payment-step">
            <h3 className="bt-form-step__heading">Confirm &amp; Pay</h3>
            <p className="bt-form-step__sub">
              You will be redirected to Mollie's secure checkout to complete payment of <strong>€{grandTotal}</strong>.
              All major payment methods are accepted (iDEAL, card, PayPal and more).
            </p>

            <p className="bt-payment__disclaimer">
              <FaShieldAlt /> Your payment is encrypted and secure. Tickets will be emailed instantly after payment.
            </p>

            {payError && (
              <p style={{ color: '#e74c3c', fontSize: '0.88rem', marginTop: '0.5rem' }}>{payError}</p>
            )}

            <div className="bt-nav">
              <button className="bt-back-btn" onClick={() => setStep(2)} disabled={paying}><FaArrowLeft /> Back</button>
              <button
                className="bt-continue-btn bt-continue-btn--pay"
                disabled={paying}
                onClick={handlePay}
              >
                {paying ? 'Processing…' : <><FaLock /> Pay €{grandTotal} securely</>}
              </button>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
