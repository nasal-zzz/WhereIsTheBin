(() => {
  const el = document.getElementById('loc-map');
  const lat = Number(el.dataset.lat);
  const lng = Number(el.dataset.lng);
  const map = L.map(el).setView([lat, lng], 17);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  L.marker([lat, lng]).addTo(map);
})();