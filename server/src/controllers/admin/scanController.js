const Ticket = require('../../models/Ticket');
const Member = require('../../models/Member');
const EventCheckIn = require('../../models/EventCheckIn');

// Ticket/booking/member IDs all use distinct prefixes (NIA-TKT-, NIA-BKG-,
// NIA-MBR-), so a single scan input can resolve to the right collection
// without the scanner needing to know in advance what kind of code it is.
function normalizeCode(raw) {
  return (raw || '').trim().toUpperCase();
}

async function resolveCode(code) {
  const normalized = normalizeCode(code);
  if (normalized.startsWith('NIA-TKT-')) {
    return { type: 'ticket', record: await Ticket.findOne({ ticketNumber: normalized }) };
  }
  if (normalized.startsWith('NIA-MBR-')) {
    return { type: 'member', record: await Member.findOne({ memberId: normalized }).populate('membershipTier') };
  }
  return { type: null, record: null };
}

function ticketSummary(ticket) {
  return {
    id: ticket._id,
    ticketNumber: ticket.ticketNumber,
    name: ticket.name,
    email: ticket.email,
    phone: ticket.phone,
    attendeeNames: ticket.attendee_names,
    lines: ticket.tickets,
    status: ticket.ticket_status,
    checkedInAt: ticket.checkedInAt,
  };
}

function memberSummary(member) {
  return {
    id: member._id,
    memberId: member.memberId,
    name: `${member.firstName} ${member.lastName}`,
    email: member.email,
    phone: member.phone,
    membershipStatus: member.membershipStatus,
    membershipTier: member.membershipTier?.name,
    membershipExpiresAt: member.membershipExpiresAt,
    accountStatus: member.status,
  };
}

// ── POST /api/admin/scan/lookup ─────────────────────────────────────
// Read-only preview of what a check-in would do — lets the UI show a
// confirm screen before actually recording anything.
async function lookup(req, res, next) {
  try {
    const { code } = req.body;
    if (!code?.trim()) return res.status(400).json({ error: 'code is required' });

    const { type, record } = await resolveCode(code);
    if (!type) return res.status(404).json({ error: `Unrecognized code format: "${code.trim()}"` });
    if (!record) return res.status(404).json({ error: `No ${type} found for code "${normalizeCode(code)}"` });

    if (type === 'ticket') {
      if (record.ticket_status !== 'paid') {
        return res.json({ type, valid: false, reason: `Ticket status is "${record.ticket_status}", not paid`, data: ticketSummary(record) });
      }
      return res.json({ type, valid: true, alreadyCheckedIn: !!record.checkedInAt, data: ticketSummary(record) });
    }

    // A member is "valid" if the account itself is usable (active, not
    // suspended/deleted) — membershipStatus (active/none/expired/...) is
    // shown but isn't a hard gate, since e.g. a 'none' member is still a
    // legitimate account holder who should be waved through at the door.
    const valid = record.status === 'active';
    return res.json({ type, valid, reason: valid ? undefined : `Account status is "${record.status}"`, data: memberSummary(record) });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/scan/check-in ───────────────────────────────────
// Records the scan. Tickets are idempotent — a second scan reports
// alreadyCheckedIn instead of erroring, and instead of re-logging or
// overwriting the original check-in time. Members aren't blocked from
// repeat scans since verifying identity twice isn't a problem the way
// redeeming a ticket twice is.
async function checkIn(req, res, next) {
  try {
    const { code } = req.body;
    if (!code?.trim()) return res.status(400).json({ error: 'code is required' });

    const { type, record } = await resolveCode(code);
    if (!type) return res.status(404).json({ error: `Unrecognized code format: "${code.trim()}"` });
    if (!record) return res.status(404).json({ error: `No ${type} found for code "${normalizeCode(code)}"` });

    if (type === 'ticket') {
      if (record.ticket_status !== 'paid') {
        return res.status(400).json({ error: `Ticket status is "${record.ticket_status}", not paid — cannot check in`, data: ticketSummary(record) });
      }

      const wasAlreadyCheckedIn = !!record.checkedInAt;
      if (!wasAlreadyCheckedIn) {
        record.checkedInAt = new Date();
        record.checkedInBy = req.admin.id;
        await record.save();
        await EventCheckIn.create({
          type: 'ticket', ticket: record._id, code: record.ticketNumber,
          name: record.name, email: record.email, scannedBy: req.admin.id,
        });
      }
      return res.json({ type, checkedIn: true, alreadyCheckedIn: wasAlreadyCheckedIn, data: ticketSummary(record) });
    }

    if (record.status !== 'active') {
      return res.status(400).json({ error: `Account status is "${record.status}"`, data: memberSummary(record) });
    }
    await EventCheckIn.create({
      type: 'member', member: record._id, code: record.memberId,
      name: `${record.firstName} ${record.lastName}`, email: record.email, scannedBy: req.admin.id,
    });
    return res.json({ type, checkedIn: true, alreadyCheckedIn: false, data: memberSummary(record) });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/scan/log ──────────────────────────────────────────
async function log(req, res, next) {
  try {
    const { limit = 25 } = req.query;
    const entries = await EventCheckIn.find()
      .sort('-scannedAt')
      .limit(Math.min(100, Number(limit) || 25))
      .populate('scannedBy', 'firstName lastName');
    return res.json(entries);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/scan/stats ────────────────────────────────────────
async function stats(req, res, next) {
  try {
    const [ticketStats, memberScans] = await Promise.all([
      Ticket.aggregate([
        { $match: { ticket_status: 'paid' } },
        {
          $group: {
            _id: null,
            totalTickets: { $sum: { $sum: '$tickets.quantity' } },
            totalOrders: { $sum: 1 },
            // $ne against a genuinely-missing field (most tickets, predating this
            // feature) evaluates true in aggregation expressions — $ifNull first
            // normalizes missing/null to a falsy value so this actually counts
            // only tickets that have really been checked in.
            checkedInOrders: { $sum: { $cond: [{ $ifNull: ['$checkedInAt', false] }, 1, 0] } },
          },
        },
      ]),
      EventCheckIn.countDocuments({ type: 'member' }),
    ]);
    const t = ticketStats[0] || { totalTickets: 0, totalOrders: 0, checkedInOrders: 0 };
    return res.json({
      totalOrders: t.totalOrders,
      checkedInOrders: t.checkedInOrders,
      totalTickets: t.totalTickets,
      memberScans,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { lookup, checkIn, log, stats };
