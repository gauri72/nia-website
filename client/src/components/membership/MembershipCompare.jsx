import { FaCheck, FaMinus, FaUsers, FaCalendarAlt, FaTag, FaEnvelope, FaAward, FaCrown } from 'react-icons/fa';
import './MembershipCompare.css';

const ROWS = [
  { icon: <FaUsers />,       feature: 'Adults covered',      friend: '2',              patron: '2' },
  { icon: <FaCalendarAlt />, feature: 'Event access',        friend: 'check',          patron: 'check' },
  { icon: <FaTag />,         feature: 'Event pricing',       friend: '20% discount',   patron: 'Free' },
  { icon: <FaEnvelope />,    feature: 'Newsletter',          friend: 'check',          patron: 'check' },
  { icon: <FaAward />,       feature: 'Patron recognition',  friend: 'dash',           patron: 'check' },
  { icon: <FaCrown />,       feature: 'Priority access',     friend: 'dash',           patron: 'check' },
];

function Cell({ value, col }) {
  if (value === 'check') return <span className={`mc-check mc-check--${col}`}><FaCheck /></span>;
  if (value === 'dash')  return <span className="mc-dash"><FaMinus /></span>;
  return <span className={`mc-text mc-text--${col}`}>{value}</span>;
}

export default function MembershipCompare() {
  return (
    <section className="mem-compare">
      <div className="mem-compare__inner">

        <div className="mem-compare__title-row">
          <span className="mem-compare__deco">✦</span>
          <h2 className="mem-compare__heading">PLAN COMPARISON</h2>
          <span className="mem-compare__deco">✦</span>
        </div>

        <div className="mem-compare__table-wrap">
          <table className="mc-table">
            <thead>
              <tr>
                <th className="mc-th mc-th--feature">FEATURE</th>
                <th className="mc-th mc-th--friend">FRIEND &nbsp;€60</th>
                <th className="mc-th mc-th--patron">PATRON &nbsp;€150</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr key={i} className={`mc-tr${i % 2 === 0 ? ' mc-tr--even' : ''}`}>
                  <td className="mc-td mc-td--feature">
                    <span className="mc-feature-icon">{row.icon}</span>
                    {row.feature}
                  </td>
                  <td className="mc-td mc-td--friend">
                    <Cell value={row.friend} col="friend" />
                  </td>
                  <td className="mc-td mc-td--patron">
                    <Cell value={row.patron} col="patron" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </section>
  );
}
