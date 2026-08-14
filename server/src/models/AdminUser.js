const mongoose = require('mongoose');

const AdminUserSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    // door_staff is deliberately least-privilege: denied by default at the
    // top of adminRoutes.js except the /scan/* endpoints, and redirected
    // away from the admin panel entirely on the frontend (see
    // ProtectedAdminRoute.jsx) — a login that can only reach the check-in app.
    enum: ['super_admin', 'content_manager', 'door_staff'],
    default: 'content_manager',
  },
  isActive: { type: Boolean, default: true },
  // Bumped on password change/reset so any JWT issued before that point is
  // rejected on its next request, regardless of its natural expiry.
  tokenVersion: { type: Number, default: 0 },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
  lastLoginAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('AdminUser', AdminUserSchema);
