const SponsorLogo = require('../../models/SponsorLogo');

// ── GET /api/admin/sponsor-logos ────────────────────────────────────
async function list(req, res, next) {
  try {
    const logos = await SponsorLogo.find().sort('sortOrder');
    return res.json(logos);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/sponsor-logos ───────────────────────────────────
async function create(req, res, next) {
  try {
    const { name, logoUrl, tier, websiteUrl, isActive, sortOrder } = req.body;
    if (!name?.trim() || !logoUrl?.trim()) {
      return res.status(400).json({ error: 'name and logoUrl are required' });
    }

    const logo = await SponsorLogo.create({
      name: name.trim(),
      logoUrl: logoUrl.trim(),
      tier: tier?.trim(),
      websiteUrl: websiteUrl?.trim(),
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder || 0,
    });

    return res.status(201).json(logo);
  } catch (err) {
    next(err);
  }
}

// ── PUT /api/admin/sponsor-logos/:id ────────────────────────────────
async function update(req, res, next) {
  try {
    const { name, logoUrl, tier, websiteUrl, isActive, sortOrder } = req.body;

    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (logoUrl !== undefined) update.logoUrl = logoUrl.trim();
    if (tier !== undefined) update.tier = tier.trim();
    if (websiteUrl !== undefined) update.websiteUrl = websiteUrl.trim();
    if (isActive !== undefined) update.isActive = isActive;
    if (sortOrder !== undefined) update.sortOrder = sortOrder;

    const logo = await SponsorLogo.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!logo) return res.status(404).json({ error: 'Sponsor logo not found' });

    return res.json(logo);
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/admin/sponsor-logos/:id ─────────────────────────────
async function remove(req, res, next) {
  try {
    const logo = await SponsorLogo.findByIdAndDelete(req.params.id);
    if (!logo) return res.status(404).json({ error: 'Sponsor logo not found' });
    return res.json({ message: 'Sponsor logo deleted' });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/sponsor-logos (public) ─────────────────────────────────
async function publicList(req, res, next) {
  try {
    const logos = await SponsorLogo.find({ isActive: true }).sort('sortOrder')
      .select('name logoUrl tier websiteUrl');
    return res.json(logos);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove, publicList };
