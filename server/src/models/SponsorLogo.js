const mongoose = require('mongoose');

// Featured logos shown in the homepage "Our Sponsors" carousel — display-only,
// intentionally separate from Sponsorship (which tracks paid packages/transactions),
// since a homepage logo isn't always tied to a single payment record.
//
// The image itself is stored directly on the document (logoData/logoContentType)
// rather than as a URL to a file on disk — Render's web service filesystem is
// ephemeral and wipes server/uploads/ on every deploy, which was silently
// breaking every logo. These images are small (a handful of KB-to-low-MB
// each), well within MongoDB's 16MB document limit, and Atlas — unlike the
// app server's local disk — isn't reset on deploy.
const SponsorLogoSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  logoData: { type: Buffer, required: true },
  logoContentType: { type: String, required: true },
  tier: { type: String, trim: true }, // free-text badge, e.g. "Platinum" — no FK to SponsorshipTier
  websiteUrl: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('SponsorLogo', SponsorLogoSchema);
