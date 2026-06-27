import heroBG  from '../../assets/events/HeroBG.png';
import ctaLogo from '../../assets/events/CTALogo.png';
import './EventHero.css';

export default function EventHero() {
  return (
    <section className="event-hero">
      {/* Full-width image — natural ratio, zero distortion */}
      <img src={heroBG} alt="" className="event-hero__bg" aria-hidden="true" />

      {/* Content floats above image, kept clear of water splash */}
      <div className="event-hero__content">

        <h1 className="event-hero__title">
          India, Netherlands<br />
          and&nbsp;<span className="event-hero__water">
            Water
            <svg className="event-hero__water-swirl" viewBox="0 0 120 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 14 C20 4, 40 20, 60 12 C80 4, 100 18, 116 10" stroke="#4a9fd4" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
              <path d="M10 18 C28 10, 48 22, 68 15 C88 8, 108 20, 118 14" stroke="#4a9fd4" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.5"/>
            </svg>
          </span>
        </h1>

        <p className="event-hero__tagline">TWO NATIONS. ONE ELEMENT. ENDLESS CONNECTIONS.</p>
        <div className="event-hero__tagline-rule">
          <span className="event-hero__tagline-rule-line" />
          <span className="event-hero__tagline-rule-diamond">◆</span>
          <span className="event-hero__tagline-rule-line" />
        </div>

        <div className="event-hero__celebrating-row">
          <span className="event-hero__cel-line" />
          <span className="event-hero__celebrating">CELEBRATING</span>
          <span className="event-hero__cel-line" />
        </div>

        <div className="event-hero__milestones">
          <div className="event-hero__milestone">
            <p className="event-hero__milestone-label">India's</p>
            <p className="event-hero__milestone-number event-hero__milestone-number--orange">80<sup>th</sup></p>
            <p className="event-hero__milestone-sub">Independence Day</p>
          </div>
          <div className="event-hero__amp-col">
            <div className="event-hero__amp-line" />
            <span className="event-hero__ampersand">&amp;</span>
            <div className="event-hero__amp-line" />
          </div>
          <div className="event-hero__milestone">
            <p className="event-hero__milestone-label">NIA's</p>
            <p className="event-hero__milestone-number event-hero__milestone-number--navy">75<sup>th</sup></p>
            <p className="event-hero__milestone-sub">Anniversary</p>
          </div>
        </div>

        <div className="event-hero__badge">
          <span className="event-hero__badge-dot" />
          A GRAND CELEBRATION
          <span className="event-hero__badge-dot" />
        </div>

        <div className="event-hero__lotus-row">
          <span className="event-hero__lotus-line" />
          <img src={ctaLogo} alt="Lotus" className="event-hero__lotus" />
          <span className="event-hero__lotus-line" />
        </div>

        <p className="event-hero__subtext">
          An unforgettable evening of<br />culture, pride, unity and festivity.
        </p>

      </div>

      {/* ── Animated water splash — tall wave from bottom up to just below subtext ── */}
      <div className="event-hero__wave" aria-hidden="true">
        <svg viewBox="0 0 1440 200" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          {/* back layer — slow drift, highest crest */}
          <path className="event-hero__wave-back" d="M0,40 C180,90 360,10 540,50 C720,90 900,5 1080,45 C1260,85 1380,20 1440,40 L1440,200 L0,200 Z" />
          {/* mid layer — medium drift */}
          <path className="event-hero__wave-mid"  d="M0,65 C200,20 400,100 600,60 C800,20 1000,90 1200,55 C1320,35 1400,70 1440,60 L1440,200 L0,200 Z" />
          {/* front layer — fast drift, lowest crest */}
          <path className="event-hero__wave-front" d="M0,90 C160,55 320,120 520,85 C720,50 920,115 1120,78 C1300,46 1390,95 1440,82 L1440,200 L0,200 Z" />
          {/* fine ripple highlight just above front wave */}
          <path className="event-hero__wave-ripple" d="M0,105 C90,95 200,118 310,104 C420,90 530,112 640,100 C750,88 860,110 970,98 C1080,86 1200,108 1320,96 C1380,90 1420,100 1440,97" />
        </svg>
      </div>
    </section>
  );
}
