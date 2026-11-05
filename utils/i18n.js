const en = require('../locales/en.json');
const ml = require('../locales/ml.json');

const dictionaries = { en, ml };
const SUPPORTED = Object.keys(dictionaries);

// Returns a translator for a locale; falls back to English, then to the key itself.
function translator(locale) {
  const dict = dictionaries[locale] || en;
  return (key, params = {}) => {
    const str = dict[key] ?? en[key] ?? key;
    return str.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? `{${k}}`));
  };
}

// Picks the first supported language from an Accept-Language header.
function fromAcceptLanguage(header = '') {
  const tags = header.split(',').map((p) => p.split(';')[0].trim().toLowerCase().slice(0, 2));
  return tags.find((t) => SUPPORTED.includes(t)) || null;
}

// Subset of a dictionary (by key prefix) for client-side scripts, as a script-tag-safe JSON string.
function clientStrings(locale, prefixes) {
  const dict = { ...en, ...(dictionaries[locale] || {}) };
  const out = {};
  for (const k of Object.keys(dict)) if (prefixes.some((p) => k.startsWith(p))) out[k] = dict[k];
  return JSON.stringify(out).replace(/</g, '\\u003c');
}

module.exports = { translator, fromAcceptLanguage, clientStrings, SUPPORTED };
