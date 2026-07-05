// One-time CLI script to create (or promote) the first super admin.
// Usage: SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... SEED_ADMIN_NAME="First Last" node scripts/seedAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const AdminUser = require('../src/models/AdminUser');
const { hashPassword } = require('../src/services/authService');

async function run() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || 'NIA Admin';

  if (!email || !password) {
    console.error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in the environment.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('SEED_ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  await connectDB();

  const [firstName, ...rest] = name.trim().split(' ');
  const lastName = rest.join(' ') || 'Admin';

  const existing = await AdminUser.findOne({ email: email.toLowerCase() });
  if (existing) {
    existing.passwordHash = await hashPassword(password);
    existing.role = 'super_admin';
    existing.isActive = true;
    await existing.save();
    console.log(`[SeedAdmin] Updated existing admin ${email} to super_admin with the new password.`);
  } else {
    await AdminUser.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      role: 'super_admin',
      isActive: true,
    });
    console.log(`[SeedAdmin] Created super admin ${email}.`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('[SeedAdmin] Failed:', err.message);
  process.exit(1);
});
