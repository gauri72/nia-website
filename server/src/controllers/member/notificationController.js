const Notification = require('../../models/Notification');

// ── GET /api/member/notifications ─────────────────────────────────
async function list(req, res, next) {
  try {
    const notifications = await Notification.find({ recipientKind: 'member', recipient: req.member.id })
      .sort('-createdAt').limit(50);
    const unreadCount = await Notification.countDocuments({ recipientKind: 'member', recipient: req.member.id, read: false });
    return res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/member/notifications/mark-all-read ───────────────────
async function markAllRead(req, res, next) {
  try {
    await Notification.updateMany({ recipientKind: 'member', recipient: req.member.id, read: false }, { read: true });
    return res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, markAllRead };
