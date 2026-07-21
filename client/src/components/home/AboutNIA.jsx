import { useTranslation } from 'react-i18next';
import { FaHandshake, FaUsers } from 'react-icons/fa';
import aboutNiaImage from '../../assets/home/AboutNiaImage.png';
import './AboutNIA.css';

const OBJECTIVES = [
  { key: 'objective1', icon: <FaHandshake />, color: 'navy' },
  { key: 'objective2', icon: <FaUsers />,      color: 'green' },
];

export default function AboutNIA() {
  const { t } = useTranslation();

  return (
    <section className="about" id="about">
      <div className="about__inner">

        {/* Blue-shaded card panel */}
        <div className="about__left">
          <h2 className="about__heading">{t('home.aboutNia.heading')}</h2>
          <div className="about__underline" />
          <p className="about__subtitle">{t('home.aboutNia.subtitle')}</p>
          <ul className="about__objectives">
            {OBJECTIVES.map((obj, i) => (
              <li key={i} className="about__objective">
                {/* Outer ring → inner filled circle → icon */}
                <span className={`about__icon-ring about__icon-ring--${obj.color}`}>
                  <span className={`about__icon-circle about__icon-circle--${obj.color}`}>
                    {obj.icon}
                  </span>
                </span>
                <p>{t(`home.aboutNia.${obj.key}`)}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="about__right">
          <img
            src={aboutNiaImage}
            alt="Netherlands and India flags"
            className="about__flags-img"
          />
        </div>
      </div>
    </section>
  );
}
