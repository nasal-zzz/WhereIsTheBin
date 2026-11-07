const test = require('node:test');
const assert = require('node:assert');
const { effectFor } = require('../services/moderationService');
const { REPORT_TYPES } = require('../utils/constants');

test('every report type has an effect', () => {
  for (const type of REPORT_TYPES) assert.ok(effectFor(type), type);
});

test('confirming maps to the expected facility change', () => {
  assert.deepStrictEqual(effectFor('full'), { operationalStatus: 'reported-full' });
  assert.deepStrictEqual(effectFor('damaged'), { operationalStatus: 'damaged' });
  assert.deepStrictEqual(effectFor('missing'), { verificationStatus: 'archived' });
  assert.deepStrictEqual(effectFor('wrong-location'), { verificationStatus: 'pending' });
});

test('unknown type has no effect', () => {
  assert.strictEqual(effectFor('nope'), null);
});