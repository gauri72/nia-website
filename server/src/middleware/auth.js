const { verifyToken } = require('../services/authService');
const Member = require('../models/Member');

// Verifies a member JWT (kind: 'member') and attaches { id } to req.member.
// Also re-checks tokenVersion and account status against the DB on every request, so a
// password change/reset or a suspended/deleted account both take effect immediately
// instead of waiting out the token's natural expiry.
const requireMemberAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = verifyToken(token);
    if (decoded.kind !== 'member') return res.status(403).json({ error: 'Invalid token for this resource' });

    const member = await Member.findById(decoded.id).select('status tokenVersion');
    if (!member || member.status !== 'active' || (decoded.tokenVersion || 0) !== member.tokenVersion) {
      return res.status(401).json({ error: 'Session is no longer valid. Please log in again.' });
    }

    req.member = { id: decoded.id };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = requireMemberAuth;
