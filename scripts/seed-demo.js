// Seeds clearly-labelled DEMO facilities around Nilambur for UI testing.
// These are NOT real locations. Remove with: npm run seed:demo -- --clear
require('dotenv').config();
const mongoose = require('mongoose');
const Facility = require('../models/Facility');

const CENTER = { lat: 11.2766, lng: 76.2273 };
// [name, type, waste, dLat, dLng]
const DEMO = [
  ['DEMO Public bin A', 'public-bin', ['dry'], 0.002, 0.001],
  ['DEMO Public bin B', 'public-bin', ['dry', 'plastic'], -0.004, 0.003],
  ['DEMO Collection facility', 'mcf', ['plastic', 'paper', 'glass', 'metal'], 0.008, -0.004],
  ['DEMO Mini collection point', 'mini-mcf', ['plastic', 'paper'], -0.009, -0.006],
  ['DEMO Recycling centre', 'recycling', ['plastic', 'metal', 'glass'], 0.014, 0.01],
  ['DEMO E-waste drop-off', 'e-waste', ['e-waste'], -0.013, 0.012],
  ['DEMO Organic waste facility', 'organic', ['organic'], 0.02, -0.012],
  ['DEMO Public bin C', 'public-bin', ['dry', 'paper'], 0.0, -0.008],
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await Facility.deleteMany({ isDemo: true });
  if (process.argv.includes('--clear')) {
    console.log('Demo facilities removed.');
  } else {
    await Facility.syncIndexes();
    await Facility.insertMany(
      DEMO.map(([name, facilityType, acceptedWaste, dLat, dLng]) => ({
        name, facilityType, acceptedWaste,
        location: { type: 'Point', coordinates: [CENTER.lng + dLng, CENTER.lat + dLat] },
        address: 'Demo data - not a real location',
        district: 'Malappuram', localBody: 'Nilambur',
        accessType: 'public', verificationStatus: 'verified', operationalStatus: 'unknown',
        sourceType: 'demo', isDemo: true, lastVerifiedAt: new Date(),
      }))
    );
    console.log(`Seeded ${DEMO.length} DEMO facilities.`);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
