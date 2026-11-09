const test = require('node:test');
const assert = require('node:assert');
const { validateFacilityInput } = require('../utils/facilityInput');

const good = { name: 'Test bin', facilityType: 'public-bin', waste: ['plastic'], accessType: 'public', lat: '11.2766', lng: '76.2273' };

test('accepts a valid facility', () => {
  assert.deepStrictEqual(validateFacilityInput(good).errors, []);
});

test('rejects bad fields with i18n keys', () => {
  const { errors } = validateFacilityInput({ name: 'x', facilityType: 'nope', waste: [], accessType: 'nope', lat: '', lng: '' });
  assert.deepStrictEqual(errors, ['err.facilityName', 'err.type', 'err.waste', 'err.access', 'err.coords']);
});

test('rejects a location outside Kerala', () => {
  assert.deepStrictEqual(validateFacilityInput({ ...good, lat: '28.6', lng: '77.2' }).errors, ['err.outsideKerala']);
});

test('consent is only required when asked for', () => {
  assert.deepStrictEqual(validateFacilityInput(good).errors, []);
  assert.deepStrictEqual(validateFacilityInput(good, { requireConsent: true }).errors, ['err.consent']);
  assert.deepStrictEqual(validateFacilityInput({ ...good, consent: 'on' }, { requireConsent: true }).errors, []);
});

test('ignores unknown waste values and trims long text', () => {
  const { values } = validateFacilityInput({ ...good, waste: ['plastic', 'gold'], description: 'd'.repeat(600) });
  assert.deepStrictEqual(values.waste, ['plastic']);
  assert.strictEqual(values.description.length, 500);
});