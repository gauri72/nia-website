const mongoose = require('mongoose');
const dns = require('dns');

// Node.js sometimes picks up a broken localhost DNS entry (e.g. from WSL/VPN/Docker).
// Explicitly set reliable DNS servers so MongoDB SRV lookups always resolve.
dns.setServers(['8.8.8.8', '8.8.4.4', '192.168.1.1']);

// Hard-pinned regardless of what's in MONGO_URI (which carries no database name
// segment) — this is what used to make every connection silently fall back to
// the driver's default "test" database, and "test" is exactly the kind of name
// someone with cluster access will assume is disposable and safe to wipe.
const DB_NAME = 'nia_75';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: DB_NAME });
    console.log(`MongoDB connected (db: ${DB_NAME})`);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.error('[DB] Check: 1) Your IP is whitelisted in MongoDB Atlas, 2) Network allows port 27017/DNS SRV');
    // Don't exit — server stays up so non-DB routes (health check, etc.) still respond
  }
};

module.exports = connectDB;
