const Ticket = require('../../models/Ticket');
const Member = require('../../models/Member');
const MembershipTier = require('../../models/MembershipTier');
const EventCheckIn = require('../../models/EventCheckIn');

// Same tier-identification pattern as memberAdminController.js's Patron Pass
// gate — Patron isn't a dedicated boolean, just a tier name/slug.
function isPatronTier(member) {
  return member.membershipTier?.slug === 'patron' || member.membershipTier?.name?.toLowerCase() === 'patron';
}

// A Patron membership covers 2 people — one Member ID scan admits both, so
// headcount reporting (stats + roster) multiplies by this rather than
// counting Patron accounts. Deliberately a single scan/check-in action per
// couple (not 2 separate tickets) — one source of truth for whether they've
// arrived, instead of two parallel check-in paths for the same people.
const PATRON_HEADCOUNT = 2;

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

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    // suspended/deleted) AND their tier is Patron — this door-scan path is
    // specifically for Patron members' free entry (everyone else already
    // has a real ticket to check in instead). membershipStatus
    // (active/none/expired/...) is shown but isn't a hard gate on its own.
    let reason;
    if (record.status !== 'active') reason = `Account status is "${record.status}"`;
    else if (!isPatronTier(record)) reason = "This member's tier doesn't include free event entry — check in their ticket instead.";
    const valid = !reason;
    return res.json({ type, valid, reason, data: memberSummary(record) });
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
    if (!isPatronTier(record)) {
      return res.status(400).json({ error: "This member's tier doesn't include free event entry — check in their ticket instead.", data: memberSummary(record) });
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

// ── POST /api/admin/scan/undo ────────────────────────────────────────
// Deliberately a separate endpoint from check-in, not a toggle — check-in
// must stay idempotent/one-way for the camera-scan flow (a stray re-scan
// must never silently un-admit someone). This is only ever reached
// explicitly from the roster view, never from scanning.
async function undoCheckIn(req, res, next) {
  try {
    const { code } = req.body;
    if (!code?.trim()) return res.status(400).json({ error: 'code is required' });

    const { type, record, unit } = await resolveCode(code);
    if (!type) return res.status(404).json({ error: `Unrecognized code format: "${code.trim()}"` });
    if (!record) return res.status(404).json({ error: `No ${type} found for code "${normalizeCode(code)}"` });

    if (type === 'ticket') {
      if (unit) {
        // Clearing order-level checkedInAt unconditionally is safe even if it
        // was never stamped (only set once every unit was checked in) — undoing
        // one unit means the order is no longer fully redeemed either way.
        await Ticket.updateOne(
          { _id: record._id, 'units.unitNumber': unit.unitNumber },
          { $set: { 'units.$.checkedInAt': null, 'units.$.checkedInBy': null }, $unset: { checkedInAt: '', checkedInBy: '' } },
        );
        await EventCheckIn.deleteOne({ ticket: record._id, code: unit.unitNumber });
      } else if (record.units?.length) {
        // Bare order code — undo the whole order, mirroring check-in's own bulk-admit behavior for the same code shape.
        await Ticket.updateOne(
          { _id: record._id },
          { $set: { 'units.$[].checkedInAt': null, 'units.$[].checkedInBy': null }, $unset: { checkedInAt: '', checkedInBy: '' } },
        );
        await EventCheckIn.deleteMany({ ticket: record._id });
      } else {
        // True legacy doc, no units at all.
        await Ticket.updateOne({ _id: record._id }, { $unset: { checkedInAt: '', checkedInBy: '' } });
        await EventCheckIn.deleteOne({ ticket: record._id, code: record.ticketNumber });
      }
      const fresh = await Ticket.findById(record._id);
      const freshUnit = unit ? fresh.units.find((u) => u.unitNumber === unit.unitNumber) : null;
      return res.json({ type, checkedIn: false, data: ticketSummary(fresh, freshUnit) });
    }

    // Member scans aren't idempotent (a member can have multiple EventCheckIn
    // rows) — undo clears all of them so the roster shows fully not-checked-in.
    await EventCheckIn.deleteMany({ type: 'member', member: record._id });
    return res.json({ type, checkedIn: false, data: memberSummary(record) });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/scan/roster?type= ─────────────────────────────────
// Backs the clickable stat tiles — a flat list of who's in each bucket,
// checked-in status included, so the UI can split into "Checked In" /
// "Not Yet Checked In" sections. Each row's `code` feeds straight into
// the existing check-in endpoint and the new undo endpoint above.
const ROSTER_TYPES = ['attendees', 'patrons', 'artist', 'invited_guest', 'chief_guest'];
async function roster(req, res, next) {
  try {
    const { type } = req.query;
    if (!ROSTER_TYPES.includes(type)) return res.status(400).json({ error: `type must be one of: ${ROSTER_TYPES.join(', ')}` });

    if (type === 'patrons') {
      const patronTier = await MembershipTier.findOne({ $or: [{ slug: 'patron' }, { name: /^patron$/i }] });
      if (!patronTier) return res.json([]);
      const members = await Member.find({ status: 'active', membershipTier: patronTier._id }).sort('firstName');
      const checkIns = await EventCheckIn.find({ type: 'member', member: { $in: members.map((m) => m._id) } }).sort('-scannedAt');
      const checkedInAt = new Map();
      for (const c of checkIns) {
        const key = String(c.member);
        if (!checkedInAt.has(key)) checkedInAt.set(key, c.scannedAt); // first hit per member = most recent, since sorted desc
      }
      // Each row is one Patron account, but represents PATRON_HEADCOUNT
      // people admitted together on that one scan — flagged here so the
      // roster UI can label it, even though the row itself isn't duplicated.
      return res.json(members.map((m) => ({
        code: m.memberId, name: `${m.firstName} ${m.lastName}`, subtitle: `${m.email} · ${PATRON_HEADCOUNT} people`,
        checkedInAt: checkedInAt.get(String(m._id)) || null,
        headcount: PATRON_HEADCOUNT,
      })));
    }

    if (type === 'attendees') {
      const tickets = await Ticket.find({ ticket_status: 'paid', payment_provider: { $ne: 'guest_list_complimentary' } });
      const rows = [];
      for (const t of tickets) {
        if (t.units?.length) {
          for (const u of t.units) {
            rows.push({ code: u.unitNumber, name: u.attendeeName || t.name, subtitle: u.ticketType, checkedInAt: u.checkedInAt || null });
          }
        } else {
          rows.push({ code: t.ticketNumber, name: t.name, subtitle: t.tickets?.[0]?.ticket_type, checkedInAt: t.checkedInAt || null });
        }
      }
      rows.sort((a, b) => a.name.localeCompare(b.name));
      return res.json(rows);
    }

    // Guest-list categories (artist / invited_guest / chief_guest).
    const guests = await Ticket.find({ payment_provider: 'guest_list_complimentary', 'tickets.0.ticket_type': type }).sort('name');
    return res.json(guests.map((g) => ({
      code: g.ticketNumber, name: g.name,
      subtitle: g.email?.endsWith('@nia.internal') ? undefined : g.email,
      checkedInAt: g.checkedInAt || null,
    })));
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/scan/search?q= ────────────────────────────────────
// Name-lookup fallback for when a QR won't scan or a guest has no phone
// handy — matches buyer/attendee names & emails, and member names/email.
// Each hit resolves to the same `code` a scan would produce, so tapping a
// result just feeds straight into the existing lookup/check-in flow.
async function search(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json([]);

    const re = new RegExp(escapeRegex(q), 'i');
    const results = [];

    const tickets = await Ticket.find({
      ticket_status: 'paid',
      $or: [{ name: re }, { email: re }, { 'units.attendeeName': re }],
    }).limit(20);

    for (const t of tickets) {
      if (t.units?.length) {
        for (const u of t.units) {
          const label = u.attendeeName || t.name;
          if (re.test(label) || re.test(t.name) || re.test(t.email)) {
            results.push({
              code: u.unitNumber, type: 'ticket', name: label,
              subtitle: `${t.email} · ${u.ticketType}`, alreadyCheckedIn: !!u.checkedInAt,
            });
          }
        }
      } else {
        results.push({
          code: t.ticketNumber, type: 'ticket', name: t.name,
          subtitle: t.email, alreadyCheckedIn: !!t.checkedInAt,
        });
      }
    }

    const members = await Member.find({
      status: 'active',
      $or: [{ firstName: re }, { lastName: re }, { email: re }],
    }).limit(10);
    for (const m of members) {
      results.push({
        code: m.memberId, type: 'member', name: `${m.firstName} ${m.lastName}`,
        subtitle: m.email, alreadyCheckedIn: false,
      });
    }

    return res.json(results.slice(0, 25));
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
    const [ticketStats, patronStats, guestListStats] = await Promise.all([
      Ticket.aggregate([
        // Guest-list entries (artists/invited/chief guests) are real Ticket
        // docs too, but they get their own breakdown below — excluded here
        // so nobody is counted in two tiles at once.
        { $match: { ticket_status: 'paid', payment_provider: { $ne: 'guest_list_complimentary' } } },
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
      // Patron pool size + how many have been scanned in, in PEOPLE (not
      // accounts) — each Patron membership is 2 people admitted by one scan.
      (async () => {
        const patronTier = await MembershipTier.findOne({ $or: [{ slug: 'patron' }, { name: /^patron$/i }] });
        if (!patronTier) return { total: 0, checkedIn: 0 };
        const memberIds = await Member.find({ status: 'active', membershipTier: patronTier._id }).distinct('_id');
        const checkedInIds = await EventCheckIn.distinct('member', { type: 'member', member: { $in: memberIds } });
        return { total: memberIds.length * PATRON_HEADCOUNT, checkedIn: checkedInIds.length * PATRON_HEADCOUNT };
      })(),
      Ticket.aggregate([
        { $match: { payment_provider: 'guest_list_complimentary' } },
        {
          $group: {
            _id: { $arrayElemAt: ['$tickets.ticket_type', 0] },
            total: { $sum: 1 },
            checkedIn: { $sum: { $cond: [{ $ifNull: ['$checkedInAt', false] }, 1, 0] } },
          },
        },
      ]),
    ]);
    const t = ticketStats[0] || { totalTickets: 0, totalOrders: 0, checkedInOrders: 0, checkedInTickets: 0 };
    const guestList = { artist: { total: 0, checkedIn: 0 }, invited_guest: { total: 0, checkedIn: 0 }, chief_guest: { total: 0, checkedIn: 0 } };
    for (const g of guestListStats) {
      if (guestList[g._id]) guestList[g._id] = { total: g.total, checkedIn: g.checkedIn };
    }
    return res.json({
      totalOrders: t.totalOrders,
      checkedInOrders: t.checkedInOrders,
      totalTickets: t.totalTickets,
      checkedInTickets: t.checkedInTickets,
      patrons: patronStats,
      guestList,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { lookup, checkIn, undoCheckIn, roster, search, log, stats };
