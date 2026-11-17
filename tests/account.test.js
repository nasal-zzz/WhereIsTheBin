const test = require('node:test');
const assert = require('node:assert');
const { withdrawableFilter, deletionErrors } = require('../services/accountService');

test('a normal member with the right password and confirmation may delete', () => {
  assert.deepStrictEqual(deletionErrors({ role: 'user', passwordOk: true, confirmed: true }), []);
});

test('wrong password and missing confirmation are reported', () => {
  assert.deepStrictEqual(deletionErrors({ role: 'user', passwordOk: false, confirmed: false }), ['err.passwordWrong', 'err.confirmDelete']);
});

test('staff accounts cannot self-delete, whatever the password', () => {
  for (const role of ['moderator', 'admin', 'super-admin']) {
    assert.ok(deletionErrors({ role, passwordOk: true, confirmed: true }).includes('err.accountRole'), role);
  }
});

test('only never-published places are withdrawn', () => {
  const f = withdrawableFilter('u1');
  assert.strictEqual(f.addedBy, 'u1');
  assert.deepStrictEqual(f.verificationStatus, { $in: ['pending', 'rejected'] });
  assert.strictEqual(f.lastVerifiedAt, null); // places that were ever verified are kept, unlinked
  assert.ok(!f.verificationStatus.$in.includes('verified') && !f.verificationStatus.$in.includes('archived'));
});