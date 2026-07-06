const Member = require('../../models/Member');
const Booking = require('../../models/Booking');
const Ticket = require('../../models/Ticket');
const { getLegacyEventDisplay } = require('./memberBookingController');

// ── GET /api/member/dashboard ─────────────────────────────────────
async function overview(req, res, next) {
  try {
    const member = await Member.findById(req.member.id).populate('membershipTier');

    const upcomingBookings = await Booking.find({
      member: req.member.id,
      status: 'paid',
    }).populate({ path: 'event', match: { startDate: { $gte: new Date() } } }).sort('createdAt');

    const filtered = upcomingBookings.filter((b) => b.event);

    // Legacy guest-checkout tickets (email-matched, not member-linked) count
    // toward "upcoming events" too — see memberBookingController.js's listMine
    // for why this second, separate ticket system exists.
    const legacyEvent = await getLegacyEventDisplay();
    if (legacyEvent && new Date(legacyEvent.startDate) >= new Date()) {
      const legacyCount = await Ticket.countDocuments({ email: member.email, ticket_status: 'paid' });
      if (legacyCount > 0) filtered.push({ _id: 'legacy-event', event: legacyEvent });
    }

    return res.json({
      member: {
        firstName: member.firstName, lastName: member.lastName,
        membershipTier: member.membershipTier, membershipStatus: member.membershipStatus,
        membershipExpiresAt: member.membershipExpiresAt,
      },
      upcomingBookings: filtered,
      announcements: [], // Content Management / announcements land in a later milestone
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { overview };
