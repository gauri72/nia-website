const mongoose = require('mongoose');

const MollieImportLogSchema = new mongoose.Schema({
  triggeredBy: { type: String, enum: ['manual', 'webhook'], required: true },
  triggeredByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  totalFetched: { type: Number, default: 0 },
  created: { type: Number, default: 0 },
  updated: { type: Number, default: 0 },
  flagged: { type: Number, default: 0 },
  skipped: { type: Number, default: 0 },
  status: { type: String, enum: ['running', 'completed', 'failed'], default: 'running' },
  error: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('MollieImportLog', MollieImportLogSchema);
