const mongoose = require('mongoose');

// A running audit log of every door scan — both ticket check-ins (which also
// flip Ticket.checkedInAt so a ticket can't be silently reused) and member ID
// verifications (which don't block re-scans, since confirming identity twice
// isn't a problem the way redeeming a ticket twice is).
const EventCheckInSchema = new mongoose.Schema({
  type: { type: String, enum: ['ticket', 'member'], required: true },
  ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  code: { type: String, required: true, trim: true },
  name: { type: String },
  email: { type: String },
  scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  scannedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('EventCheckIn', EventCheckInSchema);
