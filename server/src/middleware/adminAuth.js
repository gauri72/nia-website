const { verifyToken } = require('../services/authService');
const AdminUser = require('../models/AdminUser');

// Verifies an admin JWT (kind: 'admin') and attaches { id, role } to req.admin.
// Also re-checks tokenVersion and isActive against the DB on every request, so a
// password change/reset or a deactivated account both take effect immediately
// instead of waiting out the token's natural expiry.
const requireAdminAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = verifyToken(token);
    if (decoded.kind !== 'admin') return res.status(403).json({ error: 'Invalid token for this resource' });

    const admin = await AdminUser.findById(decoded.id).select('role isActive tokenVersion');
    if (!admin || !admin.isActive || (decoded.tokenVersion || 0) !== admin.tokenVersion) {
      return res.status(401).json({ error: 'Session is no longer valid. Please log in again.' });
    }

    req.admin = { id: decoded.id, role: admin.role };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// requireRole(['super_admin']) — use after requireAdminAuth
const requireRole = (roles) => (req, res, next) => {
  if (!req.admin || !roles.includes(req.admin.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

module.exports = { requireAdminAuth, requireRole };
