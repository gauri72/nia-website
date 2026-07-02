import { useState, useEffect, useRef, useCallback } from 'react';
import { FaGlobe, FaTv, FaMicrophone, FaQrcode, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import './SponsorshipEvents.css';

const BENEFITS = [
  { icon: <FaGlobe />,      title: 'EXPOSURE ON\nNIA WEBSITE',                desc: null },
  { icon: <FaTv />,         title: 'VISIBLE ON 3 SCREENS\nDURING OUR EVENTS', desc: '15 AUGUST 2026 & 12 DECEMBER 2026' },
  { icon: <FaMicrophone />, title: 'MENTIONING OF\nSPONSORS ON STAGE',        desc: null },
];

const FLAGSHIP = [
  { emoji: '🇮🇳', title: '79TH INDEPENDENCE DAY', date: '15TH AUGUST 2026',   color: 'india' },
  { emoji: '🎄',  title: 'CHRISTMAS GALA DINNER',  date: '12TH DECEMBER 2026', color: 'xmas'  },
];

const SCREENS = [
  { label: 'GURUSKOOL 1', sub: 'Main Stage Screen'   },
  { label: 'GURUSKOOL 2', sub: 'Entrance Display'    },
  { label: 'GURUSKOOL 3', sub: 'Dining Area Screen'  },
];

const INTERVAL = 4000;

function ScreenCarousel() {
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
    go((active + 1) % SCREENS.length, 'next');
  }, [active, go]);

  const prev = useCallback(() => {
    go((active - 1 + SCREENS.length) % SCREENS.length, 'prev');
  }, [active, go]);

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(next, INTERVAL);
  }, [next]);

  useEffect(() => {
    timerRef.current = setInterval(next, INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [next]);

  const screen = SCREENS[active];

  return (
    <div
      className="sp-screen-carousel"
      onMouseEnter={() => clearInterval(timerRef.current)}
      onMouseLeave={resetTimer}
    >
      <button className="sp-sc__arrow sp-sc__arrow--prev" onClick={() => { prev(); resetTimer(); }} aria-label="Previous">
        <FaChevronLeft />
      </button>

      <div className="sp-sc__stage">
        <div key={animKey} className={`sp-sc__slide sp-sc__slide--${dir}`}>
          <div className="sp-screen__frame">
            <FaTv className="sp-screen__tv-icon" />
          </div>
          <p className="sp-screen__label">{screen.label}</p>
          <p className="sp-screen__sub">{screen.sub}</p>
        </div>
      </div>

      <button className="sp-sc__arrow sp-sc__arrow--next" onClick={() => { next(); resetTimer(); }} aria-label="Next">
        <FaChevronRight />
      </button>

      {/* Dots */}
      <div className="sp-sc__dots">
        {SCREENS.map((_, i) => (
          <button
            key={i}
            className={`sp-sc__dot${i === active ? ' sp-sc__dot--active' : ''}`}
            onClick={() => { go(i, i > active ? 'next' : 'prev'); resetTimer(); }}
            aria-label={`Screen ${i + 1}`}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="sp-sc__progress">
        <div key={animKey} className="sp-sc__progress-fill" />
      </div>
    </div>
  );
}

export default function SponsorshipEvents() {
  return (
    <section className="sp-dark">

      {/* ══ ROW 1: Benefits (left) | Flagship (right) ══ */}
      <div className="sp-dark__row1">

        <div className="sp-dark__benefits-col">
          <p className="sp-dark__eyebrow">ALL SPONSOR PACKAGES INCLUDE:</p>
          <div className="sp-dark__benefit-row">
            {BENEFITS.map((b, i) => (
              <div key={i} className="sp-benefit-item">
                {i > 0 && <div className="sp-benefit-item__vline" />}
                <div className="sp-benefit-item__content">
                  <div className="sp-benefit-item__icon-wrap">{b.icon}</div>
                  <div className="sp-benefit-item__text">
                    <p className="sp-benefit-item__title" style={{ whiteSpace: 'pre-line' }}>{b.title}</p>
                    {b.desc && <p className="sp-benefit-item__desc">{b.desc}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sp-dark__flagship-box">
          <p className="sp-dark__flagship-heading">OUR FLAGSHIP EVENTS 2026</p>
          {FLAGSHIP.map((ev) => (
            <div key={ev.title} className={`sp-flagship sp-flagship--${ev.color}`}>
              <span className="sp-flagship__emoji">{ev.emoji}</span>
              <div>
                <p className="sp-flagship__name">{ev.title}</p>
                <p className="sp-flagship__date">{ev.date}</p>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* ══ ROW 2: Tagline (left) | Screen carousel (centre) | CTA (right) ══ */}
      <div className="sp-dark__row2">

        <div className="sp-dark__tagline-col">
          <p className="sp-dark__tagline">
            YOUR BRAND.<br />YOUR IMPACT.<br />
            <span className="sp-dark__tagline--gold">OUR COMMUNITY.</span>
          </p>
          <div className="sp-dark__rule">
            <span className="sp-dark__rule-line" />
            <span className="sp-dark__rule-diamond">✦</span>
            <span className="sp-dark__rule-line" />
          </div>
          <p className="sp-dark__script">Let's grow together!</p>
        </div>

        <ScreenCarousel />

        <div className="sp-dark__cta-col">
          <p className="sp-dark__cta-title">BECOME A SPONSOR</p>
          <p className="sp-dark__cta-sub">MAKE A LASTING IMPACT!</p>
          <div className="sp-dark__qr-row">
            <div className="sp-dark__qr-wrap">
              <FaQrcode className="sp-dark__qr-icon" />
            </div>
            <div className="sp-dark__qr-label">
              <span>SCAN TO</span>
              <span>BECOME A</span>
              <span>SPONSOR</span>
              <span className="sp-dark__qr-arrow">→</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
