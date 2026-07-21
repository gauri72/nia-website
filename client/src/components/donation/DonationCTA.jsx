import { useTranslation } from 'react-i18next';
import { FaHandHoldingHeart } from 'react-icons/fa';
import ctaLogo from '../../assets/events/CTALogo.png';
import './DonationCTA.css';

export default function DonationCTA() {
  const { t } = useTranslation();

  return (
    <section className="don-cta">
      <div className="don-cta__inner">

        <div className="don-cta__icon-wrap">
          <FaHandHoldingHeart className="don-cta__icon" />
        </div>

        <div className="don-cta__text">
          <p className="don-cta__body">{t('donation.cta.body')}</p>
          <p className="don-cta__sub">
            {t('donation.cta.subPrefix')}{' '}
            <strong>{t('donation.cta.subStrong')}</strong>
          </p>
        </div>

        <img src={ctaLogo} alt="NIA Lotus" className="don-cta__logo" aria-hidden="true" />

      </div>
    </section>
  );
}
