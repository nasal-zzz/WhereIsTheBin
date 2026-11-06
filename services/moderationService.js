const Facility = require('../models/Facility');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

async function dashboardData() {
  const real = { isDemo: { $ne: true } };
  const [pending, verified, rejected, users, queue] = await Promise.all([
    Facility.countDocuments({ ...real, verificationStatus: 'pending' }),
    Facility.countDocuments({ ...real, verificationStatus: 'verified' }),
    Facility.countDocuments({ ...real, verificationStatus: 'rejected' }),
    User.countDocuments(),
    Facility.find({ ...real, verificationStatus: 'pending' }).sort({ createdAt: 1 }).limit(50).populate('addedBy', 'name').lean(),
  ]);
  return { counts: { pending, verified, rejected, users }, queue };
}

const getFacility = (id) =>
  Facility.findById(id).populate('addedBy', 'name').populate('verifiedBy', 'name').lean();

// Only a still-pending submission can be decided; the status check in the query makes this race-safe.
// Returns null if someone else already reviewed it.
async function decide({ facilityId, actor, decision, reason }) {
  const now = new Date();
  const set = decision === 'approve'
    ? { verificationStatus: 'verified', lastVerifiedAt: now, verifiedBy: actor._id, reviewedAt: now }
    : { verificationStatus: 'rejected', verifiedBy: actor._id, reviewedAt: now, rejectionReason: reason };
  const update = decision === 'approve' ? { $set: set, $unset: { rejectionReason: 1 } } : { $set: set };

  const before = await Facility.findOneAndUpdate(
    { _id: facilityId, verificationStatus: 'pending' },
    update,
    { returnDocument: 'before' }
  );
  if (!before) return null;

  await AuditLog.create({
    actorId: actor._id,
    action: `facility.${decision}`,
    targetType: 'facility',
    targetId: before._id,
    targetName: before.name,
    before: { verificationStatus: before.verificationStatus },
    after: { verificationStatus: set.verificationStatus },
    reason: reason || undefined,
  });
  return before;
}

const recentAudit = () => AuditLog.find().sort({ createdAt: -1 }).limit(100).populate('actorId', 'name').lean();

module.exports = { dashboardData, getFacility, decide, recentAudit };