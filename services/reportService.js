const Report = require('../models/Report');
const { REPORT_TYPES } = require('../utils/constants');

function validateReport(body = {}) {
  const type = String(body.type || '');
  const note = String(body.note || '').trim().slice(0, 300);
  const errors = [];
  if (!REPORT_TYPES.includes(type)) errors.push('err.reportType');
  return { errors, values: { type, note } };
}

// Throws a Mongo duplicate-key error (code 11000) if this person already has the same open report.
const createReport = ({ facilityId, userId, type, note }) =>
  Report.create({ facilityId, reportedBy: userId, type, note: note || undefined });

module.exports = { validateReport, createReport };