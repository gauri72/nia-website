import { useTranslation } from 'react-i18next';
import { FaHandshake, FaUsers } from 'react-icons/fa';
import aboutNiaImage from '../../assets/home/AboutNiaImage.png';
import './AboutIntro.css';

const OBJECTIVES = [
  { key: 'objective1', icon: <FaHandshake />, color: 'navy' },
  { key: 'objective2', icon: <FaUsers />,      color: 'green' },
];

export default function AboutIntro() {
  const { t } = useTranslation();

  return (
    <section className="au-intro">
      <div className="au-intro__inner">

        <div className="au-intro__left">
          <p className="au-intro__eyebrow">{t('about.intro.eyebrow')}</p>
          <h2 className="au-intro__heading">{t('about.intro.heading')}</h2>
          <div className="au-intro__underline" />
          <p className="au-intro__body">{t('about.intro.body')}</p>
          <p className="au-intro__sub">{t('home.aboutNia.subtitle')}</p>
          <ul className="au-intro__objectives">
            {OBJECTIVES.map((obj, i) => (
              <li key={i} className="au-intro__objective">
                <span className={`au-intro__icon-ring au-intro__icon-ring--${obj.color}`}>
                  <span className={`au-intro__icon-circle au-intro__icon-circle--${obj.color}`}>
                    {obj.icon}
                  </span>
                </span>
                <p>{t(`home.aboutNia.${obj.key}`)}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="au-intro__right">
          <img
            src={aboutNiaImage}
            alt="Netherlands and India flags"
            className="au-intro__img"
          />
        </div>

      </div>
    </section>
  );
}
