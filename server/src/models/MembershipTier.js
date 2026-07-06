const mongoose = require('mongoose');

const MembershipTierSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, trim: true },
  price: { type: Number, required: true, min: 0 },
  billingPeriod: { type: String, enum: ['monthly', 'annual'], default: 'annual' },
  benefits: [{ type: String }],
  maxMembers: { type: Number }, // null/undefined = unlimited
  color: { type: String, default: '#1a2b5e' },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  autoRenewDefault: { type: Boolean, default: false },
  renewalReminderDays: { type: Number, default: 7 },
  gracePeriodDays: { type: Number, default: 0 },
  // Feature B — automatic ticket discount for active members of this tier, applied without a code.
  // null/undefined type = no automatic discount for this tier.
  ticketDiscountType: { type: String, enum: ['percentage', 'fixed'] },
  ticketDiscountValue: { type: Number, min: 0 },
  ticketDiscountMaxPerEvent: { type: Number, default: 1, min: 1 }, // how many discounted tickets one member can get per event
}, { timestamps: true });

module.exports = mongoose.model('MembershipTier', MembershipTierSchema);
