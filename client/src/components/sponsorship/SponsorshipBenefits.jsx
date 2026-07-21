import { useTranslation } from 'react-i18next';
import { FaGlobe, FaTv, FaMicrophone } from 'react-icons/fa';
import './SponsorshipBenefits.css';

const BENEFITS = [
  { icon: <FaGlobe />,      key: 'exposure', hasDesc: false },
  { icon: <FaTv />,         key: 'screens',  hasDesc: true },
  { icon: <FaMicrophone />, key: 'mention',  hasDesc: false },
];

export default function SponsorshipBenefits() {
  const { t } = useTranslation();

  return (
    <section className="sp-benefits">
      <div className="sp-benefits__inner">
        <p className="sp-benefits__eyebrow">{t('sponsorship.benefits.eyebrow')}</p>
        <div className="sp-benefits__cards">
          {BENEFITS.map((b, i) => (
            <div key={i} className="sp-benefit">
              {i > 0 && <div className="sp-benefit__divider" />}
              <div className="sp-benefit__icon-wrap">
                <span className="sp-benefit__icon">{b.icon}</span>
              </div>
              <div className="sp-benefit__text">
                <p className="sp-benefit__title">{t(`sponsorship.benefits.${b.key}.title`)}</p>
                {b.hasDesc && <p className="sp-benefit__desc">{t(`sponsorship.benefits.${b.key}.desc`)}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
