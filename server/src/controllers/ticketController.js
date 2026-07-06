const Ticket = require('../models/Ticket');
const Member = require('../models/Member');
const { createPayment } = require('../services/mollieService');
const { validateDiscountCode, applyDiscount } = require('../services/discountService');
const { finalizeFreeOrder } = require('../services/databaseService');

const TICKET_PRICES = { regular: 20, vip: 45, child: 5 };
const EVENT_ID = 'NIA-EVENT-20260815'; // matches Ticket.event_id's schema default — the one legacy event this flow serves

function validateTicketLines(tickets) {
  const ticketLines = [];
  let subtotal = 0;
  for (const t of tickets) {
    const type = t.ticket_type?.toLowerCase();
    const qty = parseInt(t.quantity, 10);
    if (!TICKET_PRICES[type]) throw new Error(`Invalid ticket type: ${type}`);
    if (!qty || qty < 1) throw new Error(`Invalid quantity for ${type}`);
    const unitPrice = TICKET_PRICES[type];
    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;
    ticketLines.push({ ticket_type: type, quantity: qty, unit_price: unitPrice, line_total: lineTotal });
  }
  return { ticketLines, subtotal };
}

// ── Shared by create() and the preview endpoint — same exact eligibility
// logic (active member, tier has a discount configured, per-event cap not yet
// reached) so a preview can never show something the real submission wouldn't
// also do, and vice versa. ──
async function resolveAutomaticDiscount(normalizedEmail, subtotal) {
  const member = await Member.findOne({ email: normalizedEmail, membershipStatus: 'active' }).populate('membershipTier');
  const tier = member?.membershipTier;
  if (!tier?.ticketDiscountType) return { eligible: false };

  const usedCount = await Ticket.countDocuments({
    email: normalizedEmail,
    event_id: EVENT_ID,
    ticket_status: 'paid',
    membershipDiscountApplied: true,
  });
  const maxPerEvent = tier.ticketDiscountMaxPerEvent || 1;
  if (usedCount >= maxPerEvent) {
    return {
      eligible: false,
      message: `A membership discount has already been used the maximum ${maxPerEvent} time${maxPerEvent === 1 ? '' : 's'} allowed for this event with this email — this ticket is charged at full price.`,
    };
  }

  const applied = applyDiscount({ type: tier.ticketDiscountType, value: tier.ticketDiscountValue }, subtotal);
  return { eligible: true, tier, applied };
}

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

    let ticketLines, subtotal;
    try {
      ({ ticketLines, subtotal } = validateTicketLines(tickets));
    } catch (err) {
      return res.status(400).json({ error: err.message });
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
      const resolved = await resolveAutomaticDiscount(normalizedEmail, subtotal);
      if (resolved.eligible) {
        total = resolved.applied.finalAmount;
        membershipDiscount = { tier: resolved.tier._id, amount: resolved.applied.discount_amount };
      } else if (resolved.message) {
        message = resolved.message;
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

// ── POST /api/tickets/preview-discount ─────────────────────────
// No side effects — mirrors create()'s exact discount logic (including the
// per-event redemption cap, so this can never reveal eligibility beyond what
// a real submission would) so the booking flow can show the buyer their real
// total before they leave the site for Mollie's checkout, instead of only
// finding out there — which is the confusing gap this endpoint fixes.
async function previewDiscount(req, res, next) {
  try {
    const { email, tickets, discountCode } = req.body;
    if (!email?.trim() || !tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({ error: 'email and at least one ticket are required' });
    }
    const normalizedEmail = email.trim().toLowerCase();

    let subtotal;
    try {
      ({ subtotal } = validateTicketLines(tickets));
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    if (discountCode?.trim()) {
      try {
        const doc = await validateDiscountCode({ code: discountCode, productType: 'ticket', email: normalizedEmail });
        const applied = applyDiscount(doc, subtotal);
        return res.json({ subtotal, discount_amount: applied.discount_amount, finalAmount: applied.finalAmount, source: 'code' });
      } catch (err) {
        return res.json({ subtotal, discount_amount: 0, finalAmount: subtotal, message: err.message });
      }
    }

    const resolved = await resolveAutomaticDiscount(normalizedEmail, subtotal);
    if (resolved.eligible) {
      return res.json({
        subtotal, discount_amount: resolved.applied.discount_amount, finalAmount: resolved.applied.finalAmount, source: 'membership',
      });
    }
    return res.json({ subtotal, discount_amount: 0, finalAmount: subtotal, message: resolved.message });
  } catch (err) {
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

module.exports = { create, getById, previewDiscount };
