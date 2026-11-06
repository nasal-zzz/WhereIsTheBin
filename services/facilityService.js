const Facility = require('../models/Facility');

// Verified, publicly accessible facilities near a point, nearest first, with distance in metres.
async function findNearby({ lat, lng, radiusM, type, limit }) {
  const query = { verificationStatus: 'verified', accessType: 'public' };
  if (type) query.facilityType = type;

  const rows = await Facility.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distanceM',
        maxDistance: radiusM,
        spherical: true,
        query,
      },
    },
    { $limit: limit },
  ]);

  return rows.map((f) => ({
    id: String(f._id),
    name: f.name,
    facilityType: f.facilityType,
    acceptedWaste: f.acceptedWaste,
    address: f.address || '',
    district: f.district || '',
    localBody: f.localBody || '',
    lat: f.location.coordinates[1],
    lng: f.location.coordinates[0],
    distanceM: Math.round(f.distanceM),
    lastVerifiedAt: f.lastVerifiedAt || null,
    isDemo: !!f.isDemo,
  }));
}

// Existing pending/verified places within radiusM metres (duplicate warning; humans decide on merging).
async function findDuplicates(lat, lng, radiusM = 50) {
  return Facility.find({
    location: { $near: { $geometry: { type: 'Point', coordinates: [lng, lat] }, $maxDistance: radiusM } },
    verificationStatus: { $in: ['pending', 'verified'] },
  })
    .select('name facilityType verificationStatus')
    .limit(3)
    .lean();
}

// Community submissions always start as pending and never appear as verified public results.
async function createSubmission(d, userId) {
  return Facility.create({
    name: d.name, facilityType: d.facilityType, acceptedWaste: d.waste, accessType: d.accessType,
    district: d.district, localBody: d.localBody, address: d.address, description: d.description,
    location: { type: 'Point', coordinates: [d.lng, d.lat] },
    verificationStatus: 'pending', sourceType: 'community', addedBy: userId,
  });
}

// Public detail page: only verified facilities are ever visible.
const getPublicFacility = (id) => Facility.findOne({ _id: id, verificationStatus: 'verified' }).lean();

module.exports = { findNearby, findDuplicates, createSubmission, getPublicFacility };