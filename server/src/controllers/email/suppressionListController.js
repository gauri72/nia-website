const SuppressionList = require('../../models/SuppressionList');
const Member = require('../../models/Member');

// ── GET /api/suppression-list ──────────────────────────────────────
// ?reason=bounced restricts to one suppression reason; ?archived=true/false
// filters by archive state (default: archived entries are hidden).
async function list(req, res, next) {
  try {
    const { reason, archived } = req.query;
    const filter = {};
    if (reason?.trim()) filter.reason = reason.trim();
    filter.archived = archived === 'true';

    const entries = await SuppressionList.find(filter)
      .populate('member', 'firstName lastName')
      .populate('broadcast', 'name subject')
      .sort('-suppressedAt');
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

// ── POST /api/suppression-list/:id/archive ──────────────────────────
// Hides the entry from the default view without removing the suppression —
// the address stays excluded from future broadcasts either way.
async function archive(req, res, next) {
  try {
    const entry = await SuppressionList.findByIdAndUpdate(
      req.params.id, { archived: true, archivedAt: new Date() }, { new: true },
    );
    if (!entry) return res.status(404).json({ error: 'Suppression entry not found' });
    return res.json(entry);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/suppression-list/:id/unarchive ────────────────────────
async function unarchive(req, res, next) {
  try {
    const entry = await SuppressionList.findByIdAndUpdate(
      req.params.id, { $set: { archived: false }, $unset: { archivedAt: '' } }, { new: true },
    );
    if (!entry) return res.status(404).json({ error: 'Suppression entry not found' });
    return res.json(entry);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, resubscribe, archive, unarchive };
