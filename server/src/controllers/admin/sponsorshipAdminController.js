const Sponsorship = require('../../models/Sponsorship');
const Ticket = require('../../models/Ticket');
const { sendSponsorshipConfirmation, sendTicketConfirmation } = require('../../services/emailService');
const { TICKET_PRICES, EVENT_ID } = require('../ticketController');

// ── GET /api/admin/sponsorships — paid sponsorships only ──────────
async function list(req, res, next) {
  try {
    const { search, page = 1, limit = 25 } = req.query;
    const filter = { status: 'paid' };
    if (search) {
      filter.$or = [
        { sponsorName: new RegExp(search, 'i') },
        { contactPerson: new RegExp(search, 'i') },
        { companyName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { referenceNumber: new RegExp(search, 'i') },
      ];
    }

    const [items, total, stats] = await Promise.all([
      Sponsorship.find(filter).populate('sponsorshipTier', 'name color').sort('-createdAt').skip((page - 1) * limit).limit(Number(limit)),
      Sponsorship.countDocuments(filter),
      Sponsorship.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$amount' } } },
      ]),
    ]);

    const summary = stats[0] || { count: 0, revenue: 0 };
    return res.json({
      items, total, page: Number(page), pages: Math.ceil(total / limit),
      summary: { paidCount: summary.count, revenue: summary.revenue },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/sponsorships/:id ────────────────────────────────
async function getById(req, res, next) {
  try {
    const sponsorship = await Sponsorship.findById(req.params.id).populate('sponsorshipTier', 'name color ticketCount');
    if (!sponsorship) return res.status(404).json({ error: 'Sponsorship not found' });
    return res.json(sponsorship);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/sponsorships/:id/resend-email ──────────────────
async function resendEmail(req, res, next) {
  try {
    const sponsorship = await Sponsorship.findById(req.params.id);
    if (!sponsorship) return res.status(404).json({ error: 'Sponsorship not found' });
    if (sponsorship.status !== 'paid') {
      return res.status(400).json({ error: 'Confirmation email is only available for paid sponsorships' });
    }
    await sendSponsorshipConfirmation(sponsorship);
    return res.json({ message: `Confirmation email resent to ${sponsorship.email}.` });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/sponsorships/:id/complimentary-tickets ─────────
// Creates a paid legacy Ticket (no Mollie charge) for the sponsor and emails
// it exactly like a normal ticket purchase confirmation — this is the same
// hardcoded single event the public guest-checkout flow (ticketController.js)
// serves, since that's the one real event ticket sales run against today.
async function sendComplimentaryTickets(req, res, next) {
  try {
    const { ticketType = 'vip', quantity } = req.body;
    if (!TICKET_PRICES[ticketType]) {
      return res.status(400).json({ error: `Invalid ticket type: ${ticketType}` });
    }
    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1) return res.status(400).json({ error: 'quantity must be a positive number' });

    const sponsorship = await Sponsorship.findById(req.params.id);
    if (!sponsorship) return res.status(404).json({ error: 'Sponsorship not found' });
    if (sponsorship.status !== 'paid') {
      return res.status(400).json({ error: 'Complimentary tickets are only available for paid sponsorships' });
    }

    const ticket = await Ticket.create({
      name: sponsorship.contactPerson || sponsorship.sponsorName,
      email: sponsorship.email,
      phone: sponsorship.phone,
      tickets: [{ ticket_type: ticketType, quantity: qty, unit_price: 0, line_total: 0 }],
      event_id: EVENT_ID,
      subtotal: 0,
      amount: 0,
      ticket_status: 'paid',
      payment_provider: 'complimentary',
      mollie_payment_id: 'COMPLIMENTARY',
      paid_at: new Date(),
    });

    await sendTicketConfirmation(ticket);

    sponsorship.complimentaryTickets.push({ ticket: ticket._id, ticketType, quantity: qty });
    await sponsorship.save();

    return res.json({
      message: `${qty} complimentary ${ticketType} ticket${qty === 1 ? '' : 's'} sent to ${sponsorship.email}.`,
      ticketNumber: ticket.ticketNumber,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, resendEmail, sendComplimentaryTickets };
