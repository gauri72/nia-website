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
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  publishedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);
