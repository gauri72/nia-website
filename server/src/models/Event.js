const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const EventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    unique: true,
    default: () => `NIA-EVT-${uuidv4().slice(0, 8).toUpperCase()}`,
  },
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, trim: true },
  shortDescription: { type: String, trim: true },
  category: {
    type: String,
    enum: ['Cultural', 'Community', 'Workshop', 'Festival', 'Exhibition', 'Performance', 'Other'],
    default: 'Other',
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  timezone: { type: String, default: 'Europe/Amsterdam' },
  venueName: { type: String, trim: true },
  venueAddress: { type: String, trim: true },
  venueCity: { type: String, trim: true },
  coverImageUrl: { type: String },
  galleryImageUrls: [{ type: String }],
  capacity: { type: Number },
  status: {
    type: String,
    enum: ['draft', 'published', 'unpublished', 'cancelled', 'completed'],
    default: 'draft',
  },
  memberDiscountPct: { type: Number, default: 0 },
  isFeatured: { type: Boolean, default: false },
  // Set only for events whose real sales run through the legacy Ticket
  // model (guest checkout/VIP passes/sponsor comps) instead of this Event's
  // own Booking flow — holds that Ticket.event_id so eventAdminController
  // can blend in the real sold counts/attendees. Unset for a normal event.
  legacyEventId: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  publishedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);
