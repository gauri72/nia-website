import { FaLandmark, FaUserFriends, FaMusic, FaGraduationCap } from 'react-icons/fa';
import './DonationImpact.css';

const IMPACTS = [
  {
    icon: <FaLandmark />,
    stat: '10+',
    label: 'Years of Heritage',
    desc: 'Celebrating Dutch-Indian culture and traditions since our founding.',
  },
  {
    icon: <FaUserFriends />,
    stat: '500+',
    label: 'Community Members',
    desc: 'A thriving network of families and individuals across the Netherlands.',
  },
  {
    icon: <FaMusic />,
    stat: '20+',
    label: 'Events Per Year',
    desc: 'From Independence Day galas to cultural festivals and community nights.',
  },
  {
    icon: <FaGraduationCap />,
    stat: '100%',
    label: 'Community-Funded',
    desc: 'Every programme runs on the generosity of members like you.',
  },
];

export default function DonationImpact() {
  return (
    <section className="don-impact">
      <div className="don-impact__inner">
        <p className="don-impact__eyebrow">YOUR IMPACT</p>
        <h2 className="don-impact__heading">What Your Donation Powers</h2>
        <p className="don-impact__intro">
          Every euro goes directly toward cultural events, community programmes, and initiatives
          that bring the Dutch-Indian community closer together.
        </p>
        <div className="don-impact__grid">
          {IMPACTS.map((item, i) => (
            <div key={i} className="don-impact-card">
              <div className="don-impact-card__icon">{item.icon}</div>
              <p className="don-impact-card__stat">{item.stat}</p>
              <p className="don-impact-card__label">{item.label}</p>
              <p className="don-impact-card__desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
