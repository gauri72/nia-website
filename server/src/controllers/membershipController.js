const Membership = require('../models/Membership');
const { createPayment } = require('../services/mollieService');

const PLAN_AMOUNTS = { friend: 60, patron: 150 };

// ── POST /api/membership/create ───────────────────────────────
async function create(req, res, next) {
  try {
    const { plan, name, email, phone, partnerName, partnerEmail, partnerPhone } = req.body;

    if (!plan || !PLAN_AMOUNTS[plan]) {
      return res.status(400).json({ error: 'Invalid plan. Must be "friend" or "patron"' });
    }
    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'name and email are required' });
    }
    if (!partnerName?.trim()) {
      return res.status(400).json({ error: 'partnerName is required' });
    }

    const amount = PLAN_AMOUNTS[plan];

    const membership = await Membership.create({
      plan,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim(),
      partnerName: partnerName?.trim() || undefined,
      partnerEmail: partnerEmail?.trim().toLowerCase() || undefined,
      partnerPhone: partnerPhone?.trim() || undefined,
      amount,
      status: 'pending_payment',
      payment_status: 'pending',
    });

    const payment = await createPayment({
      amount,
      description: `NIA Membership — ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
      type: 'membership',
      referenceId: membership._id.toString(),
    });

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
async function getById(req, res, next) {
  try {
    const membership = await Membership.findById(req.params.id).select('-__v');
    if (!membership) return res.status(404).json({ error: 'Membership not found' });
    return res.json(membership);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, getById };
