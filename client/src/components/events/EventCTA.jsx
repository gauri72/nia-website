import ctaLogo from '../../assets/events/CTALogo.png';
import './EventCTA.css';

export default function EventCTA() {
  return (
    <section className="event-cta">
      <div className="event-cta__inner">
        <img src={ctaLogo} alt="Lotus" className="event-cta__logo" />
        <div className="event-cta__text">
          <p className="event-cta__title">Let's Celebrate Together!</p>
          <p className="event-cta__sub">
            Honouring the past, celebrating the present,<br />inspiring the future.
          </p>
        </div>
        <a href="#tickets" className="event-cta__btn">
          BOOK YOUR TICKETS NOW &nbsp;→
        </a>
      </div>
    </section>
  );
}
