import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaUser, FaChild, FaStar, FaShieldAlt, FaTag, FaIdCard,
  FaRobot, FaArrowRight, FaArrowLeft, FaLock, FaCheckCircle,
} from 'react-icons/fa';
import { startTicketPayment } from '../../services/paymentService';
import api from '../../services/api';
import { translateApiError } from '../../i18n/translateApiError';
import './BookTickets.css';

const TICKETS = [
  { id: 'regular', icon: <FaUser />,  price: 20, highlight: false, color: 'navy'   },
  { id: 'vip',     icon: <FaStar />,  price: 45, highlight: true,  color: 'orange' },
  { id: 'child',   icon: <FaChild />, price: 5,  highlight: false, color: 'green'  },
];

// Same simple check the server enforces — catches stray spaces, missing @,
// missing domain, etc. before the buyer ever leaves this page.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


function StepBar({ step, steps }) {
  return (
    <div className="bt-steps">
      {steps.map((label, i) => (
        <div key={i} className={`bt-step${step === i ? ' bt-step--active' : ''}${step > i ? ' bt-step--done' : ''}`}>
          <div className="bt-step__circle">{step > i ? '✓' : i + 1}</div>
          <span className="bt-step__label">{label}</span>
          {i < steps.length - 1 && <div className="bt-step__line" />}
        </div>
      ))}
    </div>
  );
}

function AIHint({ ticket, qty, discount, t }) {
  if (qty < 1) return null;
  const saved = discount > 0 ? Math.round(ticket.price * qty * discount) : 0;
  if (ticket.id === 'vip' && qty >= 2)
    return <span className="bt-ai-hint"><FaRobot /> {t('events.booking.aiHints.vipMultiple', { qty })}</span>;
  if (ticket.id === 'regular' && qty >= 4)
    return <span className="bt-ai-hint"><FaRobot /> {t('events.booking.aiHints.regularUpsell', { qty, diff: (45 - 20) * qty })}</span>;
  if (saved > 0)
    return <span className="bt-ai-hint"><FaRobot /> {t('events.booking.aiHints.discountSaved', { amount: saved })}</span>;
  return null;
}

export default function BookTickets() {
  const { t, i18n } = useTranslation();
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

  const STEPS = [
    t('events.booking.steps.selectTickets'),
    t('events.booking.steps.yourDetails'),
    t('events.booking.steps.reviewOrder'),
    t('events.booking.steps.payment'),
  ];

  // ── Derived totals ──
  const selectedTickets = TICKETS.filter(tk => qtys[tk.id] > 0);
  const subtotal    = selectedTickets.reduce((sum, tk) => sum + tk.price * qtys[tk.id], 0);
  const totalSaved  = discount?.valid ? discount.discount_amount : 0;
  const grandTotal   = discount?.valid ? discount.finalAmount : subtotal;
  const hasTickets  = selectedTickets.length > 0;
  const totalTickets = selectedTickets.reduce((sum, tk) => sum + qtys[tk.id], 0);

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

  const emailTouched = attendee.email.trim().length > 0;
  const emailValid = EMAIL_RE.test(attendee.email.trim());

  const canProceedStep1 = attendee.name.trim() && emailValid
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
          tickets: selectedTickets.map(tk => ({ ticket_type: tk.id, quantity: qtys[tk.id] })),
          discountCode: discountCode.trim() || undefined,
        });
        if (data.finalAmount < data.subtotal) {
          setDiscount({ valid: true, discount_amount: data.discount_amount, finalAmount: data.finalAmount, source: data.source });
        } else if (data.message) {
          setDiscount({ valid: false, message: translateApiError(data.message, i18n.language) });
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
      const ticketLines = selectedTickets.map(tk => ({
        ticket_type: tk.id,
        quantity: qtys[tk.id],
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
        setFreeSuccess(result.message || t('events.booking.freeSuccessDefault'));
        setPaying(false);
      }
    } catch (err) {
      setPayError(translateApiError(err?.response?.data?.error, i18n.language) || t('events.booking.errors.paymentFailed'));
      setPaying(false);
    }
  }

  return (
    <section className="book-tickets" id="tickets">
      <div className="book-tickets__inner">

        <div className="book-tickets__header">
          <h2 className="book-tickets__heading">{t('events.booking.heading')}</h2>
          <p className="book-tickets__sub">{t('events.booking.sub')}</p>
        </div>

        <StepBar step={step} steps={STEPS} />

        {/* ══════════════════════════════
            STEP 0 — Select Tickets
            ══════════════════════════════ */}
        {step === 0 && (
          <>
            {/* Shared codes */}
            <div className="bt-codes">
              <div className="bt-codes__field">
                <label className="bt-field__label"><FaIdCard /> {t('events.booking.membershipCodeLabel')}</label>
                <input className="bt-code-input bt-code-input--full" placeholder={t('membership.plans.memberCodePlaceholder')} value={membershipCode} onChange={e => setMembershipCode(e.target.value)} />
              </div>
              <div className="bt-codes__field">
                <label className="bt-field__label"><FaTag /> {t('events.booking.discountCodeLabel')} <span className="bt-optional">{t('events.booking.details.optional')}</span></label>
                <input
                  className="bt-code-input bt-code-input--full" placeholder={t('events.booking.discountCodePlaceholder')}
                  value={discountCode}
                  onChange={e => { setDiscountCode(e.target.value); setDiscount(null); }}
                />
                <span className="bt-pfield__hint">{t('events.booking.discountValidateHint')}</span>
              </div>
            </div>

            {/* Ticket rows */}
            <div className="book-tickets__rows">
              {TICKETS.map((tk) => {
                const qty       = qtys[tk.id];
                const lineTotal = tk.price * qty;
                const type = t(`events.booking.tickets.${tk.id}.type`);
                const perks = t(`events.booking.tickets.${tk.id}.perks`, { returnObjects: true });
                const badge = tk.id === 'vip' ? t('events.booking.tickets.vip.badge') : null;

                return (
                  <div key={tk.id} className={`bt-row${tk.highlight ? ' bt-row--highlight' : ''}${qty > 0 ? ' bt-row--active' : ''}`}>
                    {badge && <span className="bt-row__badge">{badge}</span>}

                    <div className="bt-row__identity">
                      <div className={`bt-row__icon-wrap bt-row__icon-wrap--${tk.color}`}>{tk.icon}</div>
                      <div>
                        <p className="bt-row__type">{type}</p>
                        <ul className="bt-row__perks">{perks.map(p => <li key={p}>{p}</li>)}</ul>
                      </div>
                    </div>

                    <div className="bt-row__controls">
                      <div className="bt-row__price-wrap">
                        <span className={`bt-row__price bt-row__price--${tk.color}`}>€{tk.price}</span>
                        <span className="bt-row__price-unit">{t('events.booking.perPerson')}</span>
                      </div>
                      <div className="bt-field bt-field--qty">
                        <label className="bt-field__label">{t('events.booking.qtyLabel')}</label>
                        <div className="bt-qty">
                          <button className="bt-qty__btn" onClick={() => changeQty(tk.id, -1)} aria-label={t('events.booking.decreaseAria')}>−</button>
                          <span className="bt-qty__num">{qty}</span>
                          <button className="bt-qty__btn" onClick={() => changeQty(tk.id, 1)} aria-label={t('events.booking.increaseAria')}>+</button>
                        </div>
                      </div>
                      <AIHint ticket={tk} qty={qty} discount={0} t={t} />
                    </div>

                    <div className="bt-row__action">
                      <div className="bt-row__total-wrap">
                        <span className={`bt-row__total bt-row__total--${tk.color}`}>{qty > 0 ? `€${lineTotal}` : '—'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="book-tickets__note">
              <FaShieldAlt className="book-tickets__note-icon" />
              {t('events.booking.secureBookingNote')} &nbsp;|&nbsp; {t('events.booking.limitedSeatsNote')}
            </p>

            <div className="bt-bottom">
              {hasTickets && (
                <p className="bt-bottom__summary">
                  {selectedTickets.map(tk => `${t(`events.booking.tickets.${tk.id}.type`)} × ${qtys[tk.id]}`).join(' + ')}
                  {' '}&nbsp;=&nbsp; <strong>€{subtotal}</strong>
                </p>
              )}
              <button
                className="bt-continue-btn"
                disabled={!hasTickets}
                onClick={() => setStep(1)}
              >
                {t('events.booking.continue')} <FaArrowRight />
              </button>
            </div>
          </>
        )}

        {/* ══════════════════════════════
            STEP 1 — Attendee Details
            ══════════════════════════════ */}
        {step === 1 && (
          <div className="bt-form-step">
            <h3 className="bt-form-step__heading">{t('events.booking.details.heading')}</h3>
            <p className="bt-form-step__sub">{t('events.booking.details.sub')}</p>

            <div className="bt-pfield bt-pfield--full">
              <label className="bt-pfield__label">{t('events.booking.details.fullName')} <span className="bt-required">*</span></label>
              <input className="bt-pfield__input" name="name" type="text" placeholder={t('events.booking.details.fullName')} value={attendee.name} onChange={handleAttendeeField} required />
            </div>

            <div className="bt-pfield bt-pfield--full">
              <label className="bt-pfield__label">{t('events.booking.details.emailAddress')} <span className="bt-required">*</span></label>
              <input className="bt-pfield__input" name="email" type="email" placeholder="you@email.com" value={attendee.email} onChange={handleAttendeeField} required />
              {emailTouched && !emailValid && (
                <span className="bt-pfield__hint" style={{ color: '#e74c3c' }}>{t('events.booking.details.emailInvalidHint')}</span>
              )}
            </div>

            <div className="bt-pfield bt-pfield--full">
              <label className="bt-pfield__label">{t('events.booking.details.phoneNumber')} <span className="bt-optional">{t('events.booking.details.optional')}</span></label>
              <input className="bt-pfield__input" name="phone" type="tel" placeholder="+31 6 12345678" value={attendee.phone} onChange={handleAttendeeField} />
            </div>

            {totalTickets > 1 && (
              <div className="bt-pfield bt-pfield--full">
                <label className="bt-pfield__label">
                  {t('events.booking.details.otherAttendeesLabel', { count: totalTickets - 1 })} <span className="bt-required">*</span>
                </label>
                <textarea
                  className="bt-pfield__input bt-pfield__textarea"
                  placeholder={Array.from({ length: totalTickets - 1 }, (_, i) => `${i + 1}. ${t('events.booking.details.fullName')}`).join('\n')}
                  value={attendeeNames}
                  onChange={e => setAttendeeNames(e.target.value)}
                  rows={totalTickets}
                />
                <span className="bt-pfield__hint">{t('events.booking.details.otherAttendeesHint', { count: totalTickets - 1 })}</span>
              </div>
            )}

            <div className="bt-nav">
              <button className="bt-back-btn" onClick={() => setStep(0)}><FaArrowLeft /> {t('events.booking.back')}</button>
              <button className="bt-continue-btn" disabled={!canProceedStep1 || applyingDiscount} onClick={handleContinueToReview}>
                {applyingDiscount ? t('events.booking.details.checking') : <>{t('events.booking.continue')} <FaArrowRight /></>}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════
            STEP 2 — Review Order
            ══════════════════════════════ */}
        {step === 2 && (
          <div className="bt-review">
            <h3 className="bt-form-step__heading">{t('events.booking.review.heading')}</h3>
            <p className="bt-form-step__sub">{t('events.booking.review.sub')}</p>

            <div className="bt-review__table">
              <div className="bt-review__thead">
                <span>{t('events.booking.review.colTicket')}</span>
                <span>{t('events.booking.review.colPrice')}</span>
                <span>{t('events.booking.review.colQty')}</span>
                <span>{t('events.booking.review.colTotal')}</span>
              </div>
              {selectedTickets.map(tk => {
                const lineTotal = tk.price * qtys[tk.id];
                return (
                  <div key={tk.id} className="bt-review__row">
                    <span className="bt-review__ticket-name">
                      <span className={`bt-review__dot bt-review__dot--${tk.color}`} />
                      {t(`events.booking.tickets.${tk.id}.type`)}
                    </span>
                    <span>€{tk.price}</span>
                    <span>{qtys[tk.id]}</span>
                    <span className="bt-review__line-total">€{lineTotal}</span>
                  </div>
                );
              })}
              {discount?.valid && (
                <div className="bt-review__discount-row">
                  <span>{discount.source === 'membership' ? t('events.booking.review.membershipDiscount') : t('events.booking.review.discountWithCode', { code: discountCode.trim().toUpperCase() })}</span>
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
                <span>{t('events.booking.review.totalPayable')}</span>
                <span />
                <span />
                <span className="bt-review__grand-total">€{grandTotal}</span>
              </div>
            </div>

            <div className="bt-review__attendee">
              <p className="bt-review__attendee-label">{t('events.booking.review.ticketsFor')}</p>
              <p className="bt-review__attendee-name">{attendee.name}</p>
              <p className="bt-review__attendee-email">{attendee.email}</p>
              {attendee.phone && <p className="bt-review__attendee-email">{attendee.phone}</p>}
            </div>

            {totalTickets > 1 && attendeeNames.trim() && (
              <div className="bt-review__attendee">
                <p className="bt-review__attendee-label">{t('events.booking.review.allAttendees', { count: totalTickets })}</p>
                <p className="bt-review__attendee-email">1. {attendee.name} {t('events.booking.review.youSuffix')}</p>
                {attendeeNames.trim().split('\n').filter(n => n.trim()).map((n, i) => (
                  <p key={i} className="bt-review__attendee-email">{i + 2}. {n.trim()}</p>
                ))}
              </div>
            )}

            <div className="bt-nav">
              <button className="bt-back-btn" onClick={() => setStep(1)}><FaArrowLeft /> {t('events.booking.back')}</button>
              <button className="bt-continue-btn" onClick={() => setStep(3)}>
                {t('events.booking.review.pay', { amount: grandTotal })} <FaArrowRight />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════
            STEP 3 — Confirm & Pay
            ══════════════════════════════ */}
        {step === 3 && freeSuccess && (
          <div className="bt-payment-step">
            <h3 className="bt-form-step__heading"><FaCheckCircle style={{ color: '#2ecc71' }} /> {t('events.booking.payment.allSet')}</h3>
            <p className="bt-form-step__sub">{freeSuccess}</p>
            <p className="bt-payment__disclaimer">{t('events.booking.payment.ticketsEmailed', { email: attendee.email })}</p>
          </div>
        )}

        {step === 3 && !freeSuccess && (
          <div className="bt-payment-step">
            <h3 className="bt-form-step__heading">{t('events.booking.payment.confirmPay')}</h3>
            <p className="bt-form-step__sub">{t('events.booking.payment.redirectNotice', { amount: grandTotal })}</p>

            <p className="bt-payment__disclaimer">
              <FaShieldAlt /> {t('events.booking.payment.secureNotice')}
            </p>

            {payError && (
              <p style={{ color: '#e74c3c', fontSize: '0.88rem', marginTop: '0.5rem' }}>{payError}</p>
            )}

            <div className="bt-nav">
              <button className="bt-back-btn" onClick={() => setStep(2)} disabled={paying}><FaArrowLeft /> {t('events.booking.back')}</button>
              <button
                className="bt-continue-btn bt-continue-btn--pay"
                disabled={paying}
                onClick={handlePay}
              >
                {paying ? t('events.booking.payment.processing') : <><FaLock /> {t('events.booking.payment.paySecurely', { amount: grandTotal })}</>}
              </button>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
