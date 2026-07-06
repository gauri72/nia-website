const MembershipTier = require('../../models/MembershipTier');
const Member = require('../../models/Member');

function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ── GET /api/admin/membership-tiers ──────────────────────────────
async function list(req, res, next) {
  try {
    const tiers = await MembershipTier.find().sort('sortOrder');
    const counts = await Member.aggregate([
      { $match: { membershipStatus: 'active', membershipTier: { $ne: null } } },
      { $group: { _id: '$membershipTier', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));

    const result = tiers.map((t) => ({ ...t.toObject(), activeMemberCount: countMap[String(t._id)] || 0 }));
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/membership-tiers ─────────────────────────────
async function create(req, res, next) {
  try {
    const { name, description, price, billingPeriod, benefits, maxMembers, color, isActive, renewalReminderDays, gracePeriodDays, ticketDiscountType, ticketDiscountValue } = req.body;
    if (!name?.trim() || price === undefined || price === null) {
      return res.status(400).json({ error: 'name and price are required' });
    }

    const slug = slugify(name);
    const existing = await MembershipTier.findOne({ $or: [{ name: name.trim() }, { slug }] });
    if (existing) return res.status(409).json({ error: 'A tier with this name already exists' });

    const tier = await MembershipTier.create({
      name: name.trim(),
      slug,
      description: description?.trim(),
      price,
      billingPeriod: billingPeriod || 'annual',
      benefits: Array.isArray(benefits) ? benefits.filter(Boolean) : [],
      maxMembers: maxMembers || undefined,
      color,
      isActive: isActive !== undefined ? isActive : true,
      renewalReminderDays,
      gracePeriodDays,
      ticketDiscountType: ticketDiscountType || undefined,
      ticketDiscountValue: ticketDiscountType ? ticketDiscountValue : undefined,
    });

    return res.status(201).json(tier);
  } catch (err) {
    next(err);
  }
}

// ── PUT /api/admin/membership-tiers/:id ───────────────────────────
async function update(req, res, next) {
  try {
    const { name, description, price, billingPeriod, benefits, maxMembers, color, isActive, sortOrder, renewalReminderDays, gracePeriodDays, ticketDiscountType, ticketDiscountValue } = req.body;

    const update = {};
    if (name !== undefined) { update.name = name.trim(); update.slug = slugify(name); }
    if (description !== undefined) update.description = description.trim();
    if (price !== undefined) update.price = price;
    if (billingPeriod !== undefined) update.billingPeriod = billingPeriod;
    if (benefits !== undefined) update.benefits = Array.isArray(benefits) ? benefits.filter(Boolean) : [];
    if (maxMembers !== undefined) update.maxMembers = maxMembers || undefined;
    if (color !== undefined) update.color = color;
    if (isActive !== undefined) update.isActive = isActive;
    if (sortOrder !== undefined) update.sortOrder = sortOrder;
    if (renewalReminderDays !== undefined) update.renewalReminderDays = renewalReminderDays;
    if (gracePeriodDays !== undefined) update.gracePeriodDays = gracePeriodDays;
    if (ticketDiscountType !== undefined) {
      update.ticketDiscountType = ticketDiscountType || null;
      update.ticketDiscountValue = ticketDiscountType ? ticketDiscountValue : null;
    }

    const tier = await MembershipTier.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!tier) return res.status(404).json({ error: 'Membership tier not found' });

    return res.json(tier);
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/admin/membership-tiers/:id ────────────────────────
async function remove(req, res, next) {
  try {
    const memberCount = await Member.countDocuments({ membershipTier: req.params.id, status: { $ne: 'deleted' } });
    if (memberCount > 0) {
      return res.status(409).json({ error: `Cannot delete: ${memberCount} member(s) are assigned to this tier. Reassign them first.` });
    }

    const tier = await MembershipTier.findByIdAndDelete(req.params.id);
    if (!tier) return res.status(404).json({ error: 'Membership tier not found' });

    return res.json({ message: 'Membership tier deleted' });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/membership-tiers (public) ────────────────────────────
async function publicList(req, res, next) {
  try {
    const tiers = await MembershipTier.find({ isActive: true }).sort('sortOrder')
      .select('name slug description price billingPeriod benefits color');
    return res.json(tiers);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove, publicList };
