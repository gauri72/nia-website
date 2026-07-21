import { useTranslation } from 'react-i18next';
import { FaLandmark, FaUserFriends, FaMusic, FaGraduationCap } from 'react-icons/fa';
import './DonationImpact.css';

const IMPACTS = [
  { icon: <FaLandmark />,      stat: '10+',  key: 'heritage' },
  { icon: <FaUserFriends />,   stat: '500+', key: 'members' },
  { icon: <FaMusic />,         stat: '20+',  key: 'events' },
  { icon: <FaGraduationCap />, stat: '100%', key: 'funded' },
];

export default function DonationImpact() {
  const { t } = useTranslation();

  return (
    <section className="don-impact">
      <div className="don-impact__inner">
        <p className="don-impact__eyebrow">{t('donation.impact.eyebrow')}</p>
        <h2 className="don-impact__heading">{t('donation.impact.heading')}</h2>
        <p className="don-impact__intro">{t('donation.impact.intro')}</p>
        <div className="don-impact__grid">
          {IMPACTS.map((item, i) => (
            <div key={i} className="don-impact-card">
              <div className="don-impact-card__icon">{item.icon}</div>
              <p className="don-impact-card__stat">{item.stat}</p>
              <p className="don-impact-card__label">{t(`donation.impact.items.${item.key}.label`)}</p>
              <p className="don-impact-card__desc">{t(`donation.impact.items.${item.key}.desc`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
