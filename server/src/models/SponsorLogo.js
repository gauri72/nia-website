const mongoose = require('mongoose');

// Featured logos shown in the homepage "Our Sponsors" carousel — display-only,
// intentionally separate from Sponsorship (which tracks paid packages/transactions),
// since a homepage logo isn't always tied to a single payment record.
const SponsorLogoSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  logoUrl: { type: String, required: true },
  tier: { type: String, trim: true }, // free-text badge, e.g. "Platinum" — no FK to SponsorshipTier
  websiteUrl: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('SponsorLogo', SponsorLogoSchema);
