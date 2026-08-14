const mongoose = require('mongoose');

const TicketTypeSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  name: { type: String, required: true, trim: true }, // General Admission, VIP, Early Bird, Member Price, Free
  price: { type: Number, required: true, min: 0 },
  memberPrice: { type: Number, min: 0 },
  quantityTotal: { type: Number, required: true, min: 0 },
  quantitySold: { type: Number, default: 0 },
  maxPerOrder: { type: Number, default: 10 },
  salesStart: { type: Date },
  salesEnd: { type: Date },
  membershipDiscount: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  // Matching Ticket.tickets[].ticket_type key (e.g. 'vip', 'gala') when this
  // type's parent Event has a legacyEventId set — lets quantitySold be
  // overridden with the real per-type count instead of staying at 0.
  legacyTicketTypeKey: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('TicketType', TicketTypeSchema);
