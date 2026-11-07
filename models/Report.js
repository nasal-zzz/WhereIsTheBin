const mongoose = require('mongoose');
const { REPORT_TYPES } = require('../utils/constants');

const reportSchema = new mongoose.Schema(
  {
    facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: REPORT_TYPES, required: true },
    note: { type: String, trim: true, maxlength: 300 },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    resolutionNote: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

// One person cannot flood a facility with the same open report.
reportSchema.index(
  { facilityId: 1, reportedBy: 1, type: 1 },
  { unique: true, partialFilterExpression: { status: 'open' } }
);
reportSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('Report', reportSchema);