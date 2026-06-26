import { FaFlag, FaTree, FaCrown, FaLeaf, FaUserFriends } from 'react-icons/fa';
import activityOne   from '../../assets/home/ActivitiesOne.png';
import activityTwo   from '../../assets/home/ActivitiesTwo.png';
import activityThree from '../../assets/home/ActivitiesThree.png';
import activityFour  from '../../assets/home/ActivitiesFour.png';
import activityFive  from '../../assets/home/ActivitiesFive.png';
import './Activities.css';

const ACTIVITIES = [
  { label: 'Indian Independence Day', icon: <FaFlag />,        iconBg: 'orange', img: activityOne   },
  { label: 'Christmas Gala Dinner',   icon: <FaTree />,        iconBg: 'orange', img: activityTwo   },
  { label: 'Kings Day Celebrations',  icon: <FaCrown />,       iconBg: 'blue',   img: activityThree },
  { label: 'Keukenhof Visit',         icon: <FaLeaf />,        iconBg: 'green',  img: activityFour  },
  { label: 'NIA Members Outing',      icon: <FaUserFriends />, iconBg: 'green',  img: activityFive  },
];

export default function Activities() {
  return (
    <section className="activities">
      <div className="activities__header">
        <h2 className="activities__heading">Activities</h2>
        <div className="activities__underline" />
        <p className="activities__subtitle">
          {`The Association organizes about four to five activities every year, sometimes in cooperation with other organizations.\nThese activities bring the Dutch and Indian communities together in the Netherlands.`}
        </p>
      </div>

      <div className="activities__grid">
        {ACTIVITIES.map((activity) => (
          <div key={activity.label} className="activity-card">
            <div className="activity-card__img-wrap">
              <img src={activity.img} alt={activity.label} className="activity-card__img" />
            </div>
            <div className={`activity-card__icon activity-card__icon--${activity.iconBg}`}>
              {activity.icon}
            </div>
            <p className="activity-card__label">{activity.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
