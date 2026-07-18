const EmailAsset = require('../models/EmailAsset');

// ── GET /api/email-assets/:key/image (public) ───────────────────────
async function image(req, res, next) {
  try {
    const asset = await EmailAsset.findOne({ key: req.params.key }).select('imageData contentType');
    if (!asset) return res.status(404).end();

    res.set('Content-Type', asset.contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(asset.imageData);
  } catch (err) {
    next(err);
  }
}

module.exports = { image };
