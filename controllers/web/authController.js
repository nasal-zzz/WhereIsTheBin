const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../../models/User');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12); // keeps login timing similar for unknown emails
const dbReady = () => mongoose.connection.readyState === 1;
const safeNext = (s) => (typeof s === 'string' && s.startsWith('/') && !s.startsWith('//') ? s : '/');

function startSession(req, userId) {
  const returnTo = req.session.returnTo;
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => { // new session id on login prevents fixation
      if (err) return reject(err);
      req.session.userId = String(userId);
      if (returnTo) req.session.returnTo = returnTo;
      resolve();
    });
  });
}

function finish(req, res, flash) {
  const to = safeNext(req.session.returnTo);
  delete req.session.returnTo;
  req.session.flash = flash;
  res.redirect(to);
}

const renderRegister = (res, errors, values = {}, status = 200) =>
  res.status(status).render('auth/register', { pageTitle: 'auth.register.title', errors, values });
const renderLogin = (res, errors, values = {}, status = 200) =>
  res.status(status).render('auth/login', { pageTitle: 'auth.login.title', errors, values });

exports.showRegister = (req, res) => renderRegister(res, []);
exports.showLogin = (req, res) => renderLogin(res, []);

exports.register = async (req, res, next) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const errors = [];
  if (name.length < 2 || name.length > 60) errors.push('err.name');
  if (!EMAIL.test(email) || email.length > 254) errors.push('err.email');
  if (password.length < 8 || password.length > 128) errors.push('err.password');
  if (!errors.length && !dbReady()) errors.push('err.db');
  if (errors.length) return renderRegister(res, errors, { name, email }, 400);

  try {
    const user = await User.create({
      name, email, passwordHash: await bcrypt.hash(password, 12), preferredLanguage: req.locale,
    });
    await startSession(req, user.id);
    finish(req, res, 'flash.registered');
  } catch (err) {
    if (err.code === 11000) return renderRegister(res, ['err.emailTaken'], { name, email }, 400);
    next(err);
  }
};

exports.login = async (req, res, next) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!dbReady()) return renderLogin(res, ['err.db'], { email }, 503);
  try {
    const user = await User.findOne({ email });
    const ok = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
    if (!user || !user.passwordHash || !ok) return renderLogin(res, ['err.credentials'], { email }, 401);
    if (user.isBlocked) return renderLogin(res, ['err.blocked'], { email }, 403);
    await startSession(req, user.id);
    finish(req, res, 'flash.loggedIn');
  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('wib.sid');
    res.redirect('/');
  });
};
