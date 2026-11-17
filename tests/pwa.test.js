const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const pub = (...p) => path.join(__dirname, '..', 'public', ...p);
const manifest = JSON.parse(fs.readFileSync(pub('manifest.webmanifest'), 'utf8'));

// PNG header: width and height are stored at bytes 16-23.
const pngSize = (file) => {
  const b = fs.readFileSync(file);
  return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
};

test('manifest has what browsers need to offer installation', () => {
  assert.ok(manifest.name && manifest.short_name);
  assert.strictEqual(manifest.start_url.startsWith('/'), true);
  assert.strictEqual(manifest.display, 'standalone');
  assert.ok(manifest.theme_color && manifest.background_color);
  const sizes = manifest.icons.map((i) => `${i.sizes}:${i.purpose}`);
  assert.ok(sizes.includes('192x192:any') && sizes.includes('512x512:any') && sizes.includes('512x512:maskable'));
});

test('every icon file exists and has the size the manifest claims (run: npm run make-icons)', () => {
  for (const icon of manifest.icons) {
    const file = pub(icon.src.replace(/^\//, ''));
    assert.ok(fs.existsSync(file), `${icon.src} is missing - run npm run make-icons`);
    assert.strictEqual(pngSize(file), icon.sizes, icon.src);
  }
  assert.strictEqual(pngSize(pub('icons', 'apple-touch-icon.png')), '180x180');
});

test('offline page is bilingual and uses the site stylesheet', () => {
  const html = fs.readFileSync(pub('offline.html'), 'utf8');
  assert.ok(html.includes('You are offline') && html.includes('lang="ml"'));
  assert.ok(html.includes('/css/main.css'));
});

test('service worker never caches API calls, posts or pages', () => {
  const sw = fs.readFileSync(pub('sw.js'), 'utf8');
  assert.ok(sw.includes("req.method !== 'GET'"));
  assert.ok(sw.includes("'/api/'"));
  assert.ok(/mode === 'navigate'[\s\S]*caches\.match\('\/offline\.html'\)/.test(sw));
  assert.ok(!/cache\.put\(req/.test(sw.split("req.mode === 'navigate'")[1].split('STATIC_PATHS.some')[0] || ''));
});