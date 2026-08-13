const Ticket = require('../../models/Ticket');
const Member = require('../../models/Member');
const EventCheckIn = require('../../models/EventCheckIn');

// Ticket/booking/member IDs all use distinct prefixes (NIA-TKT-, NIA-BKG-,
// NIA-MBR-), so a single scan input can resolve to the right collection
// without the scanner needing to know in advance what kind of code it is.
function normalizeCode(raw) {
  return (raw || '').trim().toUpperCase();
}

// Two permanently valid shapes for a ticket code:
//   - a specific unit (NIA-TKT-XXXXXXXX-N) — checks in just that attendee.
//   - the bare order number (NIA-TKT-XXXXXXXX, the original/legacy QR still
//     printed on every order's own PDF/email) — resolves to the whole order
//     for a bulk check-in of whatever units remain, preserving the original
//     one-scan-admits-everyone behavior for anyone still holding that code.
// `unit` is non-null only when a specific unit code was matched.
async function resolveCode(code) {
  const normalized = normalizeCode(code);
  if (normalized.startsWith('NIA-TKT-')) {
    const byUnit = await Ticket.findOne({ 'units.unitNumber': normalized });
    if (byUnit) {
      const unit = byUnit.units.find((u) => u.unitNumber === normalized);
      return { type: 'ticket', record: byUnit, unit };
    }
    const byOrder = await Ticket.findOne({ ticketNumber: normalized });
    return { type: 'ticket', record: byOrder, unit: null };
  }
  if (normalized.startsWith('NIA-MBR-')) {
    return { type: 'member', record: await Member.findOne({ memberId: normalized }).populate('membershipTier') };
  }
  return { type: null, record: null };
}

function ticketSummary(ticket, unit) {
  const units = ticket.units || [];
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
    // The specific unit that was scanned — absent when the bare order code
    // was used instead (a bulk/legacy scan, not tied to one attendee).
    scannedUnit: unit
      ? { unitNumber: unit.unitNumber, ticketType: unit.ticketType, attendeeName: unit.attendeeName, checkedInAt: unit.checkedInAt }
      : null,
    units: units.map((u) => ({ unitNumber: u.unitNumber, ticketType: u.ticketType, attendeeName: u.attendeeName, checkedInAt: u.checkedInAt })),
    unitsTotal: units.length || null,
    unitsCheckedIn: units.length ? units.filter((u) => u.checkedInAt).length : null,
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

    const { type, record, unit } = await resolveCode(code);
    if (!type) return res.status(404).json({ error: `Unrecognized code format: "${code.trim()}"` });
    if (!record) return res.status(404).json({ error: `No ${type} found for code "${normalizeCode(code)}"` });

    if (type === 'ticket') {
      if (record.ticket_status !== 'paid') {
        return res.json({ type, valid: false, reason: `Ticket status is "${record.ticket_status}", not paid`, data: ticketSummary(record, unit) });
      }
      const alreadyCheckedIn = unit
        ? !!unit.checkedInAt
        : record.units?.length
          ? record.units.every((u) => u.checkedInAt) // bare order code: nothing left to check in
          : !!record.checkedInAt; // true legacy doc, no units at all
      return res.json({ type, valid: true, alreadyCheckedIn, data: ticketSummary(record, unit) });
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

// Atomically admits one unit — `null`-guarded on checkedInAt so concurrent
// scans of different units on the same order (multiple doors, busy entry)
// never lose an update or need a manual read-check. Also logs the audit
// entry and, once every unit in the order is redeemed, stamps the
// order-level checkedInAt/checkedInBy so legacy "checkedInOrders" reporting
// still means something ("fully redeemed", not just "first attendee in").
async function checkInSingleUnit(ticket, unitNumber, adminId) {
  const now = new Date();
  // $elemMatch (not two separate 'units.x'/'units.y' clauses) is required
  // here — plain dotted-path conditions on an array can each be satisfied by
  // a *different* element, so without it a re-scan of an already-checked-in
  // unit would still match (and re-stamp) as long as some other unit in the
  // same order was still unchecked.
  const updated = await Ticket.findOneAndUpdate(
    { _id: ticket._id, units: { $elemMatch: { unitNumber, checkedInAt: null } } },
    { $set: { 'units.$.checkedInAt': now, 'units.$.checkedInBy': adminId } },
    { new: true },
  );
  if (!updated) return { admitted: false, record: ticket };

  const u = updated.units.find((x) => x.unitNumber === unitNumber);
  await EventCheckIn.create({
    type: 'ticket', ticket: ticket._id, code: unitNumber,
    name: u.attendeeName || ticket.name, email: ticket.email, scannedBy: adminId,
  });

  if (updated.units.every((x) => x.checkedInAt) && !updated.checkedInAt) {
    await Ticket.findByIdAndUpdate(updated._id, { checkedInAt: now, checkedInBy: adminId });
    updated.checkedInAt = now;
    updated.checkedInBy = adminId;
  }
  return { admitted: true, record: updated };
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

    const { type, record, unit } = await resolveCode(code);
    if (!type) return res.status(404).json({ error: `Unrecognized code format: "${code.trim()}"` });
    if (!record) return res.status(404).json({ error: `No ${type} found for code "${normalizeCode(code)}"` });

    if (type === 'ticket') {
      if (record.ticket_status !== 'paid') {
        return res.status(400).json({ error: `Ticket status is "${record.ticket_status}", not paid — cannot check in`, data: ticketSummary(record, unit) });
      }

      if (unit) {
        const { admitted, record: finalRecord } = await checkInSingleUnit(record, unit.unitNumber, req.admin.id);
        const finalUnit = finalRecord.units.find((u) => u.unitNumber === unit.unitNumber);
        return res.json({ type, checkedIn: true, alreadyCheckedIn: !admitted, data: ticketSummary(finalRecord, finalUnit) });
      }

      if (record.units?.length) {
        // Bare order-level code — bulk-admit whatever units remain.
        let admittedCount = 0;
        let finalRecord = record;
        for (const u of record.units) {
          if (u.checkedInAt) continue;
          const result = await checkInSingleUnit(finalRecord, u.unitNumber, req.admin.id);
          if (result.admitted) { admittedCount += 1; finalRecord = result.record; }
        }
        return res.json({ type, checkedIn: true, alreadyCheckedIn: admittedCount === 0, data: ticketSummary(finalRecord, null) });
      }

      // True legacy doc — no units at all, original single-boolean behavior.
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
      return res.json({ type, checkedIn: true, alreadyCheckedIn: wasAlreadyCheckedIn, data: ticketSummary(record, null) });
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
          $project: {
            ticketsQty: { $sum: '$tickets.quantity' },
            hasUnits: { $gt: [{ $size: { $ifNull: ['$units', []] } }, 0] },
            // $ifNull (not $ne against '$$this.checkedInAt' directly) — a unit
            // that's never been checked in has the field genuinely missing, and
            // a missing field is NOT '$ne' to null in aggregation expressions,
            // which would otherwise count every never-checked-in unit as checked in.
            checkedInUnitsCount: {
              $size: { $filter: { input: { $ifNull: ['$units', []] }, cond: { $ifNull: ['$$this.checkedInAt', false] } } },
            },
            // $ne against a genuinely-missing field (docs predating this
            // feature) evaluates true in aggregation expressions — $ifNull
            // first normalizes missing/null to a falsy value.
            legacyCheckedIn: { $cond: [{ $ifNull: ['$checkedInAt', false] }, 1, 0] },
          },
        },
        {
          $project: {
            ticketsQty: 1,
            // Attendee-level check-in count: per-unit for new orders,
            // all-or-nothing (full order quantity) for legacy ones.
            checkedInForDoc: { $cond: ['$hasUnits', '$checkedInUnitsCount', { $multiply: ['$legacyCheckedIn', '$ticketsQty'] }] },
            isFullyCheckedIn: { $cond: ['$hasUnits', { $eq: ['$checkedInUnitsCount', '$ticketsQty'] }, { $eq: ['$legacyCheckedIn', 1] }] },
          },
        },
        {
          $group: {
            _id: null,
            totalTickets: { $sum: '$ticketsQty' },
            totalOrders: { $sum: 1 },
            checkedInTickets: { $sum: '$checkedInForDoc' },
            checkedInOrders: { $sum: { $cond: ['$isFullyCheckedIn', 1, 0] } },
          },
        },
      ]),
      EventCheckIn.countDocuments({ type: 'member' }),
    ]);
    const t = ticketStats[0] || { totalTickets: 0, totalOrders: 0, checkedInOrders: 0, checkedInTickets: 0 };
    return res.json({
      totalOrders: t.totalOrders,
      checkedInOrders: t.checkedInOrders,
      totalTickets: t.totalTickets,
      checkedInTickets: t.checkedInTickets,
      memberScans,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { lookup, checkIn, log, stats };
