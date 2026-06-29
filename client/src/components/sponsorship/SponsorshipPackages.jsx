import { FaStar, FaCrown, FaInfinity, FaUsers } from 'react-icons/fa';
import { GiDiamondHard } from 'react-icons/gi';
import './SponsorshipPackages.css';

const PACKAGES = [
  {
    id: 'silver',
    tier: 'SILVER',
    label: 'SPONSORSHIP',
    price: '€250',
    guests: '2 GUESTS',
    guestIcon: <><FaUsers /><FaUsers /></>,
    icon: <FaStar />,
    color: 'silver',
  },
  {
    id: 'gold',
    tier: 'GOLD',
    label: 'SPONSORSHIP',
    price: '€500',
    guests: '5 GUESTS',
    guestIcon: <><FaUsers /><FaUsers /><FaUsers /></>,
    icon: <FaStar />,
    color: 'gold',
  },
  {
    id: 'platinum',
    tier: 'PLATINUM',
    label: 'SPONSORSHIP',
    price: '€1,000',
    guests: '10 GUESTS',
    guestIcon: <><FaUsers /><FaUsers /><FaUsers /><FaUsers /><FaUsers /></>,
    icon: <FaCrown />,
    color: 'platinum',
  },
  {
    id: 'diamond',
    tier: 'DIAMOND',
    label: 'SPONSORSHIP',
    price: '€1,500',
    guests: 'UNLIMITED GUESTS',
    guestIcon: <FaInfinity />,
    icon: <GiDiamondHard />,
    color: 'diamond',
  },
];

export default function SponsorshipPackages() {
  return (
    <section className="sp-packages">
      <div className="sp-packages__container">
        {PACKAGES.map((pkg, i) => (
          <div key={pkg.id} className={`sp-pkg sp-pkg--${pkg.color}`}>
            {/* Vertical divider between cards */}
            {i > 0 && <div className="sp-pkg__vdivider" />}

            <div className="sp-pkg__top">
              {/* Badge icon */}
              <div className={`sp-pkg__badge sp-pkg__badge--${pkg.color}`}>
                <span className="sp-pkg__badge-icon">{pkg.icon}</span>
              </div>

              {/* Tier name + label */}
              <div className="sp-pkg__info">
                <p className="sp-pkg__tier">{pkg.tier}</p>
                <p className="sp-pkg__sublabel">{pkg.label}</p>
              </div>
            </div>

            {/* Price ribbon */}
            <div className={`sp-pkg__ribbon sp-pkg__ribbon--${pkg.color}`}>
              <span className="sp-pkg__price">{pkg.price}</span>
            </div>

            {/* Guests */}
            <div className="sp-pkg__guests">
              <span className="sp-pkg__guest-icons">{pkg.guestIcon}</span>
              <span className="sp-pkg__guest-label">{pkg.guests}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
