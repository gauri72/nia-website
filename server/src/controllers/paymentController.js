const { createPayment, getPayment, getPaymentStatus } = require('../services/mollieService');
const { updateRecordByType }    = require('../services/databaseService');
const { sendPostPaymentEmails } = require('../services/emailService');
const Ticket = require('../models/Ticket');
const Membership = require('../models/Membership');
const Donation = require('../models/Donation');
const Sponsorship = require('../models/Sponsorship');
const Booking = require('../models/Booking');
const MembershipPayment = require('../models/MembershipPayment');

// Tracks payment IDs currently being processed to prevent concurrent duplicate webhook runs
const processingSet = new Set();

const MODEL_BY_TYPE = {
  event_ticket: Ticket,
  membership: Membership,
  donation: Donation,
  sponsorship: Sponsorship,
  booking: Booking,
  membership_payment: MembershipPayment,
};

// ── POST /api/payments/create ─────────────────────────────────
async function create(req, res, next) {
  try {
    const { amount, description, type, referenceId } = req.body;

    if (!type || !referenceId) {
      return res.status(400).json({ error: 'type and referenceId are required' });
    }
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    const result = await createPayment({ amount, description, type, referenceId });

    console.log(`[Payment] Created | type=${type} ref=${referenceId} id=${result.paymentId}`);
    return res.status(201).json(result);
  } catch (err) {
    console.error('[Payment] Create error:', err.message);
    next(err);
  }
}

// ── POST /api/payments/webhook ────────────────────────────────
async function webhook(req, res) {
  // Always return 200 immediately — Mollie retries on non-200
  res.sendStatus(200);

  const { id: molliePaymentId } = req.body;

  if (!molliePaymentId) {
    console.warn('[Webhook] Received webhook with no payment ID');
    return;
  }

  // Prevent duplicate concurrent processing of the same payment
  if (processingSet.has(molliePaymentId)) {
    console.log(`[Webhook] Already processing ${molliePaymentId} — skipping`);
    return;
  }
  processingSet.add(molliePaymentId);

  try {
    // Always retrieve fresh status directly from Mollie — never trust frontend
    const payment = await getPayment(molliePaymentId);
    const { status, paidAt, metadata } = payment;

    console.log(`[Webhook] Payment ${molliePaymentId} | status=${status} | type=${metadata?.type} | ref=${metadata?.referenceId}`);

    if (!metadata?.type || !metadata?.referenceId) {
      console.warn(`[Webhook] Missing metadata on payment ${molliePaymentId}`);
      return;
    }

    // Update the database record — returns null if this payment was already processed
    // (e.g. a webhook redelivery, or a refund notification on an already-paid payment)
    const updatedRecord = await updateRecordByType(
      metadata.type,
      metadata.referenceId,
      molliePaymentId,
      status,
      paidAt
    );

    // Only send emails on a genuine paid transition — not on every redelivered webhook
    if (status === 'paid' && updatedRecord) {
      await sendPostPaymentEmails(metadata.type, updatedRecord);
    }
  } catch (err) {
    console.error(`[Webhook] Error processing ${molliePaymentId}:`, err.message);
  } finally {
    processingSet.delete(molliePaymentId);
  }
}

// Shared by both status lookup routes below — checks Mollie's live status for
// a payment, idempotently syncs the DB + sends confirmation emails on a
// genuine paid transition, and returns the status payload either way.
async function checkAndSyncPayment(paymentId) {
  const payment = await getPayment(paymentId);
  const { status: mollieStatus, paidAt, amount, metadata } = payment;

  if (mollieStatus === 'paid' && metadata?.type && metadata?.referenceId) {
    if (!processingSet.has(paymentId)) {
      processingSet.add(paymentId);
      try {
        const updatedRecord = await updateRecordByType(
          metadata.type,
          metadata.referenceId,
          paymentId,
          mollieStatus,
          paidAt
        );
        // Only send emails if record was actually just updated (not already processed) —
        // updateRecordByType now returns null on skip, so this check is meaningful.
        if (updatedRecord) {
          await sendPostPaymentEmails(metadata.type, updatedRecord);
        }
      } catch (err) {
        console.error(`[Status] Post-payment processing error for ${paymentId}:`, err.message);
      } finally {
        processingSet.delete(paymentId);
      }
    }
  }

  return { status: mollieStatus, paidAt: paidAt || null, amount, metadata };
}

// ── GET /api/payments/status/:paymentId ───────────────────────
// Also handles DB update + emails in dev (where Mollie can't reach localhost webhook)
async function status(req, res, next) {
  try {
    const { paymentId } = req.params;
    if (!paymentId) {
      return res.status(400).json({ error: 'paymentId is required' });
    }

    return res.json(await checkAndSyncPayment(paymentId));
  } catch (err) {
    console.error('[Payment] Status error:', err.message);
    next(err);
  }
}

// ── GET /api/payments/status-by-reference?type=&referenceId= ──
// Fallback for when the Mollie payment ID never made it back to the browser
// (sessionStorage doesn't survive returning in a different tab/context, which
// some payment methods' redirect flows do — see PaymentSuccessPage.jsx).
// type+referenceId are safe to carry in the redirect URL itself since both
// are known before the Mollie payment is even created.
async function statusByReference(req, res, next) {
  try {
    const { type, referenceId } = req.query;
    const Model = MODEL_BY_TYPE[type];
    if (!Model || !referenceId) {
      return res.status(400).json({ error: 'A valid type and referenceId are required' });
    }

    const record = await Model.findById(referenceId).select('mollie_payment_id');
    if (!record) return res.status(404).json({ error: 'Record not found' });
    if (!record.mollie_payment_id) {
      // Payment was never created for this record (e.g. a fully-discounted
      // free order) — nothing for Mollie to report on.
      return res.json({ status: 'no_payment_required' });
    }

    return res.json(await checkAndSyncPayment(record.mollie_payment_id));
  } catch (err) {
    console.error('[Payment] Status-by-reference error:', err.message);
    next(err);
  }
}

module.exports = { create, webhook, status, statusByReference };
