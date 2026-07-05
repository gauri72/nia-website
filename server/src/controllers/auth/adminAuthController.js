const AdminUser = require('../../models/AdminUser');
const { hashPassword, comparePassword, signToken, generateRawToken } = require('../../services/authService');
const { sendAdminPasswordResetEmail } = require('../../services/emailService');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

function publicAdmin(admin) {
  return {
    id: admin._id,
    firstName: admin.firstName,
    lastName: admin.lastName,
    email: admin.email,
    role: admin.role,
  };
}

// ── POST /api/admin-auth/login ───────────────────────────────────
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const admin = await AdminUser.findOne({ email: email.trim().toLowerCase() });
    if (!admin || !(await comparePassword(password, admin.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!admin.isActive) {
      return res.status(403).json({ error: 'This admin account has been deactivated' });
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    const token = signToken({ id: admin._id.toString(), kind: 'admin', role: admin.role });
    return res.json({ token, admin: publicAdmin(admin) });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin-auth/forgot-password ─────────────────────────
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: 'email is required' });

    const admin = await AdminUser.findOne({ email: email.trim().toLowerCase() });
    if (admin) {
      const resetToken = generateRawToken();
      admin.passwordResetToken = resetToken;
      admin.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await admin.save();

      const resetUrl = `${process.env.FRONTEND_URL}/admin/reset-password?token=${resetToken}`;
      sendAdminPasswordResetEmail(admin, resetUrl).catch(err =>
        console.error('[AdminAuth] Failed to send reset email:', err.message)
      );
    }

    return res.json({ message: 'If an admin account exists for that email, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin-auth/reset-password ───────────────────────────
async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'token and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const admin = await AdminUser.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });
    if (!admin) return res.status(400).json({ error: 'Invalid or expired reset link' });

    admin.passwordHash = await hashPassword(password);
    admin.passwordResetToken = undefined;
    admin.passwordResetExpires = undefined;
    await admin.save();

    return res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin-auth/me ─────────────────────────────────────────
async function me(req, res, next) {
  try {
    const admin = await AdminUser.findById(req.admin.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    return res.json(publicAdmin(admin));
  } catch (err) {
    next(err);
  }
}

module.exports = { login, forgotPassword, resetPassword, me };
