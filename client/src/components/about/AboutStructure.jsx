import { useState, useEffect, useRef, useCallback } from 'react';
import { FaStar, FaUserTie, FaChevronLeft, FaChevronRight, FaLinkedinIn } from 'react-icons/fa';
import imgPresident          from '../../assets/about-us/president.jpg';
import imgVicePresident      from '../../assets/about-us/vice-president.jpg';
import imgSecretary          from '../../assets/about-us/secretary.jpg';
import imgDirectorMarketing  from '../../assets/about-us/director-marketing.jpg';
import imgDirectorSponsorship from '../../assets/about-us/director-sponsorship.jpg';
import imgDirectorPR         from '../../assets/about-us/director-public-relations.jpg';
import './AboutStructure.css';

const BOARD = [
  { role: 'President',                        name: 'Shivam Joshi',          photo: imgPresident,           color: '#e8641a', linkedin: 'https://www.linkedin.com/in/shivam-joshi-2a22659b/' },
  { role: 'Vice President / Acting Treasurer', name: 'Shanti Pahladsingh',   photo: imgVicePresident,       color: '#1a2b5e', linkedin: 'https://www.linkedin.com/in/shanti-pahladsingh-942b9830/' },
  { role: 'Secretary',                        name: 'Victor van Bijlert',    photo: imgSecretary,           color: '#2d7d3a', linkedin: 'https://www.linkedin.com/in/victor-van-bijlert-38a6a529/' },
  { role: 'Director Marketing',               name: 'Remy van Nieuwenhoven', photo: imgDirectorMarketing,   color: '#7B2D8B', linkedin: 'https://www.linkedin.com/in/remy-van-nieuwenhoven/' },
  { role: 'Director Sponsorships',            name: 'Jaydev',                photo: imgDirectorSponsorship, color: '#c89a2e', linkedin: null },
  { role: 'Director Public Relations',        name: 'Radha Nikhade',         photo: imgDirectorPR,          color: '#1a7fa8', linkedin: 'https://www.linkedin.com/in/radha-nikhade-2a2548a/' },
];

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
          <div className="ob-avatar" style={{ '--member-color': member.color }}>
            <img src={member.photo} alt={member.name} className="ob-avatar__photo" />
          </div>
          <p className="ob-carousel__name">{member.name}</p>
          <p className="ob-carousel__role" style={{ color: member.color }}>{member.role}</p>
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
