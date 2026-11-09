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

// ---------- facility management ----------
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const STATUSES = ['pending', 'verified', 'rejected', 'archived'];

function listFacilities({ status, q }) {
  const filter = { isDemo: { $ne: true } };
  if (STATUSES.includes(status)) filter.verificationStatus = status;
  if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' };
  return Facility.find(filter).sort({ updatedAt: -1 }).limit(100)
    .select('name facilityType verificationStatus operationalStatus district updatedAt').lean();
}

const EDITABLE = ['name', 'facilityType', 'acceptedWaste', 'accessType', 'district', 'localBody', 'address', 'description'];
const norm = (v) => (v === undefined || v === null ? '' : v);

// Saves a moderator edit and records exactly which fields changed. Returns null if the facility does not exist.
async function updateFacility({ facilityId, actor, values, markVerified }) {
  const before = await Facility.findById(facilityId).lean();
  if (!before) return null;

  const next = {
    name: values.name, facilityType: values.facilityType, acceptedWaste: values.waste, accessType: values.accessType,
    district: values.district, localBody: values.localBody, address: values.address, description: values.description,
  };
  const from = {};
  const to = {};
  for (const k of EDITABLE) {
    if (JSON.stringify(norm(before[k])) !== JSON.stringify(norm(next[k]))) { from[k] = norm(before[k]); to[k] = next[k]; }
  }
  const [oldLng, oldLat] = before.location.coordinates;
  if (Math.abs(oldLng - values.lng) > 1e-6 || Math.abs(oldLat - values.lat) > 1e-6) {
    from.location = [oldLat, oldLng];
    to.location = [values.lat, values.lng];
  }
  const stamp = markVerified && before.verificationStatus === 'verified';
  const changed = Object.keys(to);
  if (!changed.length && !stamp) return { changed: [], stamped: false };

  const set = { ...next, location: { type: 'Point', coordinates: [values.lng, values.lat] } };
  if (stamp) { set.lastVerifiedAt = new Date(); set.verifiedBy = actor._id; to.lastVerifiedAt = set.lastVerifiedAt; }
  await Facility.updateOne({ _id: facilityId }, { $set: set }, { runValidators: true });

  await AuditLog.create({
    actorId: actor._id, action: 'facility.edit', targetType: 'facility', targetId: before._id,
    targetName: values.name, before: from, after: to,
  });
  return { changed, stamped: stamp };
}

// archive: verified -> archived (hidden). restore: archived -> verified. Race-safe; null if the state does not fit.
async function setFacilityState({ facilityId, actor, state }) {
  const now = new Date();
  const rules = {
    archive: { from: 'verified', set: { verificationStatus: 'archived' } },
    restore: { from: 'archived', set: { verificationStatus: 'verified', lastVerifiedAt: now, verifiedBy: actor._id } },
  };
  const rule = rules[state];
  if (!rule) return null;
  const before = await Facility.findOneAndUpdate(
    { _id: facilityId, verificationStatus: rule.from }, { $set: rule.set }, { returnDocument: 'before' }
  ).lean();
  if (!before) return null;
  await AuditLog.create({
    actorId: actor._id, action: `facility.${state}`, targetType: 'facility', targetId: before._id, targetName: before.name,
    before: { verificationStatus: before.verificationStatus }, after: { verificationStatus: rule.set.verificationStatus },
  });
  return before;
}

const recentAudit = () => AuditLog.find().sort({ createdAt: -1 }).limit(100).populate('actorId', 'name').lean();

module.exports = {
  effectFor, dashboardData, getFacility, decide,
  listOpenReports, getReport, decideReport, setOperationalStatus, recentAudit,
  listFacilities, updateFacility, setFacilityState,
};