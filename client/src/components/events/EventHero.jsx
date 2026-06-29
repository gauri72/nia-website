import heroBG from '../../assets/events/HeroBG.png';
import './EventHero.css';

export default function EventHero() {
  return (
    <section className="event-hero">
      <img src={heroBG} alt="" className="event-hero__bg" aria-hidden="true" />
    </section>
  );
}
