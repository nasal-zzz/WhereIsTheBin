const mongoose = require('mongoose');
const { getPublicFacility } = require('../../services/facilityService');
const { clientStrings } = require('../../utils/i18n');

const STALE_DAYS = 180;
const fail = (next, status, msg) => next(Object.assign(new Error(msg), { status }));

exports.show = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(next, 404, 'Not found');
    if (mongoose.connection.readyState !== 1) return fail(next, 503, 'Database unavailable');
    const f = await getPublicFacility(req.params.id);
    if (!f) return fail(next, 404, 'Not found');

    const stale = !f.lastVerifiedAt || Date.now() - new Date(f.lastVerifiedAt).getTime() > STALE_DAYS * 86400000;
    res.render('public/facility', {
      pageTitle: null, f, stale,
      clientStrings: clientStrings(req.locale, ['dir.', 'map.locat', 'map.youAreHere']),
    });
  } catch (err) {
    next(err);
  }
};