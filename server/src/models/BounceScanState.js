const mongoose = require('mongoose');

// Tracks IMAP scan progress per mailbox so bounceDetectionService only ever
// processes messages it hasn't seen before, without marking them read/moving
// them — the mailbox is also used for real human correspondence.
const BounceScanStateSchema = new mongoose.Schema({
  mailbox: { type: String, required: true, unique: true },
  // Stored as a string — IMAP UIDVALIDITY is a bigint and doesn't round-trip
  // cleanly through Mongo/JSON.
  uidValidity: { type: String },
  lastUid: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('BounceScanState', BounceScanStateSchema);
