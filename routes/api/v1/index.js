const express = require('express');
const rateLimit = require('express-rate-limit');
const facilities = require('../../../controllers/api/facilityController');
const geocode = require('../../../controllers/api/geocodeController');

const router = express.Router();
const geocodeLimiter = rateLimit({ windowMs: 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false });

router.get('/facilities/nearby', facilities.nearby);
router.get('/geocode', geocodeLimiter, geocode.search);

module.exports = router;
