import { useTranslation } from 'react-i18next';
import { FaCheck, FaMinus, FaMedal, FaStar, FaCrown, FaGem } from 'react-icons/fa';
import './SponsorshipCompare.css';

const ROW_VALUES = [
  { bronze: true,  silver: true,  gold: true,   platinum: true  },
  { bronze: true,  silver: true,  gold: true,   platinum: true  },
  { bronze: true,  silver: true,  gold: true,   platinum: true  },
  { bronze: true,  silver: true,  gold: true,   platinum: true  },
  { bronze: false, silver: true,  gold: true,   platinum: true  },
  { bronze: false, silver: false, gold: true,   platinum: true  },
  { bronze: false, silver: false, gold: false,  platinum: true  },
  { bronze: '2',   silver: '4',   gold: '8',    platinum: '12'  },
];

const COLS = [
  { key: 'bronze',   price: '€250',  icon: <FaMedal /> },
  { key: 'silver',   price: '€500',  icon: <FaStar /> },
  { key: 'gold',     price: '€1,000', icon: <FaCrown /> },
  { key: 'platinum', price: '€2,500', icon: <FaGem /> },
];

function Cell({ value, col }) {
  if (value === true)  return <span className={`sc-check sc-check--${col}`}><FaCheck /></span>;
  if (value === false) return <span className="sc-dash"><FaMinus /></span>;
  return <span className={`sc-text sc-text--${col}`}>{value}</span>;
}

export default function SponsorshipCompare() {
  const { t } = useTranslation();
  const rowLabels = t('sponsorship.compare.rows', { returnObjects: true });

  return (
    <section className="sp-compare">
      <div className="sp-compare__inner">

        <div className="sp-compare__title-row">
          <span className="sp-compare__deco">✦</span>
          <h2 className="sp-compare__heading">{t('sponsorship.compare.heading')}</h2>
          <span className="sp-compare__deco">✦</span>
        </div>

        <div className="sp-compare__table-wrap">
          <table className="sc-table">
            <thead>
              <tr>
                <th className="sc-th sc-th--feature">{t('sponsorship.compare.colBenefits')}</th>
                {COLS.map(c => (
                  <th key={c.key} className={`sc-th sc-th--${c.key}`}>
                    <span className="sc-th__icon">{c.icon}</span>
                    <span className="sc-th__label">{t(`sponsorship.compare.tierLabels.${c.key}`)}</span>
                    <span className="sc-th__price">{c.price}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROW_VALUES.map((row, i) => (
                <tr key={i} className={`sc-tr${i % 2 === 0 ? ' sc-tr--even' : ''}`}>
                  <td className="sc-td sc-td--feature">{rowLabels[i]}</td>
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
