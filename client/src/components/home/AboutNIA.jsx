import { FaHandshake, FaUsers } from 'react-icons/fa';
import aboutNiaImage from '../../assets/home/AboutNiaImage.png';
import './AboutNIA.css';

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

export default function AboutNIA() {
  return (
    <section className="about" id="about">
      <div className="about__inner">

        {/* Blue-shaded card panel */}
        <div className="about__left">
          <h2 className="about__heading">About NIA</h2>
          <div className="about__underline" />
          <p className="about__subtitle">The aims and objectives of the Association are:</p>
          <ul className="about__objectives">
            {OBJECTIVES.map((obj, i) => (
              <li key={i} className="about__objective">
                {/* Outer ring → inner filled circle → icon */}
                <span className={`about__icon-ring about__icon-ring--${obj.color}`}>
                  <span className={`about__icon-circle about__icon-circle--${obj.color}`}>
                    {obj.icon}
                  </span>
                </span>
                <p>{obj.text}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="about__right">
          <img
            src={aboutNiaImage}
            alt="Netherlands and India flags"
            className="about__flags-img"
          />
        </div>
      </div>
    </section>
  );
}
