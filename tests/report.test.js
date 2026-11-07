const test = require('node:test');
const assert = require('node:assert');
const { validateReport } = require('../services/reportService');

test('accepts each allowed type', () => {
  for (const type of ['full', 'damaged', 'missing', 'wrong-location']) {
    assert.deepStrictEqual(validateReport({ type }).errors, []);
  }
});

test('rejects unknown or missing type', () => {
  assert.deepStrictEqual(validateReport({ type: 'hack' }).errors, ['err.reportType']);
  assert.deepStrictEqual(validateReport({}).errors, ['err.reportType']);
});

test('trims and caps the note at 300 characters', () => {
  const { values } = validateReport({ type: 'full', note: `  ${'x'.repeat(400)}  ` });
  assert.strictEqual(values.note.length, 300);
});