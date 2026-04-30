'use strict';

async function connectDB() {
  if (process.env.MONGODB_URI) {
    const mongoose = require('mongoose');
    const IS_PROD  = process.env.NODE_ENV === 'production' || !!process.env.RENDER;

    // In production: skip auto-index creation on startup (indexes already exist in Atlas).
    // This saves 2-5s on cold starts. Run `mongoose.syncIndexes()` manually after schema changes.
    if (IS_PROD) mongoose.set('autoIndex', false);

    if (IS_PROD) {
      console.log(`📡  URI Proof        →  Length: ${process.env.MONGODB_URI?.length || 0} | Ends with: ...${process.env.MONGODB_URI?.slice(-20) || 'NULL'}`);
    }
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS:         10000,
      socketTimeoutMS:          45000,
      // ── Connection pool tuning ────────────────────────────────────────────────
      maxPoolSize:              10,   // max concurrent connections (default=5)
      minPoolSize:              2,    // keep 2 warm connections ready
      family:                   4,
      authSource:              'admin',
      ssl:                     true,
      retryWrites:             true,
    });
    console.log('✅  MongoDB Atlas connected');


    // Drop stale unique indexes that cause duplicate-null crashes
    try {
      await mongoose.connection.collection('applications').dropIndex('inviteToken_1');
      console.log('🔧  Dropped stale inviteToken_1 index from applications');
    } catch (_) { /* index doesn't exist — fine */ }

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected — will auto-reconnect');
    });
    mongoose.connection.on('error', (err) => {
      console.error('❌  MongoDB error:', err.message);
    });
  } else {
    console.log('✅  JSON file database ready (local dev)');
  }
}

module.exports = connectDB;
