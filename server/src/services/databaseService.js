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

const TERMINAL_STATUSES = ['paid', 'failed', 'expired', 'canceled'];

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
  if (isAlreadyProcessed(record, status)) {
    console.log(`[DB] Membership ${referenceId} already processed — skipping`);
    return null;
  }

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

  const updated = await Membership.findByIdAndUpdate(referenceId, update, { new: true });
  console.log(`[DB] Membership ${referenceId} updated → status=${status}`);
  return updated;
}

// ── Event Ticket ─────────────────────────────────────────────
async function updateTicket(referenceId, molliePaymentId, status, paidAt) {
  const record = await Ticket.findById(referenceId);
  if (!record) throw new Error(`Ticket not found: ${referenceId}`);
  if (isAlreadyProcessed(record, status)) {
    console.log(`[DB] Ticket ${referenceId} already processed — skipping`);
    return null;
  }

  const update = {
    mollie_payment_id: molliePaymentId,
    payment_provider: 'mollie',
    ticket_status: status,
  };
  if (status === 'paid') {
    update.paid_at = paidAt ? new Date(paidAt) : new Date();
  }

  const updated = await Ticket.findByIdAndUpdate(referenceId, update, { new: true });
  console.log(`[DB] Ticket ${referenceId} updated → status=${status}`);
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
  if (isAlreadyProcessed(record, status)) {
    console.log(`[DB] Sponsorship ${referenceId} already processed — skipping`);
    return null;
  }

  const update = {
    mollie_payment_id: molliePaymentId,
    payment_provider: 'mollie',
    payment_status: status,
    status: status === 'paid' ? 'paid' : status,
  };
  if (status === 'paid') {
    update.paid_at = paidAt ? new Date(paidAt) : new Date();
  }

  const updated = await Sponsorship.findByIdAndUpdate(referenceId, update, { new: true });
  console.log(`[DB] Sponsorship ${referenceId} updated → status=${status}`);
  return updated;
}

// ── Booking (event ticketing, account-linked) ─────────────────
async function updateBooking(referenceId, molliePaymentId, status, paidAt) {
  const record = await Booking.findById(referenceId);
  if (!record) throw new Error(`Booking not found: ${referenceId}`);
  if (isAlreadyProcessed(record, status)) {
    console.log(`[DB] Booking ${referenceId} already processed — skipping`);
    return null;
  }

  const update = {
    mollie_payment_id: molliePaymentId,
    payment_provider: 'mollie',
    status,
  };
  if (status === 'paid') {
    update.paid_at = paidAt ? new Date(paidAt) : new Date();
    // Increment sold counts now that payment is confirmed — never before, to avoid holding inventory hostage on abandoned checkouts.
    await Promise.all(record.lines.map((line) =>
      TicketType.findByIdAndUpdate(line.ticketType, { $inc: { quantitySold: line.quantity } })
    ));
  }

  const updated = await Booking.findByIdAndUpdate(referenceId, update, { new: true })
    .populate('member')
    .populate('event');
  console.log(`[DB] Booking ${referenceId} updated → status=${status}`);

  if (status === 'paid' && updated.member && updated.event) {
    notifyMember(updated.member._id, 'Booking Confirmed', `Your booking for ${updated.event.title} is confirmed.`, '/dashboard/tickets').catch(() => {});
    notifyAdmins('New Booking', `${updated.member.firstName} ${updated.member.lastName} booked ${updated.event.title}.`, '/admin/bookings').catch(() => {});
  }

  return updated;
}

// ── Membership Payment (Member Dashboard renewal/upgrade) ─────
async function updateMembershipPayment(referenceId, molliePaymentId, status, paidAt) {
  const record = await MembershipPayment.findById(referenceId);
  if (!record) throw new Error(`MembershipPayment not found: ${referenceId}`);
  if (isAlreadyProcessed(record, status)) {
    console.log(`[DB] MembershipPayment ${referenceId} already processed — skipping`);
    return null;
  }

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

  const updated = await MembershipPayment.findByIdAndUpdate(referenceId, update, { new: true })
    .populate('member')
    .populate('membershipTier');
  console.log(`[DB] MembershipPayment ${referenceId} updated → status=${status}`);
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

module.exports = { updateRecordByType };
