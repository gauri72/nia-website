import Navbar         from '../components/home/Navbar';
import Footer         from '../components/home/Footer';
import EventHero      from '../components/events/EventHero';
import EventInfo      from '../components/events/EventInfo';
import BookTickets    from '../components/events/BookTickets';
import AboutEvent     from '../components/events/AboutEvent';
import VenueOrganizer from '../components/events/VenueOrganizer';
import EventCTA       from '../components/events/EventCTA';
import galaHeroBG      from '../assets/events/GalaHeroBG.jpg';

const EVENT_SLUG = 'christmas-gala-2026';
const NS = 'galaEvent';

export default function GalaEventPage() {
  return (
    <div className="events-page">
      <Navbar />
      {/* Banner is a designed graphic with title/tagline/date/venue/pricing
          already baked in — same image-only pattern as Independence Day's
          hero, no separate text overlay needed. */}
      <EventHero bgImage={galaHeroBG} />
      <EventInfo i18nNamespace={NS} />
      <BookTickets eventSlug={EVENT_SLUG} i18nNamespace={NS} />
      <AboutEvent i18nNamespace={NS} />
      <VenueOrganizer />
      <EventCTA i18nNamespace={NS} />
      <Footer />
    </div>
  );
}
