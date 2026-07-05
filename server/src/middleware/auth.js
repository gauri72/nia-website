const { verifyToken } = require('../services/authService');

// Verifies a member JWT (kind: 'member') and attaches { id } to req.member.
const requireMemberAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = verifyToken(token);
    if (decoded.kind !== 'member') return res.status(403).json({ error: 'Invalid token for this resource' });
    req.member = { id: decoded.id };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = requireMemberAuth;
