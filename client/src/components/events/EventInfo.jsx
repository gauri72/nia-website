import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaUsers } from 'react-icons/fa';
import './EventInfo.css';

const INFO = [
  {
    icon: <FaCalendarAlt />,
    label: 'DATE',
    primary: '15TH AUGUST 2025',
    secondary: 'FRIDAY',
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
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
