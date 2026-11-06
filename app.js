const path = require('path');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const resolveLanguage = require('./middleware/locale');
const { notFound, errorHandler } = require('./middleware/errors');
const webRoutes = require('./routes/web');
const accountRoutes = require('./routes/web/account');
const adminRoutes = require('./routes/admin');
const apiV1 = require('./routes/api/v1');
const sessionMiddleware = require('./middleware/session');
const csrf = require('./middleware/csrf');
const { attachUser } = require('./middleware/auth');
const pkg = require('./package.json');
const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(
  helmet({
    // OSM tile servers require a Referer header; helmet's default (no-referrer) gets tiles blocked with 403.
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        // OSM public tiles are fine for development; use a production tile provider before launch.
        imgSrc: ["'self'", 'data:', 'https://tile.openstreetmap.org'],
        scriptSrc: ["'self'"],
      },
    },
  })
);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());
// Cache-bust assets: version changes on every dev restart and every release.
app.locals.assetVersion = isProd ? pkg.version : Date.now();
app.use(express.static(path.join(__dirname, 'public'), { maxAge: isProd ? '7d' : 0 }));
app.use('/vendor/leaflet', express.static(path.join(__dirname, 'node_modules/leaflet/dist'), { maxAge: '30d' }));

app.use(resolveLanguage);
app.use(sessionMiddleware());
app.use(attachUser);
app.use(csrf);
app.use('/api/v1', apiV1);
app.use('/', webRoutes);
app.use('/', accountRoutes);
app.use('/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;