const mongoose = require('mongoose');

// Tracks Member-Dashboard-driven membership purchases (new/renewal/upgrade) against
// the flexible MembershipTier system. Deliberately separate from the legacy
// Membership model (which stays untouched, tied to the public Friend/Patron flow).
const MembershipPaymentSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  membershipTier: { type: mongoose.Schema.Types.ObjectId, ref: 'MembershipTier', required: true },
  previousTier: { type: mongoose.Schema.Types.ObjectId, ref: 'MembershipTier' },
  type: { type: String, enum: ['new', 'renewal', 'upgrade'], default: 'renewal' },
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
  payment_provider: { type: String, default: 'mollie' },
  mollie_payment_id: { type: String },
  paid_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('MembershipPayment', MembershipPaymentSchema);
