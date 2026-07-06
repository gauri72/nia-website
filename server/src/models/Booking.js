const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const BookingLineSchema = new mongoose.Schema({
  ticketType: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketType', required: true },
  name: { type: String, required: true }, // snapshot of ticket type name at time of booking
  quantity: { type: Number, required: true, min: 1 },
  unit_price: { type: Number, required: true },
  line_total: { type: Number, required: true },
}, { _id: false });

const BookingSchema = new mongoose.Schema({
  bookingNumber: {
    type: String,
    unique: true,
    default: () => `NIA-BKG-${uuidv4().slice(0, 8).toUpperCase()}`,
  },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  lines: [BookingLineSchema],
  subtotal: { type: Number, required: true },
  discountCode: { type: mongoose.Schema.Types.ObjectId, ref: 'DiscountCode' },
  discount_code: { type: String },
  discount_pct: { type: Number, default: 0 },
  discount_amount: { type: Number, default: 0 },
  amount: { type: Number, required: true },
  // Feature B — automatic per-tier membership discount, distinct from a Feature A discount code
  membershipDiscountApplied: { type: Boolean, default: false },
  membershipDiscountTier: { type: mongoose.Schema.Types.ObjectId, ref: 'MembershipTier' },
  membershipDiscountAmount: { type: Number },
  status: {
    type: String,
    enum: ['pending_payment', 'paid', 'failed', 'expired', 'canceled', 'refunded'],
    default: 'pending_payment',
  },
  payment_provider: { type: String, default: 'mollie' },
  mollie_payment_id: { type: String },
  paid_at: { type: Date },
  qr_code: { type: String },
  refund_requested_at: { type: Date },
  refunded_at: { type: Date },
  refund_amount: { type: Number },
  checkedInAt: { type: Date },
  reminderSentAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);
