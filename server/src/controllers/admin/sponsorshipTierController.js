const SponsorshipTier = require('../../models/SponsorshipTier');
const Sponsorship = require('../../models/Sponsorship');

function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ── GET /api/admin/sponsorship-tiers ──────────────────────────────
async function list(req, res, next) {
  try {
    const tiers = await SponsorshipTier.find().sort('sortOrder');
    return res.json(tiers);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/sponsorship-tiers ─────────────────────────────
async function create(req, res, next) {
  try {
    const { name, description, price, ticketCount, perks, icon, color, isActive } = req.body;
    if (!name?.trim() || price === undefined || price === null) {
      return res.status(400).json({ error: 'name and price are required' });
    }

    const slug = slugify(name);
    const existing = await SponsorshipTier.findOne({ $or: [{ name: name.trim() }, { slug }] });
    if (existing) return res.status(409).json({ error: 'A tier with this name already exists' });

    const tier = await SponsorshipTier.create({
      name: name.trim(),
      slug,
      description: description?.trim(),
      price,
      ticketCount: ticketCount || 0,
      perks: Array.isArray(perks) ? perks.filter(Boolean) : [],
      icon: icon || 'medal',
      color,
      isActive: isActive !== undefined ? isActive : true,
    });

    return res.status(201).json(tier);
  } catch (err) {
    next(err);
  }
}

// ── PUT /api/admin/sponsorship-tiers/:id ───────────────────────────
async function update(req, res, next) {
  try {
    const { name, description, price, ticketCount, perks, icon, color, isActive, sortOrder } = req.body;

    const update = {};
    if (name !== undefined) { update.name = name.trim(); update.slug = slugify(name); }
    if (description !== undefined) update.description = description.trim();
    if (price !== undefined) update.price = price;
    if (ticketCount !== undefined) update.ticketCount = ticketCount || 0;
    if (perks !== undefined) update.perks = Array.isArray(perks) ? perks.filter(Boolean) : [];
    if (icon !== undefined) update.icon = icon;
    if (color !== undefined) update.color = color;
    if (isActive !== undefined) update.isActive = isActive;
    if (sortOrder !== undefined) update.sortOrder = sortOrder;

    const tier = await SponsorshipTier.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!tier) return res.status(404).json({ error: 'Sponsorship tier not found' });

    return res.json(tier);
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/admin/sponsorship-tiers/:id ────────────────────────
async function remove(req, res, next) {
  try {
    const usedCount = await Sponsorship.countDocuments({ sponsorshipTier: req.params.id });
    if (usedCount > 0) {
      return res.status(409).json({ error: `Cannot delete: ${usedCount} sponsorship(s) reference this tier. It's kept for historical records.` });
    }

    const tier = await SponsorshipTier.findByIdAndDelete(req.params.id);
    if (!tier) return res.status(404).json({ error: 'Sponsorship tier not found' });

    return res.json({ message: 'Sponsorship tier deleted' });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/sponsorship-tiers (public) ────────────────────────────
async function publicList(req, res, next) {
  try {
    const tiers = await SponsorshipTier.find({ isActive: true }).sort('sortOrder')
      .select('name slug description price ticketCount perks icon color');
    return res.json(tiers);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove, publicList };
