const Ticket = require('../../models/Ticket');
const { refundPayment } = require('../../services/mollieService');
const {
  generateTicketPDF, generateQRDataURL, sendTicketConfirmation, sendTicketRefundConfirmation, sendVipPassEmail,
} = require('../../services/emailService');
const { generateVipPassBatchPDF } = require('../../services/vipPassService');

// Read-only admin view onto the original public-site ticket flow (client/src/components/events/*,
// /api/tickets/create) — the single hardcoded "15 August" event that predates the Event/Booking
// system built for the admin panel. Left as a separate collection/flow per the project's rule of
// never touching the 4 legacy payment models; this just gives the admin visibility into it.
const EVENT_LABELS = {
  'NIA-EVENT-20260815': 'NIA Cultural Celebration — 15 August 2026',
};

function friendlyEvent(eventId) {
  return EVENT_LABELS[eventId] || eventId;
}

// ── GET /api/admin/legacy-tickets — paid bookings only ────────────
async function list(req, res, next) {
  try {
    const { search, page = 1, limit = 25 } = req.query;
    const filter = { ticket_status: 'paid' };
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { ticketNumber: new RegExp(search, 'i') },
      ];
    }

    const [tickets, total, stats] = await Promise.all([
      Ticket.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(Number(limit)),
      Ticket.countDocuments(filter),
      Ticket.aggregate([
        { $match: { ticket_status: 'paid' } },
        { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$amount' }, seats: { $sum: { $sum: '$tickets.quantity' } } } },
      ]),
    ]);

    const items = tickets.map((t) => ({ ...t.toObject(), eventLabel: friendlyEvent(t.event_id) }));
    const summary = stats[0] || { count: 0, revenue: 0, seats: 0 };

    return res.json({
      items, total, page: Number(page), pages: Math.ceil(total / limit),
      summary: { paidCount: summary.count, revenue: summary.revenue, seats: summary.seats },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/legacy-tickets/:id ─────────────────────────────
async function getById(req, res, next) {
  try {
    const ticket = await Ticket.findById(req.params.id).select('-__v');
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    return res.json({ ...ticket.toObject(), eventLabel: friendlyEvent(ticket.event_id) });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/legacy-tickets/:id/pdf ─────────────────────────
async function downloadPdf(req, res, next) {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.ticket_status !== 'paid') return res.status(400).json({ error: 'Only paid tickets have a PDF' });

    // VIP batches are one Ticket doc covering a whole party — reuse the
    // multi-page pass PDF (one page per guest, from attendee_names) instead
    // of the standard single-page ticket layout.
    if (ticket.payment_provider === 'vip_complimentary') {
      const guestNames = (ticket.attendee_names || ticket.name).split('\n').filter(Boolean);
      const pdfBuffer = await generateVipPassBatchPDF(ticket, guestNames);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="NIA-VIP-Pass-${ticket.ticketNumber}.pdf"`);
      return res.send(pdfBuffer);
    }

    const pdfBuffer = await generateTicketPDF(ticket);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="NIA-Ticket-${ticket.ticketNumber}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/legacy-tickets/:id/qr ──────────────────────────
async function downloadQr(req, res, next) {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const qrDataUrl = await generateQRDataURL(ticket.ticketNumber);
    const qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="NIA-Ticket-${ticket.ticketNumber}-QR.png"`);
    return res.send(qrBuffer);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/legacy-tickets/:id/resend-email ───────────────
async function resendEmail(req, res, next) {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.ticket_status !== 'paid') return res.status(400).json({ error: 'Only paid tickets can be re-sent' });

    if (ticket.payment_provider === 'vip_complimentary') {
      const guestNames = (ticket.attendee_names || ticket.name).split('\n').filter(Boolean);
      const pdfBuffer = await generateVipPassBatchPDF(ticket, guestNames);
      await sendVipPassEmail(ticket, guestNames, pdfBuffer);
      return res.json({ message: `VIP Pass email re-sent to ${ticket.email}` });
    }

    await sendTicketConfirmation(ticket);
    return res.json({ message: `Ticket email re-sent to ${ticket.email}` });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/legacy-tickets/:id/refund ─────────────────────
async function refund(req, res, next) {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.ticket_status !== 'paid') return res.status(400).json({ error: 'Only paid tickets can be refunded' });

    const alreadyRefunded = ticket.refund_amount || 0;
    const remaining = Math.round((ticket.amount - alreadyRefunded) * 100) / 100;
    const requestedAmount = req.body?.amount !== undefined ? Number(req.body.amount) : remaining;

    if (!requestedAmount || isNaN(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({ error: 'Refund amount must be a positive number' });
    }
    if (requestedAmount > remaining) {
      return res.status(400).json({ error: `Refund amount cannot exceed the remaining refundable balance (€${remaining.toFixed(2)})` });
    }

    if (ticket.payment_provider === 'mollie' && ticket.mollie_payment_id) {
      try {
        await refundPayment(ticket.mollie_payment_id, requestedAmount);
      } catch (mollieErr) {
        console.error('[LegacyTicket] Mollie refund failed:', mollieErr.message);
        return res.status(502).json({ error: `Refund failed at Mollie: ${mollieErr.message}` });
      }
    }

    const isFullRefund = requestedAmount >= remaining;
    ticket.ticket_status = isFullRefund ? 'refunded' : ticket.ticket_status; // partial refunds keep the ticket valid
    ticket.refunded_at = new Date();
    ticket.refund_amount = alreadyRefunded + requestedAmount;
    await ticket.save();

    sendTicketRefundConfirmation(ticket).catch((err) => console.error('[LegacyTicket] Refund email failed:', err.message));

    return res.json({ ...ticket.toObject(), eventLabel: friendlyEvent(ticket.event_id) });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, downloadPdf, downloadQr, resendEmail, refund };
