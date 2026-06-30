import heroBG from '../../assets/donation/HeroBG.png';
import './DonationHero.css';

export default function DonationHero() {
  return (
    <section className="don-hero">
      <img src={heroBG} alt="NIA Donation" className="don-hero__bg" />
    </section>
  );
}
