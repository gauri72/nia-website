const Donation = require('../../models/Donation');

// ── GET /api/admin/donations — paid donations only ─────────────────
async function list(req, res, next) {
  try {
    const { search, page = 1, limit = 25 } = req.query;
    const filter = { donation_status: 'paid' };
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { referenceNumber: new RegExp(search, 'i') },
      ];
    }

    const [items, total, stats] = await Promise.all([
      Donation.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(Number(limit)),
      Donation.countDocuments(filter),
      Donation.aggregate([
        { $match: { donation_status: 'paid' } },
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

// ── GET /api/admin/donations/:id ────────────────────────────────────
async function getById(req, res, next) {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ error: 'Donation not found' });
    return res.json(donation);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById };
