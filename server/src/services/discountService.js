const DiscountCode = require('../models/DiscountCode');

// ── Validation only — no amount math. Split out from applyDiscount() so callers
// that need to know "is a code present/valid" BEFORE they've computed an amount
// (e.g. per-line pricing loops) can do so without a chicken-and-egg problem. ──
async function validateDiscountCode({ code, productType, email }) {
  const normalizedCode = code.trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();

  const discountCode = await DiscountCode.findOne({ code: normalizedCode });
  if (!discountCode) throw new Error('Invalid discount code');
  if (!discountCode.isActive) throw new Error('This discount code is no longer active');

  const now = new Date();
  if (discountCode.startsAt && now < discountCode.startsAt) throw new Error('This discount code is not yet valid');
  if (discountCode.expiresAt && now > discountCode.expiresAt) throw new Error('This discount code has expired');

  if (discountCode.applicableProducts?.length && !discountCode.applicableProducts.includes(productType)) {
    throw new Error(`This discount code cannot be used for ${productType} purchases`);
  }

  if (discountCode.maxRedemptions != null && discountCode.redemptionCount >= discountCode.maxRedemptions) {
    throw new Error('This discount code has reached its usage limit');
  }

  if (discountCode.maxRedemptionsPerCustomer) {
    const usedByCustomer = discountCode.redeemedBy.filter((r) => r.email === normalizedEmail).length;
    if (usedByCustomer >= discountCode.maxRedemptionsPerCustomer) {
      throw new Error('You have already used this discount code');
    }
  }

  return discountCode;
}

// ── Pure math — no DB access. Floors at €0 and re-derives discount_amount from
// the floored final amount so the two always add up exactly (avoids float drift
// when a fixed-amount code exceeds the original amount). ──
function applyDiscount(discountCode, originalAmount) {
  const rawDiscount = discountCode.type === 'percentage'
    ? originalAmount * (discountCode.value / 100)
    : discountCode.value;

  const finalAmount = Math.max(0, Math.round((originalAmount - rawDiscount) * 100) / 100);
  const discount_amount = Math.round((originalAmount - finalAmount) * 100) / 100;

  return {
    discountCodeId: discountCode._id,
    discount_code: discountCode.code,
    discount_type: discountCode.type,
    discount_value: discountCode.value,
    discount_amount,
    finalAmount,
  };
}

// ── Convenience wrapper for callers that already have originalAmount upfront
// (legacy membership/sponsorship/ticket flows — no per-line pricing loop). ──
async function computeDiscount({ code, productType, email, originalAmount }) {
  const discountCode = await validateDiscountCode({ code, productType, email });
  return applyDiscount(discountCode, originalAmount);
}

// ── Called only from databaseService.js's webhook-finalization functions, only
// on a genuine (non-redelivered) transition to 'paid' — see the atomic-guard fix
// there. Redemption counting must never fire on a pending/abandoned checkout. ──
async function recordRedemption({ discountCodeId, email, productType, referenceId }) {
  await DiscountCode.findByIdAndUpdate(discountCodeId, {
    $inc: { redemptionCount: 1 },
    $push: { redeemedBy: { email: email.trim().toLowerCase(), productType, referenceId, redeemedAt: new Date() } },
  });
}

module.exports = { validateDiscountCode, applyDiscount, computeDiscount, recordRedemption };
