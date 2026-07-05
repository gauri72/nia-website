const mongoose = require('mongoose');

// One row per Mollie payment we've ever seen, whether auto-matched or flagged.
const MollieTransactionSchema = new mongoose.Schema({
  paymentId: { type: String, required: true, unique: true },
  type: { type: String }, // membership | event_ticket | donation | sponsorship | booking | membership_payment | unknown
  referenceId: { type: String }, // metadata.referenceId from Mollie, if present
  email: { type: String, trim: true, lowercase: true },
  name: { type: String, trim: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'EUR' },
  status: { type: String, required: true }, // mollie payment status: paid/failed/expired/canceled/open/...
  description: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  paidAt: { type: Date },
  mollieCreatedAt: { type: Date },

  importStatus: {
    type: String,
    enum: ['created', 'updated', 'flagged', 'skipped'],
    required: true,
  },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  importLog: { type: mongoose.Schema.Types.ObjectId, ref: 'MollieImportLog' },
}, { timestamps: true });

MollieTransactionSchema.index({ status: 1 });
MollieTransactionSchema.index({ importStatus: 1 });

module.exports = mongoose.model('MollieTransaction', MollieTransactionSchema);
