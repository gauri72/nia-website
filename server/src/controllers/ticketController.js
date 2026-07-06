const Ticket = require('../models/Ticket');
const Member = require('../models/Member');
const { createPayment } = require('../services/mollieService');
const { validateDiscountCode, applyDiscount } = require('../services/discountService');
const { finalizeFreeOrder } = require('../services/databaseService');

const TICKET_PRICES = { regular: 20, vip: 45, child: 5 };
const EVENT_ID = 'NIA-EVENT-20260815'; // matches Ticket.event_id's schema default — the one legacy event this flow serves

// ── POST /api/tickets/create ──────────────────────────────────
async function create(req, res, next) {
  try {
    const { name, email, phone, attendeeNames, tickets, discountCode } = req.body;

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'name and email are required' });
    }
    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({ error: 'At least one ticket is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

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

    const totalQty = ticketLines.reduce((s, t) => s + t.quantity, 0);
    if (totalQty > 1 && !attendeeNames?.trim()) {
      return res.status(400).json({ error: 'attendeeNames is required when booking more than one ticket' });
    }

    // ── Discount resolution ──
    // A Feature A discount code always wins over the automatic Feature B tier
    // discount — never both. Response shape stays identical whether or not a
    // member discount applied; only the "already used this event" case gets a
    // distinguishing message, which only fires on a genuine repeat submission
    // (not a first-time probe), to limit how much a guessed email can reveal.
    let total = subtotal;
    let codeDiscount = null;
    let membershipDiscount = null;
    let message;

    if (discountCode?.trim()) {
      try {
        const doc = await validateDiscountCode({ code: discountCode, productType: 'ticket', email: normalizedEmail });
        codeDiscount = applyDiscount(doc, subtotal);
        total = codeDiscount.finalAmount;
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
    } else {
      const member = await Member.findOne({ email: normalizedEmail, membershipStatus: 'active' }).populate('membershipTier');
      const tier = member?.membershipTier;
      if (tier?.ticketDiscountType) {
        const alreadyUsed = await Ticket.exists({
          email: normalizedEmail,
          event_id: EVENT_ID,
          ticket_status: 'paid',
          membershipDiscountApplied: true,
        });
        if (alreadyUsed) {
          message = 'A membership discount has already been used for this event with this email — this ticket is charged at full price.';
        } else {
          const applied = applyDiscount({ type: tier.ticketDiscountType, value: tier.ticketDiscountValue }, subtotal);
          total = applied.finalAmount;
          membershipDiscount = { tier: tier._id, amount: applied.discount_amount };
        }
      }
    }

    const ticket = await Ticket.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone?.trim(),
      attendee_names: totalQty > 1 ? attendeeNames.trim() : undefined,
      tickets: ticketLines,
      event_id: EVENT_ID,
      discountCode: codeDiscount?.discountCodeId,
      discount_code: codeDiscount?.discount_code,
      discount_pct: codeDiscount?.discount_type === 'percentage' ? codeDiscount.discount_value : 0,
      subtotal,
      discount_amount: codeDiscount?.discount_amount || 0,
      membershipDiscountApplied: !!membershipDiscount,
      membershipDiscountTier: membershipDiscount?.tier,
      membershipDiscountAmount: membershipDiscount?.amount,
      amount: total,
      ticket_status: 'pending_payment',
    });

    if (total <= 0) {
      await finalizeFreeOrder('event_ticket', ticket._id.toString());
      console.log(`[Ticket] Created ${ticket._id} | free (fully discounted)`);
      return res.status(201).json({
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        amount: total,
        free: true,
        message: message || 'Your tickets are fully covered by the discount — no payment required.',
      });
    }

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
      message,
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
