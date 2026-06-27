import { FaMusic, FaUtensils, FaHandshake, FaStar } from 'react-icons/fa';
import './AboutEvent.css';

const HIGHLIGHTS = [
  { icon: <FaMusic />,     label: 'Cultural\nPerformances' },
  { icon: <FaUtensils />,  label: 'Delicious\nCuisine' },
  { icon: <FaHandshake />, label: 'Community\nTogetherness' },
  { icon: <FaStar />,      label: 'Surprises &\nMemorable Moments' },
];

export default function AboutEvent() {
  return (
    <section className="about-event">
      <div className="about-event__inner">

        {/* Left — text */}
        <div className="about-event__left">
          <h2 className="about-event__heading">About The Event</h2>
          <p className="about-event__body">
            Join us for a historic celebration as we mark India's 80th Independence Day
            and the 75th Anniversary of NIA.
          </p>
          <p className="about-event__body">
            An evening filled with cultural performances, delicious cuisine, inspiring
            moments and togetherness as we honour our heritage and strengthen the bond
            between two nations.
          </p>
          <a href="#tickets" className="about-event__btn">
            EVENT HIGHLIGHTS &nbsp;→
          </a>
        </div>

        {/* Right — highlight icons */}
        <div className="about-event__right">
          {HIGHLIGHTS.map((h, i) => (
            <div key={i} className="about-event__highlight">
              <div className="about-event__highlight-icon">{h.icon}</div>
              <p className="about-event__highlight-label" style={{ whiteSpace: 'pre-line' }}>
                {h.label}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
