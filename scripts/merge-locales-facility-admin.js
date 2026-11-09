const fs = require('fs');
const path = require('path');

const en = {
  'admin.facilities': 'Facilities',
  'admin.facilities.all': 'All',
  'admin.facilities.search': 'Search by name',
  'admin.facilities.empty': 'No facilities found.',
  'admin.edit': 'Edit',
  'admin.edit.title': 'Edit facility',
  'admin.edit.save': 'Save changes',
  'admin.edit.markVerified': 'I checked this place: update the last verified date',
  'admin.edit.noChanges': 'Nothing was changed.',
  'admin.state.archive': 'Archive (hide from the public map)',
  'admin.state.restore': 'Restore as verified',
  'flash.facilityUpdated': 'Facility updated.',
  'flash.facilityArchived': 'Facility archived and hidden from the public map.',
  'flash.facilityRestored': 'Facility restored and visible again.',
  'flash.stateConflict': 'This facility is not in the right state for that action.',
  'audit.facility.edit': 'Edited',
  'audit.facility.archive': 'Archived',
  'audit.facility.restore': 'Restored',
};

const ml = {
  'admin.facilities': 'കേന്ദ്രങ്ങൾ',
  'admin.facilities.all': 'എല്ലാം',
  'admin.facilities.search': 'പേര് തിരയുക',
  'admin.facilities.empty': 'കേന്ദ്രങ്ങളൊന്നും കണ്ടെത്തിയില്ല.',
  'admin.edit': 'തിരുത്തുക',
  'admin.edit.title': 'കേന്ദ്രം തിരുത്തുക',
  'admin.edit.save': 'മാറ്റങ്ങൾ സേവ് ചെയ്യുക',
  'admin.edit.markVerified': 'ഞാൻ ഈ സ്ഥലം പരിശോധിച്ചു: അവസാന സ്ഥിരീകരണ തീയതി പുതുക്കുക',
  'admin.edit.noChanges': 'ഒന്നും മാറ്റിയിട്ടില്ല.',
  'admin.state.archive': 'ആർക്കൈവ് ചെയ്യുക (പൊതു മാപ്പിൽ നിന്ന് മറയ്ക്കുക)',
  'admin.state.restore': 'സ്ഥിരീകരിച്ചതായി തിരികെ എടുക്കുക',
  'flash.facilityUpdated': 'കേന്ദ്രം പുതുക്കി.',
  'flash.facilityArchived': 'കേന്ദ്രം ആർക്കൈവ് ചെയ്ത് പൊതു മാപ്പിൽ നിന്ന് മറച്ചു.',
  'flash.facilityRestored': 'കേന്ദ്രം തിരികെ എടുത്തു, വീണ്ടും ദൃശ്യമാണ്.',
  'flash.stateConflict': 'ഈ പ്രവർത്തനത്തിന് കേന്ദ്രം ശരിയായ അവസ്ഥയിലല്ല.',
  'audit.facility.edit': 'തിരുത്തി',
  'audit.facility.archive': 'ആർക്കൈവ് ചെയ്തു',
  'audit.facility.restore': 'തിരികെ എടുത്തു',
};

for (const [lang, extra] of [['en', en], ['ml', ml]]) {
  const file = path.join(__dirname, '..', 'locales', `${lang}.json`);
  const data = { ...JSON.parse(fs.readFileSync(file, 'utf8')), ...extra };
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}
console.log('Locales updated.');