const mongoose = require('mongoose');

// Singleton document — the admin panel only ever manages one Mollie connection at a time.
const MollieConfigSchema = new mongoose.Schema({
  singleton: { type: String, unique: true, default: 'mollie_config' },
  apiKeyEncrypted: {
    iv: { type: String, required: true },
    ciphertext: { type: String, required: true },
    authTag: { type: String, required: true },
  },
  mode: { type: String, enum: ['live', 'test'], required: true },
  accountName: { type: String },
  connectedAt: { type: Date },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
}, { timestamps: true });

module.exports = mongoose.model('MollieConfig', MollieConfigSchema);
