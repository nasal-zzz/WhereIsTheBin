(() => {
  const $ = (id) => document.getElementById(id);
  const strings = JSON.parse($('i18n').textContent);
  const t = (k, p = {}) => (strings[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => p[x] ?? '');
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  const mapEl = $('loc-map');
  const dest = { lat: Number(mapEl.dataset.lat), lng: Number(mapEl.dataset.lng) };
  const map = L.map(mapEl).setView([dest.lat, dest.lng], 17);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  L.marker([dest.lat, dest.lng]).addTo(map);

  // ---------- helpers ----------
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dist = (a, b) => {
    const dLat = rad(b.lat - a.lat);
    const x = rad(b.lng - a.lng) * Math.cos(rad((a.lat + b.lat) / 2));
    return Math.sqrt(dLat * dLat + x * x) * R;
  };
  // Shortest distance (metres) from a point to the route line.
  function distToRoute(p, coords) {
    const k = Math.cos(rad(p.lat));
    const xy = (lat, lng) => [rad(lng) * k * R, rad(lat) * R];
    const [px, py] = xy(p.lat, p.lng);
    let best = Infinity;
    for (let i = 0; i < coords.length - 1; i++) {
      const [ax, ay] = xy(coords[i][0], coords[i][1]);
      const [bx, by] = xy(coords[i + 1][0], coords[i + 1][1]);
      const dx = bx - ax;
      const dy = by - ay;
      const len2 = dx * dx + dy * dy;
      const u = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
      best = Math.min(best, Math.hypot(px - (ax + u * dx), py - (ay + u * dy)));
    }
    return best;
  }
  const fmtDist = (m) => (m < 1000
    ? t('dir.m', { n: m < 100 ? Math.round(m / 5) * 5 : Math.round(m / 10) * 10 })
    : t('dir.km', { n: (m / 1000).toFixed(1) }));
  const fmtTime = (s) => {
    const mins = Math.max(1, Math.round(s / 60));
    return mins >= 60 ? t('dir.hm', { h: Math.floor(mins / 60), m: mins % 60 }) : t('dir.min', { n: mins });
  };

  const MOD = { left: 'left', right: 'right', 'slight left': 'slight-left', 'slight right': 'slight-right',
    'sharp left': 'sharp-left', 'sharp right': 'sharp-right', straight: 'straight', uturn: 'uturn' };
  function instruction(s) {
    if (s.type === 'arrive') return t('dir.arrive');
    if (s.type === 'depart') return s.name ? t('dir.depart.road', { road: s.name }) : t('dir.depart');
    if (/roundabout|rotary/.test(s.type)) return t('dir.roundabout');
    const action = t('dir.' + (MOD[s.mod] || 'straight'));
    return s.name ? t('dir.withRoad', { action, road: s.name }) : action;
  }

  // ---------- state ----------
  let route = null;
  let line = null;
  let userMarker = null;
  let watchId = null;
  let wakeLock = null;
  let stepIdx = 1; // index of the UPCOMING manoeuvre
  let offCount = 0;
  let lastReroute = 0;
  const setStatus = (msg) => { $('dir-status').textContent = msg; };
  const fromParam = (() => {
    const m = /^(-?\d+(\.\d+)?),(-?\d+(\.\d+)?)$/.exec(new URLSearchParams(location.search).get('from') || '');
    return m ? { lat: Number(m[1]), lng: Number(m[3]) } : null;
  })();

  const userIcon = L.divIcon({ className: 'origin-wrap', html: '<span class="origin"></span>', iconSize: [18, 18] });
  function setUser(p) {
    if (!userMarker) userMarker = L.marker([p.lat, p.lng], { icon: userIcon, title: t('map.youAreHere') }).addTo(map);
    else userMarker.setLatLng([p.lat, p.lng]);
  }

  // ---------- route ----------
  async function loadRoute(from) {
    const q = new URLSearchParams({ fromLat: from.lat, fromLng: from.lng, toLat: dest.lat, toLng: dest.lng });
    const res = await fetch(`/api/v1/route?${q}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success) throw new Error(body.error?.code || 'ERROR');
    return body.data;
  }
  const errText = (e) => ({ TOO_FAR: t('dir.errTooFar'), NO_ROUTE: t('dir.errRoute') }[e.message] || t('dir.errService'));

  function draw(fit) {
    if (line) line.remove();
    line = L.polyline(route.coordinates, { weight: 6, opacity: 0.85, color: '#15803D' }).addTo(map);
    if (fit) map.fitBounds(line.getBounds(), { padding: [30, 30] });
  }
  function renderSteps() {
    const list = $('dir-steps');
    list.replaceChildren();
    route.steps.forEach((s, i) => {
      const li = el('li', i === stepIdx && watchId !== null ? 'current' : '');
      li.append(el('span', 'dir-instr', instruction(s)));
      if (s.type !== 'arrive' && s.d) li.append(el('span', 'dir-dist', fmtDist(s.d)));
      list.append(li);
    });
  }

  const getPos = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('NO_GEO'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });

  async function getDirections() {
    stopNav();
    setStatus(t('map.locating'));
    let from = null;
    let usedSearch = false;
    try {
      from = await getPos();
    } catch {
      if (fromParam) { from = fromParam; usedSearch = true; }
    }
    if (!from) { setStatus(t('dir.errLocation')); return; }
    try {
      route = await loadRoute(from);
    } catch (e) {
      setStatus(errText(e));
      return;
    }
    setStatus(usedSearch ? t('dir.fromSearch') : '');
    stepIdx = Math.min(1, route.steps.length - 1);
    setUser(from);
    draw(true);
    $('dir-summary').textContent = t('dir.summary', { distance: fmtDist(route.distance), time: fmtTime(route.duration) });
    renderSteps();
    $('dir-panel').hidden = false;
  }

  // ---------- live navigation ----------
  async function keepAwake() {
    try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch { /* optional */ }
  }
  function showBanner(text) { const b = $('dir-banner'); b.hidden = false; b.textContent = text; }

  function startNav() {
    if (!route || !navigator.geolocation) { setStatus(t('dir.errLocation')); return; }
    offCount = 0;
    $('dir-start').hidden = true;
    $('dir-stop').hidden = false;
    showBanner(instruction(route.steps[stepIdx]));
    watchId = navigator.geolocation.watchPosition(onPosition, () => setStatus(t('dir.errLocation')),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
    keepAwake();
    renderSteps();
  }
  function stopNav() {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
    $('dir-stop').hidden = true;
    $('dir-start').hidden = false;
    $('dir-banner').hidden = true;
    if (route) renderSteps();
  }
  function arrive() {
    stopNav();
    showBanner(t('dir.arrive'));
  }

  async function reroute(pos) {
    lastReroute = Date.now();
    offCount = 0;
    showBanner(t('dir.offRoute'));
    try {
      route = await loadRoute(pos);
      stepIdx = Math.min(1, route.steps.length - 1);
      draw(false);
      renderSteps();
    } catch { /* keep the old route and try again later */ }
  }

  function onPosition(p) {
    const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
    setUser(pos);
    map.panTo([pos.lat, pos.lng]);
    if (p.coords.accuracy > 100) return; // too imprecise to act on

    if (dist(pos, dest) < 25) { arrive(); return; }
    const last = route.steps.length - 1;
    while (stepIdx < last && dist(pos, route.steps[stepIdx]) < 20) stepIdx++;

    if (distToRoute(pos, route.coordinates) > 50) offCount++; else offCount = 0;
    if (offCount >= 3 && Date.now() - lastReroute > 15000) { reroute(pos); return; }

    const next = route.steps[stepIdx];
    showBanner(`${t('dir.in', { distance: fmtDist(dist(pos, next)) })}: ${instruction(next)}`);
    renderSteps();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && watchId !== null) keepAwake();
  });

  $('dir-btn').addEventListener('click', getDirections);
  $('dir-start').addEventListener('click', startNav);
  $('dir-stop').addEventListener('click', stopNav);
  if (new URLSearchParams(location.search).get('directions') === '1') getDirections();
})();