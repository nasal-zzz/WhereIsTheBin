const Facility = require('../models/Facility');
const Report = require('../models/Report');
const User = require('../models/User');

// Places that were NEVER public (still waiting, or rejected) can be withdrawn with the account.
// Anything that was verified at some point (even if it is now pending again or archived) stays on the
// map for everyone, but is unlinked from the person.
const withdrawableFilter = (userId) => ({
  addedBy: userId,
  verificationStatus: { $in: ['pending', 'rejected'] },
  lastVerifiedAt: null, // matches "never set"
});

// Returns i18n error keys; an empty list means the deletion may go ahead.
function deletionErrors({ role, passwordOk, confirmed }) {
  const errors = [];
  if (role !== 'user') errors.push('err.accountRole'); // staff accounts keep moderation records accountable
  else if (!passwordOk) errors.push('err.passwordWrong');
  if (!confirmed) errors.push('err.confirmDelete');
  return errors;
}

// Steps run in order and the user record goes LAST, so a failure part-way can simply be retried.
// (A standalone MongoDB has no multi-document transactions.)
async function deleteAccount(userId) {
  await Facility.deleteMany(withdrawableFilter(userId));
  await Facility.updateMany({ addedBy: userId }, { $unset: { addedBy: 1 } });
  await Report.deleteMany({ reportedBy: userId });
  await User.deleteOne({ _id: userId });
}

module.exports = { withdrawableFilter, deletionErrors, deleteAccount };