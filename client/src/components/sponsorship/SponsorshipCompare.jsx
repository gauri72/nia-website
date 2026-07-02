import { FaCheck, FaMinus, FaMedal, FaStar, FaCrown, FaGem } from 'react-icons/fa';
import './SponsorshipCompare.css';

const ROWS = [
  { feature: 'Logo placement on event boards & banners',          bronze: true,  silver: true,  gold: true,   platinum: true  },
  { feature: 'Brief mention about your company during event',     bronze: true,  silver: true,  gold: true,   platinum: true  },
  { feature: 'Promotional video during the event',               bronze: true,  silver: true,  gold: true,   platinum: true  },
  { feature: 'Company listed as sponsor on website for 1 year',  bronze: true,  silver: true,  gold: true,   platinum: true  },
  { feature: 'Place company banners & brochures at event',       bronze: false, silver: true,  gold: true,   platinum: true  },
  { feature: 'Seating with VIPs during the event',               bronze: false, silver: false, gold: true,   platinum: true  },
  { feature: 'Chance to speak on stage (~3 mins)',               bronze: false, silver: false, gold: false,  platinum: true  },
  { feature: 'Complimentary tickets (entry + dinner + drinks)',  bronze: '2',   silver: '4',   gold: '8',    platinum: '12'  },
];

const COLS = [
  { key: 'bronze',   label: 'BRONZE',   price: '€250',  icon: <FaMedal /> },
  { key: 'silver',   label: 'SILVER',   price: '€500',  icon: <FaStar /> },
  { key: 'gold',     label: 'GOLD',     price: '€1,000', icon: <FaCrown /> },
  { key: 'platinum', label: 'PLATINUM', price: '€2,500', icon: <FaGem /> },
];

function Cell({ value, col }) {
  if (value === true)  return <span className={`sc-check sc-check--${col}`}><FaCheck /></span>;
  if (value === false) return <span className="sc-dash"><FaMinus /></span>;
  return <span className={`sc-text sc-text--${col}`}>{value}</span>;
}

export default function SponsorshipCompare() {
  return (
    <section className="sp-compare">
      <div className="sp-compare__inner">

        <div className="sp-compare__title-row">
          <span className="sp-compare__deco">✦</span>
          <h2 className="sp-compare__heading">PACKAGE COMPARISON</h2>
          <span className="sp-compare__deco">✦</span>
        </div>

        <div className="sp-compare__table-wrap">
          <table className="sc-table">
            <thead>
              <tr>
                <th className="sc-th sc-th--feature">BENEFITS</th>
                {COLS.map(c => (
                  <th key={c.key} className={`sc-th sc-th--${c.key}`}>
                    <span className="sc-th__icon">{c.icon}</span>
                    <span className="sc-th__label">{c.label}</span>
                    <span className="sc-th__price">{c.price}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr key={i} className={`sc-tr${i % 2 === 0 ? ' sc-tr--even' : ''}`}>
                  <td className="sc-td sc-td--feature">{row.feature}</td>
                  {COLS.map(c => (
                    <td key={c.key} className="sc-td">
                      <Cell value={row[c.key]} col={c.key} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </section>
  );
}
