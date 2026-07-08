const cron = require('node-cron');
const Broadcast = require('../models/Broadcast');
const Member = require('../models/Member');
const MembershipTier = require('../models/MembershipTier');
const Booking = require('../models/Booking');
const { resolveAudienceMembers, createRecipients, sendBroadcast } = require('./broadcastService');
const { sendRenewalReminder, sendExpiryNotice, sendEventReminder } = require('./emailService');
const { notifyMember } = require('./notificationService');
const { scanForBounces } = require('./bounceDetectionService');

async function dispatchDueBroadcasts() {
  const due = await Broadcast.find({ status: 'scheduled', scheduledAt: { $lte: new Date() } });
  for (const broadcast of due) {
    try {
      const members = await resolveAudienceMembers(broadcast.audience);
      await createRecipients(broadcast._id, members);
      broadcast.stats.totalRecipients = members.length;
      await broadcast.save();
      await sendBroadcast(broadcast._id);
      console.log(`[Scheduler] Dispatched scheduled broadcast ${broadcast._id} (${broadcast.name})`);
    } catch (err) {
      console.error(`[Scheduler] Failed to dispatch broadcast ${broadcast._id}:`, err.message);
      await Broadcast.findByIdAndUpdate(broadcast._id, { status: 'failed' });
    }
  }
}

// ── Renewal reminders: N days before expiry, once per member per cycle ─────
async function sendRenewalReminders() {
  const tiers = await MembershipTier.find();
  const tierById = Object.fromEntries(tiers.map((t) => [String(t._id), t]));

  const candidates = await Member.find({ membershipStatus: 'active', membershipExpiresAt: { $ne: null } });
  for (const member of candidates) {
    const tier = tierById[String(member.membershipTier)];
    const reminderDays = tier?.renewalReminderDays ?? 7;
    const daysRemaining = Math.ceil((member.membershipExpiresAt - Date.now()) / (24 * 60 * 60 * 1000));

    if (daysRemaining <= reminderDays && daysRemaining >= 0 && !member.renewalReminderSentAt) {
      try {
        await sendRenewalReminder(member, tier, Math.max(daysRemaining, 0));
        await notifyMember(member._id, 'Membership Renewal Reminder', `Your membership expires in ${Math.max(daysRemaining, 0)} day(s).`, '/dashboard/membership').catch(() => {});
        member.renewalReminderSentAt = new Date();
        await member.save();
      } catch (err) {
        console.error(`[Scheduler] Renewal reminder failed for ${member.email}:`, err.message);
      }
    }
  }
}

// ── Expiry sweep: mark expired + notify, once (status flip makes it idempotent) ──
async function sweepExpiredMemberships() {
  const expired = await Member.find({ membershipStatus: 'active', membershipExpiresAt: { $lte: new Date() } });
  for (const member of expired) {
    try {
      member.membershipStatus = 'expired';
      await member.save();
      await sendExpiryNotice(member);
      await notifyMember(member._id, 'Membership Expired', 'Your NIA membership has expired. Renew to keep your benefits.', '/dashboard/membership').catch(() => {});
    } catch (err) {
      console.error(`[Scheduler] Expiry notice failed for ${member.email}:`, err.message);
    }
  }
}

// ── Event reminders: 24h before start, once per booking ────────────────────
async function sendEventReminders() {
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const bookings = await Booking.find({ status: 'paid', reminderSentAt: null })
    .populate('member')
    .populate({ path: 'event', match: { startDate: { $gte: new Date(), $lte: in24h } } });

  for (const booking of bookings) {
    if (!booking.event) continue; // populate match excluded it — event isn't within the 24h window
    try {
      await sendEventReminder(booking);
      booking.reminderSentAt = new Date();
      await booking.save();
    } catch (err) {
      console.error(`[Scheduler] Event reminder failed for booking ${booking.bookingNumber}:`, err.message);
    }
  }
}

function start() {
  // Runs every minute — scheduledAt granularity is minute-level, matching the UI's datetime-local input.
  cron.schedule('* * * * *', () => {
    dispatchDueBroadcasts().catch((err) => console.error('[Scheduler] Tick failed:', err.message));
  });

  // Membership + event reminder sweeps run hourly — day/hour-level granularity, no need for per-minute checks.
  cron.schedule('0 * * * *', () => {
    sendRenewalReminders().catch((err) => console.error('[Scheduler] Renewal reminder sweep failed:', err.message));
    sweepExpiredMemberships().catch((err) => console.error('[Scheduler] Expiry sweep failed:', err.message));
    sendEventReminders().catch((err) => console.error('[Scheduler] Event reminder sweep failed:', err.message));
  });

  // Bounce notifications trickle into the sending mailbox asynchronously —
  // check every 15 minutes rather than only right after a send.
  cron.schedule('*/15 * * * *', () => {
    scanForBounces().catch((err) => console.error('[Scheduler] Bounce scan failed:', err.message));
  });

  console.log('[Scheduler] Broadcast scheduler started (checks every minute); membership/event sweeps run hourly; bounce scan runs every 15 minutes');
}

module.exports = { start, sendRenewalReminders, sweepExpiredMemberships, sendEventReminders };
