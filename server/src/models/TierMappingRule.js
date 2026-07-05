const mongoose = require('mongoose');

// Fallback matching used only for Mollie transactions with no local record to join against
// (i.e. genuinely orphaned payments — not created by this app's own checkout flows).
const TierMappingRuleSchema = new mongoose.Schema({
  matchType: { type: String, enum: ['amount', 'keyword'], required: true },
  matchValue: { type: String, required: true, trim: true }, // e.g. "25.00" or "vip"
  membershipTier: { type: mongoose.Schema.Types.ObjectId, ref: 'MembershipTier', required: true },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('TierMappingRule', TierMappingRuleSchema);
