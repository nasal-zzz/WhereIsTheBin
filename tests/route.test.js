const test = require('node:test');
const assert = require('node:assert');
const { haversine, shapeRoute } = require('../controllers/api/routeController');

test('haversine: ~111 km per degree of latitude', () => {
  const d = haversine(11, 76, 12, 76);
  assert.ok(d > 110000 && d < 112500, String(d));
});

test('shapeRoute flips coordinates to [lat,lng] and flattens steps', () => {
  const shaped = shapeRoute({
    routes: [{
      distance: 120.4, duration: 90.2,
      geometry: { coordinates: [[76.2, 11.2], [76.21, 11.21]] },
      legs: [{ steps: [
        { distance: 100, name: 'Main Rd', maneuver: { type: 'depart', location: [76.2, 11.2] } },
        { distance: 0, name: '', maneuver: { type: 'arrive', location: [76.21, 11.21] } },
      ] }],
    }],
  });
  assert.deepStrictEqual(shaped.coordinates[0], [11.2, 76.2]);
  assert.strictEqual(shaped.steps.length, 2);
  assert.strictEqual(shaped.steps[1].type, 'arrive');
  assert.strictEqual(shaped.distance, 120);
});

test('shapeRoute returns null without a route', () => {
  assert.strictEqual(shapeRoute({ routes: [] }), null);
});