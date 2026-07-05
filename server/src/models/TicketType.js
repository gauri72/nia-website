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
}, { timestamps: true });

module.exports = mongoose.model('TicketType', TicketTypeSchema);
