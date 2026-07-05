const SuppressionList = require('../../models/SuppressionList');
const Member = require('../../models/Member');

// ── GET /api/suppression-list ──────────────────────────────────────
async function list(req, res, next) {
  try {
    const entries = await SuppressionList.find().populate('member', 'firstName lastName').sort('-suppressedAt');
    return res.json(entries);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/suppression-list/:id/resubscribe ─────────────────────
async function resubscribe(req, res, next) {
  try {
    const entry = await SuppressionList.findById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Suppression entry not found' });

    if (entry.member) {
      await Member.findByIdAndUpdate(entry.member, {
        unsubscribedAt: null,
        'communicationPrefs.newsletter': true,
        'communicationPrefs.promotional': true,
      });
    }
    await entry.deleteOne();

    return res.json({ message: 'Resubscribed successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, resubscribe };
