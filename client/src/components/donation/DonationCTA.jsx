import { FaHandHoldingHeart } from 'react-icons/fa';
import ctaLogo from '../../assets/events/CTALogo.png';
import './DonationCTA.css';

export default function DonationCTA() {
  return (
    <section className="don-cta">
      <div className="don-cta__inner">

        <div className="don-cta__icon-wrap">
          <FaHandHoldingHeart className="don-cta__icon" />
        </div>

        <div className="don-cta__text">
          <p className="don-cta__body">
            Every contribution, no matter the size, makes a real difference to our community.
          </p>
          <p className="don-cta__sub">
            Prefer bank transfer or have questions? Contact the{' '}
            <strong>Netherlands India Association.</strong>
          </p>
        </div>

        <img src={ctaLogo} alt="NIA Lotus" className="don-cta__logo" aria-hidden="true" />

      </div>
    </section>
  );
}
