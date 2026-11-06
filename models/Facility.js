const mongoose = require('mongoose');
const { FACILITY_TYPES, WASTE_CATEGORIES, ACCESS_TYPES } = require('../utils/constants');

const facilitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    facilityType: { type: String, enum: FACILITY_TYPES, required: true },
    // Slugs for now; moves to Category references when the Category collection is added.
    acceptedWaste: [{ type: String, enum: WASTE_CATEGORIES }],
    location: {
      type: { type: String, enum: ['Point'], required: true, default: 'Point' },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
    address: { type: String, trim: true, maxlength: 300 },
    district: { type: String, trim: true },
    localBody: { type: String, trim: true },
    accessType: { type: String, enum: ACCESS_TYPES, default: 'unknown' },
    verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected', 'archived'], default: 'pending' },
    operationalStatus: { type: String, enum: ['unknown', 'available', 'reported-full', 'damaged', 'closed'], default: 'unknown' },
    sourceType: { type: String, enum: ['community', 'admin', 'official-import', 'demo'], default: 'community' },
    isDemo: { type: Boolean, default: false },
    description: { type: String, trim: true, maxlength: 500 },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    rejectionReason: { type: String, maxlength: 500 },
    lastVerifiedAt: Date,
  },
  { timestamps: true }
);

facilitySchema.index({ location: '2dsphere' });
facilitySchema.index({ verificationStatus: 1, facilityType: 1 });
facilitySchema.index({ district: 1, localBody: 1 });
facilitySchema.index({ addedBy: 1, createdAt: -1 });

module.exports = mongoose.model('Facility', facilitySchema);