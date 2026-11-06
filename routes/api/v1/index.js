const express = require('express');
const rateLimit = require('express-rate-limit');
const facilities = require('../../../controllers/api/facilityController');
const geocode = require('../../../controllers/api/geocodeController');
const routing = require('../../../controllers/api/routeController');

const router = express.Router();
const limiter = (limit) => rateLimit({ windowMs: 60 * 1000, limit, standardHeaders: true, legacyHeaders: false });

router.get('/facilities/nearby', facilities.nearby);
router.get('/geocode', limiter(15), geocode.search);
router.get('/route', limiter(20), routing.route);

module.exports = router;