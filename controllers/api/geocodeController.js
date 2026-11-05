// Server-side proxy to Nominatim so we can send a proper User-Agent and rate-limit.
// The public Nominatim service is for light use only (see its usage policy);
// switch to a hosted geocoder before real traffic.
exports.search = async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 120);
  if (q.length < 2) return res.status(400).json({ success: false, error: { code: 'INVALID_QUERY' } });

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({
    q,
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'in',
    viewbox: '74.85,12.80,77.45,8.25', // Kerala bounding box (left,top,right,bottom)
    bounded: '1',
  }).toString();

  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': process.env.NOMINATIM_USER_AGENT || 'WhereIsTheBin/0.1 (development)',
        'Accept-Language': req.locale || 'en',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) throw new Error(`Nominatim ${r.status}`);
    const rows = await r.json();
    if (!rows.length) return res.status(404).json({ success: false, error: { code: 'PLACE_NOT_FOUND' } });
    const { lat, lon, display_name: label } = rows[0];
    res.json({ success: true, data: { lat: Number(lat), lng: Number(lon), label } });
  } catch (err) {
    console.error('[geocode]', err.message);
    res.status(502).json({ success: false, error: { code: 'GEOCODER_UNAVAILABLE' } });
  }
};
