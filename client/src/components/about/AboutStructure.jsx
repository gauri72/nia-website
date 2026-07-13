import { useState, useEffect, useRef, useCallback } from 'react';
import { FaStar, FaUserTie, FaChevronLeft, FaChevronRight, FaLinkedinIn } from 'react-icons/fa';
import imgPresident          from '../../assets/about-us/president.jpg';
import imgVicePresident      from '../../assets/about-us/vice-president.jpg';
import imgSecretary          from '../../assets/about-us/secretary.jpg';
import imgDirectorMarketing  from '../../assets/about-us/director-marketing.jpg';
import imgDirectorSponsorship from '../../assets/about-us/director-sponsorship.jpg';
import imgDirectorPR         from '../../assets/about-us/director-public-relations.jpg';
import imgAdvisorBadriMadan   from '../../assets/about-us/advisor-badri-madan.jpeg';
import imgAdvisorVinodSehdev  from '../../assets/about-us/advisor-vinod-sehdev.jpeg';
import imgAdvisorDevPalSingh  from '../../assets/about-us/advisor-dev-pal-singh.jpeg';
import './AboutStructure.css';

const BOARD = [
  { role: 'President',                        name: 'Shivam Joshi',          photo: imgPresident,           color: '#e8641a', linkedin: 'https://www.linkedin.com/in/shivam-joshi-2a22659b/' },
  { role: 'Vice President / Acting Treasurer', name: 'Shanti Pahladsingh',   photo: imgVicePresident,       color: '#5b8dd9', linkedin: 'https://www.linkedin.com/in/shanti-pahladsingh-942b9830/' },
  { role: 'Secretary',                        name: 'Victor van Bijlert',    photo: imgSecretary,           color: '#2d7d3a', linkedin: 'https://www.linkedin.com/in/victor-van-bijlert-38a6a529/' },
  { role: 'Director Marketing',               name: 'Remy van Nieuwenhoven', photo: imgDirectorMarketing,   color: '#7B2D8B', linkedin: 'https://www.linkedin.com/in/remy-van-nieuwenhoven/' },
  { role: 'Director Sponsorships',            name: 'Jayadev Sukumaran',     photo: imgDirectorSponsorship, color: '#c89a2e', linkedin: 'https://www.linkedin.com/in/jayadev-sukumaran-38801b138/' },
  { role: 'Director Public Relations',        name: 'Radha Nikhade',         photo: imgDirectorPR,          color: '#1a7fa8', linkedin: 'https://www.linkedin.com/in/radha-nikhade-2a2548a/' },
  // Photos pending for these two — falls back to initials in the avatar circle until supplied.
  { role: 'Advisor', name: 'Prof. dr. Dirk Kolff', photo: null, color: '#b0463c' },
  { role: 'Advisor', name: 'Ram Lakhina',          photo: null, color: '#3c8fb0' },
  { role: 'Advisor', name: 'Badri Madan',          photo: imgAdvisorBadriMadan,  color: '#8a6d3b' },
  { role: 'Advisor', name: 'Vinod Sehdev',         photo: imgAdvisorVinodSehdev, color: '#4a7d4f' },
  { role: 'Advisor', name: 'Dev Pal Singh',        photo: imgAdvisorDevPalSingh, color: '#6b5b9e' },
];

function initials(name) {
  // Strips ALL leading honorifics ("Prof. dr. " is two tokens, not one).
  const parts = name.replace(/^(?:(?:Prof|Dr|Mr|Mrs|Ms)\.?\s*)+/i, '').trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
}

const INTERVAL = 4000;

function OfficeBearersCarousel() {
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
    go((active + 1) % BOARD.length, 'next');
  }, [active, go]);

  const prev = useCallback(() => {
    go((active - 1 + BOARD.length) % BOARD.length, 'prev');
  }, [active, go]);

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(next, INTERVAL);
  }, [next]);

  useEffect(() => {
    timerRef.current = setInterval(next, INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [next]);

  const member = BOARD[active];

  return (
    <div
      className="ob-carousel"
      onMouseEnter={() => clearInterval(timerRef.current)}
      onMouseLeave={resetTimer}
    >
      <button className="ob-carousel__arrow ob-carousel__arrow--prev" onClick={() => { prev(); resetTimer(); }} aria-label="Previous">
        <FaChevronLeft />
      </button>

      <div className="ob-carousel__stage">
        <div key={animKey} className={`ob-carousel__slide ob-carousel__slide--${dir}`}>
          <div
            className="ob-avatar"
            role="img"
            aria-label={member.name}
            style={member.photo ? { backgroundImage: `url(${member.photo})` } : { '--member-color': member.color }}
          >
            {!member.photo && <span className="ob-avatar__initials">{initials(member.name)}</span>}
          </div>
          <p className="ob-carousel__name">{member.name}</p>
          <p className="ob-carousel__role">{member.role}</p>
          {member.linkedin && (
            <a
              href={member.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="ob-carousel__linkedin"
              aria-label={`${member.name} on LinkedIn`}
            >
              <FaLinkedinIn /> LinkedIn
            </a>
          )}
        </div>
      </div>

      <button className="ob-carousel__arrow ob-carousel__arrow--next" onClick={() => { next(); resetTimer(); }} aria-label="Next">
        <FaChevronRight />
      </button>

      <div className="ob-carousel__dots">
        {BOARD.map((b, i) => (
          <button
            key={i}
            className={`ob-carousel__dot${i === active ? ' ob-carousel__dot--active' : ''}`}
            style={{ '--member-color': b.color }}
            onClick={() => { go(i, i > active ? 'next' : 'prev'); resetTimer(); }}
            aria-label={`${b.role}`}
          />
        ))}
      </div>

      <div className="ob-carousel__progress">
        <div key={animKey} className="ob-carousel__progress-fill" style={{ '--member-color': member.color }} />
      </div>
    </div>
  );
}

export default function AboutStructure() {
  return (
    <section className="au-struct">
      <div className="au-struct__inner">

        <div className="au-struct__header">
          <p className="au-struct__eyebrow">HOW WE ARE ORGANISED</p>
          <h2 className="au-struct__heading">Structure of the Association</h2>
          <div className="au-struct__underline" />
        </div>

        {/* Two highlight cards */}
        <div className="au-struct__highlight-row">
          <div className="au-struct__card au-struct__card--orange">
            <span className="au-struct__card-icon au-struct__card-icon--orange"><FaStar /></span>
            <div>
              <h3 className="au-struct__card-title">Honorary Membership</h3>
              <p className="au-struct__card-text">
                Honorary membership may be conferred upon individuals who have made an outstanding
                contribution to Indo-Dutch cultural cooperation. It is the highest distinction
                the Association can bestow, recognising exceptional service and dedication.
              </p>
            </div>
          </div>

        </div>

        {/* Office Bearers carousel */}
        <div className="au-struct__roles-header">
          <FaUserTie className="au-struct__roles-icon" />
          <h3 className="au-struct__roles-title">Office Bearers</h3>
        </div>

        <div className="au-ob-dark">
          <div className="au-ob-dark__row">

            <div className="au-ob-dark__tagline-col">
              <p className="au-ob-dark__eyebrow">MEET THE TEAM</p>
              <p className="au-ob-dark__tagline">
                THE PEOPLE<br />WHO DRIVE<br />
                <span className="au-ob-dark__tagline--gold">NIA FORWARD.</span>
              </p>
              <div className="au-ob-dark__rule">
                <span className="au-ob-dark__rule-line" />
                <span className="au-ob-dark__rule-diamond">✦</span>
                <span className="au-ob-dark__rule-line" />
              </div>
              <p className="au-ob-dark__script">Serving our community!</p>
            </div>

            <OfficeBearersCarousel />

            <div className="au-ob-dark__info-col">
              <p className="au-ob-dark__contact-label">GET IN TOUCH</p>
              <a href="mailto:secretary@niaonline.org" className="au-ob-dark__contact-email">secretary@niaonline.org</a>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
