const mongoose = require('mongoose');

const AdminUserSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['super_admin', 'content_manager'],
    default: 'content_manager',
  },
  isActive: { type: Boolean, default: true },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
  lastLoginAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('AdminUser', AdminUserSchema);
