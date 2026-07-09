const SponsorLogo = require('../../models/SponsorLogo');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5050';

function withComputedUrl(logo) {
  return { ...logo, logoUrl: `${BACKEND_URL}/api/sponsor-logos/${logo._id}/image` };
}

// ── GET /api/admin/sponsor-logos ────────────────────────────────────
async function list(req, res, next) {
  try {
    const logos = await SponsorLogo.find().select('-logoData').sort('sortOrder').lean();
    return res.json(logos.map(withComputedUrl));
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/sponsor-logos ───────────────────────────────────
// Expects multipart/form-data — the image (field "logo") is stored directly
// on the document, not on disk (see SponsorLogo.js for why).
async function create(req, res, next) {
  try {
    const { name, tier, websiteUrl, isActive, sortOrder } = req.body;
    if (!name?.trim() || !req.file) {
      return res.status(400).json({ error: 'name and a logo image are required' });
    }

    const logo = await SponsorLogo.create({
      name: name.trim(),
      logoData: req.file.buffer,
      logoContentType: req.file.mimetype,
      tier: tier?.trim(),
      websiteUrl: websiteUrl?.trim(),
      isActive: isActive === undefined ? true : isActive === 'true' || isActive === true,
      sortOrder: sortOrder ? Number(sortOrder) : 0,
    });

    return res.status(201).json(withComputedUrl(logo.toObject({ transform: (doc, ret) => { delete ret.logoData; return ret; } })));
  } catch (err) {
    next(err);
  }
}

// ── PUT /api/admin/sponsor-logos/:id ────────────────────────────────
// The image is only replaced if a new file is uploaded — editing just the
// name/tier/etc. doesn't require re-uploading the logo.
async function update(req, res, next) {
  try {
    const { name, tier, websiteUrl, isActive, sortOrder } = req.body;

    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (tier !== undefined) update.tier = tier.trim();
    if (websiteUrl !== undefined) update.websiteUrl = websiteUrl.trim();
    if (isActive !== undefined) update.isActive = isActive === 'true' || isActive === true;
    if (sortOrder !== undefined) update.sortOrder = Number(sortOrder) || 0;
    if (req.file) {
      update.logoData = req.file.buffer;
      update.logoContentType = req.file.mimetype;
    }

    const logo = await SponsorLogo.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
      .select('-logoData').lean();
    if (!logo) return res.status(404).json({ error: 'Sponsor logo not found' });

    return res.json(withComputedUrl(logo));
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
      .select('name tier websiteUrl').lean();
    return res.json(logos.map(withComputedUrl));
  } catch (err) {
    next(err);
  }
}

// ── GET /api/sponsor-logos/:id/image (public) ───────────────────────
async function image(req, res, next) {
  try {
    const logo = await SponsorLogo.findById(req.params.id).select('logoData logoContentType');
    if (!logo?.logoData) return res.status(404).end();

    res.set('Content-Type', logo.logoContentType);
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(logo.logoData);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove, publicList, image };
