const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const SponsorshipSchema = new mongoose.Schema({
  referenceNumber: {
    type: String,
    unique: true,
    default: () => `NIA-SPO-${uuidv4().slice(0, 8).toUpperCase()}`,
  },
  sponsorName: { type: String, required: true, trim: true },
  contactPerson: { type: String, required: true, trim: true },
  companyName: { type: String, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  sponsorshipTier: { type: mongoose.Schema.Types.ObjectId, ref: 'SponsorshipTier' },
  packageName: { type: String, required: true }, // snapshot of the tier name/slug at purchase time — free text since tiers are now admin-defined, not a fixed enum
  discountCode: { type: mongoose.Schema.Types.ObjectId, ref: 'DiscountCode' },
  discount_code: { type: String },
  discount_type: { type: String, enum: ['percentage', 'fixed'] },
  discount_value: { type: Number },
  discount_amount: { type: Number, default: 0 },
  amount: { type: Number, required: true },
  eventId: { type: String },
  remarks: { type: String, trim: true },
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
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
}, { timestamps: true });

module.exports = mongoose.model('Sponsorship', SponsorshipSchema);
