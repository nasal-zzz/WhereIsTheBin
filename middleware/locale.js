const { translator, fromAcceptLanguage, SUPPORTED } = require('../utils/i18n');

const ONE_YEAR = 365 * 24 * 60 * 60 * 1000;

// Order: ?lang= query -> saved cookie -> browser Accept-Language -> English.
function resolveLanguage(req, res, next) {
  const fromQuery = SUPPORTED.includes(req.query.lang) ? req.query.lang : null;
  const fromCookie = SUPPORTED.includes(req.cookies.lang) ? req.cookies.lang : null;
  const locale =
    fromQuery || fromCookie || fromAcceptLanguage(req.headers['accept-language']) || 'en';

  if (fromQuery && fromQuery !== req.cookies.lang) {
    res.cookie('lang', fromQuery, {
      maxAge: ONE_YEAR,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  req.locale = locale;
  res.locals.currentLocale = locale;
  res.locals.t = translator(locale);
  res.locals.currentPath = req.path;
  next();
}

module.exports = resolveLanguage;
