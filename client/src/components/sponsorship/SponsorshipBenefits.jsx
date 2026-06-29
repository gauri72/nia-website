import { FaGlobe, FaTv, FaMicrophone } from 'react-icons/fa';
import './SponsorshipBenefits.css';

const BENEFITS = [
  {
    icon: <FaGlobe />,
    title: 'EXPOSURE ON NIA WEBSITE',
    desc: null,
  },
  {
    icon: <FaTv />,
    title: 'VISIBLE ON 3 SCREENS DURING OUR EVENTS',
    desc: '15 August 2026 & 12 December 2026',
  },
  {
    icon: <FaMicrophone />,
    title: 'MENTIONING OF SPONSORS ON STAGE',
    desc: null,
  },
];

export default function SponsorshipBenefits() {
  return (
    <section className="sp-benefits">
      <div className="sp-benefits__inner">
        <p className="sp-benefits__eyebrow">ALL SPONSOR PACKAGES INCLUDE:</p>
        <div className="sp-benefits__cards">
          {BENEFITS.map((b, i) => (
            <div key={i} className="sp-benefit">
              {i > 0 && <div className="sp-benefit__divider" />}
              <div className="sp-benefit__icon-wrap">
                <span className="sp-benefit__icon">{b.icon}</span>
              </div>
              <div className="sp-benefit__text">
                <p className="sp-benefit__title">{b.title}</p>
                {b.desc && <p className="sp-benefit__desc">{b.desc}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
