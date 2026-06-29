import heroBannerBG from '../../assets/home/HeroBannerBG.png';
import './HeroBanner.css';

export default function HeroBanner() {
  return (
    <section className="hero">
      <img src={heroBannerBG} alt="Netherlands India Association" className="hero__bg" />
    </section>
  );
}
