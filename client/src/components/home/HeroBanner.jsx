import { FaArrowRight, FaUserPlus } from 'react-icons/fa';
import heroBannerBG from '../../assets/home/HeroBannerBG.png';
import './HeroBanner.css';

export default function HeroBanner() {
  return (
    <section
      className="hero"
      style={{ backgroundImage: `url(${heroBannerBG})` }}
    >
      <div className="hero__overlay" />

      <div className="hero__content">
        <p className="hero__welcome">Welcome to</p>
        <h1 className="hero__title">
          <span className="hero__title--navy">THE NETHERLANDS</span>
          <span className="hero__title--orange">INDIA <span className="hero__title--green">ASSOCIATION</span></span>
        </h1>
        <p className="hero__tagline">
          Strengthening Indo-Dutch friendship through cultural exchange, meaningful connections,
          and community building in the Netherlands.
        </p>
        <div className="hero__buttons">
          <a href="#about" className="hero__btn hero__btn--navy">
            About NIA <FaArrowRight />
          </a>
          <a href="#membership" className="hero__btn hero__btn--orange">
            <FaUserPlus /> Register as a Member
          </a>
        </div>
      </div>
    </section>
  );
}
