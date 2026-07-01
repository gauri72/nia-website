const Membership  = require('../models/Membership');
const Ticket       = require('../models/Ticket');
const Donation     = require('../models/Donation');
const Sponsorship  = require('../models/Sponsorship');

const TERMINAL_STATUSES = ['paid', 'failed', 'expired', 'canceled'];

/**
 * Generic guard: skip update if record already has a terminal status.
 * Prevents duplicate webhook processing.
 */
function isAlreadyProcessed(record, newStatus) {
  return TERMINAL_STATUSES.includes(record.payment_status || record.ticket_status || record.donation_status);
}

// ── Membership ──────────────────────────────────────────────
async function updateMembership(referenceId, molliePaymentId, status, paidAt) {
  const record = await Membership.findById(referenceId);
  if (!record) throw new Error(`Membership not found: ${referenceId}`);
  if (isAlreadyProcessed(record, status)) {
    console.log(`[DB] Membership ${referenceId} already processed — skipping`);
    return record;
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
    return record;
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
    return record;
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
    return record;
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
    default:             throw new Error(`Unknown payment type: ${type}`);
  }
}

module.exports = { updateRecordByType };
