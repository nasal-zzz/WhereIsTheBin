const mongoose = require('mongoose');
const Facility = require('../../models/Facility');
const { findDuplicates, createSubmission } = require('../../services/facilityService');
const { FACILITY_TYPES, WASTE_CATEGORIES, ACCESS_TYPES } = require('../../utils/constants');
const { validateFacilityInput } = require('../../utils/facilityInput');
const { clientStrings } = require('../../utils/i18n');

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
    const { errors, values } = validateFacilityInput(req.body, { requireConsent: true });
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