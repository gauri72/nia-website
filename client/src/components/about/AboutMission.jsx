import { FaGlobe, FaHeart, FaPeace, FaLightbulb } from 'react-icons/fa';
import './AboutMission.css';

const VALUES = [
  {
    icon: <FaGlobe />,
    title: 'Cultural Bridge',
    desc: 'We connect two great civilisations — Dutch and Indian — through art, music, cuisine, festivals, and shared stories that span centuries.',
  },
  {
    icon: <FaHeart />,
    title: 'Community First',
    desc: 'Every event, initiative, and programme we run is designed to bring people together and strengthen the bonds within our community.',
  },
  {
    icon: <FaPeace />,
    title: 'Mutual Respect',
    desc: 'We celebrate diversity and promote understanding between cultures, honouring both the Dutch and Indian ways of life equally.',
  },
  {
    icon: <FaLightbulb />,
    title: 'Inspire & Educate',
    desc: 'From cultural workshops to heritage talks, we create meaningful experiences that inspire curiosity and deepen appreciation for both nations.',
  },
];

export default function AboutMission() {
  return (
    <section className="au-mission">
      <div className="au-mission__inner">

        <div className="au-mission__header">
          <p className="au-mission__eyebrow">OUR MISSION & VALUES</p>
          <h2 className="au-mission__heading">What Drives Us</h2>
          <p className="au-mission__intro">
            The Netherlands India Association is built on a foundation of cultural pride,
            human connection, and a belief that shared experiences make the world a richer place.
          </p>
        </div>

        <div className="au-mission__grid">
          {VALUES.map((v, i) => (
            <div key={i} className="au-value-card">
              <div className="au-value-card__icon">{v.icon}</div>
              <h3 className="au-value-card__title">{v.title}</h3>
              <p className="au-value-card__desc">{v.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
