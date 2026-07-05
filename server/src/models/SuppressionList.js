const mongoose = require('mongoose');

const SuppressionListSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  reason: { type: String, enum: ['unsubscribed', 'bounced', 'complained', 'manual'], required: true },
  broadcast: { type: mongoose.Schema.Types.ObjectId, ref: 'Broadcast' },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  suppressedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('SuppressionList', SuppressionListSchema);
