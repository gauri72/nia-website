import { FaUser, FaUsers, FaChild, FaShieldAlt } from 'react-icons/fa';
import './BookTickets.css';

const TICKETS = [
  {
    icon: <FaUser />,
    type: 'INDIVIDUAL',
    desc: '1 Person',
    price: '€25',
    highlight: false,
    badge: null,
  },
  {
    icon: <FaUsers />,
    type: 'COUPLE',
    desc: '2 People',
    price: '€45',
    highlight: true,
    badge: 'BEST VALUE',
  },
  {
    icon: <FaUsers />,
    type: 'FAMILY',
    desc: '4 People',
    price: '€85',
    highlight: false,
    badge: null,
  },
  {
    icon: <FaChild />,
    type: 'CHILD (6–12 YRS)',
    desc: 'Per Child',
    price: '€10',
    highlight: false,
    badge: null,
  },
];

export default function BookTickets() {
  return (
    <section className="book-tickets" id="tickets">
      <div className="book-tickets__inner">
        <h2 className="book-tickets__heading">Book Your Tickets</h2>
        <p className="book-tickets__sub">
          Choose your tickets and be part of this grand celebration.
        </p>

        <div className="book-tickets__grid">
          {TICKETS.map((t) => (
            <div
              key={t.type}
              className={`ticket-card${t.highlight ? ' ticket-card--highlight' : ''}`}
            >
              {t.badge && <span className="ticket-card__badge">{t.badge}</span>}
              <div className="ticket-card__top">
                <div className="ticket-card__icon">{t.icon}</div>
                <div className="ticket-card__info">
                  <p className="ticket-card__type">{t.type}</p>
                  <p className="ticket-card__desc">{t.desc}</p>
                </div>
              </div>
              <p className="ticket-card__price">{t.price}</p>
              <button className="ticket-card__btn">SELECT</button>
            </div>
          ))}
        </div>

        <p className="book-tickets__note">
          <FaShieldAlt className="book-tickets__note-icon" />
          Secure Booking &nbsp;|&nbsp; Limited Seats – Book Early!
        </p>
      </div>
    </section>
  );
}
