const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipientKind: { type: String, enum: ['admin', 'member'], required: true },
  recipientModel: { type: String, enum: ['AdminUser', 'Member'], required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'recipientModel' },
  title: { type: String, required: true },
  body: { type: String },
  link: { type: String },
  read: { type: Boolean, default: false },
}, { timestamps: true });

NotificationSchema.index({ recipientKind: 1, recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
