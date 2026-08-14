// Client-side mirror of server/src/config/events.js — same slugs, same
// ticket ids/prices, kept in sync manually (matches this codebase's existing
// pattern of small duplicated config rather than a shared client/server
// package). Used by every ticket-purchase surface: the public booking
// widget (BookTickets.jsx, which pulls its own display text from i18n keyed
// by ticket id), the member-dashboard booking page, and the admin VIP
// pass / sponsor complimentary-ticket forms.
export const EVENTS = {
  'independence-day-2026': {
    slug: 'independence-day-2026',
    name: "India's 80th Independence Day & NIA's 75th Anniversary",
    tickets: [
      { id: 'regular', price: 20, label: 'Regular Entry', highlight: false, color: 'navy' },
      { id: 'vip', price: 45, label: 'VIP Experience (Dinner & Drinks)', highlight: true, color: 'orange' },
      { id: 'child', price: 5, label: 'Child (6–12 yrs)', highlight: false, color: 'green' },
    ],
  },
  'christmas-gala-2026': {
    slug: 'christmas-gala-2026',
    name: 'NIA Christmas Gala Dinner 2026',
    tickets: [
      { id: 'gala', price: 45, label: 'Gala Experience', highlight: true, color: 'orange' },
    ],
  },
};

export const DEFAULT_EVENT_SLUG = 'independence-day-2026';

// Mirrors server/src/config/events.js's GALA_LAUNCH_AT exactly — the single
// scheduled cutover moment every nav/dashboard/booking surface reads.
export const GALA_LAUNCH_AT = new Date('2026-08-15T15:00:00.000Z'); // 17:00 Europe/Amsterdam (CEST, UTC+2)
export function isGalaLive() {
  return new Date() >= GALA_LAUNCH_AT;
}

export function getEvent(slug) {
  return EVENTS[slug] || null;
}
