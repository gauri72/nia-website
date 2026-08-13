const Ticket = require('../../models/Ticket');
const { getEvent, DEFAULT_EVENT_SLUG } = require('../../config/events');
const { sendVipPassEmail } = require('../../services/emailService');
const { generateVipPassBatchPDF } = require('../../services/vipPassService');
const { buildTicketUnits } = require('../../services/ticketUnitService');

const MAX_QUANTITY = 50;

// ── POST /api/admin/vip-passes ─────────────────────────────────────
// Issues a batch of complimentary VIP passes as one real Ticket document
// (zero-priced, payment_provider: 'vip_complimentary'). Each guest gets
// their own unit (own scannable QR, own name) on its own page of one
// consolidated PDF, which is emailed immediately and also returned so the
// admin panel can offer an instant download without waiting on email.
async function create(req, res, next) {
  try {
    const { name, email, quantity, guestNames, eventSlug, ticketType } = req.body;

    const event = getEvent(eventSlug?.trim() || DEFAULT_EVENT_SLUG);
    if (!event) return res.status(400).json({ error: `Unknown event: "${eventSlug}"` });

    // Defaults to 'vip' when the event has that type (matches every batch
    // issued before events became selectable), else the event's own single
    // type — e.g. the Gala's 'gala'.
    const resolvedType = ticketType?.trim() || (event.ticketPrices.vip ? 'vip' : Object.keys(event.ticketPrices)[0]);
    if (!event.ticketPrices[resolvedType]) {
      return res.status(400).json({ error: `Invalid ticket type "${resolvedType}" for ${event.name}` });
    }

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'name and email are required' });
    }
    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1 || qty > MAX_QUANTITY) {
      return res.status(400).json({ error: `quantity must be between 1 and ${MAX_QUANTITY}` });
    }
    if (!Array.isArray(guestNames) || guestNames.length !== qty || guestNames.some((n) => !n?.trim())) {
      return res.status(400).json({ error: `guestNames must list exactly ${qty} non-empty name${qty === 1 ? '' : 's'}` });
    }
    const trimmedNames = guestNames.map((n) => n.trim());
    const vipTicketNumber = Ticket.generateTicketNumber();
    const vipLines = [{ ticket_type: resolvedType, quantity: qty, unit_price: 0, line_total: 0 }];

    const ticket = await Ticket.create({
      ticketNumber: vipTicketNumber,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      tickets: vipLines,
      units: buildTicketUnits({ ticketNumber: vipTicketNumber, tickets: vipLines, names: trimmedNames }),
      attendee_names: trimmedNames.join('\n'),
      event_id: event.eventId,
      subtotal: 0,
      amount: 0,
      ticket_status: 'paid',
      payment_provider: 'vip_complimentary',
      mollie_payment_id: 'VIP-COMPLIMENTARY',
      paid_at: new Date(),
    });

    const pdfBuffer = await generateVipPassBatchPDF(ticket);
    await sendVipPassEmail(ticket, trimmedNames, pdfBuffer);

    return res.status(201).json({
      message: `${qty} VIP pass${qty === 1 ? '' : 'es'} sent to ${ticket.email}.`,
      ticket,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { create };
