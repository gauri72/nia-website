import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaCheck, FaMinus, FaUsers, FaCalendarAlt, FaTag, FaEnvelope, FaAward, FaCrown, FaArrowRight } from 'react-icons/fa';
import { useMemberAuth } from '../../context/MemberAuthContext';
import memberApi from '../../services/memberApi';
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
  const { member } = useMemberAuth();
  const [patronTier, setPatronTier] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    memberApi.get('/membership-tiers').then((r) => {
      setPatronTier(r.data.find((t) => t.slug === 'patron') || null);
    });
  }, []);

  const isPatron = member?.membershipTier?.slug === 'patron';
  const canPreview = !!(member && patronTier && !isPatron);

  useEffect(() => {
    if (!canPreview) { setPreview(null); return; }
    setPreviewLoading(true);
    memberApi.get(`/member/membership/upgrade-preview/${patronTier._id}`)
      .then((r) => setPreview(r.data))
      .catch(() => setPreview(null))
      .finally(() => setPreviewLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canPreview, patronTier?._id]);

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

        <div className="mc-upgrade">
          <h3 className="mc-upgrade__heading">Already a Friend member? Upgrade to Patron anytime.</h3>
          <p className="mc-upgrade__text">
            If you have more than 180 days left on your Friend membership, upgrading only costs the difference between
            the two tiers (€90). With 180 days or fewer remaining, upgrading costs the full Patron price (€150).
            Either way, your new Patron validity starts fresh for a full year from the day you upgrade.
          </p>

          {!member && (
            <Link to="/dashboard/login" state={{ from: '/dashboard/membership' }} className="mc-upgrade__btn">
              Log In to Upgrade <FaArrowRight />
            </Link>
          )}

          {member && isPatron && (
            <p className="mc-upgrade__already">✓ You're already a Patron member — thank you for your support!</p>
          )}

          {member && !isPatron && (
            <>
              {previewLoading && <p className="mc-upgrade__text">Calculating your upgrade price…</p>}
              {preview && (
                <p className="mc-upgrade__price">
                  Your price: <strong>€{preview.amount}</strong>
                  <span className="mc-upgrade__price-note">{preview.message}</span>
                </p>
              )}
              <Link to="/dashboard/membership" className="mc-upgrade__btn">
                Upgrade to Patron <FaArrowRight />
              </Link>
            </>
          )}
        </div>

      </div>
    </section>
  );
}
