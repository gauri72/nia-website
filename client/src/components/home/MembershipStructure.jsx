import { useTranslation } from 'react-i18next';
import { FaHome, FaStar, FaUsers } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import membershipImage from '../../assets/home/MembershipStructureImage.png';
import './MembershipStructure.css';

const TIERS = [
  {
    id: 'friend',
    icon: <FaHome />,
    label: 'FRIEND',
    price: '€60',
    unit: '/ year',
    color: 'gold',
  },
  {
    id: 'patron',
    icon: <FaStar />,
    label: 'PATRON',
    price: '€150',
    unit: '/ year',
    color: 'diamond',
  },
];

export default function MembershipStructure() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleTierClick = (tierId) => {
    navigate('/membership');
    setTimeout(() => {
      document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <section className="membership" id="membership">
      <div className="membership__inner">

        {/* ── Left panel with border ── */}
        <div className="membership__left">
          <h2 className="membership__heading">{t('home.membership.heading')}</h2>
          <div className="membership__underline" />
          <p className="membership__intro">{t('home.membership.intro')}</p>

          <div className="membership__tiers">
            {TIERS.map((tier) => (
              <div key={tier.id} className={`tier-card tier-card--${tier.color}`} onClick={() => handleTierClick(tier.id)} style={{ cursor: 'pointer' }}>

                <div className="tier-card__top">
                  <div className={`tier-card__badge tier-card__badge--${tier.color}`}>
                    {tier.icon}
                  </div>
                  <div className="tier-card__info">
                    <p className="tier-card__label">{tier.label}</p>
                    <p className="tier-card__sublabel">{t(`home.membership.tiers.${tier.id}.sublabel`)}</p>
                  </div>
                </div>

                <div className={`tier-card__ribbon tier-card__ribbon--${tier.color}`}>
                  <span className="tier-card__price">{tier.price}</span>
                  <span className="tier-card__unit">{tier.unit}</span>
                </div>

                <p className="tier-card__perk">{t(`home.membership.tiers.${tier.id}.perk`)}</p>

              </div>
            ))}
          </div>
        </div>

        {/* ── Right panel: image + card seamlessly joined, icon straddling seam ── */}
        <div className="membership__right">
          <div className="membership__right-wrap">
            <img
              src={membershipImage}
              alt="Amsterdam canal"
              className="membership__canal-img"
            />
            <div className="membership__seam-icon">
              <FaUsers />
            </div>
            <div className="membership__info-card">
              <p>{t('home.membership.infoCard.line1')}</p>
              <p>{t('home.membership.infoCard.line2')}</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
