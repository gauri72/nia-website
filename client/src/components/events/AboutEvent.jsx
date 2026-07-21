import { useTranslation } from 'react-i18next';
import { FaMusic, FaUtensils, FaHandshake, FaStar } from 'react-icons/fa';
import './AboutEvent.css';

const HIGHLIGHTS = [
  { icon: <FaMusic />,     key: 'performances' },
  { icon: <FaUtensils />,  key: 'cuisine' },
  { icon: <FaHandshake />, key: 'togetherness' },
  { icon: <FaStar />,      key: 'surprises' },
];

export default function AboutEvent() {
  const { t } = useTranslation();

  return (
    <section className="about-event">
      <div className="about-event__inner">

        {/* Left — text */}
        <div className="about-event__left">
          <h2 className="about-event__heading">{t('events.about.heading')}</h2>
          <p className="about-event__body">{t('events.about.body1')}</p>
          <p className="about-event__body">{t('events.about.body2')}</p>
          <a href="#tickets" className="about-event__btn">
            {t('events.about.highlightsBtn')} &nbsp;→
          </a>
        </div>

        {/* Right — highlight icons */}
        <div className="about-event__right">
          {HIGHLIGHTS.map((h, i) => (
            <div key={i} className="about-event__highlight">
              <div className="about-event__highlight-icon">{h.icon}</div>
              <p className="about-event__highlight-label" style={{ whiteSpace: 'pre-line' }}>
                {t(`events.about.highlights.${h.key}`)}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
