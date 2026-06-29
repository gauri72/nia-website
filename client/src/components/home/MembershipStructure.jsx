import { FaUsers, FaUser, FaUserGraduate } from 'react-icons/fa';
import membershipImage from '../../assets/home/MembershipStructureImage.png';
import './MembershipStructure.css';

const TIERS = [
  {
    icon: <FaUsers />,
    label: 'Family Member',
    price: '€ 50,-',
    iconColor: 'navy',
    priceColor: 'navy',
    borderColor: 'navy',
  },
  {
    icon: <FaUser />,
    label: 'Single member',
    price: '€ 30,-',
    iconColor: 'orange',
    priceColor: 'orange',
    borderColor: 'orange',
  },
  {
    icon: <FaUserGraduate />,
    label: 'Students',
    price: '€ 20,-',
    iconColor: 'green',
    priceColor: 'green',
    borderColor: 'green',
  },
];

export default function MembershipStructure() {
  return (
    <section className="membership" id="membership">
      <div className="membership__inner">

        {/* ── Left panel with border ── */}
        <div className="membership__left">
          <h2 className="membership__heading">Membership</h2>
          <div className="membership__underline" />
          <p className="membership__intro">
            Individuals and families who agree with the objectives of the Association can become members
            by filling in the membership form and paying the annual contribution.
          </p>

          <div className="membership__tiers">
            {TIERS.map((tier) => (
              <div key={tier.label} className={`tier-card tier-card--${tier.borderColor}`}>
                <span className={`tier-icon tier-icon--${tier.iconColor}`}>{tier.icon}</span>
                <p className="tier-label">{tier.label}</p>
                <p className={`tier-price tier-price--${tier.priceColor}`}>{tier.price}</p>
              </div>
            ))}
          </div>

        </div>

        {/* ── Right panel: image + card seamlessly joined, icon straddling seam ── */}
        <div className="membership__right">
          <div className="membership__right-wrap">
            <img
              src={membershipImage}
              alt="Amsterdam canal"
              className="membership__canal-img"
            />
            {/* Icon sits exactly at the seam — half on image, half on card */}
            <div className="membership__seam-icon">
              <FaUsers />
            </div>
            <div className="membership__info-card">
              <p>The Executive Board plans and organizes activities that support our mission and bring our communities together.</p>
              <p>Members guide our direction through the General Meeting and active participation.</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
