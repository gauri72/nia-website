const Ticket = require('../../models/Ticket');
const { EVENT_ID } = require('../ticketController');
const { sendVipPassEmail } = require('../../services/emailService');
const { generateVipPassBatchPDF } = require('../../services/vipPassService');

const MAX_QUANTITY = 50;

// ── POST /api/admin/vip-passes ─────────────────────────────────────
// Issues a batch of complimentary VIP passes as one real Ticket document
// (zero-priced, payment_provider: 'vip_complimentary') — the whole party
// shares one QR/check-in, matching sponsorshipAdminController's existing
// complimentary-ticket precedent. guestNames go on individual pages of one
// consolidated PDF, which is emailed immediately and also returned so the
// admin panel can offer an instant download without waiting on email.
async function create(req, res, next) {
  try {
    const { name, email, quantity, guestNames } = req.body;

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'name and email are required' });
    }
    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1 || qty > MAX_QUANTITY) {
      return res.status(400).json({ error: `quantity must be between 1 and ${MAX_QUANTITY}` });
    }
    if (!Array.isArray(guestNames) || guestNames.length !== qty || guestNames.some((n) => !n?.trim())) {
      return res.status(400).json({ error: `guestNames must list exactly ${qty} non-empty name${qty === 1 ? '' : 's'}` });
    }
    const trimmedNames = guestNames.map((n) => n.trim());

    const ticket = await Ticket.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      tickets: [{ ticket_type: 'vip', quantity: qty, unit_price: 0, line_total: 0 }],
      attendee_names: trimmedNames.join('\n'),
      event_id: EVENT_ID,
      subtotal: 0,
      amount: 0,
      ticket_status: 'paid',
      payment_provider: 'vip_complimentary',
      mollie_payment_id: 'VIP-COMPLIMENTARY',
      paid_at: new Date(),
    });

    const pdfBuffer = await generateVipPassBatchPDF(ticket, trimmedNames);
    await sendVipPassEmail(ticket, trimmedNames, pdfBuffer);

    return res.status(201).json({
      message: `${qty} VIP pass${qty === 1 ? '' : 'es'} sent to ${ticket.email}.`,
      ticket,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { create };
