const mollieImportService = require('../services/mollieImportService');
const MollieWebhookLog = require('../models/MollieWebhookLog');

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

// ── POST /api/mollie/webhook ─────────────────────────────────────────
// Separate from /api/payments/webhook (which handles the existing payment-status
// update + transactional emails). This endpoint is specifically the Mollie Import
// module's real-time "auto-create a Member for a newly paid transaction" hook.
async function webhook(req, res) {
  // Always return 200 immediately — Mollie retries on non-200 responses
  res.sendStatus(200);

  const { id: paymentId } = req.body || {};
  if (!paymentId) {
    console.warn('[MollieWebhook] Received webhook with no payment id');
    return;
  }

  let attempts = 0;
  let lastError = null;

  while (attempts < MAX_ATTEMPTS) {
    attempts += 1;
    try {
      // Fetching the payment by ID directly from Mollie *is* the authenticity check.
      const result = await mollieImportService.processWebhookPayment(paymentId);
      await MollieWebhookLog.create({
        paymentId, action: result.outcome, status: 'success', attempts,
      });
      return;
    } catch (err) {
      lastError = err;
      console.error(`[MollieWebhook] Attempt ${attempts}/${MAX_ATTEMPTS} failed for ${paymentId}:`, err.message);
      if (attempts < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS * attempts);
    }
  }

  await MollieWebhookLog.create({
    paymentId, action: 'error', status: 'failed', attempts, error: lastError?.message,
  });
}

module.exports = { webhook };
