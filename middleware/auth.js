const mongoose = require('mongoose');
const User = require('../models/User');

async function attachUser(req, res, next) {
  res.locals.currentUser = null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  const id = req.session.userId;
  if (!id || mongoose.connection.readyState !== 1) return next();
  try {
    const user = await User.findById(id).select('name role isBlocked').lean();
    if (!user || user.isBlocked) {
      delete req.session.userId;
      return next();
    }
    req.user = user;
    res.locals.currentUser = user;
    next();
  } catch (err) {
    next(err);
  }
}

function requireLogin(req, res, next) {
  if (req.user) return next();
  req.session.returnTo = req.originalUrl;
  res.redirect('/login');
}

module.exports = { attachUser, requireLogin };
