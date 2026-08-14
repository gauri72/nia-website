// Canonical registry of bookable events for the guest-checkout / member-dashboard
// ticketing flow (ticketController.js, memberBundleController.js, vipPassController.js,
// sponsorshipAdminController.js). Every flow that creates a Ticket resolves its
// event id + valid ticket types/prices from here instead of a hardcoded constant —
// adding a new event means adding an entry here, not editing eight files.
const EVENTS = {
  'independence-day-2026': {
    eventId: 'NIA-EVENT-20260815',
    slug: 'independence-day-2026',
    name: "India's 80th Independence Day & NIA's 75th Anniversary",
    dateLabel: '15 August 2026',
    ticketPrices: { regular: 20, vip: 45, child: 5 },
  },
  'christmas-gala-2026': {
    eventId: 'NIA-EVENT-20261212',
    slug: 'christmas-gala-2026',
    name: 'NIA Christmas Gala Dinner 2026',
    dateLabel: '12 December 2026',
    ticketPrices: { gala: 45 },
  },
};

const DEFAULT_EVENT_SLUG = 'independence-day-2026';

// The single scheduled cutover moment: Independence Day → Gala. Drives the
// Gala's public discoverability (nav, dashboard), Independence Day's booking
// closure, and My Tickets' current/past grouping — all read this one flag
// rather than tracking separate on/off state per surface.
const GALA_LAUNCH_AT = new Date('2026-08-15T15:00:00.000Z'); // 17:00 Europe/Amsterdam (CEST, UTC+2)
function isGalaLive() {
  return new Date() >= GALA_LAUNCH_AT;
}

function getEvent(slug) {
  return EVENTS[slug] || null;
}

function getEventByEventId(eventId) {
  return Object.values(EVENTS).find((e) => e.eventId === eventId) || null;
}

module.exports = { EVENTS, getEvent, getEventByEventId, DEFAULT_EVENT_SLUG, GALA_LAUNCH_AT, isGalaLive };
