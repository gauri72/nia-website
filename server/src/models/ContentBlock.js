const mongoose = require('mongoose');

const ContentBlockSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  section: {
    type: String,
    enum: ['homepage_hero', 'about', 'mission', 'footer', 'announcements'],
    required: true,
  },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
}, { timestamps: true });

module.exports = mongoose.model('ContentBlock', ContentBlockSchema);
