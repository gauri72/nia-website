import { useTranslation } from 'react-i18next';
import { FaCalendarAlt } from 'react-icons/fa';
import ctaLogo from '../../assets/events/CTALogo.png';
import './MembershipCTA.css';

export default function MembershipCTA() {
  const { t } = useTranslation();

  return (
    <section className="mem-cta">
      <div className="mem-cta__inner">

        {/* Lotus icon */}
        <div className="mem-cta__icon-wrap">
          <FaCalendarAlt className="mem-cta__cal-icon" />
        </div>

        {/* Text block */}
        <div className="mem-cta__text">
          <p className="mem-cta__body">{t('membership.cta.body')}</p>
          <p className="mem-cta__sub">
            {t('membership.cta.subPrefix')}{' '}
            <strong>{t('membership.cta.subStrong')}</strong>
          </p>
        </div>

        {/* Logo */}
        <img src={ctaLogo} alt="Lotus" className="mem-cta__logo" aria-hidden="true" />

      </div>
    </section>
  );
}
