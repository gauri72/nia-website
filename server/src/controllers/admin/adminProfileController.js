const AdminUser = require('../../models/AdminUser');
const { hashPassword, comparePassword } = require('../../services/authService');

// ── PATCH /api/admin/profile ─────────────────────────────────────
async function updateProfile(req, res, next) {
  try {
    const { firstName, lastName } = req.body;
    const update = {};
    if (firstName !== undefined) update.firstName = firstName.trim();
    if (lastName !== undefined) update.lastName = lastName.trim();

    const admin = await AdminUser.findByIdAndUpdate(req.admin.id, update, { new: true, runValidators: true });
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    return res.json({ id: admin._id, firstName: admin.firstName, lastName: admin.lastName, email: admin.email, role: admin.role });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/profile/change-password ──────────────────────
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const admin = await AdminUser.findById(req.admin.id);
    if (!admin || !(await comparePassword(currentPassword, admin.passwordHash))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    admin.passwordHash = await hashPassword(newPassword);
    await admin.save();

    return res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { updateProfile, changePassword };
