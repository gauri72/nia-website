const Booking = require('../../models/Booking');
const Event = require('../../models/Event');
const TicketType = require('../../models/TicketType');
const Member = require('../../models/Member');
const { hashPassword, generateRawToken } = require('../../services/authService');
const { sendMemberPasswordResetEmail, sendBookingConfirmation, sendRefundConfirmation, generateBookingPDF } = require('../../services/emailService');
const { refundPayment } = require('../../services/mollieService');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const SAFE_MEMBER_FIELDS = 'firstName lastName email phone memberId';

// ── GET /api/admin/bookings ────────────────────────────────────────
async function list(req, res, next) {
  try {
    const { event, ticketType, status, search, page = 1, limit = 25 } = req.query;
    const filter = {};
    if (event?.trim()) filter.event = event.trim();
    if (status?.trim()) filter.status = status.trim();
    if (ticketType?.trim()) filter['lines.ticketType'] = ticketType.trim();

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

    let query = Booking.find(filter).populate('member', 'firstName lastName email').populate('event', 'title startDate');

    if (search?.trim()) {
      const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const matchingMembers = await Member.find({ $or: [{ firstName: re }, { lastName: re }, { email: re }] }).select('_id');
      filter.$or = [{ bookingNumber: re }, { member: { $in: matchingMembers.map((m) => m._id) } }];
      query = Booking.find(filter).populate('member', 'firstName lastName email').populate('event', 'title startDate');
    }

    const [bookings, total] = await Promise.all([
      query.sort('-createdAt').skip((pageNum - 1) * limitNum).limit(limitNum),
      Booking.countDocuments(filter),
    ]);

    return res.json({ bookings, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/bookings/:id ─────────────────────────────────────
async function getById(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id).populate('member', 'firstName lastName email phone').populate('event');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    return res.json(booking);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/bookings/:id/refund ─────────────────────────────
async function refund(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id).populate('member', SAFE_MEMBER_FIELDS).populate('event');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'paid') return res.status(400).json({ error: 'Only paid bookings can be refunded' });

    const refundAmount = req.body.amount ? Number(req.body.amount) : booking.amount;

    if (booking.payment_provider === 'mollie' && booking.mollie_payment_id) {
      try {
        await refundPayment(booking.mollie_payment_id, refundAmount);
      } catch (mollieErr) {
        console.error('[BookingAdmin] Mollie refund failed:', mollieErr.message);
        return res.status(502).json({ error: `Refund failed at Mollie: ${mollieErr.message}` });
      }
    }

    booking.status = 'refunded';
    booking.refunded_at = new Date();
    booking.refund_amount = refundAmount;
    await booking.save();

    // Release inventory
    await Promise.all(booking.lines.map((line) =>
      TicketType.findByIdAndUpdate(line.ticketType, { $inc: { quantitySold: -line.quantity } })
    ));

    sendRefundConfirmation(booking).catch((err) => console.error('[BookingAdmin] Refund email failed:', err.message));

    return res.json(booking);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/bookings/manual ─────────────────────────────────
async function manualBooking(req, res, next) {
  try {
    const { eventId, lines, firstName, lastName, email, phone, memberId } = req.body;
    if (!eventId || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'eventId and at least one ticket line are required' });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(400).json({ error: 'Invalid event' });

    let member;
    if (memberId) {
      member = await Member.findById(memberId);
      if (!member) return res.status(400).json({ error: 'Invalid member' });
    } else {
      if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
        return res.status(400).json({ error: 'Provide memberId, or firstName/lastName/email for a new member' });
      }
      member = await Member.findOne({ email: email.trim().toLowerCase() });
      if (!member) {
        const resetToken = generateRawToken();
        member = await Member.create({
          firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim().toLowerCase(), phone: phone?.trim(),
          passwordHash: await hashPassword(generateRawToken()),
          emailVerified: true,
          passwordResetToken: resetToken,
          passwordResetExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        });
        const resetUrl = `${process.env.FRONTEND_URL}/dashboard/reset-password?token=${resetToken}`;
        sendMemberPasswordResetEmail(member, resetUrl).catch((err) => console.error('[BookingAdmin] Welcome email failed:', err.message));
      }
    }

    const bookingLines = [];
    let subtotal = 0;
    for (const l of lines) {
      const tt = await TicketType.findOne({ _id: l.ticketTypeId, event: eventId });
      if (!tt) return res.status(400).json({ error: `Invalid ticket type: ${l.ticketTypeId}` });
      const remaining = tt.quantityTotal - tt.quantitySold;
      if (l.quantity > remaining) return res.status(400).json({ error: `Only ${remaining} left for ${tt.name}` });
      const lineTotal = tt.price * l.quantity;
      bookingLines.push({ ticketType: tt._id, name: tt.name, quantity: l.quantity, unit_price: tt.price, line_total: lineTotal });
      subtotal += lineTotal;
    }

    const booking = await Booking.create({
      member: member._id, event: event._id, lines: bookingLines,
      subtotal, amount: subtotal, status: 'paid', payment_provider: 'manual', paid_at: new Date(),
    });

    await Promise.all(bookingLines.map((l) => TicketType.findByIdAndUpdate(l.ticketType, { $inc: { quantitySold: l.quantity } })));

    const populated = await Booking.findById(booking._id).populate('member', SAFE_MEMBER_FIELDS).populate('event');
    sendBookingConfirmation(populated).catch((err) => console.error('[BookingAdmin] Confirmation email failed:', err.message));

    return res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/bookings/:id/ticket.pdf ──────────────────────────
async function downloadTicketPdf(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id).populate('member').populate('event');
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

module.exports = { list, getById, refund, manualBooking, downloadTicketPdf };
