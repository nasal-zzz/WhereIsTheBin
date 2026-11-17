const fs = require('fs');
const path = require('path');

const en = {
  'nav.account': 'Account',
  'account.title': 'My account',
  'account.details': 'Your details',
  'account.delete.title': 'Delete my account',
  'account.delete.intro': 'Deleting your account is permanent and cannot be undone. This is what happens:',
  'account.delete.removed': 'Your name, email address, password and language choice are deleted.',
  'account.delete.withdrawn': 'Places you added that were never published (waiting for review or rejected) and all your problem reports are deleted.',
  'account.delete.kept': 'Places that have already been published stay on the map for everyone, but they are no longer linked to you.',
  'account.delete.loggedOut': 'You will be logged out on all devices.',
  'account.delete.password': 'Enter your password to confirm',
  'account.delete.confirm': 'I understand that this cannot be undone.',
  'account.delete.button': 'Delete my account permanently',
  'account.delete.staff': 'Accounts with a moderator or admin role cannot be deleted here, so that moderation records stay accountable. Ask an administrator to change your role first.',
  'err.passwordWrong': 'The password is incorrect.',
  'err.confirmDelete': 'Tick the box to confirm.',
  'err.accountRole': 'This account cannot be deleted here.',
  'flash.accountDeleted': 'Your account has been deleted.',
};

const ml = {
  'nav.account': 'അക്കൗണ്ട്',
  'account.title': 'എന്റെ അക്കൗണ്ട്',
  'account.details': 'നിങ്ങളുടെ വിവരങ്ങൾ',
  'account.delete.title': 'എന്റെ അക്കൗണ്ട് ഇല്ലാതാക്കുക',
  'account.delete.intro': 'അക്കൗണ്ട് ഇല്ലാതാക്കുന്നത് സ്ഥിരമാണ്, പഴയപടിയാക്കാൻ കഴിയില്ല. ഇതാണ് സംഭവിക്കുന്നത്:',
  'account.delete.removed': 'നിങ്ങളുടെ പേര്, ഇമെയിൽ വിലാസം, പാസ്‌വേഡ്, ഭാഷാ തിരഞ്ഞെടുപ്പ് എന്നിവ ഇല്ലാതാക്കും.',
  'account.delete.withdrawn': 'നിങ്ങൾ ചേർത്ത, ഒരിക്കലും പ്രസിദ്ധീകരിക്കാത്ത സ്ഥലങ്ങളും (അവലോകനം കാത്തിരിക്കുന്നതോ നിരസിച്ചതോ) നിങ്ങളുടെ എല്ലാ പ്രശ്ന റിപ്പോർട്ടുകളും ഇല്ലാതാക്കും.',
  'account.delete.kept': 'ഇതിനകം പ്രസിദ്ധീകരിച്ച സ്ഥലങ്ങൾ എല്ലാവർക്കുമായി മാപ്പിൽ തുടരും, പക്ഷേ അവ ഇനി നിങ്ങളുമായി ബന്ധിപ്പിച്ചിരിക്കില്ല.',
  'account.delete.loggedOut': 'എല്ലാ ഉപകരണങ്ങളിലും നിങ്ങൾ ലോഗ് ഔട്ട് ആകും.',
  'account.delete.password': 'സ്ഥിരീകരിക്കാൻ നിങ്ങളുടെ പാസ്‌വേഡ് നൽകുക',
  'account.delete.confirm': 'ഇത് പഴയപടിയാക്കാൻ കഴിയില്ലെന്ന് ഞാൻ മനസ്സിലാക്കുന്നു.',
  'account.delete.button': 'എന്റെ അക്കൗണ്ട് സ്ഥിരമായി ഇല്ലാതാക്കുക',
  'account.delete.staff': 'മോഡറേറ്റർ അല്ലെങ്കിൽ അഡ്മിൻ റോൾ ഉള്ള അക്കൗണ്ടുകൾ ഇവിടെ ഇല്ലാതാക്കാൻ കഴിയില്ല; മോഡറേഷൻ രേഖകൾക്ക് ഉത്തരവാദിത്തം നിലനിർത്താനാണ് ഇത്. ആദ്യം ഒരു അഡ്മിനിസ്ട്രേറ്ററോട് നിങ്ങളുടെ റോൾ മാറ്റാൻ ആവശ്യപ്പെടുക.',
  'err.passwordWrong': 'പാസ്‌വേഡ് തെറ്റാണ്.',
  'err.confirmDelete': 'സ്ഥിരീകരിക്കാൻ ബോക്സ് ടിക്ക് ചെയ്യുക.',
  'err.accountRole': 'ഈ അക്കൗണ്ട് ഇവിടെ ഇല്ലാതാക്കാൻ കഴിയില്ല.',
  'flash.accountDeleted': 'നിങ്ങളുടെ അക്കൗണ്ട് ഇല്ലാതാക്കി.',
};

for (const [lang, extra] of [['en', en], ['ml', ml]]) {
  const file = path.join(__dirname, '..', 'locales', `${lang}.json`);
  const data = { ...JSON.parse(fs.readFileSync(file, 'utf8')), ...extra };
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}
console.log('Locales updated.');