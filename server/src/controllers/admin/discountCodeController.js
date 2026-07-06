const DiscountCode = require('../../models/DiscountCode');
const { validateDiscountCode, applyDiscount } = require('../../services/discountService');

// ── GET /api/admin/discount-codes ─────────────────────────────────
async function list(req, res, next) {
  try {
    const codes = await DiscountCode.find().sort('-createdAt');
    return res.json(codes);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/discount-codes ────────────────────────────────
async function create(req, res, next) {
  try {
    const { code, description, type, value, applicableProducts, maxRedemptions, maxRedemptionsPerCustomer, startsAt, expiresAt, isActive } = req.body;
    if (!code?.trim() || !type || value === undefined || value === null) {
      return res.status(400).json({ error: 'code, type, and value are required' });
    }
    if (!['percentage', 'fixed'].includes(type)) {
      return res.status(400).json({ error: 'type must be "percentage" or "fixed"' });
    }

    const normalizedCode = code.trim().toUpperCase();
    const existing = await DiscountCode.findOne({ code: normalizedCode });
    if (existing) return res.status(409).json({ error: 'A discount code with this code already exists' });

    const discountCode = await DiscountCode.create({
      code: normalizedCode,
      description: description?.trim(),
      type,
      value,
      applicableProducts: Array.isArray(applicableProducts) ? applicableProducts.filter(Boolean) : [],
      maxRedemptions: maxRedemptions || undefined,
      maxRedemptionsPerCustomer: maxRedemptionsPerCustomer ?? 1,
      startsAt: startsAt || undefined,
      expiresAt: expiresAt || undefined,
      isActive: isActive !== undefined ? isActive : true,
    });

    return res.status(201).json(discountCode);
  } catch (err) {
    next(err);
  }
}

// ── PUT /api/admin/discount-codes/:id ─────────────────────────────
async function update(req, res, next) {
  try {
    const { code, description, type, value, applicableProducts, maxRedemptions, maxRedemptionsPerCustomer, startsAt, expiresAt, isActive } = req.body;

    const update = {};
    if (code !== undefined) update.code = code.trim().toUpperCase();
    if (description !== undefined) update.description = description.trim();
    if (type !== undefined) update.type = type;
    if (value !== undefined) update.value = value;
    if (applicableProducts !== undefined) update.applicableProducts = Array.isArray(applicableProducts) ? applicableProducts.filter(Boolean) : [];
    if (maxRedemptions !== undefined) update.maxRedemptions = maxRedemptions || undefined;
    if (maxRedemptionsPerCustomer !== undefined) update.maxRedemptionsPerCustomer = maxRedemptionsPerCustomer;
    if (startsAt !== undefined) update.startsAt = startsAt || undefined;
    if (expiresAt !== undefined) update.expiresAt = expiresAt || undefined;
    if (isActive !== undefined) update.isActive = isActive;

    const discountCode = await DiscountCode.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!discountCode) return res.status(404).json({ error: 'Discount code not found' });

    return res.json(discountCode);
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/admin/discount-codes/:id ──────────────────────────
async function remove(req, res, next) {
  try {
    const discountCode = await DiscountCode.findByIdAndDelete(req.params.id);
    if (!discountCode) return res.status(404).json({ error: 'Discount code not found' });
    return res.json({ message: 'Discount code deleted' });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/discount-codes/preview (public) ─────────────────────
// No side effects — just validates + computes, for a live "Apply" preview before checkout.
async function preview(req, res, next) {
  try {
    const { code, productType, email, originalAmount } = req.body;
    if (!code?.trim() || !productType || !email?.trim() || originalAmount === undefined) {
      return res.status(400).json({ error: 'code, productType, email, and originalAmount are required' });
    }

    try {
      const discountCode = await validateDiscountCode({ code, productType, email });
      const result = applyDiscount(discountCode, Number(originalAmount));
      return res.json({ valid: true, discount_amount: result.discount_amount, finalAmount: result.finalAmount });
    } catch (err) {
      return res.json({ valid: false, message: err.message });
    }
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove, preview };
