const mongoose = require('mongoose');

// Images embedded inline in broadcast/email template HTML (e.g. a venue
// parking photo), stored directly in Mongo rather than on disk — Render's
// web service filesystem is ephemeral and wipes anything written at runtime
// (like a Media Manager upload) on every deploy. See SponsorLogo.js for the
// same reasoning, applied there to homepage sponsor logos.
const EmailAssetSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  imageData: { type: Buffer, required: true },
  contentType: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('EmailAsset', EmailAssetSchema);
