import { useTranslation } from 'react-i18next';
import { FaGlobe, FaTv, FaMicrophone } from 'react-icons/fa';
import './SponsorshipEvents.css';

const BENEFITS = [
  { icon: <FaGlobe />,      key: 'exposure', hasDesc: false },
  { icon: <FaTv />,         key: 'screens',  hasDesc: true },
  { icon: <FaMicrophone />, key: 'mention',  hasDesc: false },
];

const FLAGSHIP = [
  { emoji: '🇮🇳', key: 'independence', color: 'india' },
  { emoji: '🎄',  key: 'christmas',    color: 'xmas'  },
];

export default function SponsorshipEvents() {
  const { t } = useTranslation();

  return (
    <section className="sp-dark">

      {/* ══ ROW 1: Benefits (left) | Flagship (right) ══ */}
      <div className="sp-dark__row1">

        <div className="sp-dark__benefits-col">
          <p className="sp-dark__eyebrow">{t('sponsorship.benefits.eyebrow')}</p>
          <div className="sp-dark__benefit-row">
            {BENEFITS.map((b, i) => (
              <div key={i} className="sp-benefit-item">
                {i > 0 && <div className="sp-benefit-item__vline" />}
                <div className="sp-benefit-item__content">
                  <div className="sp-benefit-item__icon-wrap">{b.icon}</div>
                  <div className="sp-benefit-item__text">
                    <p className="sp-benefit-item__title" style={{ whiteSpace: 'pre-line' }}>{t(`sponsorship.events.benefits.${b.key}`)}</p>
                    {b.hasDesc && <p className="sp-benefit-item__desc">{t('sponsorship.events.benefits.screensDesc')}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sp-dark__flagship-box">
          <p className="sp-dark__flagship-heading">{t('sponsorship.events.flagshipHeading')}</p>
          {FLAGSHIP.map((ev) => (
            <div key={ev.key} className={`sp-flagship sp-flagship--${ev.color}`}>
              <span className="sp-flagship__emoji">{ev.emoji}</span>
              <div>
                <p className="sp-flagship__name">{t(`sponsorship.events.flagship.${ev.key}.title`)}</p>
                <p className="sp-flagship__date">{t(`sponsorship.events.flagship.${ev.key}.date`)}</p>
              </div>
            </div>
          ))}
        </div>

      </div>

    </section>
  );
}
