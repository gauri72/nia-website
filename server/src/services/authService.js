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

// kind distinguishes member vs admin tokens so one can never satisfy the other's routes
function signToken({ id, kind, role }) {
  const payload = { id, kind };
  if (role) payload.role = role;
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function generateRawToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { hashPassword, comparePassword, signToken, verifyToken, generateRawToken };
