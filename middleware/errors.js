function notFound(req, res, next) {
  const err = new Error('Not found');
  err.status = 404;
  next(err);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);

  if (req.path.startsWith('/api/')) {
    return res.status(status).json({ success: false, error: { status } });
  }
  const errKey = `error.${[403, 404].includes(status) ? status : 500}`;
  res.status(status).render('error', { status, errKey, pageTitle: `${errKey}.title` });
}

module.exports = { notFound, errorHandler };
