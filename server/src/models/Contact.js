const mongoose = require('mongoose');

const USER_TYPES = ['user', 'sponsor_partner', 'friend_membership', 'advisory_council', 'board_member'];

const ContactSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  userType: { type: String, enum: USER_TYPES, default: 'user' },
  notes: { type: String, trim: true },
  // Set once an admin converts this contact into a real Member record — keeps
  // the conversion one-way and traceable, and lets the UI show "Member ✓"
  // instead of offering to convert again.
  linkedMember: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  convertedToMemberAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Contact', ContactSchema);
module.exports.USER_TYPES = USER_TYPES;
