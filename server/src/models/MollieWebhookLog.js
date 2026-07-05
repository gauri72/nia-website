const mongoose = require('mongoose');

const MollieWebhookLogSchema = new mongoose.Schema({
  paymentId: { type: String, required: true },
  receivedAt: { type: Date, default: Date.now },
  action: { type: String, enum: ['created', 'updated', 'skipped', 'flagged', 'error'] },
  status: { type: String, enum: ['success', 'failed', 'retrying'], default: 'success' },
  attempts: { type: Number, default: 1 },
  error: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('MollieWebhookLog', MollieWebhookLogSchema);
