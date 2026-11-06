// Walking directions, proxied through our server (keeps the browser on our site and lets us rate-limit).
// Uses the free FOSSGIS OSRM demo server: fine for development and light use only (see its usage policy).
// Its "routed-foot" prefix is what makes the route a WALKING route.
const MAX_KM = 30;
const ENDPOINT = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot';

const toRad = (d) => (d * Math.PI) / 180;
const num = (v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
const fail = (res, status, code) => res.status(status).json({ success: false, error: { code } });

function haversine(aLat, aLng, bLat, bLng) {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

// Turns an OSRM response into the small shape the browser needs. Returns null if there is no route.
function shapeRoute(osrm) {
  const r = osrm && osrm.routes && osrm.routes[0];
  if (!r) return null;
  return {
    distance: Math.round(r.distance),
    duration: Math.round(r.duration),
    coordinates: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    steps: r.legs.flatMap((leg) => leg.steps).map((s) => ({
      d: Math.round(s.distance),
      type: s.maneuver.type,
      mod: s.maneuver.modifier || '',
      name: s.name || '',
      lat: s.maneuver.location[1],
      lng: s.maneuver.location[0],
    })),
  };
}

async function route(req, res) {
  const [fLat, fLng, tLat, tLng] = ['fromLat', 'fromLng', 'toLat', 'toLng'].map((k) => num(req.query[k]));
  const all = [fLat, fLng, tLat, tLng];
  if (all.some((n) => !Number.isFinite(n)) || Math.abs(fLat) > 90 || Math.abs(tLat) > 90 || Math.abs(fLng) > 180 || Math.abs(tLng) > 180) {
    return fail(res, 400, 'INVALID_COORDINATES');
  }
  if (haversine(fLat, fLng, tLat, tLng) > MAX_KM * 1000) return fail(res, 422, 'TOO_FAR');

  try {
    const url = `${ENDPOINT}/${fLng},${fLat};${tLng},${tLat}?overview=full&geometries=geojson&steps=true`;
    const r = await fetch(url, {
      headers: { 'User-Agent': process.env.NOMINATIM_USER_AGENT || 'WhereIsTheBin/0.1 (development)' },
      signal: AbortSignal.timeout(8000),
    });
    const data = await r.json().catch(() => ({}));
    if (data.code === 'NoRoute') return fail(res, 404, 'NO_ROUTE');
    if (!r.ok || data.code !== 'Ok') throw new Error(`OSRM ${r.status} ${data.code || ''}`);
    const shaped = shapeRoute(data);
    if (!shaped) return fail(res, 404, 'NO_ROUTE');
    res.set('Cache-Control', 'no-store'); // location-based: never cache
    res.json({ success: true, data: shaped });
  } catch (err) {
    console.error('[route]', err.message); // message only: never log coordinates
    fail(res, 502, 'ROUTER_UNAVAILABLE');
  }
}

module.exports = { route, haversine, shapeRoute };