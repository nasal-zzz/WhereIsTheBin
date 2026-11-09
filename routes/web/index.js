const express = require('express');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const { FACILITY_TYPES } = require('../../utils/constants');
const { clientStrings } = require('../../utils/i18n');
const { requireLogin } = require('../../middleware/auth');
const facility = require('../../controllers/web/facilityController');

const router = express.Router();
const reportLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

// Text pages live in views/pages/<name>.<en|ml>.ejs. Update CONTENT_UPDATED whenever their wording changes.
const PAGES = { about: 'nav.about', privacy: 'nav.privacy' };
const CONTENT_UPDATED = new Date('2026-11-09');
const page = (name) => (req, res) =>
  res.render('public/page', {
    pageTitle: PAGES[name], titleKey: PAGES[name], name,
    updated: CONTENT_UPDATED.toLocaleDateString(req.locale === 'ml' ? 'ml-IN' : 'en-IN', { dateStyle: 'long' }),
    contactEmail: process.env.CONTACT_EMAIL || '',
  });

router.get('/', (req, res) => {
  res.render('public/home', { pageTitle: null, facilityTypes: FACILITY_TYPES });
});

router.get('/map', (req, res) => {
  res.render('public/map', {
    pageTitle: 'nav.map',
    facilityTypes: FACILITY_TYPES,
    clientStrings: clientStrings(req.locale, ['map.', 'type.', 'waste.']),
  });
});

router.get('/about', page('about'));
router.get('/privacy', page('privacy'));

router.get('/facility/:id', facility.show);
router.get('/facility/:id/report', requireLogin, facility.reportRedirect);
router.post('/facility/:id/report', requireLogin, reportLimiter, facility.report);

router.get('/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    db: states[mongoose.connection.readyState] || 'unknown',
  });
});

module.exports = router;