const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '7d';

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// kind distinguishes member vs admin tokens so one can never satisfy the other's routes.
// tokenVersion is echoed back by requireAdminAuth/requireMemberAuth against the current
// DB value on every request — bumping it (on password change/reset) invalidates every
// token issued before that point, independent of the token's own expiry.
function signToken({ id, kind, role, tokenVersion = 0 }) {
  const payload = { id, kind, tokenVersion };
  if (role) payload.role = role;
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY, algorithm: 'HS256' });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
}

function generateRawToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { hashPassword, comparePassword, signToken, verifyToken, generateRawToken };
