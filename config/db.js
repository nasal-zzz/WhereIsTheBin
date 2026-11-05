const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('[db] MONGODB_URI not set - running without a database.');
    return false;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('[db] MongoDB connected');
    return true;
  } catch (err) {
    console.error('[db] Connection failed:', err.message);
    if (process.env.NODE_ENV === 'production') process.exit(1);
    return false;
  }
}

module.exports = connectDB;
