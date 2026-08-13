// One-time CLI script — populates `units[]` on paid Ticket orders created
// before the per-unit-QR redesign, so past buyers can be issued a corrected
// PDF (via the existing admin "Resend Email"/"Download PDF" actions) with
// individually scannable codes for each attendee. Purely additive: sends no
// emails, and doesn't touch ticketNumber/qr_code/checkedInAt, so the
// original QR each buyer already has keeps working exactly as before.
// Usage: node scripts/backfillTicketUnits.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Ticket = require('../src/models/Ticket');
const { buildTicketUnits, parseAttendeeNamePool } = require('../src/services/ticketUnitService');

async function run() {
  await connectDB();

  const tickets = await Ticket.find({ ticket_status: 'paid', $or: [{ units: { $exists: false } }, { units: { $size: 0 } }] });
  console.log(`[BackfillTicketUnits] Found ${tickets.length} paid ticket(s) with no units.`);

  let updated = 0;
  let skipped = 0;
  for (const ticket of tickets) {
    if (!ticket.tickets?.length) {
      console.warn(`[BackfillTicketUnits] Skipping ${ticket.ticketNumber} — no ticket line items.`);
      skipped += 1;
      continue;
    }
    const namePool = parseAttendeeNamePool(ticket.name, ticket.attendee_names);
    ticket.units = buildTicketUnits({ ticketNumber: ticket.ticketNumber, tickets: ticket.tickets, names: namePool });
    await ticket.save();
    updated += 1;
    console.log(`[BackfillTicketUnits] ${ticket.ticketNumber} → ${ticket.units.length} unit(s).`);
  }

  console.log(`[BackfillTicketUnits] Done. Updated: ${updated}, skipped: ${skipped}.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('[BackfillTicketUnits] Failed:', err.message);
  process.exit(1);
});
