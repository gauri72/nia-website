import { FaGlobe, FaTv, FaMicrophone } from 'react-icons/fa';
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

    </section>
  );
}
