const mongoose = require('mongoose');

const ICONS = ['medal', 'star', 'crown', 'gem', 'trophy', 'award'];

const SponsorshipTierSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, trim: true },
  price: { type: Number, required: true, min: 0 },
  ticketCount: { type: Number, default: 0, min: 0 },
  perks: [{ type: String }],
  icon: { type: String, enum: ICONS, default: 'medal' },
  color: { type: String, default: '#1a2b5e' },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('SponsorshipTier', SponsorshipTierSchema);
module.exports.ICONS = ICONS;
