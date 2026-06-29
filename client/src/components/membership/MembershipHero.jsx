import heroBG from '../../assets/membership/HeroBG.png';
import './MembershipHero.css';

export default function MembershipHero() {
  return (
    <section className="mem-hero">
      <img src={heroBG} alt="NIA Membership" className="mem-hero__bg" aria-hidden="true" />
    </section>
  );
}
