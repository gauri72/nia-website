import heroBG from '../../assets/sponsorship/HeroBG.png';
import './SponsorshipHero.css';

export default function SponsorshipHero() {
  return (
    <section className="sp-hero">
      <img src={heroBG} alt="NIA Sponsorship" className="sp-hero__bg" aria-hidden="true" />
    </section>
  );
}
