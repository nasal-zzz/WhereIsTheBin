const mongoose = require('mongoose');
const { getPublicFacility } = require('../../services/facilityService');
const { createReport, validateReport } = require('../../services/reportService');
const { clientStrings } = require('../../utils/i18n');
const { REPORT_TYPES } = require('../../utils/constants');

const STALE_DAYS = 180;
const fail = (next, status, msg) => next(Object.assign(new Error(msg), { status }));

function renderFacility(req, res, f, { errors = [], values = {}, status = 200 } = {}) {
  const stale = !f.lastVerifiedAt || Date.now() - new Date(f.lastVerifiedAt).getTime() > STALE_DAYS * 86400000;
  res.status(status).render('public/facility', {
    pageTitle: null, f, stale, errors, values, reportTypes: REPORT_TYPES,
    clientStrings: clientStrings(req.locale, ['dir.', 'map.locat', 'map.youAreHere']),
  });
}

// Returns the verified facility, or null after passing the right error to next().
async function loadFacility(req, next) {
  if (!mongoose.isValidObjectId(req.params.id)) { fail(next, 404, 'Not found'); return null; }
  if (mongoose.connection.readyState !== 1) { fail(next, 503, 'Database unavailable'); return null; }
  const f = await getPublicFacility(req.params.id);
  if (!f) fail(next, 404, 'Not found');
  return f;
}

exports.show = async (req, res, next) => {
  try {
    const f = await loadFacility(req, next);
    if (f) renderFacility(req, res, f);
  } catch (err) { next(err); }
};

// Lets a logged-out visitor log in and land back on the report form.
exports.reportRedirect = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return fail(next, 404, 'Not found');
  res.redirect(`/facility/${req.params.id}#report`);
};

exports.report = async (req, res, next) => {
  try {
    const f = await loadFacility(req, next);
    if (!f) return;
    const { errors, values } = validateReport(req.body);
    if (errors.length) return renderFacility(req, res, f, { errors, values, status: 400 });

    try {
      await createReport({ facilityId: f._id, userId: req.user._id, ...values });
    } catch (err) {
      if (err.code === 11000) return renderFacility(req, res, f, { errors: ['err.reportDuplicate'], values, status: 409 });
      throw err;
    }
    req.session.flash = 'flash.reported';
    res.redirect(`/facility/${f._id}`);
  } catch (err) { next(err); }
};