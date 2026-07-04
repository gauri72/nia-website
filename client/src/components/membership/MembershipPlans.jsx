import { useState } from 'react';
import {
  FaHome, FaStar, FaUsers, FaCalendarAlt, FaTag, FaEnvelope,
  FaAward, FaCrown, FaCheck, FaTicketAlt, FaArrowRight, FaArrowLeft,
  FaLock, FaShieldAlt, FaCheckCircle, FaIdCard,
} from 'react-icons/fa';
import { startMembershipPayment } from '../../services/paymentService';
import './MembershipPlans.css';

/* ── Plan data ── */
const PLANS = [
  {
    id: 'friend',
    icon: <FaHome />,
    tier: 'FRIEND',
    sublabel: 'MEMBERSHIP',
    price: 60,
    unit: '/ year',
    tagline: 'Celebrate together at a great value',
    color: 'gold',
    perkBadge: '🎟️ 20% OFF on All NIA Events',
    perks: [
      { icon: <FaUsers />,       text: 'Valid for 2 adults in the same household' },
      { icon: <FaCalendarAlt />, text: 'Access to all NIA events throughout the year' },
      { icon: <FaTag />,         text: '20% discount on all event tickets' },
      { icon: <FaEnvelope />,    text: 'NIA newsletter & community updates' },
      { icon: <FaUsers />,       text: 'Be part of a growing Dutch-Indian community' },
    ],
  },
  {
    id: 'patron',
    icon: <FaStar />,
    tier: 'PATRON',
    sublabel: 'MEMBERSHIP',
    price: 150,
    unit: '/ year',
    tagline: 'All events included — celebrate without limits',
    color: 'diamond',
    perkBadge: '🎟️ Free Entry to All NIA Events',
    perks: [
      { icon: <FaUsers />,       text: 'Valid for 2 adults in the same household' },
      { icon: <FaCalendarAlt />, text: 'Free entry to all NIA events throughout the year' },
      { icon: <FaTicketAlt />,   text: 'No event ticket costs — fully included' },
      { icon: <FaEnvelope />,    text: 'NIA newsletter & community updates' },
      { icon: <FaAward />,       text: 'Recognition as a Patron supporter of the association' },
      { icon: <FaCrown />,       text: 'Priority access & seating at select events' },
    ],
  },
];


const STEPS = ['Choose Plan', 'Your Details', 'Review Order', 'Payment'];

function StepBar({ step }) {
  return (
    <div className="mp-steps">
      {STEPS.map((label, i) => (
        <div key={i} className={`mp-step${step === i ? ' mp-step--active' : ''}${step > i ? ' mp-step--done' : ''}`}>
          <div className="mp-step__circle">{step > i ? '✓' : i + 1}</div>
          <span className="mp-step__label">{label}</span>
          {i < STEPS.length - 1 && <div className="mp-step__line" />}
        </div>
      ))}
    </div>
  );
}

export default function MembershipPlans() {
  const [step, setStep]           = useState(0);
  const [selected, setSelected]   = useState(null);
  const [member, setMember]       = useState({ name: '', email: '', phone: '' });
  const [partner, setPartner]     = useState({ name: '', email: '', phone: '' });
  const [memberCode, setMemberCode] = useState('');
  const [paying, setPaying]   = useState(false);
  const [payError, setPayError] = useState('');

  const plan = PLANS.find(p => p.id === selected);
  const canProceedStep1 = member.name.trim() && member.email.trim() && partner.name.trim();

  function handleField(e) {
    setMember(m => ({ ...m, [e.target.name]: e.target.value }));
  }

  function handlePartnerField(e) {
    setPartner(p => ({ ...p, [e.target.name]: e.target.value }));
  }

  function reset() {
    setStep(0); setSelected(null);
    setMember({ name: '', email: '', phone: '' });
    setPartner({ name: '', email: '', phone: '' });
    setMemberCode(''); setPaying(false); setPayError('');
  }

  async function handlePay() {
    setPayError('');
    setPaying(true);
    try {
      await startMembershipPayment({
        plan: selected,
        name: member.name.trim(),
        email: member.email.trim(),
        phone: member.phone.trim() || undefined,
        partnerName: partner.name.trim() || undefined,
        partnerEmail: partner.email.trim() || undefined,
        partnerPhone: partner.phone.trim() || undefined,
      });
      // redirects to Mollie — code below only runs on error
    } catch (err) {
      setPayError(err?.response?.data?.error || 'Payment failed. Please try again.');
      setPaying(false);
    }
  }

  return (
    <section className="mem-plans" id="plans">
      <div className="mem-plans__flow">

        <div className="mem-plans__header">
          <h2 className="mem-plans__heading">Membership Plans</h2>
          <p className="mem-plans__sub">Choose the plan that suits you and complete your registration in minutes.</p>
        </div>

        <StepBar step={step} />

        {/* ══════════════════════════════
            STEP 0 — Choose Plan
            ══════════════════════════════ */}
        {step === 0 && (
          <>
            {/* Membership code */}
            <div className="mp-code-row">
              <label className="mp-field__label"><FaIdCard /> Existing Member Code (optional)</label>
              <div className="mp-code-wrap">
                <input
                  className="mp-code-input"
                  placeholder="Member ID"
                  value={memberCode}
                  onChange={e => setMemberCode(e.target.value)}
                />
              </div>
            </div>

            {/* Plan cards — sponsorship style */}
            <div className="mp-plans-container">
              {PLANS.map((p, i) => (
                <div
                  key={p.id}
                  className={`mp-pkg mp-pkg--${p.color}${selected === p.id ? ' mp-pkg--selected' : ''}`}
                  onClick={() => setSelected(p.id)}
                >
                  {i > 0 && <div className="mp-pkg__vdivider" />}

                  <div className="mp-pkg__top">
                    <div className={`mp-pkg__badge mp-pkg__badge--${p.color}`}>
                      <span className="mp-pkg__badge-icon">{p.icon}</span>
                    </div>
                    <div className="mp-pkg__info">
                      <p className="mp-pkg__tier">{p.tier}</p>
                      <p className="mp-pkg__sublabel">{p.sublabel}</p>
                    </div>
                  </div>

                  <div className={`mp-pkg__ribbon mp-pkg__ribbon--${p.color}`}>
                    <span className="mp-pkg__price">€{p.price}</span>
                    <span className="mp-pkg__unit">{p.unit}</span>
                  </div>

                  <p className={`mp-pkg__perk-badge mp-pkg__perk-badge--${p.color}`}>{p.perkBadge}</p>

                  <p className="mp-pkg__tagline">{p.tagline}</p>

                  <ul className="mp-pkg__perks">
                    {p.perks.map((pk, j) => (
                      <li key={j} className="mp-pkg__perk">
                        <span className={`mp-pkg__perk-check mp-pkg__perk-check--${p.color}`}><FaCheck /></span>
                        <span className="mp-pkg__perk-text">{pk.text}</span>
                      </li>
                    ))}
                  </ul>

                  {selected === p.id && (
                    <span className="mp-pkg__selected-badge">✓ Selected</span>
                  )}
                </div>
              ))}
            </div>

            <div className="mp-bottom">
              {selected && (
                <p className="mp-bottom__summary">
                  <strong>{plan?.tier} Membership</strong> — €{plan?.price}/year
                </p>
              )}
              <button
                className="mp-continue-btn mp-continue-btn--light"
                disabled={!selected}
                onClick={() => setStep(1)}
              >
                Continue <FaArrowRight />
              </button>
            </div>
          </>
        )}

        {/* ══════════════════════════════
            STEPS 1-3 — dark payment card
            ══════════════════════════════ */}
        {step >= 1 && (
          <div className="mp-payment-wrap">

        {step === 1 && (
          <div className="mp-form-step">
            <h3 className="mp-form-step__heading">Your Details</h3>
            <p className="mp-form-step__sub">We'll send your membership confirmation to the email below.</p>

            <div className="mp-pfield">
              <label className="mp-pfield__label">Full Name <span className="mp-required">*</span></label>
              <input className="mp-pfield__input" name="name" type="text" placeholder="Your full name" value={member.name} onChange={handleField} />
            </div>
            <div className="mp-pfield">
              <label className="mp-pfield__label">Email Address <span className="mp-required">*</span></label>
              <input className="mp-pfield__input" name="email" type="email" placeholder="you@email.com" value={member.email} onChange={handleField} />
            </div>
            <div className="mp-pfield">
              <label className="mp-pfield__label">Phone Number <span className="mp-optional">(optional)</span></label>
              <input className="mp-pfield__input" name="phone" type="tel" placeholder="+31 6 12345678" value={member.phone} onChange={handleField} />
            </div>

            <div className="mp-section-divider">
              <span className="mp-section-divider__line" />
              <span className="mp-section-divider__label">Partner Details</span>
              <span className="mp-section-divider__line" />
            </div>

            <div className="mp-pfield">
              <label className="mp-pfield__label">Partner's Full Name <span className="mp-required">*</span></label>
              <input className="mp-pfield__input" name="name" type="text" placeholder="Partner's full name" value={partner.name} onChange={handlePartnerField} />
            </div>
            <div className="mp-pfield">
              <label className="mp-pfield__label">Partner's Email Address <span className="mp-optional">(optional)</span></label>
              <input className="mp-pfield__input" name="email" type="email" placeholder="partner@email.com" value={partner.email} onChange={handlePartnerField} />
            </div>
            <div className="mp-pfield">
              <label className="mp-pfield__label">Partner's Phone Number <span className="mp-optional">(optional)</span></label>
              <input className="mp-pfield__input" name="phone" type="tel" placeholder="+31 6 12345678" value={partner.phone} onChange={handlePartnerField} />
            </div>

            <div className="mp-nav">
              <button className="mp-back-btn" onClick={() => setStep(0)}><FaArrowLeft /> Back</button>
              <button className="mp-continue-btn" disabled={!canProceedStep1} onClick={() => setStep(2)}>
                Continue <FaArrowRight />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════
            STEP 2 — Review Order
            ══════════════════════════════ */}
        {step === 2 && (
          <div className="mp-review">
            <h3 className="mp-form-step__heading">Review Your Order</h3>
            <p className="mp-form-step__sub">Confirm your membership before proceeding to payment.</p>

            <div className="mp-review__table">
              <div className="mp-review__thead">
                <span>Plan</span>
                <span>Duration</span>
                <span>Total</span>
              </div>
              <div className="mp-review__row">
                <span className="mp-review__plan-name">
                  <span className={`mp-review__dot mp-review__dot--${plan?.color}`} />
                  {plan?.tier} Membership
                </span>
                <span>1 year</span>
                <span className="mp-review__line-total">€{plan?.price}</span>
              </div>
              <div className="mp-review__total-row">
                <span>Total Payable</span>
                <span />
                <span className="mp-review__grand-total">€{plan?.price}</span>
              </div>
            </div>

            <div className="mp-review__attendee">
              <p className="mp-review__attendee-label">Primary Member</p>
              <p className="mp-review__attendee-name">{member.name}</p>
              <p className="mp-review__attendee-email">{member.email}</p>
              {member.phone && <p className="mp-review__attendee-email">{member.phone}</p>}
            </div>

            {partner.name && (
              <div className="mp-review__attendee">
                <p className="mp-review__attendee-label">Partner</p>
                <p className="mp-review__attendee-name">{partner.name}</p>
                {partner.email && <p className="mp-review__attendee-email">{partner.email}</p>}
                {partner.phone && <p className="mp-review__attendee-email">{partner.phone}</p>}
              </div>
            )}

            <div className="mp-nav">
              <button className="mp-back-btn" onClick={() => setStep(1)}><FaArrowLeft /> Back</button>
              <button className="mp-continue-btn" onClick={() => setStep(3)}>
                Pay €{plan?.price} <FaArrowRight />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════
            STEP 3 — Confirm & Pay
            ══════════════════════════════ */}
        {step === 3 && (
          <div className="mp-payment-step">
            <h3 className="mp-form-step__heading">Confirm &amp; Pay</h3>
            <p className="mp-form-step__sub">
              You will be redirected to Mollie's secure checkout to pay <strong>€{plan?.price}</strong>.
              All major payment methods are accepted (iDEAL, card, PayPal and more).
            </p>

            <p className="mp-payment__disclaimer">
              <FaShieldAlt /> Your payment is encrypted and secure. Membership will be activated after payment.
            </p>

            {payError && (
              <p style={{ color: '#e74c3c', fontSize: '0.88rem', marginTop: '0.5rem' }}>{payError}</p>
            )}

            <div className="mp-nav">
              <button className="mp-back-btn" onClick={() => setStep(2)} disabled={paying}><FaArrowLeft /> Back</button>
              <button
                className="mp-continue-btn mp-continue-btn--pay"
                disabled={paying}
                onClick={handlePay}
              >
                {paying ? 'Redirecting…' : <><FaLock /> Pay €{plan?.price} securely</>}
              </button>
            </div>
          </div>
        )}

          </div>
        )}

      </div>
    </section>
  );
}
