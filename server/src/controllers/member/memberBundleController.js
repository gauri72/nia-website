const Member = require('../../models/Member');
const MembershipTier = require('../../models/MembershipTier');
const Ticket = require('../../models/Ticket');
const MembershipTicketBundle = require('../../models/MembershipTicketBundle');
const { createPayment } = require('../../services/mollieService');
const { finalizeFreeOrder } = require('../../services/databaseService');
const { applyDiscount } = require('../../services/discountService');
const { TICKET_PRICES, EVENT_ID } = require('../../controllers/ticketController');

function validateTicketLines(tickets) {
  const ticketLines = [];
  let subtotal = 0;
  for (const t of tickets || []) {
    const type = t.ticket_type?.toLowerCase();
    const qty = parseInt(t.quantity, 10);
    if (!TICKET_PRICES[type]) throw new Error(`Invalid ticket type: ${type}`);
    if (!qty || qty < 1) throw new Error(`Invalid quantity for ${type}`);
    const unitPrice = TICKET_PRICES[type];
    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;
    ticketLines.push({ ticket_type: type, quantity: qty, unit_price: unitPrice, line_total: lineTotal });
  }
  if (ticketLines.length === 0) throw new Error('At least one ticket is required');
  return { ticketLines, subtotal };
}

// Same highest-priced-eligible-units-first allocation ticketController.js's
// resolveAutomaticDiscount() uses — duplicated rather than imported/shared,
// since that function is tightly coupled to looking up the member's CURRENT
// active tier by email, whereas here the tier is the one being purchased in
// this same checkout (the member has no active tier yet). Still respects any
// discount usage from a previous, separate purchase for this event (the
// per-event unit cap is per email, not per order).
async function computeTicketDiscountForTier(tier, email, ticketLines) {
  if (!tier?.ticketDiscountType) return { discountAmount: 0, unitsDiscounted: 0 };

  const maxUnits = tier.ticketDiscountMaxPerEvent || 1;
  const usedAgg = await Ticket.aggregate([
    { $match: { email, event_id: EVENT_ID, ticket_status: 'paid', membershipDiscountApplied: true } },
    { $group: { _id: null, total: { $sum: '$membershipDiscountUnits' } } },
  ]);
  const usedUnits = usedAgg[0]?.total || 0;
  const remaining = Math.max(0, maxUnits - usedUnits);
  if (remaining <= 0) return { discountAmount: 0, unitsDiscounted: 0 };

  let allowanceLeft = remaining;
  let discountAmount = 0;
  let unitsDiscounted = 0;
  for (const line of [...ticketLines].sort((a, b) => b.unit_price - a.unit_price)) {
    if (allowanceLeft <= 0) break;
    const qtyToDiscount = Math.min(allowanceLeft, line.quantity);
    const perUnitDiscount = applyDiscount({ type: tier.ticketDiscountType, value: tier.ticketDiscountValue }, line.unit_price).discount_amount;
    discountAmount += perUnitDiscount * qtyToDiscount;
    unitsDiscounted += qtyToDiscount;
    allowanceLeft -= qtyToDiscount;
  }
  return { discountAmount: Math.round(discountAmount * 100) / 100, unitsDiscounted };
}

// Shared by preview() and create() — same computation so a preview can never
// show something the real submission wouldn't also do.
async function computeBreakdown(member, tierId, tickets) {
  const tier = await MembershipTier.findById(tierId);
  if (!tier || !tier.isActive) throw new Error('Invalid or inactive membership tier');

  const { ticketLines, subtotal: ticketSubtotal } = validateTicketLines(tickets);
  const { discountAmount: ticketDiscountAmount, unitsDiscounted: ticketDiscountUnits } =
    await computeTicketDiscountForTier(tier, member.email, ticketLines);

  const membershipAmount = tier.price;
  const ticketTotal = Math.round((ticketSubtotal - ticketDiscountAmount) * 100) / 100;
  const amount = Math.round((membershipAmount + ticketTotal) * 100) / 100;
  const savings = ticketDiscountAmount; // the only discount this bundle applies today

  return { tier, ticketLines, ticketSubtotal, ticketDiscountAmount, ticketDiscountUnits, membershipAmount, ticketTotal, amount, savings };
}

// ── POST /api/member/bundle/preview ───────────────────────────────
// No side effects — lets the UI show a live price breakdown (with savings
// ribbon) as the member picks a tier and adjusts ticket quantities.
async function preview(req, res, next) {
  try {
    const { tierId, tickets } = req.body;
    if (!tierId) return res.status(400).json({ error: 'tierId is required' });

    const member = await Member.findById(req.member.id);
    const breakdown = await computeBreakdown(member, tierId, tickets);

    return res.json({
      membershipAmount: breakdown.membershipAmount,
      ticketSubtotal: breakdown.ticketSubtotal,
      ticketDiscountAmount: breakdown.ticketDiscountAmount,
      ticketTotal: breakdown.ticketTotal,
      amount: breakdown.amount,
      savings: breakdown.savings,
      tier: { id: breakdown.tier._id, name: breakdown.tier.name },
    });
  } catch (err) {
    if (err.message.startsWith('Invalid') || err.message.includes('required')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

// ── POST /api/member/bundle/create ────────────────────────────────
async function create(req, res, next) {
  try {
    const { tierId, tickets, attendeeNames } = req.body;
    if (!tierId) return res.status(400).json({ error: 'tierId is required' });

    const member = await Member.findById(req.member.id);
    if (member.membershipStatus === 'active') {
      return res.status(400).json({ error: 'You already have an active membership — book tickets directly instead.' });
    }

    const breakdown = await computeBreakdown(member, tierId, tickets);

    const totalQty = breakdown.ticketLines.reduce((s, l) => s + l.quantity, 0);
    if (totalQty > 1 && !attendeeNames?.trim()) {
      return res.status(400).json({ error: 'attendeeNames is required when booking more than one ticket' });
    }

    const bundle = await MembershipTicketBundle.create({
      member: member._id,
      membershipTier: breakdown.tier._id,
      membershipAmount: breakdown.membershipAmount,
      tickets: breakdown.ticketLines,
      attendee_names: attendeeNames?.trim() || undefined,
      ticketSubtotal: breakdown.ticketSubtotal,
      ticketDiscountAmount: breakdown.ticketDiscountAmount,
      ticketDiscountUnits: breakdown.ticketDiscountUnits,
      amount: breakdown.amount,
    });

    if (breakdown.amount <= 0) {
      await finalizeFreeOrder('bundle', bundle._id.toString());
      return res.status(201).json({ free: true, message: 'Your membership and tickets are fully covered — no payment required.' });
    }

    const result = await createPayment({
      amount: breakdown.amount,
      description: `NIA Membership (${breakdown.tier.name}) + Event Tickets`,
      type: 'bundle',
      referenceId: bundle._id.toString(),
    });
    await MembershipTicketBundle.findByIdAndUpdate(bundle._id, { mollie_payment_id: result.paymentId });

    return res.status(201).json({ paymentId: result.paymentId, checkoutUrl: result.checkoutUrl });
  } catch (err) {
    if (err.message.startsWith('Invalid') || err.message.includes('required')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

module.exports = { preview, create };
