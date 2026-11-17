const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../../models/User');
const { deletionErrors, deleteAccount } = require('../../services/accountService');

const renderAccount = (res, user, errors = [], status = 200) =>
  res.status(status).render('user/account', { pageTitle: 'account.title', account: user, errors });

exports.show = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('name email role').lean();
    renderAccount(res, user);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) return renderAccount(res, req.user, ['err.db'], 503);
    const user = await User.findById(req.user._id);
    if (!user) return res.redirect('/');

    const passwordOk = !!user.passwordHash && (await bcrypt.compare(String(req.body.password || ''), user.passwordHash));
    const errors = deletionErrors({ role: user.role, passwordOk, confirmed: req.body.confirm === 'on' });
    if (errors.length) return renderAccount(res, user, errors, 400);

    await deleteAccount(user._id);
    // Other devices are logged out automatically: their session points to a user that no longer exists.
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.flash = 'flash.accountDeleted';
      res.redirect('/');
    });
  } catch (err) { next(err); }
};