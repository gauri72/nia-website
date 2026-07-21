import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaHome, FaStar, FaUsers, FaCalendarAlt, FaTag, FaEnvelope,
  FaAward, FaCrown, FaCheck, FaTicketAlt, FaArrowRight, FaArrowLeft,
  FaLock, FaShieldAlt, FaCheckCircle, FaIdCard,
} from 'react-icons/fa';
import { startMembershipPayment } from '../../services/paymentService';
import api from '../../services/api';
import { translateApiError } from '../../i18n/translateApiError';
import './MembershipPlans.css';

/* ── Plan data (translatable copy resolved via i18n keys below) ── */
const PLANS = [
  {
    id: 'friend',
    icon: <FaHome />,
    tier: 'FRIEND',
    price: 60,
    unit: '/ year',
    color: 'gold',
    perkIcons: [<FaUsers />, <FaCalendarAlt />, <FaTag />, <FaEnvelope />, <FaUsers />],
  },
  {
    id: 'patron',
    icon: <FaStar />,
    tier: 'PATRON',
    price: 150,
    unit: '/ year',
    color: 'diamond',
    perkIcons: [<FaUsers />, <FaCalendarAlt />, <FaTicketAlt />, <FaEnvelope />, <FaAward />, <FaCrown />],
  },
];

function StepBar({ step, steps }) {
  return (
    <div className="mp-steps">
      {steps.map((label, i) => (
        <div key={i} className={`mp-step${step === i ? ' mp-step--active' : ''}${step > i ? ' mp-step--done' : ''}`}>
          <div className="mp-step__circle">{step > i ? '✓' : i + 1}</div>
          <span className="mp-step__label">{label}</span>
          {i < steps.length - 1 && <div className="mp-step__line" />}
        </div>
      ))}
    </div>
  );
}

export default function MembershipPlans() {
  const { t, i18n } = useTranslation();
  const [step, setStep]           = useState(0);
  const [selected, setSelected]   = useState(null);
  const [member, setMember]       = useState({ name: '', email: '', phone: '' });
  const [partner, setPartner]     = useState({ name: '', email: '', phone: '' });
  const [memberCode, setMemberCode] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [discount, setDiscount] = useState(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [paying, setPaying]   = useState(false);
  const [payError, setPayError] = useState('');
  const [freeSuccess, setFreeSuccess] = useState('');

  const STEPS = [
    t('membership.plans.steps.choosePlan'),
    t('membership.plans.steps.yourDetails'),
    t('membership.plans.steps.reviewOrder'),
    t('membership.plans.steps.payment'),
  ];

  const plan = PLANS.find(p => p.id === selected);
  const canProceedStep1 = member.name.trim() && member.email.trim() && partner.name.trim();
  const total = discount?.valid ? discount.finalAmount : plan?.price;

  function handleField(e) {
    setMember(m => ({ ...m, [e.target.name]: e.target.value }));
    if (e.target.name === 'email') setDiscount(null);
  }

  function handlePartnerField(e) {
    setPartner(p => ({ ...p, [e.target.name]: e.target.value }));
  }

  function reset() {
    setStep(0); setSelected(null);
    setMember({ name: '', email: '', phone: '' });
    setPartner({ name: '', email: '', phone: '' });
    setMemberCode(''); setDiscountCode(''); setDiscount(null); setPaying(false); setPayError(''); setFreeSuccess('');
  }

  async function handleApplyDiscount() {
    if (!discountCode.trim() || !member.email.trim() || !plan) return;
    setApplyingDiscount(true);
    try {
      const { data } = await api.post('/discount-codes/preview', {
        code: discountCode.trim(), productType: 'membership', email: member.email.trim(), originalAmount: plan.price,
      });
      setDiscount(data.message ? { ...data, message: translateApiError(data.message, i18n.language) } : data);
    } catch {
      setDiscount({ valid: false, message: t('membership.plans.errors.discountCheckFailed') });
    } finally {
      setApplyingDiscount(false);
    }
  }

  async function handlePay() {
    setPayError('');
    setPaying(true);
    try {
      const result = await startMembershipPayment({
        plan: selected,
        name: member.name.trim(),
        email: member.email.trim(),
        phone: member.phone.trim() || undefined,
        partnerName: partner.name.trim() || undefined,
        partnerEmail: partner.email.trim() || undefined,
        partnerPhone: partner.phone.trim() || undefined,
        discountCode: discountCode.trim() || undefined,
      });
      // A fully-discounted membership is finalized immediately server-side — there's
      // no Mollie checkout to redirect to. Anything else redirects the browser away.
      if (result.free) {
        setFreeSuccess(result.message || t('membership.plans.freeSuccessDefault'));
        setPaying(false);
      }
    } catch (err) {
      setPayError(translateApiError(err?.response?.data?.error, i18n.language) || t('membership.plans.errors.paymentFailed'));
      setPaying(false);
    }
  }

  return (
    <section className="mem-plans" id="plans">
      <div className="mem-plans__flow">

        <div className="mem-plans__header">
          <h2 className="mem-plans__heading">{t('membership.plans.heading')}</h2>
          <p className="mem-plans__sub">{t('membership.plans.sub')}</p>
        </div>

        <StepBar step={step} steps={STEPS} />

        {/* ══════════════════════════════
            STEP 0 — Choose Plan
            ══════════════════════════════ */}
        {step === 0 && (
          <>
            {/* Membership code */}
            <div className="mp-code-row">
              <label className="mp-field__label"><FaIdCard /> {t('membership.plans.memberCodeLabel')}</label>
              <div className="mp-code-wrap">
                <input
                  className="mp-code-input"
                  placeholder={t('membership.plans.memberCodePlaceholder')}
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
                      <p className="mp-pkg__sublabel">{t(`home.membership.tiers.${p.id}.sublabel`)}</p>
                    </div>
                  </div>

                  <div className={`mp-pkg__ribbon mp-pkg__ribbon--${p.color}`}>
                    <span className="mp-pkg__price">€{p.price}</span>
                    <span className="mp-pkg__unit">{p.unit}</span>
                  </div>

                  <p className={`mp-pkg__perk-badge mp-pkg__perk-badge--${p.color}`}>{t(`membership.plans.tiers.${p.id}.perkBadge`)}</p>

                  <p className="mp-pkg__tagline">{t(`membership.plans.tiers.${p.id}.tagline`)}</p>

                  <ul className="mp-pkg__perks">
                    {t(`membership.plans.tiers.${p.id}.perks`, { returnObjects: true }).map((perkText, j) => (
                      <li key={j} className="mp-pkg__perk">
                        <span className={`mp-pkg__perk-check mp-pkg__perk-check--${p.color}`}><FaCheck /></span>
                        <span className="mp-pkg__perk-text">{perkText}</span>
                      </li>
                    ))}
                  </ul>

                  {selected === p.id && (
                    <span className="mp-pkg__selected-badge">{t('membership.plans.selectedBadge')}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="mp-bottom">
              {selected && (
                <p className="mp-bottom__summary">
                  <strong>{t('membership.plans.summaryMembership', { tier: plan?.tier })}</strong> — €{plan?.price}/{t('membership.plans.perYear')}
                </p>
              )}
              <button
                className="mp-continue-btn mp-continue-btn--light"
                disabled={!selected}
                onClick={() => setStep(1)}
              >
                {t('membership.plans.continue')} <FaArrowRight />
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
            <h3 className="mp-form-step__heading">{t('membership.plans.details.heading')}</h3>
            <p className="mp-form-step__sub">{t('membership.plans.details.sub')}</p>

            <div className="mp-pfield">
              <label className="mp-pfield__label">{t('membership.plans.details.fullName')} <span className="mp-required">*</span></label>
              <input className="mp-pfield__input" name="name" type="text" placeholder={t('membership.plans.details.fullName')} value={member.name} onChange={handleField} />
            </div>
            <div className="mp-pfield">
              <label className="mp-pfield__label">{t('membership.plans.details.emailAddress')} <span className="mp-required">*</span></label>
              <input className="mp-pfield__input" name="email" type="email" placeholder="you@email.com" value={member.email} onChange={handleField} />
            </div>
            <div className="mp-pfield">
              <label className="mp-pfield__label">{t('membership.plans.details.phoneNumber')} <span className="mp-optional">{t('membership.plans.details.optional')}</span></label>
              <input className="mp-pfield__input" name="phone" type="tel" placeholder="+31 6 12345678" value={member.phone} onChange={handleField} />
            </div>

            <div className="mp-pfield">
              <label className="mp-pfield__label"><FaTag /> {t('membership.plans.details.discountCode')} <span className="mp-optional">{t('membership.plans.details.optional')}</span></label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  className="mp-pfield__input" placeholder={t('membership.plans.details.discountPlaceholder')}
                  value={discountCode}
                  onChange={e => { setDiscountCode(e.target.value); setDiscount(null); }}
                />
                <button type="button" className="mp-continue-btn" disabled={!discountCode.trim() || !member.email.trim() || applyingDiscount} onClick={handleApplyDiscount}>
                  {applyingDiscount ? t('membership.plans.details.checking') : t('membership.plans.details.apply')}
                </button>
              </div>
              {discount?.valid && <span style={{ color: '#2ecc71', fontSize: '0.85rem' }}>{t('membership.plans.details.discountApplied', { amount: discount.discount_amount })}</span>}
              {discount && !discount.valid && <span style={{ color: '#e74c3c', fontSize: '0.85rem' }}>{discount.message}</span>}
              {!member.email.trim() && <span className="mp-pfield__hint">{t('membership.plans.details.enterEmailFirst')}</span>}
            </div>

            <div className="mp-section-divider">
              <span className="mp-section-divider__line" />
              <span className="mp-section-divider__label">{t('membership.plans.details.partnerDetails')}</span>
              <span className="mp-section-divider__line" />
            </div>

            <div className="mp-pfield">
              <label className="mp-pfield__label">{t('membership.plans.details.partnerFullName')} <span className="mp-required">*</span></label>
              <input className="mp-pfield__input" name="name" type="text" placeholder={t('membership.plans.details.partnerFullName')} value={partner.name} onChange={handlePartnerField} />
            </div>
            <div className="mp-pfield">
              <label className="mp-pfield__label">{t('membership.plans.details.partnerEmail')} <span className="mp-optional">{t('membership.plans.details.optional')}</span></label>
              <input className="mp-pfield__input" name="email" type="email" placeholder="partner@email.com" value={partner.email} onChange={handlePartnerField} />
            </div>
            <div className="mp-pfield">
              <label className="mp-pfield__label">{t('membership.plans.details.partnerPhone')} <span className="mp-optional">{t('membership.plans.details.optional')}</span></label>
              <input className="mp-pfield__input" name="phone" type="tel" placeholder="+31 6 12345678" value={partner.phone} onChange={handlePartnerField} />
            </div>

            <div className="mp-nav">
              <button className="mp-back-btn" onClick={() => setStep(0)}><FaArrowLeft /> {t('membership.plans.back')}</button>
              <button className="mp-continue-btn" disabled={!canProceedStep1} onClick={() => setStep(2)}>
                {t('membership.plans.continue')} <FaArrowRight />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════
            STEP 2 — Review Order
            ══════════════════════════════ */}
        {step === 2 && (
          <div className="mp-review">
            <h3 className="mp-form-step__heading">{t('membership.plans.review.heading')}</h3>
            <p className="mp-form-step__sub">{t('membership.plans.review.sub')}</p>

            <div className="mp-review__table">
              <div className="mp-review__thead">
                <span>{t('membership.plans.review.plan')}</span>
                <span>{t('membership.plans.review.duration')}</span>
                <span>{t('membership.plans.review.total')}</span>
              </div>
              <div className="mp-review__row">
                <span className="mp-review__plan-name">
                  <span className={`mp-review__dot mp-review__dot--${plan?.color}`} />
                  {t('membership.plans.summaryMembership', { tier: plan?.tier })}
                </span>
                <span>{t('membership.plans.review.oneYear')}</span>
                <span className="mp-review__line-total">€{plan?.price}</span>
              </div>
              {discount?.valid && (
                <div className="mp-review__row">
                  <span>{t('membership.plans.review.discount')} ({discountCode.trim().toUpperCase()})</span>
                  <span />
                  <span className="mp-review__line-total">−€{discount.discount_amount}</span>
                </div>
              )}
              <div className="mp-review__total-row">
                <span>{t('membership.plans.review.totalPayable')}</span>
                <span />
                <span className="mp-review__grand-total">€{total}</span>
              </div>
            </div>

            <div className="mp-review__attendee">
              <p className="mp-review__attendee-label">{t('membership.plans.review.primaryMember')}</p>
              <p className="mp-review__attendee-name">{member.name}</p>
              <p className="mp-review__attendee-email">{member.email}</p>
              {member.phone && <p className="mp-review__attendee-email">{member.phone}</p>}
            </div>

            {partner.name && (
              <div className="mp-review__attendee">
                <p className="mp-review__attendee-label">{t('membership.plans.review.partner')}</p>
                <p className="mp-review__attendee-name">{partner.name}</p>
                {partner.email && <p className="mp-review__attendee-email">{partner.email}</p>}
                {partner.phone && <p className="mp-review__attendee-email">{partner.phone}</p>}
              </div>
            )}

            <div className="mp-nav">
              <button className="mp-back-btn" onClick={() => setStep(1)}><FaArrowLeft /> {t('membership.plans.back')}</button>
              <button className="mp-continue-btn" onClick={() => setStep(3)}>
                {t('membership.plans.review.pay', { amount: total })} <FaArrowRight />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════
            STEP 3 — Confirm & Pay
            ══════════════════════════════ */}
        {step === 3 && freeSuccess && (
          <div className="mp-payment-step">
            <h3 className="mp-form-step__heading"><FaCheckCircle style={{ color: '#2ecc71' }} /> {t('membership.plans.payment.allSet')}</h3>
            <p className="mp-form-step__sub">{freeSuccess}</p>
            <p className="mp-payment__disclaimer">{t('membership.plans.payment.confirmationEmailed', { email: member.email })}</p>
          </div>
        )}

        {step === 3 && !freeSuccess && (
          <div className="mp-payment-step">
            <h3 className="mp-form-step__heading">{t('membership.plans.payment.confirmPay')}</h3>
            <p className="mp-form-step__sub">{t('membership.plans.payment.redirectNotice', { amount: total })}</p>

            <p className="mp-payment__disclaimer">
              <FaShieldAlt /> {t('membership.plans.payment.secureNotice')}
            </p>

            {payError && (
              <p style={{ color: '#e74c3c', fontSize: '0.88rem', marginTop: '0.5rem' }}>{payError}</p>
            )}

            <div className="mp-nav">
              <button className="mp-back-btn" onClick={() => setStep(2)} disabled={paying}><FaArrowLeft /> {t('membership.plans.back')}</button>
              <button
                className="mp-continue-btn mp-continue-btn--pay"
                disabled={paying}
                onClick={handlePay}
              >
                {paying ? t('membership.plans.payment.processing') : <><FaLock /> {t('membership.plans.payment.paySecurely', { amount: total })}</>}
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
