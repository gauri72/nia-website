const Sponsorship = require('../../models/Sponsorship');

// ── GET /api/admin/sponsorships — paid sponsorships only ──────────
async function list(req, res, next) {
  try {
    const { search, page = 1, limit = 25 } = req.query;
    const filter = { status: 'paid' };
    if (search) {
      filter.$or = [
        { sponsorName: new RegExp(search, 'i') },
        { contactPerson: new RegExp(search, 'i') },
        { companyName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { referenceNumber: new RegExp(search, 'i') },
      ];
    }

    const [items, total, stats] = await Promise.all([
      Sponsorship.find(filter).populate('sponsorshipTier', 'name color').sort('-createdAt').skip((page - 1) * limit).limit(Number(limit)),
      Sponsorship.countDocuments(filter),
      Sponsorship.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$amount' } } },
      ]),
    ]);

    const summary = stats[0] || { count: 0, revenue: 0 };
    return res.json({
      items, total, page: Number(page), pages: Math.ceil(total / limit),
      summary: { paidCount: summary.count, revenue: summary.revenue },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/sponsorships/:id ────────────────────────────────
async function getById(req, res, next) {
  try {
    const sponsorship = await Sponsorship.findById(req.params.id).populate('sponsorshipTier', 'name color');
    if (!sponsorship) return res.status(404).json({ error: 'Sponsorship not found' });
    return res.json(sponsorship);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById };
