import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaUsers } from 'react-icons/fa';
import './EventInfo.css';

const INFO = [
  {
    icon: <FaCalendarAlt />,
    label: 'DATE',
    primary: '15TH AUGUST 2026',
    secondary: 'SATURDAY',
  },
  {
    icon: <FaClock />,
    label: 'TIME',
    primary: '18:00',
    secondary: 'ONWARDS',
  },
  {
    icon: <FaMapMarkerAlt />,
    label: 'VENUE',
    primary: 'DE DUINPAN',
    secondary: 'Sportlaan 34, 2191 XH De Zilk\nGemeente Noordwijk',
    mapUrl: 'https://maps.app.goo.gl/qSfRXG5iMBcR6exs8',
  },
  {
    icon: <FaUsers />,
    label: 'EVENT THEME',
    primary: 'India, Netherlands',
    secondary: 'and Water',
  },
];

export default function EventInfo() {
  return (
    <section className="event-info">
      <div className="event-info__inner">
        {INFO.map((item, i) => (
          <div key={i} className="event-info__item">
            <span className="event-info__icon">{item.icon}</span>
            <div className="event-info__text">
              <p className="event-info__label">{item.label}</p>
              <p className="event-info__primary">{item.primary}</p>
              <p className="event-info__secondary" style={{ whiteSpace: 'pre-line' }}>
                {item.secondary}
              </p>
              {item.mapUrl && (
                <a href={item.mapUrl} target="_blank" rel="noopener noreferrer" className="event-info__map-btn">
                  <FaMapMarkerAlt /> View on Map
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
