const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const MembershipSchema = new mongoose.Schema({
  membershipId: {
    type: String,
    unique: true,
    default: () => `NIA-MEM-${uuidv4().slice(0, 8).toUpperCase()}`,
  },
  plan: {
    type: String,
    enum: ['friend', 'patron'],
    required: true,
  },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  partnerName: { type: String, trim: true },
  partnerEmail: { type: String, trim: true, lowercase: true },
  partnerPhone: { type: String, trim: true },
  discountCode: { type: mongoose.Schema.Types.ObjectId, ref: 'DiscountCode' },
  discount_code: { type: String },
  discount_type: { type: String, enum: ['percentage', 'fixed'] },
  discount_value: { type: Number },
  discount_amount: { type: Number, default: 0 },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending_payment', 'paid', 'failed', 'expired', 'canceled'],
    default: 'pending_payment',
  },
  payment_status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'expired', 'canceled'],
    default: 'pending',
  },
  payment_provider: { type: String, default: 'mollie' },
  mollie_payment_id: { type: String },
  paid_at: { type: Date },
  qr_code: { type: String },
  digital_card_url: { type: String },
  activated_at: { type: Date },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
}, { timestamps: true });

module.exports = mongoose.model('Membership', MembershipSchema);
