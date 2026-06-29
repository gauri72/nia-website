import { FaCalendarAlt } from 'react-icons/fa';
import ctaLogo from '../../assets/events/CTALogo.png';
import './MembershipCTA.css';

export default function MembershipCTA() {
  return (
    <section className="mem-cta">
      <div className="mem-cta__inner">

        {/* Lotus icon */}
        <div className="mem-cta__icon-wrap">
          <FaCalendarAlt className="mem-cta__cal-icon" />
        </div>

        {/* Text block */}
        <div className="mem-cta__text">
          <p className="mem-cta__body">
            Membership is valid for one calendar year from the date of registration.
          </p>
          <p className="mem-cta__sub">
            For more information or to sign up, please contact the{' '}
            <strong>Netherlands India Association.</strong>
          </p>
        </div>

        {/* Logo */}
        <img src={ctaLogo} alt="Lotus" className="mem-cta__logo" aria-hidden="true" />

      </div>
    </section>
  );
}
