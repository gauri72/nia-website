const Member = require('../../models/Member');
const MembershipTier = require('../../models/MembershipTier');
const MembershipPayment = require('../../models/MembershipPayment');
const { createPayment } = require('../../services/mollieService');
const { generateMembershipCardPDF } = require('../../services/emailService');
const { generatePatronPassPDF } = require('../../services/patronPassService');
const { computeDiscount } = require('../../services/discountService');
const { finalizeFreeOrder } = require('../../services/databaseService');
const { computeUpgradeAmount } = require('../../services/membershipUpgradeService');

// ── GET /api/member/membership ───────────────────────────────────
async function getStatus(req, res, next) {
  try {
    const member = await Member.findById(req.member.id).populate('membershipTier');
    const history = await MembershipPayment.find({ member: req.member.id, status: 'paid' })
      .populate('membershipTier', 'name')
      .sort('-paid_at');

    return res.json({
      membershipTier: member.membershipTier,
      membershipStatus: member.membershipStatus,
      membershipExpiresAt: member.membershipExpiresAt,
      autoRenew: member.autoRenew,
      history,
    });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/member/membership/auto-renew ──────────────────────
async function setAutoRenew(req, res, next) {
  try {
    const member = await Member.findByIdAndUpdate(req.member.id, { autoRenew: !!req.body.autoRenew }, { new: true });
    return res.json({ autoRenew: member.autoRenew });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/member/membership/renew ─────────────────────────────
async function renew(req, res, next) {
  try {
    const { discountCode } = req.body;
    const member = await Member.findById(req.member.id);
    if (!member.membershipTier) return res.status(400).json({ error: 'No current membership tier to renew. Choose a tier to join first.' });

    const tier = await MembershipTier.findById(member.membershipTier);
    if (!tier || !tier.isActive) return res.status(400).json({ error: 'This membership tier is no longer available' });

    let amount = tier.price;
    let discount = null;
    if (discountCode?.trim()) {
      try {
        discount = await computeDiscount({ code: discountCode, productType: 'membership', email: member.email, originalAmount: tier.price });
        amount = discount.finalAmount;
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
    }

    const payment = await MembershipPayment.create({
      member: member._id, membershipTier: tier._id, type: 'renewal', amount,
      discountCode: discount?.discountCodeId,
      discount_code: discount?.discount_code,
      discount_type: discount?.discount_type,
      discount_value: discount?.discount_value,
      discount_amount: discount?.discount_amount || 0,
    });

    if (amount <= 0) {
      await finalizeFreeOrder('membership_payment', payment._id.toString());
      return res.status(201).json({ free: true, message: 'Your renewal is fully covered by the discount — no payment required.' });
    }

    const result = await createPayment({
      amount,
      description: `NIA Membership Renewal — ${tier.name}`,
      type: 'membership_payment',
      referenceId: payment._id.toString(),
    });
    await MembershipPayment.findByIdAndUpdate(payment._id, { mollie_payment_id: result.paymentId });

    return res.status(201).json({ paymentId: result.paymentId, checkoutUrl: result.checkoutUrl });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/member/membership/upgrade-preview/:tierId ────────────
// No side effects — lets the Dashboard show the buyer the real amount and the
// reasoning (proration rule applied or not) before they commit to checkout.
async function previewUpgrade(req, res, next) {
  try {
    const member = await Member.findById(req.member.id).populate('membershipTier');
    const tier = await MembershipTier.findById(req.params.tierId);
    if (!tier || !tier.isActive) return res.status(400).json({ error: 'Invalid or inactive membership tier' });

    const result = computeUpgradeAmount(member, tier);
    return res.json({
      amount: result.amount,
      prorationApplied: result.prorationApplied,
      daysRemaining: result.daysRemaining,
      message: result.message,
      currentTier: member.membershipTier ? { name: member.membershipTier.name, price: member.membershipTier.price } : null,
      targetTier: { name: tier.name, price: tier.price },
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/member/membership/upgrade ───────────────────────────
async function upgrade(req, res, next) {
  try {
    const { tierId, discountCode } = req.body;
    if (!tierId) return res.status(400).json({ error: 'tierId is required' });

    const member = await Member.findById(req.member.id).populate('membershipTier');
    const tier = await MembershipTier.findById(tierId);
    if (!tier || !tier.isActive) return res.status(400).json({ error: 'Invalid or inactive membership tier' });

    if (tier.maxMembers) {
      const count = await Member.countDocuments({ membershipTier: tier._id, membershipStatus: 'active' });
      if (count >= tier.maxMembers) return res.status(409).json({ error: 'This tier has reached its member limit' });
    }

    const upgradeCalc = computeUpgradeAmount(member, tier);
    let amount = upgradeCalc.amount;
    let discount = null;
    if (discountCode?.trim()) {
      try {
        discount = await computeDiscount({ code: discountCode, productType: 'membership', email: member.email, originalAmount: amount });
        amount = discount.finalAmount;
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
    }

    const payment = await MembershipPayment.create({
      member: member._id, membershipTier: tier._id, previousTier: member.membershipTier?._id || undefined,
      type: member.membershipTier ? 'upgrade' : 'new', amount,
      discountCode: discount?.discountCodeId,
      discount_code: discount?.discount_code,
      discount_type: discount?.discount_type,
      discount_value: discount?.discount_value,
      discount_amount: discount?.discount_amount || 0,
    });

    if (amount <= 0) {
      await finalizeFreeOrder('membership_payment', payment._id.toString());
      return res.status(201).json({ free: true, message: 'This membership is fully covered by the discount — no payment required.' });
    }

    const result = await createPayment({
      amount,
      description: `NIA Membership — ${tier.name}`,
      type: 'membership_payment',
      referenceId: payment._id.toString(),
    });
    await MembershipPayment.findByIdAndUpdate(payment._id, { mollie_payment_id: result.paymentId });

    return res.status(201).json({ paymentId: result.paymentId, checkoutUrl: result.checkoutUrl, amount, message: upgradeCalc.message });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/member/membership/card.pdf ───────────────────────────
async function downloadCard(req, res, next) {
  try {
    const member = await Member.findById(req.member.id).populate('membershipTier');
    if (member.membershipStatus !== 'active') return res.status(400).json({ error: 'An active membership is required to download a card' });

    const pdfBuffer = await generateMembershipCardPDF(member, member.membershipTier);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="NIA-Membership-Card-${member.memberId}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/member/membership/patron-pass.pdf ─────────────────────
async function downloadPatronPass(req, res, next) {
  try {
    const member = await Member.findById(req.member.id).populate('membershipTier');
    if (member.membershipTier?.slug !== 'patron' && member.membershipTier?.name?.toLowerCase() !== 'patron') {
      return res.status(400).json({ error: 'Patron Pass is only available for Patron-tier members' });
    }
    if (member.membershipStatus !== 'active') return res.status(400).json({ error: 'An active membership is required to download a pass' });

    const pdfBuffer = await generatePatronPassPDF(member, member.membershipTier);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="NIA-Patron-Pass-${member.memberId}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

module.exports = { getStatus, setAutoRenew, renew, upgrade, previewUpgrade, downloadCard, downloadPatronPass };
