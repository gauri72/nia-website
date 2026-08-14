const Ticket = require('../../models/Ticket');
const EventCheckIn = require('../../models/EventCheckIn');
const { getEvent, DEFAULT_EVENT_SLUG } = require('../../config/events');

const CATEGORIES = ['artist', 'invited_guest', 'chief_guest'];

// Guest-list entries are real Ticket documents (zero-priced, payment_provider:
// 'guest_list_complimentary') — the same trick vipPassController.js uses for
// complimentary passes — so they automatically count everywhere a real
// attendee already does: scanController.js's /scan/stats, the Ticket Sales
// page, and the Events-menu attendee export. Unlike a VIP pass there's no
// QR/PDF/email — just a name and a category, with checkedInAt/checkedInBy
// (already on the schema) used as a plain reversible on/off toggle instead
// of a per-unit QR redemption.

// ── GET /api/admin/guest-list?eventSlug= ────────────────────────────
async function list(req, res, next) {
  try {
    const event = getEvent(req.query.eventSlug?.trim() || DEFAULT_EVENT_SLUG);
    if (!event) return res.status(400).json({ error: `Unknown event: "${req.query.eventSlug}"` });

    const guests = await Ticket.find({ event_id: event.eventId, payment_provider: 'guest_list_complimentary' })
      .sort('name');
    return res.json(guests);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/guest-list ───────────────────────────────────────
async function create(req, res, next) {
  try {
    const { name, category, eventSlug, email, phone } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `category must be one of: ${CATEGORIES.join(', ')}` });
    }

    const event = getEvent(eventSlug?.trim() || DEFAULT_EVENT_SLUG);
    if (!event) return res.status(400).json({ error: `Unknown event: "${eventSlug}"` });

    const ticketNumber = Ticket.generateTicketNumber();
    const guest = await Ticket.create({
      ticketNumber,
      name: name.trim(),
      email: email?.trim().toLowerCase() || `guestlist-${ticketNumber.toLowerCase()}@nia.internal`,
      phone: phone?.trim(),
      tickets: [{ ticket_type: category, quantity: 1, unit_price: 0, line_total: 0 }],
      event_id: event.eventId,
      subtotal: 0,
      amount: 0,
      ticket_status: 'paid',
      payment_provider: 'guest_list_complimentary',
      mollie_payment_id: 'GUEST-LIST',
      paid_at: new Date(),
    });

    return res.status(201).json(guest);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/guest-list/:id/check-in ──────────────────────────
// Reversible toggle, not a one-way redemption — an admin ticking the wrong
// name is a normal, expected mistake here, unlike scanning a real ticket.
async function toggleCheckIn(req, res, next) {
  try {
    const guest = await Ticket.findOne({ _id: req.params.id, payment_provider: 'guest_list_complimentary' });
    if (!guest) return res.status(404).json({ error: 'Guest not found' });

    if (guest.checkedInAt) {
      guest.checkedInAt = undefined;
      guest.checkedInBy = undefined;
      await guest.save();
      await EventCheckIn.deleteOne({ ticket: guest._id, type: 'ticket' });
    } else {
      guest.checkedInAt = new Date();
      guest.checkedInBy = req.admin.id;
      await guest.save();
      await EventCheckIn.create({
        type: 'ticket', ticket: guest._id, code: guest.ticketNumber,
        name: guest.name, email: guest.email, scannedBy: req.admin.id,
      });
    }

    return res.json(guest);
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/admin/guest-list/:id ──────────────────────────────────
async function remove(req, res, next) {
  try {
    const guest = await Ticket.findOneAndDelete({ _id: req.params.id, payment_provider: 'guest_list_complimentary' });
    if (!guest) return res.status(404).json({ error: 'Guest not found' });
    await EventCheckIn.deleteOne({ ticket: guest._id, type: 'ticket' });
    return res.json({ message: 'Guest removed' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, toggleCheckIn, remove };
