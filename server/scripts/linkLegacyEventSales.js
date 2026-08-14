// One-time CLI script — links the admin-panel Event/TicketType records
// (created for Events-menu visibility) to the real sales data, which lives
// in the separate legacy Ticket model (guest checkout/VIP passes/sponsor
// comps). Sets Event.legacyEventId and each TicketType.legacyTicketTypeKey
// so eventAdminController can blend in real sold counts/attendees instead
// of the permanently-zero Booking-derived ones.
//
// Matches each Event to a registry entry (server/src/config/events.js) by a
// shared keyword in their slugs, then matches each TicketType to a
// ticket_type key by price — reliable here since each event's ticket types
// have distinct prices. Usage: node scripts/linkLegacyEventSales.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Event = require('../src/models/Event');
const TicketType = require('../src/models/TicketType');
const { EVENTS } = require('../src/config/events');

async function run() {
  await connectDB();

  const registryEntries = Object.values(EVENTS);
  const events = await Event.find({});
  console.log(`[LinkLegacySales] Found ${events.length} admin Event(s), ${registryEntries.length} registry entr(y/ies).`);

  let linked = 0;
  for (const event of events) {
    // Match by a shared keyword between the Event's own slug and the
    // registry entry's slug — unambiguous for the two events that exist today.
    const resolved = registryEntries.find((r) => event.slug.includes('gala') && r.slug.includes('gala'))
      || registryEntries.find((r) => event.slug.includes('independence') && r.slug.includes('independence'));
    if (!resolved) {
      console.warn(`[LinkLegacySales] No registry match for "${event.title}" (slug: ${event.slug}) — skipping.`);
      continue;
    }

    event.legacyEventId = resolved.eventId;
    await event.save();

    const ticketTypes = await TicketType.find({ event: event._id });
    const priceToKey = Object.entries(resolved.ticketPrices).reduce((acc, [key, price]) => ({ ...acc, [price]: key }), {});
    for (const tt of ticketTypes) {
      const key = priceToKey[tt.price];
      if (!key) {
        console.warn(`[LinkLegacySales]   No ticket_type match for "${tt.name}" (€${tt.price}) on "${event.title}".`);
        continue;
      }
      tt.legacyTicketTypeKey = key;
      await tt.save();
      console.log(`[LinkLegacySales]   ${tt.name} (€${tt.price}) → '${key}'`);
    }

    console.log(`[LinkLegacySales] Linked "${event.title}" → ${resolved.eventId}`);
    linked += 1;
  }

  console.log(`[LinkLegacySales] Done. Linked ${linked}/${events.length} event(s).`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('[LinkLegacySales] Failed:', err.message);
  process.exit(1);
});
