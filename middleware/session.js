const session = require('express-session');
const connectMongo = require('connect-mongo');
// Different connect-mongo versions export the store differently; accept all of them.
const MongoStore = [connectMongo, connectMongo.default, connectMongo.MongoStore].find((m) => typeof m?.create === 'function');

module.exports = function sessionMiddleware() {
  const prod = process.env.NODE_ENV === 'production';
  let secret = process.env.SESSION_SECRET;
  if (!secret || secret === 'change-me') {
    if (prod) throw new Error('SESSION_SECRET must be set in production');
    console.warn('[session] SESSION_SECRET not set - using an insecure development secret.');
    secret = 'dev-only-secret-change-me';
  }
  const store = process.env.MONGODB_URI && MongoStore
    ? MongoStore.create({ mongoUrl: process.env.MONGODB_URI, collectionName: 'sessions', ttl: 14 * 24 * 60 * 60 })
    : undefined; // in-memory store: development only
  return session({
    name: 'wib.sid', secret, resave: false, saveUninitialized: false, store,
    cookie: { httpOnly: true, sameSite: 'lax', secure: prod, maxAge: 14 * 24 * 60 * 60 * 1000 },
  });
};