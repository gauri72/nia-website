import { useState } from 'react';
import { FaMedal, FaStar, FaCrown, FaGem, FaUsers, FaArrowRight, FaArrowLeft, FaLock, FaShieldAlt } from 'react-icons/fa';
import { startSponsorshipPayment } from '../../services/paymentService';
import './SponsorshipPackages.css';

const PACKAGES = [
  {
    id: 'bronze',
    tier: 'BRONZE',
    price: 250,
    icon: <FaMedal />,
    color: 'bronze',
    tickets: 2,
  },
  {
    id: 'silver',
    tier: 'SILVER',
    price: 500,
    icon: <FaStar />,
    color: 'silver',
    tickets: 4,
  },
  {
    id: 'gold',
    tier: 'GOLD',
    price: 1000,
    icon: <FaCrown />,
    color: 'gold',
    tickets: 8,
  },
  {
    id: 'platinum',
    tier: 'PLATINUM',
    price: 2500,
    icon: <FaGem />,
    color: 'platinum',
    tickets: 12,
  },
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
  const [paying, setPaying]     = useState(false);
  const [payError, setPayError] = useState('');

  const pkg = PACKAGES.find(p => p.id === selected);
  const canProceedStep1 = sponsor.name.trim() && sponsor.email.trim();

  function handleField(e) {
    setSponsor(s => ({ ...s, [e.target.name]: e.target.value }));
  }

  function reset() {
    setStep(0); setSelected(null);
    setSponsor({ name: '', email: '', org: '', phone: '' });
    setPaying(false); setPayError('');
  }

  async function handlePay() {
    setPayError('');
    setPaying(true);
    try {
      await startSponsorshipPayment({
        sponsorName:   sponsor.name.trim(),
        contactPerson: sponsor.name.trim(),
        companyName:   sponsor.org.trim() || undefined,
        email:         sponsor.email.trim(),
        phone:         sponsor.phone.trim() || undefined,
        packageName:   selected,
      });
    } catch (err) {
      setPayError(err?.response?.data?.error || 'Payment failed. Please try again.');
      setPaying(false);
    }
  }

  return (
    <section className="sp-packages" id="packages">
      <div className="sp-packages__flow">

        <div className="sp-packages__header">
          <h2 className="sp-packages__heading">Sponsorship Packages</h2>
          <p className="sp-packages__sub">Support the Netherlands India Association and gain visibility across our events and community.</p>
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
                      <p className="spp-card__sublabel">SPONSORSHIP</p>
                    </div>
                  </div>

                  <div className={`spp-card__ribbon spp-card__ribbon--${p.color}`}>
                    <span className="spp-card__price">€{p.price.toLocaleString()}</span>
                  </div>

                  <div className="spp-card__guests">
                    <FaUsers />
                    <span className="spp-card__guest-label">{p.tickets} complimentary tickets</span>
                  </div>

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
                    <span>Tickets</span>
                    <span>Total</span>
                  </div>
                  <div className="spp-review__row">
                    <span className="spp-review__plan-name">
                      <span className={`spp-review__dot spp-review__dot--${pkg?.color}`} />
                      {pkg?.tier} Sponsorship
                    </span>
                    <span>{pkg?.tickets} tickets</span>
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

            {/* STEP 3 — Confirm & Pay */}
            {step === 3 && (
              <div className="spp-payment-step">
                <h3 className="spp-form-step__heading">Confirm &amp; Pay</h3>
                <p className="spp-form-step__sub">
                  You will be redirected to Mollie's secure checkout to complete your <strong>{pkg?.tier}</strong> sponsorship payment of <strong>€{pkg?.price.toLocaleString()}</strong>.
                  All major payment methods are accepted.
                </p>

                <p className="spp-payment__disclaimer">
                  <FaShieldAlt /> Your payment is encrypted and secure. Our team will contact you after confirmation.
                </p>

                {payError && (
                  <p style={{ color: '#e74c3c', fontSize: '0.88rem', marginTop: '0.5rem' }}>{payError}</p>
                )}

                <div className="spp-nav">
                  <button className="spp-back-btn" onClick={() => setStep(2)} disabled={paying}><FaArrowLeft /> Back</button>
                  <button
                    className="spp-continue-btn spp-continue-btn--pay"
                    disabled={paying}
                    onClick={handlePay}
                  >
                    {paying ? 'Redirecting…' : <><FaLock /> Pay €{pkg?.price.toLocaleString()} securely</>}
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
