import { useState, useEffect, useRef, useCallback } from 'react';
import { FaChevronLeft, FaChevronRight, FaHandshake } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import './Sponsors.css';

const SPONSORS = [
  { name: 'SPONSOR 1', tier: 'PLATINUM', initials: 'S1', color: '#4a90d9' },
  { name: 'SPONSOR 2', tier: 'GOLD',     initials: 'S2', color: '#c89a2e' },
  { name: 'SPONSOR 3', tier: 'SILVER',   initials: 'S3', color: '#8a9bb0' },
  { name: 'SPONSOR 4', tier: 'BRONZE',   initials: 'S4', color: '#b07340' },
];

const INTERVAL = 4000;

function SponsorCarousel() {
  const [active, setActive]   = useState(0);
  const [dir, setDir]         = useState('next');
  const [animKey, setAnimKey] = useState(0);
  const timerRef              = useRef(null);

  const go = useCallback((index, direction) => {
    setDir(direction);
    setAnimKey(k => k + 1);
    setActive(index);
  }, []);

  const next = useCallback(() => {
    go((active + 1) % SPONSORS.length, 'next');
  }, [active, go]);

  const prev = useCallback(() => {
    go((active - 1 + SPONSORS.length) % SPONSORS.length, 'prev');
  }, [active, go]);

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(next, INTERVAL);
  }, [next]);

  useEffect(() => {
    timerRef.current = setInterval(next, INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [next]);

  const sponsor = SPONSORS[active];

  return (
    <div
      className="sp-logo-carousel"
      onMouseEnter={() => clearInterval(timerRef.current)}
      onMouseLeave={resetTimer}
    >
      <button className="sp-lc__arrow sp-lc__arrow--prev" onClick={() => { prev(); resetTimer(); }} aria-label="Previous">
        <FaChevronLeft />
      </button>

      <div className="sp-lc__stage">
        <div key={animKey} className={`sp-lc__slide sp-lc__slide--${dir}`}>
          <div className="sp-logo-card" style={{ '--sponsor-color': sponsor.color }}>
            <div className="sp-logo-card__inner">
              <div className="sp-logo-card__initials">{sponsor.initials}</div>
            </div>
          </div>
          <p className="sp-logo-card__name">{sponsor.name}</p>
          <p className="sp-logo-card__tier">{sponsor.tier}</p>
        </div>
      </div>

      <button className="sp-lc__arrow sp-lc__arrow--next" onClick={() => { next(); resetTimer(); }} aria-label="Next">
        <FaChevronRight />
      </button>

      <div className="sp-lc__dots">
        {SPONSORS.map((s, i) => (
          <button
            key={i}
            className={`sp-lc__dot${i === active ? ' sp-lc__dot--active' : ''}`}
            style={{ '--sponsor-color': s.color }}
            onClick={() => { go(i, i > active ? 'next' : 'prev'); resetTimer(); }}
            aria-label={`Sponsor ${i + 1}`}
          />
        ))}
      </div>

      <div className="sp-lc__progress">
        <div key={animKey} className="sp-lc__progress-fill" />
      </div>
    </div>
  );
}

export default function Sponsors() {
  return (
    <section className="hs-sponsors">
      <div className="hs-sp__row">

        {/* Left: tagline */}
        <div className="hs-sp__tagline-col">
          <p className="hs-sp__eyebrow">PROUDLY SUPPORTED BY</p>
          <p className="hs-sp__tagline">
            OUR<br />VALUED<br />
            <span className="hs-sp__tagline--gold">SPONSORS.</span>
          </p>
          <div className="hs-sp__rule">
            <span className="hs-sp__rule-line" />
            <span className="hs-sp__rule-diamond">✦</span>
            <span className="hs-sp__rule-line" />
          </div>
          <p className="hs-sp__script">Thank you for your support!</p>
        </div>

        {/* Centre: logo carousel */}
        <div className="hs-sp__carousel-col">
          <p className="hs-sp__section-label">OUR SPONSORS</p>
          <SponsorCarousel />
        </div>

        {/* Right: CTA */}
        <div className="hs-sp__cta-col">
          <div className="hs-sp__cta-icon-wrap">
            <FaHandshake className="hs-sp__cta-icon" />
          </div>
          <p className="hs-sp__cta-title">BECOME A SPONSOR</p>
          <p className="hs-sp__cta-sub">MAKE A LASTING IMPACT!</p>
          <Link to="/sponsorship" className="hs-sp__cta-btn">VIEW PACKAGES →</Link>
        </div>

      </div>
    </section>
  );
}
