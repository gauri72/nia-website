import { useState, useEffect, useRef, useCallback } from 'react';
import { FaChevronLeft, FaChevronRight, FaHandshake } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './Sponsors.css';

const INTERVAL = 4000;
const FALLBACK_COLOR = '#8a9bb0';

function initialsOf(name) {
  return (name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function SponsorCarousel({ sponsors }) {
  const [active, setActive]   = useState(0);
  const [dir, setDir]         = useState('next');
  const [animKey, setAnimKey] = useState(0);
  const timerRef              = useRef(null);

  const go = useCallback((index, direction) => {
    setDir(direction);
    setAnimKey((k) => k + 1);
    setActive(index);
  }, []);

  const next = useCallback(() => {
    go((active + 1) % sponsors.length, 'next');
  }, [active, go, sponsors.length]);

  const prev = useCallback(() => {
    go((active - 1 + sponsors.length) % sponsors.length, 'prev');
  }, [active, go, sponsors.length]);

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current);
    if (sponsors.length > 1) timerRef.current = setInterval(next, INTERVAL);
  }, [next, sponsors.length]);

  useEffect(() => {
    resetTimer();
    return () => clearInterval(timerRef.current);
  }, [resetTimer]);

  // The sponsor list can shrink (admin deactivates one) while a later index
  // is active — clamp so we never index past the end.
  const sponsor = sponsors[Math.min(active, sponsors.length - 1)];

  const card = (
    <div className="sp-logo-card" style={{ '--sponsor-color': FALLBACK_COLOR }}>
      <div className="sp-logo-card__inner">
        {sponsor.logoUrl ? (
          <img className="sp-logo-card__img" src={sponsor.logoUrl} alt={sponsor.name} />
        ) : (
          <div className="sp-logo-card__initials">{initialsOf(sponsor.name)}</div>
        )}
      </div>
    </div>
  );

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
          {sponsor.websiteUrl ? (
            <a href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer">{card}</a>
          ) : card}
          <p className="sp-logo-card__name">{sponsor.name}</p>
          {sponsor.tier && <p className="sp-logo-card__tier">{sponsor.tier}</p>}
        </div>
      </div>

      <button className="sp-lc__arrow sp-lc__arrow--next" onClick={() => { next(); resetTimer(); }} aria-label="Next">
        <FaChevronRight />
      </button>

      <div className="sp-lc__dots">
        {sponsors.map((s, i) => (
          <button
            key={s._id || i}
            className={`sp-lc__dot${i === active ? ' sp-lc__dot--active' : ''}`}
            style={{ '--sponsor-color': FALLBACK_COLOR }}
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
  const [sponsors, setSponsors] = useState(null); // null = still loading

  useEffect(() => {
    api.get('/sponsor-logos').then((r) => setSponsors(r.data)).catch(() => setSponsors([]));
  }, []);

  // Nothing to show yet (still loading) or nothing configured — don't render
  // a broken/empty carousel while waiting on real sponsor data.
  if (!sponsors || sponsors.length === 0) return null;

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
          <SponsorCarousel sponsors={sponsors} />
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
