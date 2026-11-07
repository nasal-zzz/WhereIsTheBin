const fs = require('fs');
const path = require('path');

const en = {
  'report.title': 'Report a problem',
  'report.intro': 'Tell us if something here is wrong. A moderator will review it.',
  'report.type': 'What is wrong?',
  'report.type.full': 'It is full',
  'report.type.damaged': 'It is damaged',
  'report.type.missing': 'It is missing or gone',
  'report.type.wrong-location': 'The location is wrong',
  'report.note': 'Details (optional)',
  'report.submit': 'Send report',
  'report.login': 'Log in to report a problem',
  'err.reportType': 'Choose what is wrong.',
  'err.reportDuplicate': 'You have already reported this and it is waiting for review.',
  'flash.reported': 'Thank you. Your report was sent to the moderators.',
};

const ml = {
  'report.title': 'പ്രശ്നം അറിയിക്കുക',
  'report.intro': 'ഇവിടെ എന്തെങ്കിലും തെറ്റുണ്ടെങ്കിൽ അറിയിക്കുക. ഒരു മോഡറേറ്റർ അത് പരിശോധിക്കും.',
  'report.type': 'എന്താണ് പ്രശ്നം?',
  'report.type.full': 'നിറഞ്ഞിരിക്കുന്നു',
  'report.type.damaged': 'കേടായി',
  'report.type.missing': 'കാണുന്നില്ല / ഇല്ലാതായി',
  'report.type.wrong-location': 'സ്ഥാനം തെറ്റാണ്',
  'report.note': 'വിശദാംശങ്ങൾ (ഓപ്ഷണൽ)',
  'report.submit': 'റിപ്പോർട്ട് അയയ്ക്കുക',
  'report.login': 'പ്രശ്നം അറിയിക്കാൻ ലോഗിൻ ചെയ്യുക',
  'err.reportType': 'എന്താണ് പ്രശ്നം എന്ന് തിരഞ്ഞെടുക്കുക.',
  'err.reportDuplicate': 'നിങ്ങൾ ഇത് ഇതിനകം അറിയിച്ചിട്ടുണ്ട്, അവലോകനം കാത്തിരിക്കുകയാണ്.',
  'flash.reported': 'നന്ദി. നിങ്ങളുടെ റിപ്പോർട്ട് മോഡറേറ്റർമാർക്ക് അയച്ചു.',
};

for (const [lang, extra] of [['en', en], ['ml', ml]]) {
  const file = path.join(__dirname, '..', 'locales', `${lang}.json`);
  const data = { ...JSON.parse(fs.readFileSync(file, 'utf8')), ...extra };
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}
console.log('Locales updated.');