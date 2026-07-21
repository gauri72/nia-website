import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaMinus, FaUsers, FaCalendarAlt, FaTag, FaEnvelope, FaAward, FaCrown, FaArrowRight } from 'react-icons/fa';
import { useMemberAuth } from '../../context/MemberAuthContext';
import memberApi from '../../services/memberApi';
import './MembershipCompare.css';

const ROWS = [
  { icon: <FaUsers />,       key: 'adultsCovered',     friend: '2',       patron: '2' },
  { icon: <FaCalendarAlt />, key: 'eventAccess',       friend: 'check',   patron: 'check' },
  { icon: <FaTag />,         key: 'eventPricing',      friend: 'discount20', patron: 'free' },
  { icon: <FaEnvelope />,    key: 'newsletter',        friend: 'check',   patron: 'check' },
  { icon: <FaAward />,       key: 'patronRecognition', friend: 'dash',    patron: 'check' },
  { icon: <FaCrown />,       key: 'priorityAccess',    friend: 'dash',    patron: 'check' },
];

function Cell({ value, col, t }) {
  if (value === 'check') return <span className={`mc-check mc-check--${col}`}><FaCheck /></span>;
  if (value === 'dash')  return <span className="mc-dash"><FaMinus /></span>;
  if (value === 'discount20') return <span className={`mc-text mc-text--${col}`}>{t('membership.compare.discount20')}</span>;
  if (value === 'free') return <span className={`mc-text mc-text--${col}`}>{t('membership.compare.free')}</span>;
  return <span className={`mc-text mc-text--${col}`}>{value}</span>;
}

export default function MembershipCompare() {
  const { t } = useTranslation();
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
          <h2 className="mem-compare__heading">{t('membership.compare.heading')}</h2>
          <span className="mem-compare__deco">✦</span>
        </div>

        <div className="mem-compare__table-wrap">
          <table className="mc-table">
            <thead>
              <tr>
                <th className="mc-th mc-th--feature">{t('membership.compare.colFeature')}</th>
                <th className="mc-th mc-th--friend">FRIEND &nbsp;€60</th>
                <th className="mc-th mc-th--patron">PATRON &nbsp;€150</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr key={i} className={`mc-tr${i % 2 === 0 ? ' mc-tr--even' : ''}`}>
                  <td className="mc-td mc-td--feature">
                    <span className="mc-feature-icon">{row.icon}</span>
                    {t(`membership.compare.rows.${row.key}`)}
                  </td>
                  <td className="mc-td mc-td--friend">
                    <Cell value={row.friend} col="friend" t={t} />
                  </td>
                  <td className="mc-td mc-td--patron">
                    <Cell value={row.patron} col="patron" t={t} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mc-upgrade">
          <h3 className="mc-upgrade__heading">{t('membership.compare.upgradeHeading')}</h3>
          <p className="mc-upgrade__text">{t('membership.compare.upgradeText')}</p>

          {!member && (
            <Link to="/dashboard/login" state={{ from: '/dashboard/membership' }} className="mc-upgrade__btn">
              {t('membership.compare.logInToUpgrade')} <FaArrowRight />
            </Link>
          )}

          {member && isPatron && (
            <p className="mc-upgrade__already">{t('membership.compare.alreadyPatron')}</p>
          )}

          {member && !isPatron && (
            <>
              {previewLoading && <p className="mc-upgrade__text">{t('membership.compare.calculatingPrice')}</p>}
              {preview && (
                <p className="mc-upgrade__price">
                  {t('membership.compare.yourPrice')} <strong>€{preview.amount}</strong>
                  <span className="mc-upgrade__price-note">{preview.message}</span>
                </p>
              )}
              <Link to="/dashboard/membership" className="mc-upgrade__btn">
                {t('membership.compare.upgradeToPatron')} <FaArrowRight />
              </Link>
            </>
          )}
        </div>

      </div>
    </section>
  );
}
