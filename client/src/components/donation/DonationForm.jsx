import { useState } from 'react';
import {
  FaHeart, FaStar, FaCrown, FaGem,
  FaCheck, FaArrowRight, FaArrowLeft,
  FaCreditCard, FaUniversity, FaPaypal, FaMobileAlt,
  FaLock, FaShieldAlt, FaCheckCircle,
} from 'react-icons/fa';
import './DonationForm.css';

const TIERS = [
  {
    id: 'supporter',
    amount: 50,
    label: 'SUPPORTER',
    sublabel: 'DONATION',
    icon: <FaHeart />,
    color: 'amber',
    tagline: 'Help us run a community activity',
    perks: [
      'Sponsors one community activity',
      'Named in our newsletter thank-you list',
      'Warm gratitude from the NIA team',
    ],
  },
  {
    id: 'friend',
    amount: 75,
    label: 'FRIEND',
    sublabel: 'DONATION',
    icon: <FaStar />,
    color: 'gold',
    tagline: 'Fund refreshments at a cultural event',
    perks: [
      'Funds refreshments at an event',
      'Personal thank-you email from NIA',
      'Named in event acknowledgements',
    ],
  },
  {
    id: 'patron',
    amount: 100,
    label: 'PATRON',
    sublabel: 'DONATION',
    icon: <FaCrown />,
    color: 'platinum',
    tagline: 'Cover décor for a cultural evening',
    perks: [
      'Covers full décor for a cultural evening',
      'Recognised at the event',
      'Certificate of appreciation',
      'Featured in NIA social media post',
    ],
  },
  {
    id: 'champion',
    amount: 200,
    label: 'CHAMPION',
    sublabel: 'DONATION',
    icon: <FaGem />,
    color: 'diamond',
    tagline: 'Co-sponsor a flagship event segment',
    perks: [
      'Co-sponsors a flagship event segment',
      'Logo / name on event banner',
      'VIP recognition at the event',
      'Featured article in NIA newsletter',
    ],
  },
];

const CAUSES = [
  { value: 'general', label: 'General Community Fund' },
  { value: 'events',  label: 'Cultural Events & Festivals' },
  { value: 'youth',   label: 'Youth & Education Programmes' },
  { value: 'welfare', label: 'Community Welfare Initiatives' },
];

const PAYMENT_METHODS = [
  { id: 'ideal',  icon: <FaUniversity />, label: 'iDEAL',              desc: 'Pay directly via your Dutch bank' },
  { id: 'card',   icon: <FaCreditCard />, label: 'Credit / Debit Card', desc: 'Visa, Mastercard, Amex accepted' },
  { id: 'paypal', icon: <FaPaypal />,     label: 'PayPal',              desc: 'Fast and secure via PayPal' },
  { id: 'other',  icon: <FaMobileAlt />,  label: 'Other Methods',       desc: 'Apple Pay, Google Pay and more' },
];

const STEPS = ['Choose Amount', 'Your Details', 'Review', 'Payment'];

function StepBar({ step }) {
  return (
    <div className="dn-steps">
      {STEPS.map((label, i) => (
        <div
          key={i}
          className={`dn-step${step === i ? ' dn-step--active' : ''}${step > i ? ' dn-step--done' : ''}`}
        >
          <div className="dn-step__circle">{step > i ? '✓' : i + 1}</div>
          <span className="dn-step__label">{label}</span>
          {i < STEPS.length - 1 && <div className="dn-step__line" />}
        </div>
      ))}
    </div>
  );
}

export default function DonationForm() {
  const [step, setStep]         = useState(0);
  const [selected, setSelected] = useState(null);   // tier id OR 'custom'
  const [custom, setCustom]     = useState('');
  const [cause, setCause]       = useState('general');
  const [frequency, setFreq]    = useState('once');
  const [donor, setDonor]       = useState({ name: '', email: '', phone: '' });
  const [payMethod, setPayMethod] = useState(null);
  const [paid, setPaid]         = useState(false);

  const tier = TIERS.find(t => t.id === selected);
  const amount = selected === 'custom'
    ? (custom ? Number(custom) : 0)
    : (tier ? tier.amount : 0);
  const displayAmount = amount > 0 ? `€${amount}` : null;
  const canProceed0 = amount > 0;
  const canProceed1 = donor.name.trim() && donor.email.trim();

  function handleField(e) {
    setDonor(d => ({ ...d, [e.target.name]: e.target.value }));
  }

  function handleCustomChange(e) {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setCustom(val);
    setSelected('custom');
  }

  function reset() {
    setStep(0); setSelected(null); setCustom(''); setCause('general');
    setFreq('once'); setDonor({ name: '', email: '', phone: '' });
    setPayMethod(null); setPaid(false);
  }

  /* ── Success ── */
  if (paid) {
    return (
      <section className="dn-section" id="donate">
        <div className="dn-flow">
          <div className="dn-success">
            <FaCheckCircle className="dn-success__icon" />
            <h2 className="dn-success__heading">Thank You!</h2>
            <p className="dn-success__body">
              Your donation of <strong>{displayAmount}</strong> to{' '}
              <strong>{CAUSES.find(c => c.value === cause)?.label}</strong> has been received.
              A confirmation has been sent to <strong>{donor.email}</strong>.
            </p>
            <button className="dn-continue-btn" onClick={reset}>Donate Again</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="dn-section" id="donate">
      <div className="dn-flow">

        <div className="dn-header">
          <h2 className="dn-heading">Make a Donation</h2>
          <p className="dn-sub">Choose an amount and complete your donation in a few simple steps.</p>
        </div>

        <StepBar step={step} />

        {/* ══════════════════════════════
            STEP 0 — Choose Amount
            ══════════════════════════════ */}
        {step === 0 && (
          <>
            {/* Tier cards */}
            <div className="dn-cards">
              {TIERS.map(t => (
                <div
                  key={t.id}
                  className={`dn-card dn-card--${t.color}${selected === t.id ? ' dn-card--selected' : ''}`}
                  onClick={() => { setSelected(t.id); setCustom(''); }}
                >
                  <div className="dn-card__top">
                    <div className={`dn-card__badge dn-card__badge--${t.color}`}>
                      <span className="dn-card__badge-icon">{t.icon}</span>
                    </div>
                    <div className="dn-card__info">
                      <p className="dn-card__label">{t.label}</p>
                      <p className="dn-card__sublabel">{t.sublabel}</p>
                    </div>
                  </div>

                  <div className={`dn-card__ribbon dn-card__ribbon--${t.color}`}>
                    <span className="dn-card__price">€{t.amount}</span>
                  </div>

                  <p className="dn-card__tagline">{t.tagline}</p>

                  <ul className="dn-card__perks">
                    {t.perks.map((pk, j) => (
                      <li key={j} className="dn-card__perk">
                        <span className={`dn-card__perk-check dn-card__perk-check--${t.color}`}><FaCheck /></span>
                        <span className="dn-card__perk-text">{pk}</span>
                      </li>
                    ))}
                  </ul>

                  {selected === t.id && (
                    <span className="dn-card__selected-badge">✓ Selected</span>
                  )}
                </div>
              ))}
            </div>

            {/* Custom amount */}
            <div className="dn-custom-row">
              <span className="dn-custom-label">Or enter a custom amount:</span>
              <div className="dn-custom-wrap">
                <span className="dn-custom-prefix">€</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Your amount"
                  className={`dn-custom-input${selected === 'custom' ? ' dn-custom-input--active' : ''}`}
                  value={custom}
                  onChange={handleCustomChange}
                  maxLength={6}
                />
              </div>
            </div>

            {/* Cause selector */}
            <div className="dn-cause-row">
              <label className="dn-cause-label">Donate Towards</label>
              <select
                className="dn-cause-select"
                value={cause}
                onChange={e => setCause(e.target.value)}
              >
                {CAUSES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="dn-bottom">
              {displayAmount && (
                <p className="dn-bottom__summary">
                  <strong>Donation</strong> — {displayAmount}
                </p>
              )}
              <button
                className="dn-continue-btn"
                disabled={!canProceed0}
                onClick={() => setStep(1)}
              >
                Continue <FaArrowRight />
              </button>
            </div>
          </>
        )}

        {/* ══════════════════════════════
            STEPS 1–3 dark payment card
            ══════════════════════════════ */}
        {step >= 1 && (
          <div className="dn-payment-wrap">

            {/* STEP 1 — Details */}
            {step === 1 && (
              <div className="dn-form-step">
                <h3 className="dn-form-step__heading">Your Details</h3>
                <p className="dn-form-step__sub">We'll send your donation receipt to the email below.</p>

                <div className="dn-pfield">
                  <label className="dn-pfield__label">Full Name <span className="dn-required">*</span></label>
                  <input className="dn-pfield__input" name="name" type="text" placeholder="Your full name" value={donor.name} onChange={handleField} />
                </div>
                <div className="dn-pfield">
                  <label className="dn-pfield__label">Email Address <span className="dn-required">*</span></label>
                  <input className="dn-pfield__input" name="email" type="email" placeholder="you@email.com" value={donor.email} onChange={handleField} />
                </div>
                <div className="dn-pfield">
                  <label className="dn-pfield__label">Phone Number <span className="dn-optional">(optional)</span></label>
                  <input className="dn-pfield__input" name="phone" type="tel" placeholder="+31 6 12345678" value={donor.phone} onChange={handleField} />
                </div>

                <div className="dn-nav">
                  <button className="dn-back-btn" onClick={() => setStep(0)}><FaArrowLeft /> Back</button>
                  <button className="dn-continue-btn" disabled={!canProceed1} onClick={() => setStep(2)}>
                    Continue <FaArrowRight />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 — Review */}
            {step === 2 && (
              <div className="dn-review">
                <h3 className="dn-form-step__heading">Review Your Donation</h3>
                <p className="dn-form-step__sub">Confirm the details before proceeding to payment.</p>

                <div className="dn-review__table">
                  <div className="dn-review__thead">
                    <span>Cause</span>
                    <span>Amount</span>
                  </div>
                  <div className="dn-review__row">
                    <span className="dn-review__plan-name">
                      <span className={`dn-review__dot dn-review__dot--${tier?.color ?? 'amber'}`} />
                      {CAUSES.find(c => c.value === cause)?.label}
                    </span>
                    <span className="dn-review__line-total">{displayAmount}</span>
                  </div>
                  <div className="dn-review__total-row">
                    <span>Total Payable</span>
                    <span className="dn-review__grand-total">{displayAmount}</span>
                  </div>
                </div>

                <div className="dn-review__attendee">
                  <p className="dn-review__attendee-label">Donation from</p>
                  <p className="dn-review__attendee-name">{donor.name}</p>
                  <p className="dn-review__attendee-email">{donor.email}</p>
                  {donor.phone && <p className="dn-review__attendee-email">{donor.phone}</p>}
                </div>

                <div className="dn-nav">
                  <button className="dn-back-btn" onClick={() => setStep(1)}><FaArrowLeft /> Back</button>
                  <button className="dn-continue-btn" onClick={() => setStep(3)}>
                    Pay {displayAmount} <FaArrowRight />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 — Payment */}
            {step === 3 && (
              <div className="dn-payment-step">
                <h3 className="dn-form-step__heading">Choose Payment Method</h3>
                <p className="dn-form-step__sub">Select how you'd like to donate {displayAmount}.</p>

                <div className="dn-pay-methods">
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m.id}
                      className={`dn-pay-method${payMethod === m.id ? ' dn-pay-method--active' : ''}`}
                      onClick={() => setPayMethod(m.id)}
                    >
                      <span className="dn-pay-method__icon">{m.icon}</span>
                      <span className="dn-pay-method__label">{m.label}</span>
                      <span className="dn-pay-method__desc">{m.desc}</span>
                      {payMethod === m.id && <span className="dn-pay-method__check">✓</span>}
                    </button>
                  ))}
                </div>

                <p className="dn-payment__disclaimer">
                  <FaShieldAlt /> Your payment is encrypted and secure.
                </p>

                <div className="dn-nav">
                  <button className="dn-back-btn" onClick={() => setStep(2)}><FaArrowLeft /> Back</button>
                  <button
                    className="dn-continue-btn dn-continue-btn--pay"
                    disabled={!payMethod}
                    onClick={() => setPaid(true)}
                  >
                    <FaLock /> Confirm &amp; Donate {displayAmount}
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
