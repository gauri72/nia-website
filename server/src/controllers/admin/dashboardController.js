const Member = require('../../models/Member');
const Event = require('../../models/Event');
const Booking = require('../../models/Booking');
const MembershipPayment = require('../../models/MembershipPayment');
const Membership = require('../../models/Membership');
const Ticket = require('../../models/Ticket');
const Donation = require('../../models/Donation');
const Sponsorship = require('../../models/Sponsorship');

async function sumPaid(Model, field, statusField, statusValue) {
  const result = await Model.aggregate([
    { $match: { [statusField]: statusValue } },
    { $group: { _id: null, total: { $sum: `$${field}` } } },
  ]);
  return result[0]?.total || 0;
}

// ── GET /api/admin/dashboard ───────────────────────────────────────
async function overview(req, res, next) {
  try {
    const [totalMembers, activeMemberships, upcomingEventsCount] = await Promise.all([
      Member.countDocuments({ status: { $ne: 'deleted' } }),
      Member.countDocuments({ membershipStatus: 'active' }),
      Event.countDocuments({ status: 'published', startDate: { $gte: new Date() } }),
    ]);

    const paidBookings = await Booking.find({ status: 'paid' }).select('amount lines paid_at');
    const ticketsSold = paidBookings.reduce((sum, b) => sum + b.lines.reduce((s, l) => s + l.quantity, 0), 0);
    const legacyTickets = await Ticket.find({ ticket_status: 'paid' }).select('tickets');
    const legacyTicketsSold = legacyTickets.reduce((sum, t) => sum + t.tickets.reduce((s, l) => s + l.quantity, 0), 0);

    const [bookingRevenue, membershipPaymentRevenue, legacyMembershipRevenue, legacyTicketRevenue, donationRevenue, sponsorshipRevenue] = await Promise.all([
      sumPaid(Booking, 'amount', 'status', 'paid'),
      sumPaid(MembershipPayment, 'amount', 'status', 'paid'),
      sumPaid(Membership, 'amount', 'status', 'paid'),
      sumPaid(Ticket, 'amount', 'ticket_status', 'paid'),
      sumPaid(Donation, 'amount', 'donation_status', 'paid'),
      sumPaid(Sponsorship, 'amount', 'status', 'paid'),
    ]);
    const totalRevenue = bookingRevenue + membershipPaymentRevenue + legacyMembershipRevenue + legacyTicketRevenue + donationRevenue + sponsorshipRevenue;

    const recentBookings = await Booking.find({ status: 'paid' })
      .populate('member', 'firstName lastName').populate('event', 'title')
      .sort('-paid_at').limit(5);

    const upcomingEvents = await Event.find({ status: 'published', startDate: { $gte: new Date() } })
      .sort('startDate').limit(5);

    // Revenue chart: last 6 months of ticket (Booking) + membership (MembershipPayment) revenue
    const paidMemberships = await MembershipPayment.find({ status: 'paid' }).select('amount paid_at');
    const monthBuckets = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthBuckets.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('en-US', { month: 'short' }), amount: 0 });
    }
    const addToBucket = (date, amount) => {
      const d = new Date(date);
      const bucket = monthBuckets.find((b) => b.year === d.getFullYear() && b.month === d.getMonth());
      if (bucket) bucket.amount += amount;
    };
    paidBookings.forEach((b) => b.paid_at && addToBucket(b.paid_at, b.amount));
    paidMemberships.forEach((m) => m.paid_at && addToBucket(m.paid_at, m.amount));

    return res.json({
      totalMembers, activeMemberships, upcomingEventsCount,
      ticketsSold: ticketsSold + legacyTicketsSold,
      totalRevenue,
      recentBookings, upcomingEvents,
      revenueChart: monthBuckets.map((b) => ({ label: b.label, amount: Math.round(b.amount) })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { overview };
