const mongoose = require('mongoose');
const Facility = require('../../models/Facility');
const { findDuplicates, createSubmission } = require('../../services/facilityService');
const { FACILITY_TYPES, WASTE_CATEGORIES, ACCESS_TYPES } = require('../../utils/constants');
const { clientStrings } = require('../../utils/i18n');

const KERALA = { minLat: 8.17, maxLat: 12.8, minLng: 74.85, maxLng: 77.45 };
const num = (v) => (String(v ?? '').trim() === '' ? NaN : Number(v));

function renderForm(req, res, { errors = [], values = {}, duplicates = [], status = 200 } = {}) {
  res.status(status).render('user/add', {
    pageTitle: 'add.title', errors, duplicates,
    values: { waste: [], accessType: 'public', ...values },
    facilityTypes: FACILITY_TYPES, wasteCategories: WASTE_CATEGORIES, accessTypes: ACCESS_TYPES,
    clientStrings: clientStrings(req.locale, ['add.', 'map.locat']),
  });
}

exports.showAdd = (req, res) => renderForm(req, res);

exports.submitAdd = async (req, res, next) => {
  try {
    const b = req.body;
    const values = {
      name: String(b.name || '').trim(),
      facilityType: String(b.facilityType || ''),
      waste: [].concat(b.waste || []).map(String).filter((w) => WASTE_CATEGORIES.includes(w)),
      accessType: String(b.accessType || ''),
      district: String(b.district || '').trim().slice(0, 80),
      localBody: String(b.localBody || '').trim().slice(0, 80),
      address: String(b.address || '').trim().slice(0, 300),
      description: String(b.description || '').trim().slice(0, 500),
      lat: num(b.lat), lng: num(b.lng),
      consent: b.consent === 'on', confirmDuplicate: b.confirmDuplicate === 'on',
    };

    const errors = [];
    if (values.name.length < 2 || values.name.length > 120) errors.push('err.facilityName');
    if (!FACILITY_TYPES.includes(values.facilityType)) errors.push('err.type');
    if (!values.waste.length) errors.push('err.waste');
    if (!ACCESS_TYPES.includes(values.accessType)) errors.push('err.access');
    if (!Number.isFinite(values.lat) || !Number.isFinite(values.lng)) errors.push('err.coords');
    else if (values.lat < KERALA.minLat || values.lat > KERALA.maxLat || values.lng < KERALA.minLng || values.lng > KERALA.maxLng) {
      errors.push('err.outsideKerala');
    }
    if (!values.consent) errors.push('err.consent');
    if (!errors.length && mongoose.connection.readyState !== 1) errors.push('err.db');

    let duplicates = [];
    if (!errors.length) {
      duplicates = await findDuplicates(values.lat, values.lng);
      if (duplicates.length && !values.confirmDuplicate) errors.push('err.duplicate');
    }
    if (errors.length) return renderForm(req, res, { errors, values, duplicates, status: 400 });

    await createSubmission(values, req.user._id);
    req.session.flash = 'flash.submitted';
    res.redirect('/my');
  } catch (err) {
    next(err);
  }
};

exports.myContributions = async (req, res, next) => {
  try {
    const items = await Facility.find({ addedBy: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
    res.render('user/my', { pageTitle: 'my.title', items });
  } catch (err) {
    next(err);
  }
};
