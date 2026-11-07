const Facility = require('../models/Facility');
const User = require('../models/User');
const Report = require('../models/Report');
const AuditLog = require('../models/AuditLog');

// What confirming each kind of report does to the facility.
const EFFECTS = {
  full: { operationalStatus: 'reported-full' },
  damaged: { operationalStatus: 'damaged' },
  missing: { verificationStatus: 'archived' }, // hidden from the public map
  'wrong-location': { verificationStatus: 'pending' }, // hidden until a moderator checks it again
};
const effectFor = (type) => EFFECTS[type] || null;

async function dashboardData() {
  const real = { isDemo: { $ne: true } };
  const [pending, verified, rejected, users, reports, queue] = await Promise.all([
    Facility.countDocuments({ ...real, verificationStatus: 'pending' }),
    Facility.countDocuments({ ...real, verificationStatus: 'verified' }),
    Facility.countDocuments({ ...real, verificationStatus: 'rejected' }),
    User.countDocuments(),
    Report.countDocuments({ status: 'open' }),
    Facility.find({ ...real, verificationStatus: 'pending' }).sort({ createdAt: 1 }).limit(50).populate('addedBy', 'name').lean(),
  ]);
  return { counts: { pending, verified, rejected, users, reports }, queue };
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

// ---------- reports ----------
const listOpenReports = () =>
  Report.find({ status: 'open' }).sort({ createdAt: 1 }).limit(50)
    .populate('facilityId', 'name facilityType verificationStatus').populate('reportedBy', 'name').lean();

const getReport = (id) =>
  Report.findById(id).populate('facilityId').populate('reportedBy', 'name').populate('resolvedBy', 'name').lean();

// Only an open report can be decided (race-safe). Returns null if someone else already handled it.
async function decideReport({ reportId, actor, decision, note }) {
  const now = new Date();
  const set = { status: decision === 'confirm' ? 'resolved' : 'dismissed', resolvedBy: actor._id, resolvedAt: now };
  if (note) set.resolutionNote = note;
  const report = await Report.findOneAndUpdate({ _id: reportId, status: 'open' }, { $set: set }, { returnDocument: 'before' });
  if (!report) return null;

  let name;
  let facilityChange = null;
  const effect = decision === 'confirm' ? effectFor(report.type) : null;
  if (effect) {
    const before = await Facility.findByIdAndUpdate(report.facilityId, { $set: effect }, { returnDocument: 'before' }).lean();
    if (before) { name = before.name; facilityChange = effect; }
  } else {
    const f = await Facility.findById(report.facilityId).select('name').lean();
    name = f && f.name;
  }

  await AuditLog.create({
    actorId: actor._id,
    action: `report.${decision}`,
    targetType: 'report',
    targetId: report._id,
    targetName: name,
    before: { status: 'open' },
    after: { status: set.status, facilityChange },
    reason: note || undefined,
  });
  return report;
}

// Lets a moderator clear a "full" / "damaged" / "closed" condition once it is fixed.
async function setOperationalStatus({ facilityId, actor, status }) {
  const before = await Facility.findByIdAndUpdate(facilityId, { $set: { operationalStatus: status } }, { returnDocument: 'before' }).lean();
  if (!before) return null;
  await AuditLog.create({
    actorId: actor._id,
    action: 'facility.opstatus',
    targetType: 'facility',
    targetId: before._id,
    targetName: before.name,
    before: { operationalStatus: before.operationalStatus },
    after: { operationalStatus: status },
  });
  return before;
}

const recentAudit = () => AuditLog.find().sort({ createdAt: -1 }).limit(100).populate('actorId', 'name').lean();

module.exports = {
  effectFor, dashboardData, getFacility, decide,
  listOpenReports, getReport, decideReport, setOperationalStatus, recentAudit,
};