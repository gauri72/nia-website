import api from './api';

/**
 * Save the paymentId to sessionStorage before redirecting to Mollie.
 * The success page reads it back since Mollie doesn't inject it into the redirectUrl.
 */
function storeAndRedirect(paymentId, checkoutUrl) {
  sessionStorage.setItem('nia_pending_payment_id', paymentId);
  window.location.href = checkoutUrl;
}

/**
 * Poll Mollie (via backend) for the current payment status.
 */
export async function getPaymentStatus(paymentId) {
  const { data } = await api.get(`/payments/status/${paymentId}`);
  return data; // { status, paidAt, amount, metadata }
}

// ── Domain helpers ────────────────────────────────────────────

export async function startMembershipPayment(details) {
  const { data } = await api.post('/membership/create', details);
  storeAndRedirect(data.paymentId, data.checkoutUrl);
  return data;
}

export async function startTicketPayment(details) {
  const { data } = await api.post('/tickets/create', details);
  storeAndRedirect(data.paymentId, data.checkoutUrl);
  return data;
}

export async function startDonationPayment(details) {
  const { data } = await api.post('/donations/create', details);
  storeAndRedirect(data.paymentId, data.checkoutUrl);
  return data;
}

export async function startSponsorshipPayment(details) {
  const { data } = await api.post('/sponsorships/create', details);
  storeAndRedirect(data.paymentId, data.checkoutUrl);
  return data;
}

export default api;
