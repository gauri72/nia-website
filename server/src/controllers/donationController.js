const Donation = require('../models/Donation');
const { createPayment } = require('../services/mollieService');

const VALID_CAUSES = ['general', 'cultural_events', 'youth_education', 'community_welfare'];
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 100000;

// ── POST /api/donations/create ────────────────────────────────
async function create(req, res, next) {
  try {
    const { name, email, phone, amount, cause, tier } = req.body;

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'name and email are required' });
    }
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount < MIN_AMOUNT || numAmount > MAX_AMOUNT) {
      return res.status(400).json({ error: `Amount must be between €${MIN_AMOUNT} and €${MAX_AMOUNT}` });
    }
    const resolvedCause = VALID_CAUSES.includes(cause) ? cause : 'general';

    const donation = await Donation.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim(),
      amount: numAmount,
      cause: resolvedCause,
      tier: tier || 'custom',
      donation_status: 'pending_payment',
    });

    const causeLabel = {
      general: 'General Community Fund',
      cultural_events: 'Cultural Events',
      youth_education: 'Youth & Education',
      community_welfare: 'Community Welfare',
    }[resolvedCause];

    const payment = await createPayment({
      amount: numAmount,
      description: `NIA Donation — ${causeLabel}`,
      type: 'donation',
      referenceId: donation._id.toString(),
    });

    console.log(`[Donation] Created ${donation._id} | amount=€${numAmount} | payment=${payment.paymentId}`);

    return res.status(201).json({
      donationId: donation._id,
      referenceNumber: donation.referenceNumber,
      paymentId: payment.paymentId,
      checkoutUrl: payment.checkoutUrl,
    });
  } catch (err) {
    console.error('[Donation] Create error:', err.message);
    next(err);
  }
}

// ── GET /api/donations/:id ────────────────────────────────────
async function getById(req, res, next) {
  try {
    const donation = await Donation.findById(req.params.id).select('-__v');
    if (!donation) return res.status(404).json({ error: 'Donation not found' });
    return res.json(donation);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, getById };
