const BroadcastRecipient = require('../../models/BroadcastRecipient');
const Broadcast = require('../../models/Broadcast');
const Member = require('../../models/Member');
const SuppressionList = require('../../models/SuppressionList');

const TRANSPARENT_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

// ── GET /api/broadcasts/track/:token/open ─────────────────────────
async function trackOpen(req, res) {
  try {
    const recipient = await BroadcastRecipient.findOne({ trackingToken: req.params.token });
    if (recipient && !recipient.openedAt) {
      recipient.openedAt = new Date();
      if (recipient.status === 'sent' || recipient.status === 'delivered') recipient.status = 'opened';
      await recipient.save();
      await Broadcast.findByIdAndUpdate(recipient.broadcast, { $inc: { 'stats.opened': 1 } });
    }
  } catch (err) {
    console.error('[Tracking] Open tracking failed:', err.message);
  }
  res.set('Content-Type', 'image/png');
  return res.send(TRANSPARENT_PIXEL);
}

// ── GET /api/broadcasts/track/:token/click?url=... ────────────────
async function trackClick(req, res) {
  const target = req.query.url || '/';
  try {
    const recipient = await BroadcastRecipient.findOne({ trackingToken: req.params.token });
    if (recipient) {
      const firstClick = !recipient.clickedAt;
      recipient.clickedAt = new Date();
      recipient.status = 'clicked';
      await recipient.save();
      if (firstClick) await Broadcast.findByIdAndUpdate(recipient.broadcast, { $inc: { 'stats.clicked': 1 } });
    }
  } catch (err) {
    console.error('[Tracking] Click tracking failed:', err.message);
  }
  return res.redirect(target);
}

// ── GET /api/unsubscribe?token=... ─────────────────────────────────
async function unsubscribe(req, res) {
  const { token } = req.query;
  const page = (title, message) => `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title></head>
    <body style="font-family:Arial,sans-serif;background:#f0f4ff;margin:0;padding:2rem;display:flex;align-items:center;justify-content:center;min-height:100vh;">
      <div style="background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(26,43,94,0.12);padding:3rem 2.5rem;max-width:420px;text-align:center;">
        <h1 style="color:#0F1F4B;font-size:1.4rem;margin:0 0 0.8rem;">${title}</h1>
        <p style="color:#4a6080;font-size:0.95rem;line-height:1.6;margin:0;">${message}</p>
      </div>
    </body></html>`;

  if (!token) return res.status(400).send(page('Invalid Link', 'This unsubscribe link is invalid.'));

  try {
    const recipient = await BroadcastRecipient.findOne({ trackingToken: token });
    const email = recipient?.email;
    if (!email) return res.status(404).send(page('Invalid Link', 'This unsubscribe link could not be found.'));

    if (recipient.status !== 'unsubscribed') {
      recipient.status = 'unsubscribed';
      await recipient.save();
      await Broadcast.findByIdAndUpdate(recipient.broadcast, { $inc: { 'stats.unsubscribed': 1 } });
    }

    await SuppressionList.findOneAndUpdate(
      { email },
      { email, reason: 'unsubscribed', broadcast: recipient.broadcast, member: recipient.member, suppressedAt: new Date() },
      { upsert: true, new: true }
    );

    if (recipient.member) {
      await Member.findByIdAndUpdate(recipient.member, {
        unsubscribedAt: new Date(),
        'communicationPrefs.newsletter': false,
        'communicationPrefs.promotional': false,
      });
    }

    return res.send(page('You\'re Unsubscribed', 'You will no longer receive broadcast emails from the Netherlands India Association. You can resubscribe at any time from your member profile.'));
  } catch (err) {
    console.error('[Unsubscribe] Failed:', err.message);
    return res.status(500).send(page('Something Went Wrong', 'Please try again later or contact us directly.'));
  }
}

module.exports = { trackOpen, trackClick, unsubscribe };
