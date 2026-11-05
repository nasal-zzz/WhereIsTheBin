const mongoose = require('mongoose');
const { findNearby } = require('../../services/facilityService');
const { FACILITY_TYPES } = require('../../utils/constants');

const fail = (res, status, code) => res.status(status).json({ success: false, error: { code } });

exports.nearby = async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusM = req.query.radius === undefined ? 3000 : Number(req.query.radius);
    const limit = req.query.limit === undefined ? 30 : Number(req.query.limit);
    const type = req.query.type ? String(req.query.type) : null;

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return fail(res, 400, 'INVALID_COORDINATES');
    }
    if (!Number.isFinite(radiusM) || radiusM < 100 || radiusM > 20000) return fail(res, 400, 'INVALID_RADIUS');
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) return fail(res, 400, 'INVALID_LIMIT');
    if (type && !FACILITY_TYPES.includes(type)) return fail(res, 400, 'INVALID_TYPE');
    if (mongoose.connection.readyState !== 1) return fail(res, 503, 'DATABASE_UNAVAILABLE');

    const facilities = await findNearby({ lat, lng, radiusM, type, limit });
    res.json({ success: true, data: { count: facilities.length, facilities } });
  } catch (err) {
    next(err);
  }
};
