const crypto = require('crypto');

// Session-bound CSRF token. Views call csrfToken(); forms post it as _csrf (or send x-csrf-token).
module.exports = function csrf(req, res, next) {
  res.locals.csrfToken = () => (req.session.csrf ||= crypto.randomBytes(24).toString('hex'));
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const sent = Buffer.from(String(req.body?._csrf || req.get('x-csrf-token') || ''));
  const real = Buffer.from(String(req.session.csrf || ''));
  if (real.length && sent.length === real.length && crypto.timingSafeEqual(sent, real)) return next();
  const err = new Error('Invalid CSRF token');
  err.status = 403;
  next(err);
};
