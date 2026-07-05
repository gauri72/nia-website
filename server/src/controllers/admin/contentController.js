const ContentBlock = require('../../models/ContentBlock');

// ── GET /api/admin/content ────────────────────────────────────────
async function list(req, res, next) {
  try {
    const blocks = await ContentBlock.find();
    return res.json(blocks);
  } catch (err) {
    next(err);
  }
}

// ── PUT /api/admin/content/:key ───────────────────────────────────
async function upsert(req, res, next) {
  try {
    const { section, data } = req.body;
    if (!section) return res.status(400).json({ error: 'section is required' });

    const block = await ContentBlock.findOneAndUpdate(
      { key: req.params.key },
      { key: req.params.key, section, data, updatedBy: req.admin.id },
      { upsert: true, new: true, runValidators: true }
    );
    return res.json(block);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, upsert };
