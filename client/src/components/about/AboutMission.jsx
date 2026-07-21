import { useTranslation } from 'react-i18next';
import { FaGlobe, FaHeart, FaPeace, FaLightbulb } from 'react-icons/fa';
import './AboutMission.css';

const VALUES = [
  { key: 'culturalBridge', icon: <FaGlobe /> },
  { key: 'communityFirst', icon: <FaHeart /> },
  { key: 'mutualRespect',  icon: <FaPeace /> },
  { key: 'inspireEducate', icon: <FaLightbulb /> },
];

export default function AboutMission() {
  const { t } = useTranslation();

  return (
    <section className="au-mission">
      <div className="au-mission__inner">

        <div className="au-mission__header">
          <p className="au-mission__eyebrow">{t('about.mission.eyebrow')}</p>
          <h2 className="au-mission__heading">{t('about.mission.heading')}</h2>
          <p className="au-mission__intro">{t('about.mission.intro')}</p>
        </div>

        <div className="au-mission__grid">
          {VALUES.map((v, i) => (
            <div key={i} className="au-value-card">
              <div className="au-value-card__icon">{v.icon}</div>
              <h3 className="au-value-card__title">{t(`about.mission.values.${v.key}.title`)}</h3>
              <p className="au-value-card__desc">{t(`about.mission.values.${v.key}.desc`)}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
