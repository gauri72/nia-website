const Notification = require('../../models/Notification');

// ── GET /api/admin/notifications ──────────────────────────────────
async function list(req, res, next) {
  try {
    const notifications = await Notification.find({ recipientKind: 'admin', recipient: req.admin.id })
      .sort('-createdAt').limit(50);
    const unreadCount = await Notification.countDocuments({ recipientKind: 'admin', recipient: req.admin.id, read: false });
    return res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/notifications/mark-all-read ────────────────────
async function markAllRead(req, res, next) {
  try {
    await Notification.updateMany({ recipientKind: 'admin', recipient: req.admin.id, read: false }, { read: true });
    return res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, markAllRead };
