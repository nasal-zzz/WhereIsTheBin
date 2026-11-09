const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const read = (name, lang) => fs.readFileSync(path.join(__dirname, '..', 'views', 'pages', `${name}.${lang}.ejs`), 'utf8');
const count = (s, re) => (s.match(re) || []).length;

for (const name of ['about', 'privacy']) {
  test(`${name}: English and Malayalam versions have the same structure`, () => {
    const en = read(name, 'en');
    const ml = read(name, 'ml');
    for (const re of [/<h2>/g, /<li>/g, /<ul>/g, /<p>/g]) assert.strictEqual(count(ml, re), count(en, re), String(re));
  });

  test(`${name}: no leftover placeholders`, () => {
    for (const lang of ['en', 'ml']) assert.ok(!/TODO|FIXME|lorem/i.test(read(name, lang)), `${name}.${lang}`);
  });
}