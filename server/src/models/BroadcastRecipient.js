const mongoose = require('mongoose');
const crypto = require('crypto');

const BroadcastRecipientSchema = new mongoose.Schema({
  broadcast: { type: mongoose.Schema.Types.ObjectId, ref: 'Broadcast', required: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  email: { type: String, required: true, lowercase: true, trim: true },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'unsubscribed'],
    default: 'pending',
  },
  trackingToken: {
    type: String,
    unique: true,
    default: () => crypto.randomBytes(24).toString('hex'),
  },
  sentAt: { type: Date },
  deliveredAt: { type: Date },
  openedAt: { type: Date },
  clickedAt: { type: Date },
  bouncedAt: { type: Date },
  errorMessage: { type: String },
}, { timestamps: true });

BroadcastRecipientSchema.index({ broadcast: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('BroadcastRecipient', BroadcastRecipientSchema);
