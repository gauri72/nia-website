const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const TicketLineSchema = new mongoose.Schema({
  ticket_type: { type: String, required: true }, // regular, vip, child
  quantity: { type: Number, required: true, min: 1 },
  unit_price: { type: Number, required: true },
  line_total: { type: Number, required: true },
}, { _id: false });

// One sub-document per individual attendee/seat, expanded from TicketLineSchema's
// quantity — lets each attendee in a multi-quantity order be checked in
// independently instead of the whole order sharing one boolean check-in.
const TicketUnitSchema = new mongoose.Schema({
  unitNumber: { type: String, required: true }, // e.g. NIA-TKT-1F7F8562-1
  ticketType: { type: String, required: true },
  attendeeName: { type: String, trim: true },
  checkedInAt: { type: Date },
  checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
}, { _id: false });

// Exported (not just used as the schema default below) so callers that need
// units[] built in the same .create() call — rather than a create-then-save
// round trip — can generate the number up front and reuse it for both.
const generateTicketNumber = () => `NIA-TKT-${uuidv4().slice(0, 8).toUpperCase()}`;

const TicketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    unique: true,
    default: generateTicketNumber,
  },
  event_id: { type: String, default: 'NIA-EVENT-20260815' },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  attendee_names: { type: String, trim: true },
  tickets: [TicketLineSchema],
  // Populated at creation for new orders, backfilled once for pre-existing paid
  // orders (see scripts/backfillTicketUnits.js). Empty on the rare doc neither
  // path has touched yet — PDF/check-in code falls back to order-level behavior
  // in that case.
  units: { type: [TicketUnitSchema], default: [] },
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
    enum: ['pending_payment', 'paid', 'failed', 'expired', 'canceled', 'refunded', 'voided'],
    default: 'pending_payment',
  },
  payment_provider: { type: String, default: 'mollie' },
  mollie_payment_id: { type: String },
  paid_at: { type: Date },
  qr_code: { type: String },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  refunded_at: { type: Date },
  refund_amount: { type: Number },
  voided_at: { type: Date },
  void_reason: { type: String, trim: true },
  voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  // Event-door check-in, additive to the existing payment flow — same pattern as Booking.checkedInAt.
  checkedInAt: { type: Date },
  checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
}, { timestamps: true });

// Sparse — most historical docs have units: [] until backfilled, no need to index those.
TicketSchema.index({ 'units.unitNumber': 1 }, { sparse: true });

module.exports = mongoose.model('Ticket', TicketSchema);
module.exports.generateTicketNumber = generateTicketNumber;
