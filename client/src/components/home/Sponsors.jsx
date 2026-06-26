import { FaUsers, FaHandshake } from 'react-icons/fa';
import './Sponsors.css';

const BADGES = [
  { number: 21, color: 'var(--color-navy)',   ringColor: 'rgba(26,43,94,0.18)'  },
  { number: 16, color: 'var(--color-orange)',  ringColor: 'rgba(232,100,26,0.18)' },
  { number: 17, color: 'var(--color-green)',   ringColor: 'rgba(45,125,58,0.18)'  },
  { number: 18, color: '#7B2D8B',              ringColor: 'rgba(123,45,139,0.18)' },
];

export default function Sponsors() {
  return (
    <section className="sponsors">
      <div className="sponsors__inner">
        <h2 className="sponsors__heading">Sponsors</h2>
        <div className="sponsors__underline" />

        <div className="sponsors__badges">
          {BADGES.map((badge, i) => (
            <div key={badge.number} className="sponsors__badge-wrap">
              {/* outer light-shade ring */}
              <div
                className="sponsor-ring"
                style={{ borderColor: badge.ringColor }}
              >
                {/* inner solid circle */}
                <div
                  className="sponsor-badge"
                  style={{ borderColor: badge.color, color: badge.color }}
                >
                  {badge.number}
                </div>
              </div>

              {/* divider after every badge except the last */}
              {i < BADGES.length - 1 && (
                <div className="sponsors__divider" />
              )}
            </div>
          ))}
        </div>

        <div className="sponsors__banner">
          {/* white circle around left icon */}
          <div className="sponsors__icon-circle">
            <FaUsers className="sponsors__banner-icon" />
          </div>

          <p className="sponsors__banner-text">
            NIA is a networking organization where Dutch and Indians can come to know each other
            and can share each others knowledge and make friends.
          </p>

          {/* white circle around right icon */}
          <div className="sponsors__icon-circle">
            <FaHandshake className="sponsors__banner-icon" />
          </div>
        </div>
      </div>
    </section>
  );
}
