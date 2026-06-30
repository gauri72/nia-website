import { FaHandshake, FaUsers } from 'react-icons/fa';
import aboutNiaImage from '../../assets/home/AboutNiaImage.png';
import './AboutIntro.css';

const OBJECTIVES = [
  {
    icon: <FaHandshake />,
    color: 'navy',
    text: 'To promote the friendship, knowledge and understanding of the culture, history, philosophy, religions and social structure of India and the Netherlands between the people of both countries.',
  },
  {
    icon: <FaUsers />,
    color: 'green',
    text: 'To further friendly relations between the peoples of India and the Netherlands by widening and deepening personal, cultural and social contacts.',
  },
];

export default function AboutIntro() {
  return (
    <section className="au-intro">
      <div className="au-intro__inner">

        <div className="au-intro__left">
          <p className="au-intro__eyebrow">WHO WE ARE</p>
          <h2 className="au-intro__heading">About the Netherlands India Association</h2>
          <div className="au-intro__underline" />
          <p className="au-intro__body">
            The Netherlands India Association (NIA) is a vibrant, non-profit organisation
            dedicated to nurturing the bond between the Dutch and Indian communities. Founded
            on a shared passion for cultural exchange, we bring together individuals, families,
            and businesses who celebrate the richness of Indo-Dutch heritage.
          </p>
          <p className="au-intro__sub">The aims and objectives of the Association are:</p>
          <ul className="au-intro__objectives">
            {OBJECTIVES.map((obj, i) => (
              <li key={i} className="au-intro__objective">
                <span className={`au-intro__icon-ring au-intro__icon-ring--${obj.color}`}>
                  <span className={`au-intro__icon-circle au-intro__icon-circle--${obj.color}`}>
                    {obj.icon}
                  </span>
                </span>
                <p>{obj.text}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="au-intro__right">
          <img
            src={aboutNiaImage}
            alt="Netherlands and India flags"
            className="au-intro__img"
          />
        </div>

      </div>
    </section>
  );
}
