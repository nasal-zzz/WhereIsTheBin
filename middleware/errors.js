const { translator } = require('../utils/i18n');

function notFound(req, res, next) {
  const err = new Error('Not found');
  err.status = 404;
  next(err);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  if (status >= 500) console.error(err);

  if (req.path.startsWith('/api/')) {
    return res.status(status).json({ success: false, error: { status } });
  }

  // An error can happen before the language/session middleware ran (e.g. a failed CSRF check),
  // so make sure the error page always has what the layout needs.
  res.locals.t ??= translator('en');
  res.locals.currentLocale ??= 'en';
  res.locals.currentPath ??= req.path;
  res.locals.currentUser ??= null;
  res.locals.flash ??= null;
  res.locals.csrfToken ??= () => '';

  const errKey = err.errKey || `error.${[403, 404].includes(status) ? status : 500}`;
  res.status(status).render('error', { status, errKey, pageTitle: `${errKey}.title` });
}

module.exports = { notFound, errorHandler };