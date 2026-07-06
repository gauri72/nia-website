const Ticket = require('../models/Ticket');
const Member = require('../models/Member');
const { createPayment } = require('../services/mollieService');
const { validateDiscountCode, applyDiscount } = require('../services/discountService');
const { finalizeFreeOrder } = require('../services/databaseService');

const TICKET_PRICES = { regular: 20, vip: 45, child: 5 };
const EVENT_ID = 'NIA-EVENT-20260815'; // matches Ticket.event_id's schema default — the one legacy event this flow serves
const DISCOUNT_INELIGIBLE_TYPES = ['child']; // child tickets are already discounted — never eligible for the membership discount too

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

// ── Shared by create() and the preview endpoint — same exact eligibility and
// allocation logic so a preview can never show something the real submission
// wouldn't also do, and vice versa.
//
// The discount caps at a fixed number of TICKET UNITS per member per event
// (tier.ticketDiscountMaxPerEvent), not a number of orders — a single order
// requesting more units than the remaining allowance only gets the discount
// on the cheapest eligible units up to that allowance; the rest are charged
// full price. Child tickets are never eligible (already a reduced price). ──
async function resolveAutomaticDiscount(normalizedEmail, ticketLines) {
  const member = await Member.findOne({ email: normalizedEmail, membershipStatus: 'active' }).populate('membershipTier');
  const tier = member?.membershipTier;
  if (!tier?.ticketDiscountType) return { eligible: false };

  const maxUnits = tier.ticketDiscountMaxPerEvent || 1;
  const usedAgg = await Ticket.aggregate([
    { $match: { email: normalizedEmail, event_id: EVENT_ID, ticket_status: 'paid', membershipDiscountApplied: true } },
    { $group: { _id: null, total: { $sum: '$membershipDiscountUnits' } } },
  ]);
  const usedUnits = usedAgg[0]?.total || 0;
  const remaining = Math.max(0, maxUnits - usedUnits);

  const eligibleLines = ticketLines.filter((l) => !DISCOUNT_INELIGIBLE_TYPES.includes(l.ticket_type));
  const eligibleRequestedQty = eligibleLines.reduce((s, l) => s + l.quantity, 0);

  if (remaining <= 0) {
    return {
      eligible: false,
      message: `You've already used your full membership discount allowance (${maxUnits} ticket${maxUnits === 1 ? '' : 's'}) for this event with this email — this order is charged at full price.`,
    };
  }
  if (eligibleRequestedQty === 0) return { eligible: false }; // e.g. child-only order — nothing to discount, not an "already used" case

  // Allocate to the cheapest eligible units first.
  let allowanceLeft = remaining;
  let totalDiscountAmount = 0;
  let unitsDiscounted = 0;
  for (const line of [...eligibleLines].sort((a, b) => a.unit_price - b.unit_price)) {
    if (allowanceLeft <= 0) break;
    const qtyToDiscount = Math.min(allowanceLeft, line.quantity);
    const perUnitDiscount = applyDiscount({ type: tier.ticketDiscountType, value: tier.ticketDiscountValue }, line.unit_price).discount_amount;
    totalDiscountAmount += perUnitDiscount * qtyToDiscount;
    unitsDiscounted += qtyToDiscount;
    allowanceLeft -= qtyToDiscount;
  }
  totalDiscountAmount = Math.round(totalDiscountAmount * 100) / 100;

  if (unitsDiscounted === 0) return { eligible: false };

  let message;
  if (unitsDiscounted < eligibleRequestedQty) {
    message = `Your membership discount was applied to ${unitsDiscounted} of your ${eligibleRequestedQty} eligible ticket${eligibleRequestedQty === 1 ? '' : 's'} (your allowance for this event is ${maxUnits}) — the rest are charged full price. Child tickets are never eligible for the membership discount.`;
  }

  return { eligible: true, tier, totalDiscountAmount, unitsDiscounted, message };
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
    // member discount applied; only the "already used"/"partially applied"
    // cases get a distinguishing message, which only fire on a genuine repeat
    // or over-allowance submission (not a first-time probe), to limit how
    // much a guessed email can reveal.
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
      const resolved = await resolveAutomaticDiscount(normalizedEmail, ticketLines);
      if (resolved.eligible) {
        total = Math.round((subtotal - resolved.totalDiscountAmount) * 100) / 100;
        membershipDiscount = { tier: resolved.tier._id, amount: resolved.totalDiscountAmount, units: resolved.unitsDiscounted };
        if (resolved.message) message = resolved.message;
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
      membershipDiscountUnits: membershipDiscount?.units || 0,
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

    let ticketLines, subtotal;
    try {
      ({ ticketLines, subtotal } = validateTicketLines(tickets));
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

    const resolved = await resolveAutomaticDiscount(normalizedEmail, ticketLines);
    if (resolved.eligible) {
      return res.json({
        subtotal,
        discount_amount: resolved.totalDiscountAmount,
        finalAmount: Math.round((subtotal - resolved.totalDiscountAmount) * 100) / 100,
        source: 'membership',
        message: resolved.message,
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
