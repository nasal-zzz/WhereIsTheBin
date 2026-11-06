(() => {
  const strings = JSON.parse(document.getElementById('i18n').textContent);
  const t = (k, p = {}) => (strings[k] || k).replace(/\{(\w+)\}/g, (_, x) => p[x] ?? '');
  const $ = (id) => document.getElementById(id);
  const locale = document.documentElement.lang === 'ml' ? 'ml-IN' : 'en-IN';
  const STALE_DAYS = 180;

  // Start centred on the Nilambur pilot area. Location is only requested when the user asks.
  const START = { lat: 11.2766, lng: 76.2273 };
  let origin = { ...START };
  let originChosen = false; // true only after the user searched a place or shared their location

  const map = L.map('map').setView([origin.lat, origin.lng], 14);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  const markers = L.layerGroup().addTo(map);
  const originMarker = L.marker([origin.lat, origin.lng], {
    title: t('map.youAreHere'),
    icon: L.divIcon({ className: 'origin-wrap', html: '<span class="origin"></span>', iconSize: [18, 18] }),
  }).addTo(map);

  const setStatus = (msg) => { $('status').textContent = msg; };
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const km = (m) => (m / 1000).toFixed(1);
  function verifiedLine(f) {
    if (!f.lastVerifiedAt) return el('p', 'meta', t('map.neverVerified'));
    const d = new Date(f.lastVerifiedAt);
    const stale = Date.now() - d.getTime() > STALE_DAYS * 86400000;
    const p = el('p', 'meta', `${t('map.lastVerified')}: ${d.toLocaleDateString(locale, { dateStyle: 'medium' })}`);
    if (stale) p.append(' · ', el('strong', 'warn', `⚠ ${t('map.stale')}`));
    return p;
  }

  function card(f, popup) {
    const box = el(popup ? 'div' : 'li', popup ? 'popup' : 'card');
    const head = el('h3', null, f.name);
    box.append(head);
    const badges = el('p', 'badges');
    badges.append(el('span', 'badge ok', `✓ ${t('map.verified')}`));
    badges.append(el('span', 'badge', t('type.' + f.facilityType)));
    if (f.isDemo) badges.append(el('span', 'badge demo', t('map.demo')));
    box.append(badges);
    box.append(el('p', 'meta', t('map.distance', { km: km(f.distanceM) })));
    if (f.acceptedWaste.length) {
      box.append(el('p', 'meta', `${t('map.accepts')}: ${f.acceptedWaste.map((w) => t('waste.' + w)).join(', ')}`));
    }
    box.append(verifiedLine(f));
    const more = el('a', 'btn btn-small btn-ghost', t('map.details'));
    more.href = `/facility/${f.id}`;
    box.append(more);
    const a = el('a', 'btn btn-small', t('map.directions'));
    const from = originChosen ? `&from=${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}` : '';
    a.href = `/facility/${f.id}?directions=1${from}`; // directions open on our own site
    box.append(a);
    return box;
  }

  function render(facilities) {
    markers.clearLayers();
    const list = $('list');
    list.replaceChildren();
    $('demo-banner').hidden = !facilities.some((f) => f.isDemo);

    facilities.forEach((f) => {
      const marker = L.marker([f.lat, f.lng], {
        title: f.name,
        icon: L.divIcon({ className: 'pin-wrap', html: '<span class="pin"><span>✓</span></span>', iconSize: [30, 30], iconAnchor: [15, 30] }),
      }).bindPopup(() => card(f, true));
      marker.addTo(markers);

      const item = card(f, false);
      item.tabIndex = 0;
      const focus = () => { map.flyTo([f.lat, f.lng], Math.max(map.getZoom(), 16)); marker.openPopup(); };
      item.addEventListener('click', (e) => { if (!e.target.closest('a')) focus(); });
      item.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target === item) focus(); });
      list.append(item);
    });
  }

  async function load() {
    const radiusKm = Number($('radius').value);
    const params = new URLSearchParams({ lat: origin.lat, lng: origin.lng, radius: radiusKm * 1000 });
    if ($('type').value) params.set('type', $('type').value);
    originMarker.setLatLng([origin.lat, origin.lng]);
    setStatus('');
    try {
      const res = await fetch(`/api/v1/facilities/nearby?${params}`);
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error?.code || 'ERROR');
      const { facilities, count } = body.data;
      render(facilities);
      setStatus(count ? t('map.results', { count }) : t('map.noResults', { km: radiusKm }));
      const pts = [[origin.lat, origin.lng], ...facilities.map((f) => [f.lat, f.lng])];
      if (count) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 });
      else map.setView([origin.lat, origin.lng], 14);
    } catch {
      render([]);
      setStatus(t('map.error'));
    }
  }

  $('search-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = $('q').value.trim();
    if (q.length < 2) return;
    try {
      const res = await fetch(`/api/v1/geocode?q=${encodeURIComponent(q)}`);
      const body = await res.json();
      if (!res.ok || !body.success) {
        setStatus(body.error?.code === 'PLACE_NOT_FOUND' ? t('map.placeNotFound') : t('map.error'));
        return;
      }
      origin = { lat: body.data.lat, lng: body.data.lng };
      originChosen = true;
      load();
    } catch {
      setStatus(t('map.error'));
    }
  });

  $('locate').addEventListener('click', () => {
    if (!navigator.geolocation) return setStatus(t('map.locationDenied'));
    setStatus(t('map.locating'));
    navigator.geolocation.getCurrentPosition(
      (pos) => { origin = { lat: pos.coords.latitude, lng: pos.coords.longitude }; originChosen = true; load(); }, // never stored or sent anywhere but the nearby query
      () => setStatus(t('map.locationDenied')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });

  $('type').addEventListener('change', load);
  $('radius').addEventListener('change', load);
  load();
})();