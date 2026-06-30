import { FaUsers } from 'react-icons/fa';
import ctaLogo from '../../assets/events/CTALogo.png';
import './AboutCTA.css';

export default function AboutCTA() {
  return (
    <section className="au-cta">
      <div className="au-cta__inner">

        <div className="au-cta__icon-wrap">
          <FaUsers className="au-cta__icon" />
        </div>

        <div className="au-cta__text">
          <p className="au-cta__body">
            Want to be part of a community that celebrates two great cultures?
            Become a member of the Netherlands India Association today.
          </p>
          <p className="au-cta__sub">
            Open to everyone who shares a love for Indo-Dutch friendship —{' '}
            <strong>join us and make a difference.</strong>
          </p>
        </div>

        <img src={ctaLogo} alt="NIA Lotus" className="au-cta__logo" aria-hidden="true" />

      </div>
    </section>
  );
}
