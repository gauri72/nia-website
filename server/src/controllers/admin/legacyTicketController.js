const PDFDocument = require('pdfkit');
const Ticket = require('../../models/Ticket');
const { refundPayment } = require('../../services/mollieService');
const {
  generateTicketPDF, generateQRDataURL, sendTicketConfirmation, sendTicketRefundConfirmation, sendVipPassEmail,
  renderTicketConfirmationPreview, renderVipPassPreview,
} = require('../../services/emailService');
const { generateVipPassBatchPDF } = require('../../services/vipPassService');
const { EVENTS } = require('../../config/events');

// Read-only admin view onto the original public-site ticket flow (client/src/components/events/*,
// /api/tickets/create) — the legacy Ticket-based flow that predates the Event/Booking system built
// for the admin panel. Left as a separate collection/flow per the project's rule of never touching
// the 4 legacy payment models; this just gives the admin visibility into it. Label map derived from
// the shared event registry, so a new event added there shows up here automatically.
const EVENT_LABELS = Object.values(EVENTS).reduce((acc, e) => ({ ...acc, [e.eventId]: e.name }), {});

function friendlyEvent(eventId) {
  return EVENT_LABELS[eventId] || eventId;
}

// Friendly labels for ticket_type — covers both real purchase types and the
// Guest List categories (server/src/controllers/admin/guestListController.js),
// which are real Ticket docs too and already show up in this same list.
// Anything unmapped just gets title-cased rather than breaking.
const TYPE_LABELS = { regular: 'Regular', vip: 'VIP', child: 'Child', gala: 'Gala Experience', artist: 'Artist', invited_guest: 'Invited Guest', chief_guest: 'Chief Guest' };
function typeLabel(type) {
  return TYPE_LABELS[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Expands one Ticket order into its individual attendees, same duality the
// scan/roster/email code already handles: post-redesign orders have real
// units[] (one per seat, with its own name); older orders fall back to
// attendee_names (one name per line, matched positionally against each
// ticket line's quantity) or, failing that, just the buyer's name repeated
// per seat.
function flattenAttendees(ticket) {
  if (ticket.units?.length) {
    return ticket.units.map((u) => ({ type: u.ticketType, name: (u.attendeeName || ticket.name).trim() }));
  }
  const names = ticket.attendee_names
    ? ticket.attendee_names.split('\n').map((s) => s.trim()).filter(Boolean)
    : [];
  const rows = [];
  let i = 0;
  for (const line of ticket.tickets) {
    for (let q = 0; q < line.quantity; q++) {
      rows.push({ type: line.ticket_type, name: (names[i] || ticket.name).trim() });
      i++;
    }
  }
  return rows;
}

// ── GET /api/admin/legacy-tickets/door-list ────────────────────────
// Print-ready PDF for Registration Desk staff — every paid attendee,
// grouped by ticket category (alphabetical), alphabetical by name within
// each group. Explicit Y-position tracking throughout rather than relying
// on pdfkit's auto-flow cursor — the per-unit ticket PDF this codebase
// generates elsewhere hit a real pagination bug from mixing manual draws
// with implicit cursor movement, so this avoids that class of bug entirely.
async function doorList(req, res, next) {
  try {
    const { eventId, ticketType } = req.query;
    const filter = { ticket_status: 'paid' };
    if (eventId) filter.event_id = eventId;
    if (ticketType) filter['tickets.ticket_type'] = ticketType;

    const tickets = await Ticket.find(filter);
    let rows = tickets.flatMap(flattenAttendees);
    if (ticketType) rows = rows.filter((r) => r.type === ticketType); // a mixed order can carry other line types too

    const byType = new Map();
    for (const r of rows) {
      if (!byType.has(r.type)) byType.set(r.type, []);
      byType.get(r.type).push(r);
    }
    const categories = [...byType.keys()].sort((a, b) => typeLabel(a).localeCompare(typeLabel(b)));
    for (const cat of categories) byType.get(cat).sort((a, b) => a.name.localeCompare(b.name));

    const eventName = eventId ? friendlyEvent(eventId) : 'All Events';
    const titleSuffix = ticketType ? ` — ${typeLabel(ticketType)}` : '';

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    const filenameParts = ['NIA-Door-List', eventId || 'all-events', ticketType || null].filter(Boolean);
    res.setHeader('Content-Disposition', `attachment; filename="${filenameParts.join('-')}.pdf"`);
    doc.pipe(res);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const bottom = doc.page.height - doc.page.margins.bottom;

    doc.fillColor('#0F1F4B').fontSize(18).font('Helvetica-Bold').text(`Door List${titleSuffix}`, left, doc.y);
    doc.fontSize(11).font('Helvetica').fillColor('#555555').text(eventName, left, doc.y + 2);
    doc.fontSize(9).fillColor('#888888').text(
      `Generated ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/Amsterdam' })} · ${rows.length} attendee${rows.length === 1 ? '' : 's'} total`,
      left, doc.y + 2,
    );
    doc.y += 16;

    for (const cat of categories) {
      const list = byType.get(cat);

      if (doc.y > bottom - 90) doc.addPage();
      doc.y += 10;
      doc.fillColor('#E8641A').fontSize(14).font('Helvetica-Bold').text(`${typeLabel(cat)}  (${list.length})`, left, doc.y);
      const ruleY = doc.y + 4;
      doc.moveTo(left, ruleY).lineTo(right, ruleY).lineWidth(1).strokeColor('#E8641A').stroke();
      doc.y = ruleY + 10;

      const rowHeight = 18;
      for (const person of list) {
        if (doc.y + rowHeight > bottom) doc.addPage();
        const y = doc.y;
        doc.rect(left, y + 2, 9, 9).lineWidth(0.75).strokeColor('#999999').stroke();
        doc.font('Helvetica').fontSize(11).fillColor('#222222').text(person.name, left + 16, y, { width: right - left - 16 });
        doc.y = y + rowHeight;
      }
    }

    doc.end();
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/legacy-tickets — paid bookings only ────────────
async function list(req, res, next) {
  try {
    const { search, page = 1, limit = 25, eventId, ticketType } = req.query;
    const filter = { ticket_status: 'paid' };
    if (eventId) filter.event_id = eventId;
    if (ticketType) filter['tickets.ticket_type'] = ticketType;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { ticketNumber: new RegExp(search, 'i') },
      ];
    }

    // Type breakdown deliberately ignores `ticketType` itself (so every tile
    // stays visible to click, not just the currently-selected one) but does
    // respect the event filter, matching the summary stats below.
    const baseMatch = eventId ? { ticket_status: 'paid', event_id: eventId } : { ticket_status: 'paid' };

    const [tickets, total, stats, typeStats] = await Promise.all([
      Ticket.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(Number(limit)),
      Ticket.countDocuments(filter),
      Ticket.aggregate([
        { $match: baseMatch },
        { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$amount' }, seats: { $sum: { $sum: '$tickets.quantity' } } } },
      ]),
      Ticket.aggregate([
        { $match: baseMatch },
        { $unwind: '$tickets' },
        { $group: { _id: '$tickets.ticket_type', count: { $sum: '$tickets.quantity' } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const items = tickets.map((t) => ({ ...t.toObject(), eventLabel: friendlyEvent(t.event_id) }));
    const summary = stats[0] || { count: 0, revenue: 0, seats: 0 };
    const typeBreakdown = typeStats.map((t) => ({ type: t._id, label: typeLabel(t._id), count: t.count }));

    return res.json({
      items, total, page: Number(page), pages: Math.ceil(total / limit),
      summary: { paidCount: summary.count, revenue: summary.revenue, seats: summary.seats },
      typeBreakdown,
      events: EVENT_LABELS,
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
    // multi-page pass PDF (one page per guest, own QR per guest via
    // ticket.units) instead of the standard single-page ticket layout.
    if (ticket.payment_provider === 'vip_complimentary') {
      const pdfBuffer = await generateVipPassBatchPDF(ticket);
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
      const pdfBuffer = await generateVipPassBatchPDF(ticket);
      await sendVipPassEmail(ticket, guestNames, pdfBuffer);
      return res.json({ message: `VIP Pass email re-sent to ${ticket.email}` });
    }

    await sendTicketConfirmation(ticket);
    return res.json({ message: `Ticket email re-sent to ${ticket.email}` });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/legacy-tickets/:id/email-preview ────────────────
// Renders the exact email a guest would receive, without sending anything —
// lets an admin sanity-check names/QR/copy before or after the real send.
async function emailPreview(req, res, next) {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    if (ticket.payment_provider === 'vip_complimentary') {
      const guestNames = (ticket.attendee_names || ticket.name).split('\n').filter(Boolean);
      const { subject, html } = await renderVipPassPreview(ticket, guestNames);
      return res.json({ subject, html });
    }

    const { subject, html } = await renderTicketConfirmationPreview(ticket);
    return res.json({ subject, html });
  } catch (err) {
    next(err);
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── PATCH /api/admin/legacy-tickets/:id ────────────────────────────
// Buyer/attendee identity edits — lets an admin transfer a ticket to
// someone else who's actually attending instead of the original buyer.
// The QR code itself (unitNumber) never changes, only who it belongs to.
async function updateTicket(req, res, next) {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const { name, email, phone, unitAttendeeNames, attendeeNames, resend } = req.body || {};

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ error: 'name cannot be empty' });
      ticket.name = name.trim();
    }
    if (email !== undefined) {
      if (!EMAIL_RE.test(email.trim())) return res.status(400).json({ error: 'Please provide a valid email address' });
      ticket.email = email.trim().toLowerCase();
    }
    if (phone !== undefined) ticket.phone = phone.trim();

    // units[] is the real per-seat field once it exists (PDF + check-in both
    // read it) — attendee_names is only authoritative for pre-redesign orders
    // that never got one, but kept in sync either way for display/back-compat.
    if (ticket.units?.length && unitAttendeeNames) {
      for (const u of ticket.units) {
        if (unitAttendeeNames[u.unitNumber] !== undefined) u.attendeeName = unitAttendeeNames[u.unitNumber].trim();
      }
      ticket.attendee_names = ticket.units.map((u) => u.attendeeName || ticket.name).join('\n');
    } else if (attendeeNames !== undefined) {
      ticket.attendee_names = attendeeNames;
    }

    await ticket.save();

    // The edit itself has already been saved at this point — a resend that
    // can't happen (wrong status) shouldn't make the whole request look
    // failed, or the caller may assume nothing was saved and retry. Report
    // it as a non-fatal `resendError` alongside the successfully-saved ticket.
    let emailResent = false;
    let resendError;
    if (resend) {
      if (ticket.ticket_status !== 'paid') {
        resendError = 'Only paid tickets can be re-sent';
      } else if (ticket.payment_provider === 'vip_complimentary') {
        const guestNames = (ticket.attendee_names || ticket.name).split('\n').filter(Boolean);
        const pdfBuffer = await generateVipPassBatchPDF(ticket);
        await sendVipPassEmail(ticket, guestNames, pdfBuffer);
        emailResent = true;
      } else {
        await sendTicketConfirmation(ticket);
        emailResent = true;
      }
    }

    return res.json({ ...ticket.toObject(), eventLabel: friendlyEvent(ticket.event_id), emailResent, resendError });
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

// ── POST /api/admin/legacy-tickets/:id/void ────────────────────────
// Invalidates a ticket without a Mollie refund — for issuing errors,
// duplicates, or fraud, where no money needs to move. A voided ticket
// immediately fails scanController's status==='paid' gate at the door,
// same as a refunded one, with no scan-side changes needed.
async function voidTicket(req, res, next) {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.ticket_status !== 'paid') {
      return res.status(400).json({ error: `Ticket is already "${ticket.ticket_status}" — only paid tickets can be voided` });
    }

    ticket.ticket_status = 'voided';
    ticket.voided_at = new Date();
    ticket.void_reason = req.body?.reason?.trim() || undefined;
    ticket.voidedBy = req.admin.id;
    await ticket.save();

    return res.json({ ...ticket.toObject(), eventLabel: friendlyEvent(ticket.event_id) });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, downloadPdf, downloadQr, resendEmail, emailPreview, updateTicket, refund, voidTicket, doorList };
