const Booking = require('../../models/Booking');
const Event = require('../../models/Event');
const TicketType = require('../../models/TicketType');
const Member = require('../../models/Member');
const QRCode = require('qrcode');
const { createPayment, refundPayment } = require('../../services/mollieService');
const { generateBookingPDF } = require('../../services/emailService');
const { validateDiscountCode, applyDiscount } = require('../../services/discountService');
const { finalizeFreeOrder } = require('../../services/databaseService');

// ── Shared by create() and previewDiscount() — identical pricing logic so a
// preview can never show a different number than the real submission would
// charge. No privacy concern here (unlike the guest ticket flow): the member
// is already authenticated, so there's no email to guess.
//
// The discount caps at a fixed number of TICKET UNITS per member per event
// (tier.ticketDiscountMaxPerEvent), not a number of orders — a single order
// requesting more units than the remaining allowance discounts the
// highest-priced eligible units first, up to that allowance; the rest are
// charged full price. Only ticket types with membershipDiscount:true and no
// explicit memberPrice override are eligible for this automatic allocation —
// an explicit memberPrice always wins outright and never consumes the
// allowance. ──
async function computePricing(member, event, lines, discountCode) {
  const isEligibleForMemberPrice = member.membershipStatus === 'active';

  let validCode = null;
  if (discountCode?.trim()) {
    validCode = await validateDiscountCode({ code: discountCode, productType: 'ticket', email: member.email }); // throws on invalid — let caller catch
  }

  // Validate + fetch every ticket type up front — needed before sorting/allocating.
  const resolvedLines = [];
  for (const l of lines) {
    const tt = await TicketType.findOne({ _id: l.ticketTypeId, event: event._id, isActive: true });
    if (!tt) throw new Error(`Invalid ticket type: ${l.ticketTypeId}`);

    const now = new Date();
    if (tt.salesStart && now < tt.salesStart) throw new Error(`${tt.name} is not yet on sale`);
    if (tt.salesEnd && now > tt.salesEnd) throw new Error(`${tt.name} sales have ended`);

    const remaining = tt.quantityTotal - tt.quantitySold;
    const qty = Math.max(1, parseInt(l.quantity, 10) || 1);
    if (qty > tt.maxPerOrder) throw new Error(`Maximum ${tt.maxPerOrder} per order for ${tt.name}`);
    if (qty > remaining) throw new Error(`Only ${remaining} left for ${tt.name}`);

    resolvedLines.push({ tt, qty });
  }

  let allowance = 0;
  let maxPerEvent = 0;
  let message;
  const tierDiscountActive = !validCode && isEligibleForMemberPrice && member.membershipTier?.ticketDiscountType;
  if (tierDiscountActive) {
    maxPerEvent = member.membershipTier.ticketDiscountMaxPerEvent || 1;
    const usedAgg = await Booking.aggregate([
      { $match: { member: member._id, event: event._id, status: 'paid', membershipDiscountApplied: true } },
      { $group: { _id: null, total: { $sum: '$membershipDiscountUnits' } } },
    ]);
    const usedUnits = usedAgg[0]?.total || 0;
    allowance = Math.max(0, maxPerEvent - usedUnits);
    if (allowance <= 0) {
      message = `Maximum per-event membership discount usage (${maxPerEvent} ticket${maxPerEvent === 1 ? '' : 's'}) for this email has been reached — tickets are charged at full price.`;
    }
  }

  // Allocate remaining allowance to the highest-priced auto-discount-eligible
  // lines first. A line with an explicit memberPrice override is priced
  // separately below and never competes for this allowance.
  const autoEligible = resolvedLines.filter(({ tt }) => tt.membershipDiscount && !(isEligibleForMemberPrice && tt.memberPrice != null));
  const discountQtyByTicketType = new Map();
  let eligibleRequestedQty = 0;
  if (allowance > 0) {
    let allowanceLeft = allowance;
    for (const { tt, qty } of [...autoEligible].sort((a, b) => b.tt.price - a.tt.price)) {
      eligibleRequestedQty += qty;
      if (allowanceLeft <= 0) continue;
      const take = Math.min(allowanceLeft, qty);
      discountQtyByTicketType.set(String(tt._id), take);
      allowanceLeft -= take;
    }
  } else {
    eligibleRequestedQty = autoEligible.reduce((s, { qty }) => s + qty, 0);
  }

  const bookingLines = [];
  let subtotal = 0;
  let membershipDiscountAmount = 0;
  let membershipDiscountUnits = 0;
  for (const { tt, qty } of resolvedLines) {
    let unitPrice = tt.price;
    let lineTotal;

    if (tt.membershipDiscount && isEligibleForMemberPrice && tt.memberPrice != null) {
      // Explicit override always wins outright, applies to the full line, never consumes the allowance.
      unitPrice = tt.memberPrice;
      lineTotal = unitPrice * qty;
    } else {
      const discountedQty = discountQtyByTicketType.get(String(tt._id)) || 0;
      const fullQty = qty - discountedQty;
      if (discountedQty > 0) {
        const discountedUnitPrice = applyDiscount({ type: member.membershipTier.ticketDiscountType, value: member.membershipTier.ticketDiscountValue }, tt.price).finalAmount;
        lineTotal = discountedUnitPrice * discountedQty + tt.price * fullQty;
        unitPrice = Math.round((lineTotal / qty) * 100) / 100; // blended — line_total is what's actually charged/authoritative
        membershipDiscountAmount += (tt.price - discountedUnitPrice) * discountedQty;
        membershipDiscountUnits += discountedQty;
      } else {
        lineTotal = tt.price * qty;
      }
    }

    bookingLines.push({ ticketType: tt._id, name: tt.name, quantity: qty, unit_price: unitPrice, line_total: lineTotal });
    subtotal += lineTotal;
  }
  membershipDiscountAmount = Math.round(membershipDiscountAmount * 100) / 100;

  if (tierDiscountActive && allowance > 0 && membershipDiscountUnits < eligibleRequestedQty) {
    message = `Your membership discount was applied to ${membershipDiscountUnits} of your ${eligibleRequestedQty} eligible ticket${eligibleRequestedQty === 1 ? '' : 's'} (your allowance for this event is ${maxPerEvent}) — the rest are charged full price.`;
  }

  let amount = subtotal;
  let codeDiscount = null;
  if (validCode) {
    codeDiscount = applyDiscount(validCode, subtotal);
    amount = codeDiscount.finalAmount;
  }

  return { bookingLines, subtotal, amount, codeDiscount, membershipDiscountAmount, membershipDiscountUnits, message };
}

// ── POST /api/bookings/create ─────────────────────────────────────
async function create(req, res, next) {
  try {
    const { eventId, lines, discountCode } = req.body;
    if (!eventId || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'eventId and at least one ticket line are required' });
    }

    const event = await Event.findOne({ _id: eventId, status: 'published' });
    if (!event) return res.status(400).json({ error: 'Event not found or not available' });

    const member = await Member.findById(req.member.id).populate('membershipTier');

    let pricing;
    try {
      pricing = await computePricing(member, event, lines, discountCode);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    const { bookingLines, subtotal, amount, codeDiscount, membershipDiscountAmount, membershipDiscountUnits, message } = pricing;

    const booking = await Booking.create({
      member: member._id, event: event._id, lines: bookingLines,
      subtotal,
      discountCode: codeDiscount?.discountCodeId,
      discount_code: codeDiscount?.discount_code,
      discount_pct: codeDiscount?.discount_type === 'percentage' ? codeDiscount.discount_value : 0,
      discount_amount: codeDiscount?.discount_amount || 0,
      membershipDiscountApplied: membershipDiscountUnits > 0,
      membershipDiscountTier: membershipDiscountUnits > 0 ? member.membershipTier._id : undefined,
      membershipDiscountAmount: membershipDiscountUnits > 0 ? membershipDiscountAmount : undefined,
      membershipDiscountUnits: membershipDiscountUnits || 0,
      amount,
      status: 'pending_payment',
    });

    if (amount <= 0) {
      await finalizeFreeOrder('booking', booking._id.toString());
      return res.status(201).json({
        bookingId: booking._id,
        bookingReference: booking.bookingNumber,
        free: true,
        message: message || 'Your booking is fully covered by the discount — no payment required.',
      });
    }

    const payment = await createPayment({
      amount,
      description: `NIA Event Booking — ${event.title}`,
      type: 'booking',
      referenceId: booking._id.toString(),
    });

    return res.status(201).json({
      bookingId: booking._id,
      bookingReference: booking.bookingNumber,
      paymentId: payment.paymentId,
      checkoutUrl: payment.checkoutUrl,
      message,
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/bookings/preview-discount ────────────────────────────
// No side effects — same pricing logic as create(), so the booking widget can
// show the member their real total (including an automatic tier discount)
// before they commit, instead of only finding out at Mollie's checkout.
async function previewDiscount(req, res, next) {
  try {
    const { eventId, lines, discountCode } = req.body;
    if (!eventId || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'eventId and at least one ticket line are required' });
    }

    const event = await Event.findOne({ _id: eventId, status: 'published' });
    if (!event) return res.status(400).json({ error: 'Event not found or not available' });

    const member = await Member.findById(req.member.id).populate('membershipTier');

    try {
      const { subtotal, amount, codeDiscount, membershipDiscountAmount, message } = await computePricing(member, event, lines, discountCode);
      return res.json({
        subtotal, finalAmount: amount,
        discount_amount: codeDiscount?.discount_amount || membershipDiscountAmount || 0,
        source: codeDiscount ? 'code' : membershipDiscountAmount > 0 ? 'membership' : undefined,
        message,
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  } catch (err) {
    next(err);
  }
}

// ── GET /api/bookings/mine ────────────────────────────────────────
async function listMine(req, res, next) {
  try {
    const bookings = await Booking.find({ member: req.member.id, status: { $ne: 'pending_payment' } })
      .populate('event', 'title startDate venueName venueCity coverImageUrl')
      .sort('-createdAt');
    return res.json(bookings);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/bookings/:id ─────────────────────────────────────────
async function getById(req, res, next) {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, member: req.member.id }).populate('event');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    return res.json(booking);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/bookings/:id/ticket.pdf ──────────────────────────────
async function downloadTicketPdf(req, res, next) {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, member: req.member.id }).populate('member').populate('event');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'paid') return res.status(400).json({ error: 'Ticket PDF only available for paid bookings' });

    const pdfBuffer = await generateBookingPDF(booking);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="NIA-Ticket-${booking.bookingNumber}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/bookings/:id/qrcode ──────────────────────────────────
async function getQrCode(req, res, next) {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, member: req.member.id });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const dataUrl = await QRCode.toDataURL(booking.bookingNumber, { width: 200, margin: 1, color: { dark: '#0F1F4B', light: '#ffffff' } });
    return res.json({ dataUrl });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/bookings/:id/cancel ─────────────────────────────────
// Member-initiated cancellation request; refunds immediately (policy: full refund up to event start).
async function cancel(req, res, next) {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, member: req.member.id }).populate('event');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'paid') return res.status(400).json({ error: 'Only paid bookings can be cancelled' });
    if (booking.event?.startDate && new Date(booking.event.startDate) < new Date()) {
      return res.status(400).json({ error: 'This event has already taken place' });
    }

    if (booking.payment_provider === 'mollie' && booking.mollie_payment_id) {
      try {
        await refundPayment(booking.mollie_payment_id, booking.amount);
      } catch (mollieErr) {
        return res.status(502).json({ error: `Refund failed: ${mollieErr.message}` });
      }
    }

    booking.status = 'refunded';
    booking.refund_requested_at = new Date();
    booking.refunded_at = new Date();
    booking.refund_amount = booking.amount;
    await booking.save();

    await Promise.all(booking.lines.map((line) =>
      TicketType.findByIdAndUpdate(line.ticketType, { $inc: { quantitySold: -line.quantity } })
    ));

    return res.json(booking);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, previewDiscount, listMine, getById, downloadTicketPdf, getQrCode, cancel };
