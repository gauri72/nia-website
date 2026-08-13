import { Link } from 'react-router-dom';
import { Calendar, ArrowRight } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import Card from '../../components/admin/Card';
import Button from '../../components/admin/Button';

// Landing hub for /dashboard/events — one card per bookable event, linking
// to its own booking page (EventBookingPage, parameterized per event). Kept
// as a simple flat list rather than a nav dropdown since the dashboard's
// top bar has no dropdown pattern today.
const EVENT_CARDS = [
  {
    to: '/dashboard/events/independence-day',
    name: "India's 80th Independence Day & NIA's 75th Anniversary",
    date: '15 August 2026',
    blurb: 'Cultural performances, food and togetherness — theme: India, Netherlands and Water.',
  },
  {
    to: '/dashboard/events/christmas-gala',
    name: 'NIA Christmas Gala Dinner 2026',
    date: '12 December 2026',
    blurb: 'A December to Remember — dine, dance and celebrate the NIA way.',
  },
];

export default function EventsPage() {
  return (
    <div>
      <PageHeader title="Events" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {EVENT_CARDS.map((e) => (
          <Card key={e.to} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-nia-orange text-xs font-bold uppercase tracking-wide">
              <Calendar size={14} /> {e.date}
            </div>
            <h2 className="text-lg font-extrabold text-nia-navy-dark">{e.name}</h2>
            <p className="text-sm text-nia-text-muted flex-1">{e.blurb}</p>
            <Button as={Link} to={e.to} variant="primary" className="w-fit mt-2">
              Book Tickets <ArrowRight size={14} />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
