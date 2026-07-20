const Membership  = require('../models/Membership');
const Ticket       = require('../models/Ticket');
const Donation     = require('../models/Donation');
const Sponsorship  = require('../models/Sponsorship');
const Booking      = require('../models/Booking');
const TicketType   = require('../models/TicketType');
const MembershipPayment = require('../models/MembershipPayment');
const Member       = require('../models/Member');
const MembershipTier = require('../models/MembershipTier');
const { notifyAdmins, notifyMember } = require('./notificationService');
const { recordRedemption } = require('./discountService');
const { sendPostPaymentEmails, sendMemberPasswordResetEmail } = require('./emailService');
const { hashPassword, generateRawToken } = require('./authService');

const TERMINAL_STATUSES = ['paid', 'failed', 'expired', 'canceled'];
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function splitName(fullName) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || 'Member';
  const lastName = parts.join(' ') || '-';
  return { firstName, lastName };
}

// Finds or creates the Member account for a newly-paid Membership purchase and
// links the two records together — the live payment flow (webhook + status
// poll) previously only ever updated the Membership record's own status,
// never provisioning an actual login account. This mirrors matchOrCreateMember
// + resolveTierForMembership in mollieImportService.js (the only place this
// logic used to live, requiring an admin to manually run Mollie Import for
// every new signup) so both paths behave identically.
async function linkMemberToMembership(membership) {
  const normalizedEmail = membership.email.trim().toLowerCase();
  let member = await Member.findOne({ email: normalizedEmail });

  if (!member) {
    const { firstName, lastName } = splitName(membership.name);
    const tempPassword = generateRawToken().slice(0, 20);
    const resetToken = generateRawToken();
    member = await Member.create({
      firstName,
      lastName,
      email: normalizedEmail,
      phone: membership.phone,
      passwordHash: await hashPassword(tempPassword),
      emailVerified: true,
      status: 'active',
      source: 'registration',
      passwordResetToken: resetToken,
      passwordResetExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });

    const resetUrl = `${process.env.FRONTEND_URL}/dashboard/reset-password?token=${resetToken}`;
    sendMemberPasswordResetEmail(member, resetUrl).catch((err) =>
      console.error('[DB] Failed to send password-setup email:', err.message)
    );
  }

  const tier = await MembershipTier.findOne({ slug: membership.plan })
    || await MembershipTier.findOne({ name: new RegExp(`^${membership.plan}$`, 'i') });
  if (tier) member.membershipTier = tier._id;
  member.membershipStatus = 'active';
  member.currentMembershipRecord = membership._id;
  await member.save();

  membership.member = member._id;
  await membership.save();

  return member;
}

/**
 * Generic guard: skip update if record already has a terminal status.
 * Prevents duplicate webhook processing — callers must treat a null return as
 * "nothing changed" and skip post-payment side effects (emails, notifications),
 * not just skip the write.
 */
function isAlreadyProcessed(record, newStatus) {
  return TERMINAL_STATUSES.includes(record.payment_status || record.ticket_status || record.donation_status || record.status);
}

// ── Membership ──────────────────────────────────────────────
async function updateMembership(referenceId, molliePaymentId, status, paidAt) {
  const record = await Membership.findById(referenceId);
  if (!record) throw new Error(`Membership not found: ${referenceId}`);

  const update = {
    mollie_payment_id: molliePaymentId,
    payment_provider: 'mollie',
    payment_status: status,
    status: status === 'paid' ? 'paid' : status,
  };
  if (status === 'paid') {
    update.paid_at = paidAt ? new Date(paidAt) : new Date();
    update.activated_at = new Date();
  }

  // Atomic conditional update — the filter (not a separate read-then-write) is what
  // actually prevents double-processing under concurrent/redelivered webhooks; only
  // one concurrent caller can ever match `payment_status: { $nin: TERMINAL }`.
  const updated = await Membership.findOneAndUpdate(
    { _id: referenceId, payment_status: { $nin: TERMINAL_STATUSES } },
    update,
    { new: true },
  );
  if (!updated) {
    console.log(`[DB] Membership ${referenceId} already processed — skipping`);
    return null;
  }
  console.log(`[DB] Membership ${referenceId} updated → status=${status}`);

  if (status === 'paid') {
    if (updated.discountCode) {
      await recordRedemption({ discountCodeId: updated.discountCode, email: updated.email, productType: 'membership', referenceId: updated._id });
    }
    await linkMemberToMembership(updated);
  }

  return updated;
}

// ── Event Ticket ─────────────────────────────────────────────
async function updateTicket(referenceId, molliePaymentId, status, paidAt) {
  const record = await Ticket.findById(referenceId);
  if (!record) throw new Error(`Ticket not found: ${referenceId}`);

  const update = {
    mollie_payment_id: molliePaymentId,
    payment_provider: 'mollie',
    ticket_status: status,
  };
  if (status === 'paid') {
    update.paid_at = paidAt ? new Date(paidAt) : new Date();
  }

  const updated = await Ticket.findOneAndUpdate(
    { _id: referenceId, ticket_status: { $nin: TERMINAL_STATUSES } },
    update,
    { new: true },
  );
  if (!updated) {
    console.log(`[DB] Ticket ${referenceId} already processed — skipping`);
    return null;
  }
  console.log(`[DB] Ticket ${referenceId} updated → status=${status}`);

  if (status === 'paid' && updated.discountCode) {
    await recordRedemption({ discountCodeId: updated.discountCode, email: updated.email, productType: 'ticket', referenceId: updated._id });
  }

  return updated;
}

// ── Donation ─────────────────────────────────────────────────
async function updateDonation(referenceId, molliePaymentId, status, paidAt) {
  const record = await Donation.findById(referenceId);
  if (!record) throw new Error(`Donation not found: ${referenceId}`);
  if (isAlreadyProcessed(record, status)) {
    console.log(`[DB] Donation ${referenceId} already processed — skipping`);
    return null;
  }

  const update = {
    mollie_payment_id: molliePaymentId,
    payment_provider: 'mollie',
    donation_status: status,
  };
  if (status === 'paid') {
    update.paid_at = paidAt ? new Date(paidAt) : new Date();
  }

  const updated = await Donation.findByIdAndUpdate(referenceId, update, { new: true });
  console.log(`[DB] Donation ${referenceId} updated → status=${status}`);
  return updated;
}

// ── Sponsorship ───────────────────────────────────────────────
async function updateSponsorship(referenceId, molliePaymentId, status, paidAt) {
  const record = await Sponsorship.findById(referenceId);
  if (!record) throw new Error(`Sponsorship not found: ${referenceId}`);

  const update = {
    mollie_payment_id: molliePaymentId,
    payment_provider: 'mollie',
    payment_status: status,
    status: status === 'paid' ? 'paid' : status,
  };
  if (status === 'paid') {
    update.paid_at = paidAt ? new Date(paidAt) : new Date();
  }

  const updated = await Sponsorship.findOneAndUpdate(
    { _id: referenceId, payment_status: { $nin: TERMINAL_STATUSES } },
    update,
    { new: true },
  );
  if (!updated) {
    console.log(`[DB] Sponsorship ${referenceId} already processed — skipping`);
    return null;
  }
  console.log(`[DB] Sponsorship ${referenceId} updated → status=${status}`);

  if (status === 'paid' && updated.discountCode) {
    await recordRedemption({ discountCodeId: updated.discountCode, email: updated.email, productType: 'sponsorship', referenceId: updated._id });
  }

  return updated;
}

// ── Booking (event ticketing, account-linked) ─────────────────
async function updateBooking(referenceId, molliePaymentId, status, paidAt) {
  const record = await Booking.findById(referenceId);
  if (!record) throw new Error(`Booking not found: ${referenceId}`);

  const update = {
    mollie_payment_id: molliePaymentId,
    payment_provider: 'mollie',
    status,
  };
  if (status === 'paid') {
    update.paid_at = paidAt ? new Date(paidAt) : new Date();
  }

  const updated = await Booking.findOneAndUpdate(
    { _id: referenceId, status: { $nin: TERMINAL_STATUSES } },
    update,
    { new: true },
  ).populate('member').populate('event');
  if (!updated) {
    console.log(`[DB] Booking ${referenceId} already processed — skipping`);
    return null;
  }
  console.log(`[DB] Booking ${referenceId} updated → status=${status}`);

  if (status === 'paid') {
    // Increment sold counts now that payment is confirmed — never before, to avoid
    // holding inventory hostage on abandoned checkouts. Only runs once per booking
    // thanks to the atomic guard above.
    await Promise.all(record.lines.map((line) =>
      TicketType.findByIdAndUpdate(line.ticketType, { $inc: { quantitySold: line.quantity } })
    ));

    if (updated.discountCode && updated.member) {
      await recordRedemption({ discountCodeId: updated.discountCode, email: updated.member.email, productType: 'ticket', referenceId: updated._id });
    }

    if (updated.member && updated.event) {
      notifyMember(updated.member._id, 'Booking Confirmed', `Your booking for ${updated.event.title} is confirmed.`, '/dashboard/tickets').catch(() => {});
      notifyAdmins('New Booking', `${updated.member.firstName} ${updated.member.lastName} booked ${updated.event.title}.`, '/admin/bookings').catch(() => {});
    }
  }

  return updated;
}

// ── Membership Payment (Member Dashboard renewal/upgrade) ─────
async function updateMembershipPayment(referenceId, molliePaymentId, status, paidAt) {
  const record = await MembershipPayment.findById(referenceId);
  if (!record) throw new Error(`MembershipPayment not found: ${referenceId}`);

  const update = { mollie_payment_id: molliePaymentId, payment_provider: 'mollie', status };
  if (status === 'paid') {
    update.paid_at = paidAt ? new Date(paidAt) : new Date();

    const tier = await MembershipTier.findById(record.membershipTier);
    const durationMs = tier?.billingPeriod === 'monthly' ? 30 * 24 * 60 * 60 * 1000 : 365 * 24 * 60 * 60 * 1000;
    const member = await Member.findById(record.member);
    // Renewals extend from current expiry if still in the future; upgrades/new start from now.
    const base = (record.type === 'renewal' && member?.membershipExpiresAt > new Date()) ? member.membershipExpiresAt : new Date();

    await Member.findByIdAndUpdate(record.member, {
      membershipTier: record.membershipTier,
      membershipStatus: 'active',
      membershipExpiresAt: new Date(base.getTime() + durationMs),
      renewalReminderSentAt: null,
    });
  }

  const updated = await MembershipPayment.findOneAndUpdate(
    { _id: referenceId, status: { $nin: TERMINAL_STATUSES } },
    update,
    { new: true },
  ).populate('member').populate('membershipTier');
  if (!updated) {
    console.log(`[DB] MembershipPayment ${referenceId} already processed — skipping`);
    return null;
  }
  console.log(`[DB] MembershipPayment ${referenceId} updated → status=${status}`);

  if (status === 'paid' && updated.discountCode && updated.member) {
    await recordRedemption({ discountCodeId: updated.discountCode, email: updated.member.email, productType: 'membership', referenceId: updated._id });
  }

  return updated;
}

// ── Dispatcher ────────────────────────────────────────────────
async function updateRecordByType(type, referenceId, molliePaymentId, mollieStatus, paidAt) {
  // Map Mollie statuses to our internal statuses
  const statusMap = {
    paid: 'paid',
    failed: 'failed',
    expired: 'expired',
    canceled: 'canceled',
    open: 'pending',
    pending: 'pending',
    authorized: 'pending',
  };
  const status = statusMap[mollieStatus] || mollieStatus;

  switch (type) {
    case 'membership':   return updateMembership(referenceId, molliePaymentId, status, paidAt);
    case 'event_ticket': return updateTicket(referenceId, molliePaymentId, status, paidAt);
    case 'donation':     return updateDonation(referenceId, molliePaymentId, status, paidAt);
    case 'sponsorship':  return updateSponsorship(referenceId, molliePaymentId, status, paidAt);
    case 'booking':      return updateBooking(referenceId, molliePaymentId, status, paidAt);
    case 'membership_payment': return updateMembershipPayment(referenceId, molliePaymentId, status, paidAt);
    default:             throw new Error(`Unknown payment type: ${type}`);
  }
}

// ── Free-order finalization ────────────────────────────────────
// Called by a `create` controller instead of createPayment() when a discount (code
// or automatic tier discount) brings the final amount to €0 — Mollie rejects €0
// payments outright, so there is no webhook to wait for. Reuses the exact same
// finalization + email path a real webhook would trigger, just synchronously.
async function finalizeFreeOrder(type, referenceId) {
  const updated = await updateRecordByType(type, referenceId, null, 'paid', new Date());
  if (updated) {
    await sendPostPaymentEmails(type, updated);
  }
  return updated;
}

module.exports = { updateRecordByType, finalizeFreeOrder };
