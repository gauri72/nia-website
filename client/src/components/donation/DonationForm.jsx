import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaHeart, FaStar, FaCrown, FaGem,
  FaCheck, FaArrowRight, FaArrowLeft,
  FaLock, FaShieldAlt, FaCheckCircle,
} from 'react-icons/fa';
import { startDonationPayment } from '../../services/paymentService';
import { translateApiError } from '../../i18n/translateApiError';
import './DonationForm.css';

const TIERS = [
  { id: 'supporter', amount: 50,  label: 'SUPPORTER', icon: <FaHeart />, color: 'amber' },
  { id: 'friend',     amount: 75,  label: 'FRIEND',     icon: <FaStar />,  color: 'gold' },
  { id: 'patron',     amount: 100, label: 'PATRON',     icon: <FaCrown />, color: 'platinum' },
  { id: 'champion',   amount: 200, label: 'CHAMPION',   icon: <FaGem />,   color: 'diamond' },
];

const CAUSES = ['general', 'events', 'youth', 'welfare'];

function StepBar({ step, steps }) {
  return (
    <div className="dn-steps">
      {steps.map((label, i) => (
        <div
          key={i}
          className={`dn-step${step === i ? ' dn-step--active' : ''}${step > i ? ' dn-step--done' : ''}`}
        >
          <div className="dn-step__circle">{step > i ? '✓' : i + 1}</div>
          <span className="dn-step__label">{label}</span>
          {i < steps.length - 1 && <div className="dn-step__line" />}
        </div>
      ))}
    </div>
  );
}

export default function DonationForm() {
  const { t, i18n } = useTranslation();
  const [step, setStep]         = useState(0);
  const [selected, setSelected] = useState(null);   // tier id OR 'custom'
  const [custom, setCustom]     = useState('');
  const [cause, setCause]       = useState('general');
  const [frequency, setFreq]    = useState('once');
  const [donor, setDonor]       = useState({ name: '', email: '', phone: '' });
  const [paying, setPaying]   = useState(false);
  const [payError, setPayError] = useState('');

  const STEPS = [
    t('donation.form.steps.chooseAmount'),
    t('donation.form.steps.yourDetails'),
    t('donation.form.steps.review'),
    t('donation.form.steps.payment'),
  ];

  const tier = TIERS.find(tr => tr.id === selected);
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
    setPaying(false); setPayError('');
  }

  async function handlePay() {
    setPayError('');
    setPaying(true);
    const causeMap = { general: 'general', events: 'cultural_events', youth: 'youth_education', welfare: 'community_welfare' };
    try {
      await startDonationPayment({
        name: donor.name.trim(),
        email: donor.email.trim(),
        phone: donor.phone.trim() || undefined,
        amount,
        cause: causeMap[cause] || 'general',
        tier: selected || 'custom',
      });
      // redirects to Mollie — code below only runs on error
    } catch (err) {
      setPayError(translateApiError(err?.response?.data?.error, i18n.language) || t('donation.form.errors.paymentFailed'));
      setPaying(false);
    }
  }

  return (
    <section className="dn-section" id="donate">
      <div className="dn-flow">

        <div className="dn-header">
          <h2 className="dn-heading">{t('donation.form.heading')}</h2>
          <p className="dn-sub">{t('donation.form.sub')}</p>
        </div>

        <StepBar step={step} steps={STEPS} />

        {/* ══════════════════════════════
            STEP 0 — Choose Amount
            ══════════════════════════════ */}
        {step === 0 && (
          <>
            {/* Tier cards */}
            <div className="dn-cards">
              {TIERS.map(tr => (
                <div
                  key={tr.id}
                  className={`dn-card dn-card--${tr.color}${selected === tr.id ? ' dn-card--selected' : ''}`}
                  onClick={() => { setSelected(tr.id); setCustom(''); }}
                >
                  <div className="dn-card__top">
                    <div className={`dn-card__badge dn-card__badge--${tr.color}`}>
                      <span className="dn-card__badge-icon">{tr.icon}</span>
                    </div>
                    <div className="dn-card__info">
                      <p className="dn-card__label">{tr.label}</p>
                      <p className="dn-card__sublabel">{t('donation.form.summaryLabel')}</p>
                    </div>
                  </div>

                  <div className={`dn-card__ribbon dn-card__ribbon--${tr.color}`}>
                    <span className="dn-card__price">€{tr.amount}</span>
                  </div>

                  <p className="dn-card__tagline">{t(`donation.form.tiers.${tr.id}.tagline`)}</p>

                  <ul className="dn-card__perks">
                    {t(`donation.form.tiers.${tr.id}.perks`, { returnObjects: true }).map((pk, j) => (
                      <li key={j} className="dn-card__perk">
                        <span className={`dn-card__perk-check dn-card__perk-check--${tr.color}`}><FaCheck /></span>
                        <span className="dn-card__perk-text">{pk}</span>
                      </li>
                    ))}
                  </ul>

                  {selected === tr.id && (
                    <span className="dn-card__selected-badge">{t('donation.form.selectedBadge')}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Custom amount */}
            <div className="dn-custom-row">
              <span className="dn-custom-label">{t('donation.form.customAmountLabel')}</span>
              <div className="dn-custom-wrap">
                <span className="dn-custom-prefix">€</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={t('donation.form.customAmountPlaceholder')}
                  className={`dn-custom-input${selected === 'custom' ? ' dn-custom-input--active' : ''}`}
                  value={custom}
                  onChange={handleCustomChange}
                  maxLength={6}
                />
              </div>
            </div>

            {/* Cause selector */}
            <div className="dn-cause-row">
              <label className="dn-cause-label">{t('donation.form.donateTowards')}</label>
              <select
                className="dn-cause-select"
                value={cause}
                onChange={e => setCause(e.target.value)}
              >
                {CAUSES.map(c => (
                  <option key={c} value={c}>{t(`donation.form.causes.${c}`)}</option>
                ))}
              </select>
            </div>

            <div className="dn-bottom">
              {displayAmount && (
                <p className="dn-bottom__summary">
                  <strong>{t('donation.form.summaryLabel')}</strong> — {displayAmount}
                </p>
              )}
              <button
                className="dn-continue-btn"
                disabled={!canProceed0}
                onClick={() => setStep(1)}
              >
                {t('donation.form.continue')} <FaArrowRight />
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
                <h3 className="dn-form-step__heading">{t('donation.form.details.heading')}</h3>
                <p className="dn-form-step__sub">{t('donation.form.details.sub')}</p>

                <div className="dn-pfield">
                  <label className="dn-pfield__label">{t('donation.form.details.fullName')} <span className="dn-required">*</span></label>
                  <input className="dn-pfield__input" name="name" type="text" placeholder={t('donation.form.details.fullName')} value={donor.name} onChange={handleField} />
                </div>
                <div className="dn-pfield">
                  <label className="dn-pfield__label">{t('donation.form.details.emailAddress')} <span className="dn-required">*</span></label>
                  <input className="dn-pfield__input" name="email" type="email" placeholder="you@email.com" value={donor.email} onChange={handleField} />
                </div>
                <div className="dn-pfield">
                  <label className="dn-pfield__label">{t('donation.form.details.phoneNumber')} <span className="dn-optional">{t('donation.form.details.optional')}</span></label>
                  <input className="dn-pfield__input" name="phone" type="tel" placeholder="+31 6 12345678" value={donor.phone} onChange={handleField} />
                </div>

                <div className="dn-nav">
                  <button className="dn-back-btn" onClick={() => setStep(0)}><FaArrowLeft /> {t('donation.form.back')}</button>
                  <button className="dn-continue-btn" disabled={!canProceed1} onClick={() => setStep(2)}>
                    {t('donation.form.continue')} <FaArrowRight />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 — Review */}
            {step === 2 && (
              <div className="dn-review">
                <h3 className="dn-form-step__heading">{t('donation.form.review.heading')}</h3>
                <p className="dn-form-step__sub">{t('donation.form.review.sub')}</p>

                <div className="dn-review__table">
                  <div className="dn-review__thead">
                    <span>{t('donation.form.review.cause')}</span>
                    <span>{t('donation.form.review.amount')}</span>
                  </div>
                  <div className="dn-review__row">
                    <span className="dn-review__plan-name">
                      <span className={`dn-review__dot dn-review__dot--${tier?.color ?? 'amber'}`} />
                      {t(`donation.form.causes.${cause}`)}
                    </span>
                    <span className="dn-review__line-total">{displayAmount}</span>
                  </div>
                  <div className="dn-review__total-row">
                    <span>{t('donation.form.review.totalPayable')}</span>
                    <span className="dn-review__grand-total">{displayAmount}</span>
                  </div>
                </div>

                <div className="dn-review__attendee">
                  <p className="dn-review__attendee-label">{t('donation.form.review.donationFrom')}</p>
                  <p className="dn-review__attendee-name">{donor.name}</p>
                  <p className="dn-review__attendee-email">{donor.email}</p>
                  {donor.phone && <p className="dn-review__attendee-email">{donor.phone}</p>}
                </div>

                <div className="dn-nav">
                  <button className="dn-back-btn" onClick={() => setStep(1)}><FaArrowLeft /> {t('donation.form.back')}</button>
                  <button className="dn-continue-btn" onClick={() => setStep(3)}>
                    {t('donation.form.review.pay', { amount: displayAmount })} <FaArrowRight />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 — Confirm & Pay */}
            {step === 3 && (
              <div className="dn-payment-step">
                <h3 className="dn-form-step__heading">{t('donation.form.payment.confirmDonate')}</h3>
                <p className="dn-form-step__sub">{t('donation.form.payment.redirectNotice', { amount: displayAmount })}</p>

                <p className="dn-payment__disclaimer">
                  <FaShieldAlt /> {t('donation.form.payment.secureNotice')}
                </p>

                {payError && (
                  <p style={{ color: '#e74c3c', fontSize: '0.88rem', marginTop: '0.5rem' }}>{payError}</p>
                )}

                <div className="dn-nav">
                  <button className="dn-back-btn" onClick={() => setStep(2)} disabled={paying}><FaArrowLeft /> {t('donation.form.back')}</button>
                  <button
                    className="dn-continue-btn dn-continue-btn--pay"
                    disabled={paying}
                    onClick={handlePay}
                  >
                    {paying ? t('donation.form.payment.redirecting') : <><FaLock /> {t('donation.form.payment.donateSecurely', { amount: displayAmount })}</>}
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
