const mongoose = require('mongoose');

const RedemptionSchema = new mongoose.Schema({
  email: { type: String, required: true, trim: true, lowercase: true },
  productType: { type: String, enum: ['ticket', 'membership', 'sponsorship'], required: true },
  referenceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  redeemedAt: { type: Date, default: Date.now },
}, { _id: false });

const DiscountCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, trim: true },
  type: { type: String, enum: ['percentage', 'fixed'], required: true },
  value: { type: Number, required: true, min: 0 },
  applicableProducts: [{ type: String, enum: ['ticket', 'membership', 'sponsorship'] }], // empty = all
  maxRedemptions: { type: Number, min: 0 }, // null/undefined = unlimited
  maxRedemptionsPerCustomer: { type: Number, default: 1, min: 0 }, // 0 = unlimited
  redemptionCount: { type: Number, default: 0 },
  redeemedBy: [RedemptionSchema],
  startsAt: { type: Date },
  expiresAt: { type: Date },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('DiscountCode', DiscountCodeSchema);
