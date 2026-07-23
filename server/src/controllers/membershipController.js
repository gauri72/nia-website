const Membership = require('../models/Membership');
const { createPayment } = require('../services/mollieService');
const { computeDiscount } = require('../services/discountService');
const { finalizeFreeOrder } = require('../services/databaseService');

const PLAN_AMOUNTS = { friend: 60, patron: 150 };

// ── POST /api/membership/create ───────────────────────────────
async function create(req, res, next) {
  try {
    const { plan, name, email, phone, partnerName, partnerEmail, partnerPhone, discountCode } = req.body;

    if (!plan || !PLAN_AMOUNTS[plan]) {
      return res.status(400).json({ error: 'Invalid plan. Must be "friend" or "patron"' });
    }
    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'name and email are required' });
    }
    if (!partnerName?.trim()) {
      return res.status(400).json({ error: 'partnerName is required' });
    }

    const originalAmount = PLAN_AMOUNTS[plan];
    let amount = originalAmount;
    let discount = null;
    if (discountCode?.trim()) {
      try {
        discount = await computeDiscount({ code: discountCode, productType: 'membership', email, originalAmount });
        amount = discount.finalAmount;
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
    }

    const membership = await Membership.create({
      plan,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim(),
      partnerName: partnerName?.trim() || undefined,
      partnerEmail: partnerEmail?.trim().toLowerCase() || undefined,
      partnerPhone: partnerPhone?.trim() || undefined,
      discountCode: discount?.discountCodeId,
      discount_code: discount?.discount_code,
      discount_type: discount?.discount_type,
      discount_value: discount?.discount_value,
      discount_amount: discount?.discount_amount || 0,
      amount,
      status: 'pending_payment',
      payment_status: 'pending',
    });

    // A 100%-off code brings amount to €0 — Mollie rejects that outright, so finalize
    // directly instead of creating a real payment session.
    if (amount <= 0) {
      await finalizeFreeOrder('membership', membership._id.toString());
      console.log(`[Membership] Created ${membership._id} | plan=${plan} | free (fully discounted)`);
      return res.status(201).json({
        membershipId: membership._id,
        referenceNumber: membership.membershipId,
        free: true,
        message: 'Your membership is fully covered by the discount — no payment required.',
      });
    }

    const payment = await createPayment({
      amount,
      description: `NIA Membership — ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
      type: 'membership',
      referenceId: membership._id.toString(),
    });
    await Membership.findByIdAndUpdate(membership._id, { mollie_payment_id: payment.paymentId });

    console.log(`[Membership] Created ${membership._id} | plan=${plan} | payment=${payment.paymentId}`);

    return res.status(201).json({
      membershipId: membership._id,
      referenceNumber: membership.membershipId,
      paymentId: payment.paymentId,
      checkoutUrl: payment.checkoutUrl,
    });
  } catch (err) {
    console.error('[Membership] Create error:', err.message);
    next(err);
  }
}

// ── GET /api/membership/:id ───────────────────────────────────
// Public, unauthenticated, and the ID is a guessable/enumerable Mongo
// ObjectId — only ever return an order-status-check-safe projection, never
// name/email/phone/mollie_payment_id.
async function getById(req, res, next) {
  try {
    const membership = await Membership.findById(req.params.id)
      .select('membershipId plan status payment_status amount discount_amount paid_at activated_at createdAt');
    if (!membership) return res.status(404).json({ error: 'Membership not found' });
    return res.json(membership);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, getById };
