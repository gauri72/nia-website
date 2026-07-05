const { verifyToken } = require('../services/authService');

// Verifies an admin JWT (kind: 'admin') and attaches { id, role } to req.admin.
const requireAdminAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = verifyToken(token);
    if (decoded.kind !== 'admin') return res.status(403).json({ error: 'Invalid token for this resource' });
    req.admin = { id: decoded.id, role: decoded.role };
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
