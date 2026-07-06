const mongoose = require('mongoose');

const BroadcastSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate', required: true },
  subject: { type: String, required: true },
  previewText: { type: String },
  audience: {
    type: {
      type: String,
      enum: [
        'all_members', 'tier', 'event_attendees', 'custom_list',
        // Sourced from the Contact ("Users") list rather than Member —
        // see broadcastService.js's resolveAudienceMembers for how each resolves.
        'all_contacts', 'specific_contact', 'sponsors', 'advisors', 'board_members',
      ],
      required: true,
    },
    tierIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MembershipTier' }],
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
    contactIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }],
    joinedAfter: { type: Date },
    joinedBefore: { type: Date },
  },
  personalizationVars: { type: mongoose.Schema.Types.Mixed },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'sent', 'canceled', 'failed'],
    default: 'draft',
  },
  scheduledAt: { type: Date },
  timezone: { type: String, default: 'Europe/Amsterdam' },
  sentAt: { type: Date },
  stats: {
    totalRecipients: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
    bounced: { type: Number, default: 0 },
    unsubscribed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
  },
  testSendEmails: [{ type: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
}, { timestamps: true });

module.exports = mongoose.model('Broadcast', BroadcastSchema);
