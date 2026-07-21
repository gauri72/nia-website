import { useTranslation } from 'react-i18next';
import { FaUsers } from 'react-icons/fa';
import ctaLogo from '../../assets/events/CTALogo.png';
import './AboutCTA.css';

export default function AboutCTA() {
  const { t } = useTranslation();

  return (
    <section className="au-cta">
      <div className="au-cta__inner">

        <div className="au-cta__icon-wrap">
          <FaUsers className="au-cta__icon" />
        </div>

        <div className="au-cta__text">
          <p className="au-cta__body">{t('about.cta.body')}</p>
          <p className="au-cta__sub">
            {t('about.cta.subPrefix')}{' '}
            <strong>{t('about.cta.subStrong')}</strong>
          </p>
        </div>

        <img src={ctaLogo} alt="NIA Lotus" className="au-cta__logo" aria-hidden="true" />

      </div>
    </section>
  );
}
