const Ticket = require('../models/Ticket');
const { createPayment } = require('../services/mollieService');

const TICKET_PRICES = { regular: 20, vip: 45, child: 1 };
const DISCOUNT_CODES = { NIA10: 0.10, NIA20: 0.20 };

// ── POST /api/tickets/create ──────────────────────────────────
async function create(req, res, next) {
  try {
    const { name, email, phone, tickets, discountCode } = req.body;

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'name and email are required' });
    }
    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({ error: 'At least one ticket is required' });
    }

    // Validate and compute totals server-side — never trust frontend amounts
    const ticketLines = [];
    let subtotal = 0;

    for (const t of tickets) {
      const type = t.ticket_type?.toLowerCase();
      const qty = parseInt(t.quantity, 10);
      if (!TICKET_PRICES[type]) {
        return res.status(400).json({ error: `Invalid ticket type: ${type}` });
      }
      if (!qty || qty < 1) {
        return res.status(400).json({ error: `Invalid quantity for ${type}` });
      }
      const unitPrice = TICKET_PRICES[type];
      const lineTotal = unitPrice * qty;
      subtotal += lineTotal;
      ticketLines.push({ ticket_type: type, quantity: qty, unit_price: unitPrice, line_total: lineTotal });
    }

    // Validate discount code server-side
    const upperCode = discountCode?.toUpperCase();
    const discountPct = DISCOUNT_CODES[upperCode] || 0;
    const discountAmount = Math.round(subtotal * discountPct * 100) / 100;
    const total = Math.round((subtotal - discountAmount) * 100) / 100;

    const ticket = await Ticket.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim(),
      tickets: ticketLines,
      discount_code: discountPct > 0 ? upperCode : undefined,
      discount_pct: discountPct,
      subtotal,
      discount_amount: discountAmount,
      amount: total,
      ticket_status: 'pending_payment',
    });

    const payment = await createPayment({
      amount: total,
      description: `NIA Event Tickets — ${ticketLines.map(t => `${t.quantity}× ${t.ticket_type}`).join(', ')}`,
      type: 'event_ticket',
      referenceId: ticket._id.toString(),
    });

    console.log(`[Ticket] Created ${ticket._id} | total=€${total} | payment=${payment.paymentId}`);

    return res.status(201).json({
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      amount: total,
      paymentId: payment.paymentId,
      checkoutUrl: payment.checkoutUrl,
    });
  } catch (err) {
    console.error('[Ticket] Create error:', err.message);
    next(err);
  }
}

// ── GET /api/tickets/:id ──────────────────────────────────────
async function getById(req, res, next) {
  try {
    const ticket = await Ticket.findById(req.params.id).select('-__v');
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    return res.json(ticket);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, getById };
