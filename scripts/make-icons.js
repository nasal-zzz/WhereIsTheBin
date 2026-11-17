// Generates the app icons in public/icons from the logo. Run once: npm run make-icons
// It cuts the pin-and-leaves part out of public/images/logo.png (without the written name).
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC = path.join(__dirname, '..', 'public', 'images', 'logo.png');
const OUT = path.join(__dirname, '..', 'public', 'icons');
// Position of the pin + leaves inside the original 1312 x 967 logo.
const REGION = { left: 160, top: 40, width: 860, height: 680 };
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const meta = await sharp(SRC).metadata();
  const sx = meta.width / 1312;
  const sy = meta.height / 967;
  const region = {
    left: Math.round(REGION.left * sx), top: Math.round(REGION.top * sy),
    width: Math.round(REGION.width * sx), height: Math.round(REGION.height * sy),
  };
  const cut = await sharp(SRC).extract(region).png().toBuffer();

  // `ratio` = how much of the icon the artwork fills. Maskable icons need a bigger safe margin
  // because Android may crop them into a circle or rounded square.
  async function make(file, size, ratio) {
    const inner = Math.round(size * ratio);
    const art = await sharp(cut)
      .resize({ width: inner, height: inner, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: WHITE } })
      .composite([{ input: art, gravity: 'centre' }])
      .png()
      .toFile(path.join(OUT, file));
    console.log('wrote', file);
  }

  await make('icon-192.png', 192, 0.86);
  await make('icon-512.png', 512, 0.86);
  await make('maskable-512.png', 512, 0.58);
  await make('apple-touch-icon.png', 180, 0.86);
}

main().catch((e) => { console.error(e.message); process.exit(1); });