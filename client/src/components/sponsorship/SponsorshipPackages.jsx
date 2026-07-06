import { useEffect, useState } from 'react';
import { FaMedal, FaStar, FaCrown, FaGem, FaTrophy, FaAward, FaUsers, FaArrowRight, FaArrowLeft, FaLock, FaShieldAlt, FaTag, FaCheckCircle } from 'react-icons/fa';
import { startSponsorshipPayment } from '../../services/paymentService';
import api from '../../services/api';
import './SponsorshipPackages.css';

const ICONS = { medal: <FaMedal />, star: <FaStar />, crown: <FaCrown />, gem: <FaGem />, trophy: <FaTrophy />, award: <FaAward /> };
// The 4 packages that shipped with the original hand-styled CSS (fancy gradients/shadows per
// name) keep that exact look. Any other admin-created tier falls back to a flat accent built
// from its own `color` field, so new/renamed packages still look intentional, not broken.
const KNOWN_COLOR_SLUGS = ['bronze', 'silver', 'gold', 'platinum'];

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
  const [tiers, setTiers] = useState(null);
  const [step, setStep]         = useState(0);
  const [selected, setSelected] = useState(null);
  const [sponsor, setSponsor]   = useState({ name: '', email: '', org: '', phone: '' });
  const [discountCode, setDiscountCode] = useState('');
  const [discount, setDiscount] = useState(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [paying, setPaying]     = useState(false);
  const [payError, setPayError] = useState('');
  const [freeSuccess, setFreeSuccess] = useState('');

  useEffect(() => { api.get('/sponsorship-tiers').then((r) => setTiers(r.data)); }, []);

  const pkg = tiers?.find(p => p.slug === selected);
  const canProceedStep1 = sponsor.name.trim() && sponsor.email.trim();
  const total = discount?.valid ? discount.finalAmount : pkg?.price;

  function handleField(e) {
    setSponsor(s => ({ ...s, [e.target.name]: e.target.value }));
    if (e.target.name === 'email') setDiscount(null);
  }

  function reset() {
    setStep(0); setSelected(null);
    setSponsor({ name: '', email: '', org: '', phone: '' });
    setDiscountCode(''); setDiscount(null); setPaying(false); setPayError(''); setFreeSuccess('');
  }

  async function handleApplyDiscount() {
    if (!discountCode.trim() || !sponsor.email.trim() || !pkg) return;
    setApplyingDiscount(true);
    try {
      const { data } = await api.post('/discount-codes/preview', {
        code: discountCode.trim(), productType: 'sponsorship', email: sponsor.email.trim(), originalAmount: pkg.price,
      });
      setDiscount(data);
    } catch {
      setDiscount({ valid: false, message: 'Could not validate this code right now.' });
    } finally {
      setApplyingDiscount(false);
    }
  }

  async function handlePay() {
    setPayError('');
    setPaying(true);
    try {
      const result = await startSponsorshipPayment({
        sponsorName:   sponsor.name.trim(),
        contactPerson: sponsor.name.trim(),
        companyName:   sponsor.org.trim() || undefined,
        email:         sponsor.email.trim(),
        phone:         sponsor.phone.trim() || undefined,
        tierSlug:      selected,
        discountCode:  discountCode.trim() || undefined,
      });
      if (result.free) {
        setFreeSuccess(result.message || 'This sponsorship is fully covered by the discount — no payment required.');
        setPaying(false);
      }
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
            {!tiers && <p style={{ textAlign: 'center', padding: '2rem' }}>Loading packages…</p>}
            {tiers && (
              <div className="spp-cards">
                {tiers.map((p) => {
                  const colorSlug = KNOWN_COLOR_SLUGS.includes(p.slug) ? p.slug : null;
                  return (
                    <div
                      key={p._id}
                      className={`spp-card${colorSlug ? ` spp-card--${colorSlug}` : ''}${selected === p.slug ? ' spp-card--selected' : ''}`}
                      style={!colorSlug ? { borderTop: `4px solid ${p.color}` } : undefined}
                      onClick={() => setSelected(p.slug)}
                    >
                      <div className="spp-card__top">
                        <div
                          className={`spp-card__badge${colorSlug ? ` spp-card__badge--${colorSlug}` : ''}`}
                          style={!colorSlug ? { background: p.color, color: '#fff' } : undefined}
                        >
                          <span className="spp-card__badge-icon">{ICONS[p.icon] || <FaMedal />}</span>
                        </div>
                        <div className="spp-card__info">
                          <p className="spp-card__tier" style={!colorSlug ? { color: p.color } : undefined}>{p.name.toUpperCase()}</p>
                          <p className="spp-card__sublabel">SPONSORSHIP</p>
                        </div>
                      </div>

                      <div
                        className={`spp-card__ribbon${colorSlug ? ` spp-card__ribbon--${colorSlug}` : ''}`}
                        style={!colorSlug ? { background: p.color } : undefined}
                      >
                        <span className="spp-card__price" style={!colorSlug ? { color: '#fff' } : undefined}>€{p.price.toLocaleString()}</span>
                      </div>

                      <div className="spp-card__guests">
                        <FaUsers />
                        <span className="spp-card__guest-label">{p.ticketCount} complimentary tickets</span>
                      </div>
                      {p.perks?.length > 0 && (
                        <ul className="spp-card__perks">
                          {p.perks.map((perk, i) => <li key={i}>{perk}</li>)}
                        </ul>
                      )}

                      {selected === p.slug && (
                        <span className="spp-card__selected-badge">✓ Selected</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="spp-bottom">
              {selected && (
                <p className="spp-bottom__summary">
                  <strong>{pkg?.name} Sponsorship</strong> — €{pkg?.price.toLocaleString()}
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

                <div className="spp-pfield">
                  <label className="spp-pfield__label"><FaTag /> Discount Code <span className="spp-optional">(optional)</span></label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input className="spp-pfield__input" placeholder="Optional" value={discountCode} onChange={e => { setDiscountCode(e.target.value); setDiscount(null); }} />
                    <button type="button" className="spp-continue-btn" disabled={!discountCode.trim() || !sponsor.email.trim() || applyingDiscount} onClick={handleApplyDiscount}>
                      {applyingDiscount ? 'Checking…' : 'Apply'}
                    </button>
                  </div>
                  {discount?.valid && <span style={{ color: '#2ecc71', fontSize: '0.85rem' }}>✓ €{discount.discount_amount} discount applied</span>}
                  {discount && !discount.valid && <span style={{ color: '#e74c3c', fontSize: '0.85rem' }}>{discount.message}</span>}
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
                      <span
                        className={`spp-review__dot${KNOWN_COLOR_SLUGS.includes(pkg?.slug) ? ` spp-review__dot--${pkg.slug}` : ''}`}
                        style={!KNOWN_COLOR_SLUGS.includes(pkg?.slug) ? { background: pkg?.color } : undefined}
                      />
                      {pkg?.name} Sponsorship
                    </span>
                    <span>{pkg?.ticketCount} tickets</span>
                    <span className="spp-review__line-total">€{pkg?.price.toLocaleString()}</span>
                  </div>
                  {discount?.valid && (
                    <div className="spp-review__row">
                      <span>Discount ({discountCode.trim().toUpperCase()})</span>
                      <span />
                      <span className="spp-review__line-total">−€{discount.discount_amount}</span>
                    </div>
                  )}
                  <div className="spp-review__total-row">
                    <span>Total Payable</span>
                    <span />
                    <span className="spp-review__grand-total">€{total?.toLocaleString()}</span>
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
                    Pay €{total?.toLocaleString()} <FaArrowRight />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 — Confirm & Pay */}
            {step === 3 && freeSuccess && (
              <div className="spp-payment-step">
                <h3 className="spp-form-step__heading"><FaCheckCircle style={{ color: '#2ecc71' }} /> You're all set!</h3>
                <p className="spp-form-step__sub">{freeSuccess}</p>
                <p className="spp-payment__disclaimer">A confirmation has been emailed to {sponsor.email}.</p>
              </div>
            )}

            {step === 3 && !freeSuccess && (
              <div className="spp-payment-step">
                <h3 className="spp-form-step__heading">Confirm &amp; Pay</h3>
                <p className="spp-form-step__sub">
                  You will be redirected to Mollie's secure checkout to complete your <strong>{pkg?.name}</strong> sponsorship payment of <strong>€{total?.toLocaleString()}</strong>.
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
                    {paying ? 'Processing…' : <><FaLock /> Pay €{total?.toLocaleString()} securely</>}
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
