import { useState } from 'react';
import { FaStar, FaCrown, FaInfinity, FaUsers, FaBuilding, FaEnvelope, FaBullhorn, FaHandshake, FaCheck, FaArrowRight, FaArrowLeft, FaCreditCard, FaUniversity, FaPaypal, FaMobileAlt, FaLock, FaShieldAlt, FaCheckCircle } from 'react-icons/fa';
import { GiDiamondHard } from 'react-icons/gi';
import './SponsorshipPackages.css';

const PACKAGES = [
  {
    id: 'silver',
    tier: 'SILVER',
    sublabel: 'SPONSORSHIP',
    price: 250,
    guests: '2 Guests',
    guestIcon: <><FaUsers /><FaUsers /></>,
    icon: <FaStar />,
    color: 'silver',
    perks: [
      { text: 'Logo on event materials' },
      { text: 'Social media mention' },
      { text: '2 guest tickets included' },
      { text: 'Certificate of appreciation' },
    ],
  },
  {
    id: 'gold',
    tier: 'GOLD',
    sublabel: 'SPONSORSHIP',
    price: 500,
    guests: '5 Guests',
    guestIcon: <><FaUsers /><FaUsers /><FaUsers /></>,
    icon: <FaStar />,
    color: 'gold',
    perks: [
      { text: 'Logo on event materials & banner' },
      { text: 'Dedicated social media post' },
      { text: '5 guest tickets included' },
      { text: 'Brand mention in press releases' },
      { text: 'Certificate of appreciation' },
    ],
  },
  {
    id: 'platinum',
    tier: 'PLATINUM',
    sublabel: 'SPONSORSHIP',
    price: 1000,
    guests: '10 Guests',
    guestIcon: <><FaUsers /><FaUsers /><FaUsers /><FaUsers /><FaUsers /></>,
    icon: <FaCrown />,
    color: 'platinum',
    perks: [
      { text: 'Premium logo placement on all materials' },
      { text: 'Multiple social media features' },
      { text: '10 guest tickets included' },
      { text: 'Speaking opportunity at event' },
      { text: 'Brand mention in press releases' },
      { text: 'VIP table at the event' },
    ],
  },
  {
    id: 'diamond',
    tier: 'DIAMOND',
    sublabel: 'SPONSORSHIP',
    price: 1500,
    guests: 'Unlimited Guests',
    guestIcon: <FaInfinity />,
    icon: <GiDiamondHard />,
    color: 'diamond',
    perks: [
      { text: 'Exclusive title sponsorship rights' },
      { text: 'Full branding across all event assets' },
      { text: 'Unlimited guest tickets' },
      { text: 'Keynote speaking slot' },
      { text: 'Dedicated feature article & press coverage' },
      { text: 'VIP table + private networking session' },
    ],
  },
];

const PAYMENT_METHODS = [
  { id: 'ideal',  icon: <FaUniversity />, label: 'iDEAL',               desc: 'Pay directly via your Dutch bank' },
  { id: 'card',   icon: <FaCreditCard />, label: 'Credit / Debit Card',  desc: 'Visa, Mastercard, Amex accepted' },
  { id: 'paypal', icon: <FaPaypal />,     label: 'PayPal',               desc: 'Fast and secure via PayPal' },
  { id: 'other',  icon: <FaMobileAlt />,  label: 'Other Methods',        desc: 'Apple Pay, Google Pay and more' },
];

const STEPS = ['Choose Package', 'Your Details', 'Review Order', 'Payment'];

function StepBar({ step }) {
  return (
    <div className="spp-steps">
      {STEPS.map((label, i) => (
        <div key={i} className={`spp-step${step === i ? ' spp-step--active' : ''}${step > i ? ' spp-step--done' : ''}`}>
          <div className="spp-step__circle">{step > i ? '✓' : i + 1}</div>
          <span className="spp-step__label">{label}</span>
          {i < STEPS.length - 1 && <div className="spp-step__line" />}
        </div>
      ))}
    </div>
  );
}

export default function SponsorshipPackages() {
  const [step, setStep]         = useState(0);
  const [selected, setSelected] = useState(null);
  const [sponsor, setSponsor]   = useState({ name: '', email: '', org: '', phone: '' });
  const [payMethod, setPayMethod] = useState(null);
  const [paid, setPaid]         = useState(false);

  const pkg = PACKAGES.find(p => p.id === selected);
  const canProceedStep1 = sponsor.name.trim() && sponsor.email.trim();

  function handleField(e) {
    setSponsor(s => ({ ...s, [e.target.name]: e.target.value }));
  }

  function reset() {
    setStep(0); setSelected(null);
    setSponsor({ name: '', email: '', org: '', phone: '' });
    setPayMethod(null); setPaid(false);
  }

  /* ── Success screen ── */
  if (paid) {
    return (
      <section className="sp-packages" id="packages">
        <div className="sp-packages__flow">
          <div className="spp-success">
            <FaCheckCircle className="spp-success__icon" />
            <h2 className="spp-success__heading">Sponsorship Confirmed!</h2>
            <p className="spp-success__body">
              Thank you, <strong>{sponsor.name}</strong>! Your <strong>{pkg?.tier}</strong> sponsorship
              is confirmed. A confirmation has been sent to <strong>{sponsor.email}</strong>.
            </p>
            <button className="spp-continue-btn" onClick={reset}>Start Again</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="sp-packages" id="packages">
      <div className="sp-packages__flow">

        <div className="sp-packages__header">
          <h2 className="sp-packages__heading">Sponsorship Packages</h2>
          <p className="sp-packages__sub">Choose a package and complete your sponsorship in a few simple steps.</p>
        </div>

        <StepBar step={step} />

        {/* ══════════════════════════════
            STEP 0 — Choose Package
            ══════════════════════════════ */}
        {step === 0 && (
          <>
            <div className="spp-cards">
              {PACKAGES.map((p) => (
                <div
                  key={p.id}
                  className={`spp-card spp-card--${p.color}${selected === p.id ? ' spp-card--selected' : ''}`}
                  onClick={() => setSelected(p.id)}
                >
                  <div className="spp-card__top">
                    <div className={`spp-card__badge spp-card__badge--${p.color}`}>
                      <span className="spp-card__badge-icon">{p.icon}</span>
                    </div>
                    <div className="spp-card__info">
                      <p className="spp-card__tier">{p.tier}</p>
                      <p className="spp-card__sublabel">{p.sublabel}</p>
                    </div>
                  </div>

                  <div className={`spp-card__ribbon spp-card__ribbon--${p.color}`}>
                    <span className="spp-card__price">€{p.price.toLocaleString()}</span>
                  </div>

                  <div className="spp-card__guests">
                    <span className="spp-card__guest-icons">{p.guestIcon}</span>
                    <span className="spp-card__guest-label">{p.guests}</span>
                  </div>

                  <ul className="spp-card__perks">
                    {p.perks.map((pk, j) => (
                      <li key={j} className="spp-card__perk">
                        <span className={`spp-card__perk-check spp-card__perk-check--${p.color}`}><FaCheck /></span>
                        <span className="spp-card__perk-text">{pk.text}</span>
                      </li>
                    ))}
                  </ul>

                  {selected === p.id && (
                    <span className="spp-card__selected-badge">✓ Selected</span>
                  )}
                </div>
              ))}
            </div>

            <div className="spp-bottom">
              {selected && (
                <p className="spp-bottom__summary">
                  <strong>{pkg?.tier} Sponsorship</strong> — €{pkg?.price.toLocaleString()}
                </p>
              )}
              <button
                className="spp-continue-btn"
                disabled={!selected}
                onClick={() => setStep(1)}
              >
                Continue <FaArrowRight />
              </button>
            </div>
          </>
        )}

        {/* ══════════════════════════════
            STEPS 1–3 inside dark card
            ══════════════════════════════ */}
        {step >= 1 && (
          <div className="spp-payment-wrap">

            {/* STEP 1 — Details */}
            {step === 1 && (
              <div className="spp-form-step">
                <h3 className="spp-form-step__heading">Your Details</h3>
                <p className="spp-form-step__sub">We'll send your sponsorship confirmation to the email below.</p>

                <div className="spp-pfield">
                  <label className="spp-pfield__label">Full Name <span className="spp-required">*</span></label>
                  <input className="spp-pfield__input" name="name" type="text" placeholder="Your full name" value={sponsor.name} onChange={handleField} />
                </div>
                <div className="spp-pfield">
                  <label className="spp-pfield__label">Email Address <span className="spp-required">*</span></label>
                  <input className="spp-pfield__input" name="email" type="email" placeholder="you@company.com" value={sponsor.email} onChange={handleField} />
                </div>
                <div className="spp-pfield">
                  <label className="spp-pfield__label">Organisation <span className="spp-optional">(optional)</span></label>
                  <input className="spp-pfield__input" name="org" type="text" placeholder="Company or organisation name" value={sponsor.org} onChange={handleField} />
                </div>
                <div className="spp-pfield">
                  <label className="spp-pfield__label">Phone Number <span className="spp-optional">(optional)</span></label>
                  <input className="spp-pfield__input" name="phone" type="tel" placeholder="+31 6 12345678" value={sponsor.phone} onChange={handleField} />
                </div>

                <div className="spp-nav">
                  <button className="spp-back-btn" onClick={() => setStep(0)}><FaArrowLeft /> Back</button>
                  <button className="spp-continue-btn" disabled={!canProceedStep1} onClick={() => setStep(2)}>
                    Continue <FaArrowRight />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 — Review */}
            {step === 2 && (
              <div className="spp-review">
                <h3 className="spp-form-step__heading">Review Your Order</h3>
                <p className="spp-form-step__sub">Confirm your sponsorship package before proceeding to payment.</p>

                <div className="spp-review__table">
                  <div className="spp-review__thead">
                    <span>Package</span>
                    <span>Guests</span>
                    <span>Total</span>
                  </div>
                  <div className="spp-review__row">
                    <span className="spp-review__plan-name">
                      <span className={`spp-review__dot spp-review__dot--${pkg?.color}`} />
                      {pkg?.tier} Sponsorship
                    </span>
                    <span>{pkg?.guests}</span>
                    <span className="spp-review__line-total">€{pkg?.price.toLocaleString()}</span>
                  </div>
                  <div className="spp-review__total-row">
                    <span>Total Payable</span>
                    <span />
                    <span className="spp-review__grand-total">€{pkg?.price.toLocaleString()}</span>
                  </div>
                </div>

                <div className="spp-review__attendee">
                  <p className="spp-review__attendee-label">Sponsorship from</p>
                  <p className="spp-review__attendee-name">{sponsor.name}</p>
                  {sponsor.org && <p className="spp-review__attendee-email">{sponsor.org}</p>}
                  <p className="spp-review__attendee-email">{sponsor.email}</p>
                  {sponsor.phone && <p className="spp-review__attendee-email">{sponsor.phone}</p>}
                </div>

                <div className="spp-nav">
                  <button className="spp-back-btn" onClick={() => setStep(1)}><FaArrowLeft /> Back</button>
                  <button className="spp-continue-btn" onClick={() => setStep(3)}>
                    Pay €{pkg?.price.toLocaleString()} <FaArrowRight />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 — Payment */}
            {step === 3 && (
              <div className="spp-payment-step">
                <h3 className="spp-form-step__heading">Choose Payment Method</h3>
                <p className="spp-form-step__sub">Select how you'd like to pay €{pkg?.price.toLocaleString()}.</p>

                <div className="spp-pay-methods">
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m.id}
                      className={`spp-pay-method${payMethod === m.id ? ' spp-pay-method--active' : ''}`}
                      onClick={() => setPayMethod(m.id)}
                    >
                      <span className="spp-pay-method__icon">{m.icon}</span>
                      <span className="spp-pay-method__label">{m.label}</span>
                      <span className="spp-pay-method__desc">{m.desc}</span>
                      {payMethod === m.id && <span className="spp-pay-method__check">✓</span>}
                    </button>
                  ))}
                </div>

                <p className="spp-payment__disclaimer">
                  <FaShieldAlt /> Your payment is encrypted and secure. Sponsorship will be activated instantly.
                </p>

                <div className="spp-nav">
                  <button className="spp-back-btn" onClick={() => setStep(2)}><FaArrowLeft /> Back</button>
                  <button
                    className="spp-continue-btn spp-continue-btn--pay"
                    disabled={!payMethod}
                    onClick={() => setPaid(true)}
                  >
                    <FaLock /> Confirm &amp; Pay €{pkg?.price.toLocaleString()}
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
