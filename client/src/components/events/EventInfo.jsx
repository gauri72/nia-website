import { useTranslation } from 'react-i18next';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaUsers } from 'react-icons/fa';
import './EventInfo.css';

const INFO = [
  { icon: <FaCalendarAlt />, key: 'date' },
  { icon: <FaClock />,       key: 'time' },
  { icon: <FaMapMarkerAlt />, key: 'venue', mapUrl: 'https://maps.app.goo.gl/qSfRXG5iMBcR6exs8' },
  { icon: <FaUsers />,       key: 'theme' },
];

export default function EventInfo() {
  const { t } = useTranslation();

  return (
    <section className="event-info">
      <div className="event-info__inner">
        {INFO.map((item, i) => (
          <div key={i} className="event-info__item">
            <span className="event-info__icon">{item.icon}</span>
            <div className="event-info__text">
              <p className="event-info__label">{t(`events.info.${item.key}.label`)}</p>
              <p className="event-info__primary">{t(`events.info.${item.key}.primary`)}</p>
              <p className="event-info__secondary" style={{ whiteSpace: 'pre-line' }}>
                {t(`events.info.${item.key}.secondary`)}
              </p>
              {item.mapUrl && (
                <a href={item.mapUrl} target="_blank" rel="noopener noreferrer" className="event-info__map-btn">
                  <FaMapMarkerAlt /> {t('events.info.viewOnMap')}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
