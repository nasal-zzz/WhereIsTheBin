// Registers the service worker (production, or locally with ENABLE_SW=1) and powers the "Install app" button.
(() => {
  const enabled = document.currentScript && document.currentScript.dataset.sw === '1';

  if ('serviceWorker' in navigator) {
    if (enabled) {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* the site works without it */ });
    } else {
      // In development a cached copy would hide your edits, so remove any old worker and its caches.
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
      if (window.caches) caches.keys().then((ks) => ks.filter((k) => k.startsWith('wib-')).forEach((k) => caches.delete(k)));
    }
  }

  const btn = document.getElementById('install-btn');
  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    if (btn) btn.hidden = false;
  });
  if (btn) {
    btn.addEventListener('click', async () => {
      if (!deferred) return;
      deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      btn.hidden = true;
    });
  }
  window.addEventListener('appinstalled', () => { if (btn) btn.hidden = true; });
})();