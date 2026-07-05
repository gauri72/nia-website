const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const MemberSchema = new mongoose.Schema({
  memberId: {
    type: String,
    unique: true,
    default: () => `NIA-MBR-${uuidv4().slice(0, 8).toUpperCase()}`,
  },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  profilePhotoUrl: { type: String },

  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  emailVerificationExpires: { type: Date },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },

  membershipTier: { type: mongoose.Schema.Types.ObjectId, ref: 'MembershipTier' },
  membershipStatus: {
    type: String,
    enum: ['none', 'active', 'expired', 'pending', 'suspended', 'canceled'],
    default: 'none',
  },
  membershipExpiresAt: { type: Date },
  autoRenew: { type: Boolean, default: false },
  renewalReminderSentAt: { type: Date },
  currentMembershipRecord: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership' },

  communicationPrefs: {
    newsletter: { type: Boolean, default: true },
    eventReminders: { type: Boolean, default: true },
    promotional: { type: Boolean, default: true },
  },
  unsubscribedAt: { type: Date },

  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active',
  },
  lastLoginAt: { type: Date },

  source: { type: String, enum: ['registration', 'mollie_import'], default: 'registration' },
  importedAt: { type: Date },
  lastImportPaymentId: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Member', MemberSchema);
