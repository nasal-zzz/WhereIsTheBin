(() => {
  const strings = JSON.parse(document.getElementById('i18n').textContent);
  const t = (k, p = {}) => (strings[k] || k).replace(/\{(\w+)\}/g, (_, x) => p[x] ?? '');
  const $ = (id) => document.getElementById(id);
  const latIn = $('lat');
  const lngIn = $('lng');
  const hasPoint = latIn.value !== '' && lngIn.value !== '';

  const map = L.map('pin-map').setView(hasPoint ? [+latIn.value, +lngIn.value] : [11.2766, 76.2273], hasPoint ? 17 : 13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  let marker = null;
  function setPoint(lat, lng, zoom) {
    latIn.value = lat.toFixed(6);
    lngIn.value = lng.toFixed(6);
    $('coords').textContent = t('add.coords', { lat: lat.toFixed(5), lng: lng.toFixed(5) });
    if (!marker) {
      marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on('dragend', () => { const p = marker.getLatLng(); setPoint(p.lat, p.lng); });
    } else marker.setLatLng([lat, lng]);
    if (zoom) map.setView([lat, lng], zoom);
  }

  map.on('click', (e) => setPoint(e.latlng.lat, e.latlng.lng));
  if (hasPoint) setPoint(+latIn.value, +lngIn.value);

  $('gps').addEventListener('click', () => {
    if (!navigator.geolocation) { $('coords').textContent = t('map.locationDenied'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setPoint(pos.coords.latitude, pos.coords.longitude, 18),
      () => { $('coords').textContent = t('map.locationDenied'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
})();
