const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const TicketLineSchema = new mongoose.Schema({
  ticket_type: { type: String, required: true }, // regular, vip, child
  quantity: { type: Number, required: true, min: 1 },
  unit_price: { type: Number, required: true },
  line_total: { type: Number, required: true },
}, { _id: false });

const TicketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    unique: true,
    default: () => `NIA-TKT-${uuidv4().slice(0, 8).toUpperCase()}`,
  },
  event_id: { type: String, default: 'NIA-EVENT-20260815' },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  attendee_names: { type: String, trim: true },
  tickets: [TicketLineSchema],
  discountCode: { type: mongoose.Schema.Types.ObjectId, ref: 'DiscountCode' },
  discount_code: { type: String },
  discount_pct: { type: Number, default: 0 },
  subtotal: { type: Number, required: true },
  discount_amount: { type: Number, default: 0 },
  amount: { type: Number, required: true }, // final amount after discount
  // Feature B — automatic per-tier membership discount, distinct from a Feature A discount code
  membershipDiscountApplied: { type: Boolean, default: false },
  membershipDiscountTier: { type: mongoose.Schema.Types.ObjectId, ref: 'MembershipTier' },
  membershipDiscountAmount: { type: Number },
  membershipDiscountUnits: { type: Number, default: 0 }, // how many ticket units in this order got the discount — the actual cap-consumption unit
  ticket_status: {
    type: String,
    enum: ['pending_payment', 'paid', 'failed', 'expired', 'canceled', 'refunded'],
    default: 'pending_payment',
  },
  payment_provider: { type: String, default: 'mollie' },
  mollie_payment_id: { type: String },
  paid_at: { type: Date },
  qr_code: { type: String },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  refunded_at: { type: Date },
  refund_amount: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('Ticket', TicketSchema);
