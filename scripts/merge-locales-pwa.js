const fs = require('fs');
const path = require('path');

const en = { 'pwa.install': 'Install app' };
const ml = { 'pwa.install': 'ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്യുക' };

for (const [lang, extra] of [['en', en], ['ml', ml]]) {
  const file = path.join(__dirname, '..', 'locales', `${lang}.json`);
  const data = { ...JSON.parse(fs.readFileSync(file, 'utf8')), ...extra };
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}
console.log('Locales updated.');