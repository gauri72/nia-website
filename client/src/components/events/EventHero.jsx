import heroBG from '../../assets/events/HeroBG.png';
import './EventHero.css';

// Independence Day's hero is a single designed graphic with the title/date
// baked into the image itself — no live text, so calling this with no props
// (or just a custom bgImage and nothing else) renders exactly as before.
// Passing title/tagline/dateLabel adds a live text overlay instead, for
// events whose background is a plain photo rather than a pre-designed banner.
export default function EventHero({ bgImage = heroBG, title, tagline, dateLabel }) {
  const hasOverlay = Boolean(title || tagline || dateLabel);

  return (
    <section className={`event-hero${hasOverlay ? ' event-hero--overlay' : ''}`}>
      <img src={bgImage} alt="" className="event-hero__bg" aria-hidden="true" />
      {hasOverlay && (
        <div className="event-hero__content">
          {dateLabel && <p className="event-hero__date">{dateLabel}</p>}
          {title && <h1 className="event-hero__title">{title}</h1>}
          {tagline && <p className="event-hero__tagline">{tagline}</p>}
        </div>
      )}
    </section>
  );
}
