const test = require('node:test');
const assert = require('node:assert');
const en = require('../locales/en.json');
const ml = require('../locales/ml.json');
const { translator, fromAcceptLanguage } = require('../utils/i18n');

test('en.json and ml.json have identical keys', () => {
  assert.deepStrictEqual(Object.keys(ml).sort(), Object.keys(en).sort());
});

test('no empty translations', () => {
  for (const d of [en, ml]) for (const [k, v] of Object.entries(d)) assert.ok(v.trim(), k);
});

test('translator falls back to the key', () => {
  assert.strictEqual(translator('ml')('does.not.exist'), 'does.not.exist');
});

test('Accept-Language detection', () => {
  assert.strictEqual(fromAcceptLanguage('ml-IN,en;q=0.8'), 'ml');
  assert.strictEqual(fromAcceptLanguage('fr-FR,de'), null);
});
