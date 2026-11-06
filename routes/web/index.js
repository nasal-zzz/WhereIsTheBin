const express = require('express');
const mongoose = require('mongoose');
const { FACILITY_TYPES } = require('../../utils/constants');
const { clientStrings } = require('../../utils/i18n');
const facility = require('../../controllers/web/facilityController');

const router = express.Router();

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

router.get('/facility/:id', facility.show);

router.get('/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    db: states[mongoose.connection.readyState] || 'unknown',
  });
});

module.exports = router;