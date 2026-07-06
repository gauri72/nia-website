const Sponsorship = require('../models/Sponsorship');
const { createPayment } = require('../services/mollieService');
const { computeDiscount } = require('../services/discountService');
const { finalizeFreeOrder } = require('../services/databaseService');

const PACKAGE_AMOUNTS = { bronze: 250, silver: 500, gold: 1000, platinum: 2500 };

// ── POST /api/sponsorships/create ────────────────────────────
async function create(req, res, next) {
  try {
    const { sponsorName, contactPerson, companyName, email, phone, packageName, eventId, remarks, discountCode } = req.body;

    if (!sponsorName?.trim() || !contactPerson?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'sponsorName, contactPerson, and email are required' });
    }
    const pkg = packageName?.toLowerCase();
    if (!PACKAGE_AMOUNTS[pkg]) {
      return res.status(400).json({ error: 'Invalid package. Must be bronze, silver, gold, or platinum' });
    }

    const originalAmount = PACKAGE_AMOUNTS[pkg];
    let amount = originalAmount;
    let discount = null;
    if (discountCode?.trim()) {
      try {
        discount = await computeDiscount({ code: discountCode, productType: 'sponsorship', email, originalAmount });
        amount = discount.finalAmount;
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
    }

    const sponsorship = await Sponsorship.create({
      sponsorName: sponsorName.trim(),
      contactPerson: contactPerson.trim(),
      companyName: companyName?.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim(),
      packageName: pkg,
      discountCode: discount?.discountCodeId,
      discount_code: discount?.discount_code,
      discount_type: discount?.discount_type,
      discount_value: discount?.discount_value,
      discount_amount: discount?.discount_amount || 0,
      amount,
      eventId: eventId || undefined,
      remarks: remarks?.trim(),
      status: 'pending_payment',
      payment_status: 'pending',
    });

    if (amount <= 0) {
      await finalizeFreeOrder('sponsorship', sponsorship._id.toString());
      console.log(`[Sponsorship] Created ${sponsorship._id} | pkg=${pkg} | free (fully discounted)`);
      return res.status(201).json({
        sponsorshipId: sponsorship._id,
        referenceNumber: sponsorship.referenceNumber,
        amount,
        free: true,
        message: 'This sponsorship is fully covered by the discount — no payment required.',
      });
    }

    const payment = await createPayment({
      amount,
      description: `NIA Sponsorship — ${pkg.charAt(0).toUpperCase() + pkg.slice(1)} Package`,
      type: 'sponsorship',
      referenceId: sponsorship._id.toString(),
    });

    console.log(`[Sponsorship] Created ${sponsorship._id} | pkg=${pkg} | payment=${payment.paymentId}`);

    return res.status(201).json({
      sponsorshipId: sponsorship._id,
      referenceNumber: sponsorship.referenceNumber,
      amount,
      paymentId: payment.paymentId,
      checkoutUrl: payment.checkoutUrl,
    });
  } catch (err) {
    console.error('[Sponsorship] Create error:', err.message);
    next(err);
  }
}

// ── GET /api/sponsorships/:id ─────────────────────────────────
async function getById(req, res, next) {
  try {
    const sponsorship = await Sponsorship.findById(req.params.id).select('-__v');
    if (!sponsorship) return res.status(404).json({ error: 'Sponsorship not found' });
    return res.json(sponsorship);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, getById };
