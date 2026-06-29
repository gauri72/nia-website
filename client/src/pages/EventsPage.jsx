import Navbar         from '../components/home/Navbar';
import Footer         from '../components/home/Footer';
import EventHero      from '../components/events/EventHero';
import EventInfo      from '../components/events/EventInfo';
import BookTickets    from '../components/events/BookTickets';
import AboutEvent     from '../components/events/AboutEvent';
import VenueOrganizer from '../components/events/VenueOrganizer';
import EventCTA       from '../components/events/EventCTA';

export default function EventsPage() {
  return (
    <div className="events-page">
      <Navbar />
      <EventHero />
      <EventInfo />
      <BookTickets />
      <AboutEvent />
      <VenueOrganizer />
      <EventCTA />
      <Footer />
    </div>
  );
}
