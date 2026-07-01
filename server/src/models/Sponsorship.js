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
  packageName: {
    type: String,
    enum: ['silver', 'gold', 'platinum', 'diamond'],
    required: true,
  },
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
}, { timestamps: true });

module.exports = mongoose.model('Sponsorship', SponsorshipSchema);
