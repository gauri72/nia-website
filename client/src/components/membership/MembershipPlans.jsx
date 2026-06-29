import {
  FaHome, FaStar, FaUsers, FaCalendarAlt, FaTag,
  FaEnvelope, FaAward, FaCrown, FaCheck, FaTicketAlt,
} from 'react-icons/fa';
import './MembershipPlans.css';

const FRIEND_PERKS = [
  { icon: <FaUsers />,       text: 'Valid for 2 adults in the same household' },
  { icon: <FaCalendarAlt />, text: 'Access to all NIA events throughout the year' },
  { icon: <FaTag />,         text: '20% discount on all event tickets' },
  { icon: <FaEnvelope />,    text: 'NIA newsletter & community updates' },
  { icon: <FaUsers />,       text: 'Be part of a growing Dutch-Indian community' },
];

const PATRON_PERKS = [
  { icon: <FaUsers />,       text: 'Valid for 2 adults in the same household' },
  { icon: <FaCalendarAlt />, text: 'Free entry to all NIA events throughout the year' },
  { icon: <FaTicketAlt />,   text: 'No event ticket costs — fully included' },
  { icon: <FaEnvelope />,    text: 'NIA newsletter & community updates' },
  { icon: <FaAward />,       text: 'Recognition as a Patron supporter of the association' },
  { icon: <FaCrown />,       text: 'Priority access & seating at select events' },
];

export default function MembershipPlans() {
  return (
    <section className="mem-plans">
      <div className="mem-plans__inner">

        {/* ── Friend card ── */}
        <div className="mem-card mem-card--friend">
          <div className="mem-card__header mem-card__header--friend">
            <div className="mem-card__icon-wrap mem-card__icon-wrap--friend">
              <FaHome />
            </div>
            <h2 className="mem-card__title">FRIEND MEMBERSHIP</h2>
          </div>

          <div className="mem-card__body">
            <p className="mem-card__price mem-card__price--friend">
              €60 <span className="mem-card__price-unit">/ year</span>
            </p>
            <p className="mem-card__tagline mem-card__tagline--friend">
              Celebrate together at a great value
            </p>

            <ul className="mem-card__perks">
              {FRIEND_PERKS.map((p, i) => (
                <li key={i} className="mem-perk">
                  <span className="mem-perk__icon mem-perk__icon--friend">{p.icon}</span>
                  <span className="mem-perk__check mem-perk__check--friend"><FaCheck /></span>
                  <span className="mem-perk__text">{p.text}</span>
                </li>
              ))}
            </ul>

            <a href="#join" className="mem-card__btn mem-card__btn--friend">
              JOIN AS FRIEND &nbsp;→
            </a>
          </div>
        </div>

        {/* ── Patron card ── */}
        <div className="mem-card mem-card--patron">
          <div className="mem-card__header mem-card__header--patron">
            <div className="mem-card__icon-wrap mem-card__icon-wrap--patron">
              <FaStar />
            </div>
            <h2 className="mem-card__title">PATRON MEMBERSHIP</h2>
          </div>

          <div className="mem-card__body">
            <p className="mem-card__price mem-card__price--patron">
              €150 <span className="mem-card__price-unit">/ year</span>
            </p>
            <p className="mem-card__tagline mem-card__tagline--patron">
              All events included — celebrate without limits
            </p>

            <ul className="mem-card__perks">
              {PATRON_PERKS.map((p, i) => (
                <li key={i} className="mem-perk">
                  <span className="mem-perk__icon mem-perk__icon--patron">{p.icon}</span>
                  <span className="mem-perk__check mem-perk__check--patron"><FaCheck /></span>
                  <span className="mem-perk__text">{p.text}</span>
                </li>
              ))}
            </ul>

            <a href="#join" className="mem-card__btn mem-card__btn--patron">
              JOIN AS PATRON &nbsp;→
            </a>
          </div>
        </div>

      </div>
    </section>
  );
}
