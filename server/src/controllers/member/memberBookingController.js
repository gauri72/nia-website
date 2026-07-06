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
// is already authenticated, so there's no email to guess. ──
async function computePricing(member, event, lines, discountCode) {
  const isEligibleForMemberPrice = member.membershipStatus === 'active';

  let validCode = null;
  if (discountCode?.trim()) {
    validCode = await validateDiscountCode({ code: discountCode, productType: 'ticket', email: member.email }); // throws on invalid — let caller catch
  }

  let tierDiscountEligible = false;
  let message;
  if (!validCode && isEligibleForMemberPrice && member.membershipTier?.ticketDiscountType) {
    const usedCount = await Booking.countDocuments({
      member: member._id, event: event._id, status: 'paid', membershipDiscountApplied: true,
    });
    const maxPerEvent = member.membershipTier.ticketDiscountMaxPerEvent || 1;
    if (usedCount >= maxPerEvent) {
      message = `A membership discount has already been used the maximum ${maxPerEvent} time${maxPerEvent === 1 ? '' : 's'} allowed for this event with this account — tickets are charged at full price.`;
    } else {
      tierDiscountEligible = true;
    }
  }

  const bookingLines = [];
  let subtotal = 0;
  let membershipDiscountAmount = 0;
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

    // Precedence: an explicit per-ticket-type memberPrice always wins; otherwise fall
    // back to the tier's automatic discount (only when the ticket type opts in via
    // membershipDiscount); a ticket type with membershipDiscount:false never gets any
    // member pricing, regardless of tier settings.
    let unitPrice = tt.price;
    if (tt.membershipDiscount && isEligibleForMemberPrice && tt.memberPrice != null) {
      unitPrice = tt.memberPrice;
    } else if (tt.membershipDiscount && tierDiscountEligible) {
      unitPrice = applyDiscount({ type: member.membershipTier.ticketDiscountType, value: member.membershipTier.ticketDiscountValue }, tt.price).finalAmount;
      membershipDiscountAmount += (tt.price - unitPrice) * qty;
    }

    const lineTotal = unitPrice * qty;
    bookingLines.push({ ticketType: tt._id, name: tt.name, quantity: qty, unit_price: unitPrice, line_total: lineTotal });
    subtotal += lineTotal;
  }

  let amount = subtotal;
  let codeDiscount = null;
  if (validCode) {
    codeDiscount = applyDiscount(validCode, subtotal);
    amount = codeDiscount.finalAmount;
  }

  return { bookingLines, subtotal, amount, codeDiscount, membershipDiscountAmount, message };
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
    const { bookingLines, subtotal, amount, codeDiscount, membershipDiscountAmount, message } = pricing;

    const booking = await Booking.create({
      member: member._id, event: event._id, lines: bookingLines,
      subtotal,
      discountCode: codeDiscount?.discountCodeId,
      discount_code: codeDiscount?.discount_code,
      discount_pct: codeDiscount?.discount_type === 'percentage' ? codeDiscount.discount_value : 0,
      discount_amount: codeDiscount?.discount_amount || 0,
      membershipDiscountApplied: membershipDiscountAmount > 0,
      membershipDiscountTier: membershipDiscountAmount > 0 ? member.membershipTier._id : undefined,
      membershipDiscountAmount: membershipDiscountAmount > 0 ? membershipDiscountAmount : undefined,
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
