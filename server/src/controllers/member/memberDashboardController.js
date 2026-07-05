const Member = require('../../models/Member');
const Booking = require('../../models/Booking');

// ── GET /api/member/dashboard ─────────────────────────────────────
async function overview(req, res, next) {
  try {
    const member = await Member.findById(req.member.id).populate('membershipTier');

    const upcomingBookings = await Booking.find({
      member: req.member.id,
      status: 'paid',
    }).populate({ path: 'event', match: { startDate: { $gte: new Date() } } }).sort('createdAt');

    const filtered = upcomingBookings.filter((b) => b.event);

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
