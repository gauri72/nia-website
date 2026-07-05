const mongoose = require('mongoose');

const EmailTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['event_announcement', 'newsletter', 'membership_update', 'promotional', 'welcome', 'general'],
    required: true,
  },
  subject: { type: String, required: true },
  htmlContent: { type: String, required: true },
  tags: [{ type: String, trim: true }],
  colorScheme: { type: String, default: 'default' },
  generatedByAI: { type: Boolean, default: false },
  aiPrompt: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  isArchived: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('EmailTemplate', EmailTemplateSchema);
