import heroBG from '../../assets/about-us/HeroBG.png';
import './AboutHero.css';

export default function AboutHero() {
  return (
    <section className="au-hero">
      <img src={heroBG} alt="About Netherlands India Association" className="au-hero__bg" />
    </section>
  );
}
