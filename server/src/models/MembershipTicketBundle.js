const mongoose = require('mongoose');

const BundleTicketLineSchema = new mongoose.Schema({
  ticket_type: { type: String, required: true }, // regular, vip, child — matches ticketController.js's TICKET_PRICES
  quantity: { type: Number, required: true, min: 1 },
  unit_price: { type: Number, required: true },
  line_total: { type: Number, required: true },
}, { _id: false });

// A one-checkout "join/renew membership + book event tickets" purchase for a
// member with no active membership. This record is checkout orchestration
// only — on payment success, updateBundle() (databaseService.js) creates a
// real Ticket document and activates the Member's tier directly, the same
// way the standalone membership and ticket flows already do, so the rest of
// the app (Ticket Sales, door scanning, "My Membership") needs no bundle-
// specific special-casing. This record just tracks what was purchased and
// exists for the payment webhook + one combined confirmation email to key off.
const MembershipTicketBundleSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  membershipTier: { type: mongoose.Schema.Types.ObjectId, ref: 'MembershipTier', required: true },
  membershipAmount: { type: Number, required: true }, // tier price charged (no membership discount code support yet)
  tickets: [BundleTicketLineSchema],
  // Which event (server/src/config/events.js slug) these tickets are for —
  // read by databaseService.js's updateBundle() to tag the finalized Ticket
  // with the right event_id. Defaults to the original single-event slug so
  // any bundle already mid-flight when this field was added still resolves.
  eventSlug: { type: String, default: 'independence-day-2026' },
  attendee_names: { type: String, trim: true },
  ticketSubtotal: { type: Number, required: true }, // ticket lines at full (non-member) price
  ticketDiscountAmount: { type: Number, default: 0 }, // savings from the newly-joined tier's automatic ticket discount
  ticketDiscountUnits: { type: Number, default: 0 }, // how many ticket units actually got the discount (may be fewer than total quantity — tier's per-event cap, child tickets never eligible)
  amount: { type: Number, required: true }, // membershipAmount + (ticketSubtotal - ticketDiscountAmount)
  status: {
    type: String,
    enum: ['pending_payment', 'paid', 'failed', 'expired', 'canceled'],
    default: 'pending_payment',
  },
  payment_provider: { type: String, default: 'mollie' },
  mollie_payment_id: { type: String },
  paid_at: { type: Date },
  // Set once finalization creates the real records, so a webhook redelivery
  // (already guarded against re-finalizing) can still report back which
  // Ticket the confirmation email was built from.
  ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' },
}, { timestamps: true });

module.exports = mongoose.model('MembershipTicketBundle', MembershipTicketBundleSchema);
