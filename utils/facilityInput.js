const { FACILITY_TYPES, WASTE_CATEGORIES, ACCESS_TYPES } = require('./constants');

// Kerala bounding box: submissions and edits outside it are rejected.
const KERALA = { minLat: 8.17, maxLat: 12.8, minLng: 74.85, maxLng: 77.45 };
const num = (v) => (String(v ?? '').trim() === '' ? NaN : Number(v));

// Shared by "Add a bin" and the moderator edit form. Returns { errors, values }; errors are i18n keys.
function validateFacilityInput(body = {}, { requireConsent = false } = {}) {
  const values = {
    name: String(body.name || '').trim(),
    facilityType: String(body.facilityType || ''),
    waste: [].concat(body.waste || []).map(String).filter((w) => WASTE_CATEGORIES.includes(w)),
    accessType: String(body.accessType || ''),
    district: String(body.district || '').trim().slice(0, 80),
    localBody: String(body.localBody || '').trim().slice(0, 80),
    address: String(body.address || '').trim().slice(0, 300),
    description: String(body.description || '').trim().slice(0, 500),
    lat: num(body.lat),
    lng: num(body.lng),
    consent: body.consent === 'on',
    confirmDuplicate: body.confirmDuplicate === 'on',
  };

  const errors = [];
  if (values.name.length < 2 || values.name.length > 120) errors.push('err.facilityName');
  if (!FACILITY_TYPES.includes(values.facilityType)) errors.push('err.type');
  if (!values.waste.length) errors.push('err.waste');
  if (!ACCESS_TYPES.includes(values.accessType)) errors.push('err.access');
  if (!Number.isFinite(values.lat) || !Number.isFinite(values.lng)) errors.push('err.coords');
  else if (values.lat < KERALA.minLat || values.lat > KERALA.maxLat || values.lng < KERALA.minLng || values.lng > KERALA.maxLng) {
    errors.push('err.outsideKerala');
  }
  if (requireConsent && !values.consent) errors.push('err.consent');
  return { errors, values };
}

module.exports = { validateFacilityInput, KERALA };