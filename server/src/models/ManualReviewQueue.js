const mongoose = require('mongoose');

const ManualReviewQueueSchema = new mongoose.Schema({
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'MollieTransaction', required: true },
  email: { type: String, trim: true, lowercase: true },
  name: { type: String, trim: true },
  amount: { type: Number },
  description: { type: String },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'resolved', 'ignored'], default: 'pending' },
  resolvedAt: { type: Date },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  resolution: { type: mongoose.Schema.Types.Mixed }, // what action was taken (tier assigned, event linked, etc.)
}, { timestamps: true });

module.exports = mongoose.model('ManualReviewQueue', ManualReviewQueueSchema);
