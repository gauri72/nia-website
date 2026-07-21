import { useTranslation } from 'react-i18next';
import { FaFlag, FaTree, FaCrown, FaLeaf, FaUserFriends } from 'react-icons/fa';
import activityOne   from '../../assets/home/ActivitiesOne.png';
import activityTwo   from '../../assets/home/ActivitiesTwo.png';
import activityThree from '../../assets/home/ActivitiesThree.png';
import activityFour  from '../../assets/home/ActivitiesFour.png';
import activityFive  from '../../assets/home/ActivitiesFive.png';
import './Activities.css';

const ACTIVITIES = [
  { key: 'independenceDay', icon: <FaFlag />,        iconBg: 'orange', img: activityOne   },
  { key: 'christmasGala',   icon: <FaTree />,        iconBg: 'orange', img: activityTwo   },
  { key: 'kingsDay',        icon: <FaCrown />,       iconBg: 'blue',   img: activityThree },
  { key: 'keukenhof',       icon: <FaLeaf />,        iconBg: 'green',  img: activityFour  },
  { key: 'membersOuting',   icon: <FaUserFriends />, iconBg: 'green',  img: activityFive  },
];

export default function Activities() {
  const { t } = useTranslation();

  return (
    <section className="activities">
      <div className="activities__header">
        <h2 className="activities__heading">{t('home.activities.heading')}</h2>
        <div className="activities__underline" />
        <p className="activities__subtitle">{t('home.activities.subtitle')}</p>
      </div>

      <div className="activities__grid">
        {ACTIVITIES.map((activity) => {
          const label = t(`home.activities.items.${activity.key}`);
          return (
            <div key={activity.key} className="activity-card">
              <div className="activity-card__img-wrap">
                <img src={activity.img} alt={label} className="activity-card__img" />
              </div>
              <div className={`activity-card__icon activity-card__icon--${activity.iconBg}`}>
                {activity.icon}
              </div>
              <p className="activity-card__label">{label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
