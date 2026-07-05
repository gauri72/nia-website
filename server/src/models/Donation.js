const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const DonationSchema = new mongoose.Schema({
  referenceNumber: {
    type: String,
    unique: true,
    default: () => `NIA-DON-${uuidv4().slice(0, 8).toUpperCase()}`,
  },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  amount: { type: Number, required: true, min: 1 },
  cause: {
    type: String,
    enum: ['general', 'cultural_events', 'youth_education', 'community_welfare'],
    default: 'general',
  },
  tier: { type: String }, // supporter, friend, patron, champion, custom
  donation_status: {
    type: String,
    enum: ['pending_payment', 'paid', 'failed', 'expired', 'canceled'],
    default: 'pending_payment',
  },
  payment_provider: { type: String, default: 'mollie' },
  mollie_payment_id: { type: String },
  paid_at: { type: Date },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
}, { timestamps: true });

module.exports = mongoose.model('Donation', DonationSchema);
