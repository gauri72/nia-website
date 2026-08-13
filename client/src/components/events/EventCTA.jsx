import { useTranslation } from 'react-i18next';
import ctaLogo from '../../assets/events/CTALogo.png';
import './EventCTA.css';

export default function EventCTA({ i18nNamespace = 'events' }) {
  const { t } = useTranslation();

  return (
    <section className="event-cta">
      <div className="event-cta__inner">
        <img src={ctaLogo} alt="Lotus" className="event-cta__logo" />
        <div className="event-cta__text">
          <p className="event-cta__title">{t(`${i18nNamespace}.cta.title`)}</p>
          <p className="event-cta__sub" style={{ whiteSpace: 'pre-line' }}>{t(`${i18nNamespace}.cta.sub`)}</p>
        </div>
        <a href="#membership" className="event-cta__btn">
          {t(`${i18nNamespace}.cta.becomeMemberBtn`)} &nbsp;→
        </a>
      </div>
    </section>
  );
}
