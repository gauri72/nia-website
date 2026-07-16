const mollieClient = require('../config/mollie');

const VALID_TYPES = ['membership', 'event_ticket', 'donation', 'sponsorship', 'booking', 'membership_payment'];

const TYPE_DESCRIPTIONS = {
  membership: 'NIA Membership',
  event_ticket: 'NIA Event Ticket',
  donation: 'NIA Donation',
  sponsorship: 'NIA Sponsorship',
  booking: 'NIA Event Booking',
  membership_payment: 'NIA Membership',
};

/**
 * Create a Mollie payment and return paymentId + checkoutUrl.
 */
async function createPayment({ amount, description, type, referenceId, metadata = {} }) {
  if (!VALID_TYPES.includes(type)) {
    throw new Error(`Invalid payment type: ${type}`);
  }
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    throw new Error('Amount must be a positive number');
  }

  const amountStr = Number(amount).toFixed(2);

  // Only include webhookUrl when BACKEND_URL is a public (non-localhost) address.
  // Mollie requires a publicly reachable URL and will reject localhost addresses.
  const isProduction = process.env.BACKEND_URL &&
    !process.env.BACKEND_URL.includes('localhost');

  const paymentPayload = {
    amount: {
      currency: 'EUR',
      value: amountStr,
    },
    description: description || TYPE_DESCRIPTIONS[type],
    // referenceId (our own record's ID, known before Mollie even assigns a
    // payment ID) travels in the URL itself so the status page can look the
    // payment up even if it returns in a different browser tab/context than
    // the one that started checkout — sessionStorage alone doesn't survive
    // that (see PaymentSuccessPage.jsx for the full explanation).
    redirectUrl: `${process.env.FRONTEND_URL}/payment/success?type=${type}&ref=${referenceId}`,
    cancelUrl:   `${process.env.FRONTEND_URL}/payment/cancel?type=${type}&ref=${referenceId}`,
    metadata: {
      type,
      referenceId: String(referenceId),
      ...metadata,
    },
  };

  if (isProduction) {
    paymentPayload.webhookUrl = `${process.env.BACKEND_URL}/api/payments/webhook`;
  }

  const payment = await mollieClient.payments.create(paymentPayload);

  console.log(`[Mollie] Payment created: ${payment.id} | type=${type} | ref=${referenceId} | amount=€${amountStr}`);

  return {
    paymentId: payment.id,
    checkoutUrl: payment._links.checkout.href,
  };
}

/**
 * Retrieve a payment from Mollie by ID.
 */
async function getPayment(paymentId) {
  const payment = await mollieClient.payments.get(paymentId);
  return payment;
}

/**
 * Get only the status of a payment.
 */
async function getPaymentStatus(paymentId) {
  const payment = await mollieClient.payments.get(paymentId);
  return {
    status: payment.status,
    paidAt: payment.paidAt || null,
    amount: payment.amount,
    metadata: payment.metadata,
  };
}

/**
 * Refund a payment (fully or partially) via Mollie.
 */
async function refundPayment(paymentId, amount) {
  const refund = await mollieClient.paymentRefunds.create({
    paymentId,
    amount: { currency: 'EUR', value: Number(amount).toFixed(2) },
  });
  return refund;
}

module.exports = { createPayment, getPayment, getPaymentStatus, refundPayment };
