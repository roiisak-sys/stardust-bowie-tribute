// One-off script: turn the Bowie photos already on the site into the red
// duotone look of the "Behind the Songs" poster (black shadows, red mids,
// cream highlights) and write them to public/assets/behind/.
//
// Usage: node scripts/prepare-behind-the-songs-images.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const SRC_DIR = join(REPO_ROOT, 'public/assets/bowie');
const OUT_DIR = join(REPO_ROOT, 'public/assets/behind');

// Gradient map: luminance 0..1 -> colour.
const STOPS = [
  [0.0, [8, 6, 6]],
  [0.3, [74, 12, 7]],
  [0.55, [197, 48, 26]],
  [0.8, [238, 107, 69]],
  [1.0, [248, 236, 217]],
];

function mapColor(t) {
  for (let i = 1; i < STOPS.length; i++) {
    const [t1, c1] = STOPS[i];
    if (t <= t1) {
      const [t0, c0] = STOPS[i - 1];
      const k = (t - t0) / (t1 - t0);
      return c0.map((v, j) => Math.round(v + (c1[j] - v) * k));
    }
  }
  return STOPS[STOPS.length - 1][1];
}

const LUT = Array.from({ length: 256 }, (_, i) => mapColor(i / 255));

// Paints a white rectangle over a caption baked into a photo.
async function whiteOut(srcName, rect) {
  const { width, height } = await sharp(join(SRC_DIR, srcName)).metadata();
  const w = Math.min(rect.width, width - rect.left);
  const h = Math.min(rect.height, height - rect.top);
  const patch = await sharp({ create: { width: w, height: h, channels: 3, background: '#ffffff' } }).png().toBuffer();
  return sharp(join(SRC_DIR, srcName)).composite([{ input: patch, left: rect.left, top: rect.top }]).toBuffer();
}

async function duotone(srcName, destName, { width, crop, blank } = {}) {
  let img = sharp(blank ? await whiteOut(srcName, blank) : join(SRC_DIR, srcName));
  if (crop) img = img.extract(crop);
  if (width) img = img.resize({ width, withoutEnlargement: true });
  const { data, info } = await img.grayscale().normalise().gamma(1.1).raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 3);
  for (let i = 0; i < info.width * info.height; i++) {
    const [r, g, b] = LUT[data[i * info.channels]];
    out[i * 3] = r;
    out[i * 3 + 1] = g;
    out[i * 3 + 2] = b;
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } })
    .webp({ quality: 78 })
    .toFile(join(OUT_DIR, destName));
  console.log(`${destName}: ${info.width}x${info.height}`);
}

mkdirSync(OUT_DIR, { recursive: true });
await duotone('bowie-portrait-stark-bw.webp', 'behind-portrait.webp', { width: 1200 });
await duotone('bowie-ziggy-stardust.webp', 'behind-ziggy.webp');
await duotone('bowie-aladdin-sane.webp', 'behind-aladdin-sane.webp', { crop: { left: 0, top: 0, width: 1000, height: 700 }, width: 800, blank: { left: 640, top: 0, width: 360, height: 90 } });
await duotone('bowie-lets-dance-era-portrait.webp', 'behind-lets-dance.webp');
await duotone('bowie-live-bw-profile-mic.webp', 'behind-live.webp');
await duotone('bowie-live-guitar-scarf.webp', 'behind-guitar.webp');

// The BOWIE wordmark in the poster's cream (the site's copy is red).
const { width: ww, height: wh } = await sharp(join(SRC_DIR, 'bowie-wordmark.png')).metadata();
const alpha = await sharp(join(SRC_DIR, 'bowie-wordmark.png')).ensureAlpha().extractChannel('alpha').raw().toBuffer();
const cream = await sharp({ create: { width: ww, height: wh, channels: 3, background: { r: 248, g: 236, b: 217 } } })
  .joinChannel(alpha, { raw: { width: ww, height: wh, channels: 1 } })
  .png()
  .toBuffer();
await sharp(cream)
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 10 })
  .webp({ quality: 85 })
  .toFile(join(OUT_DIR, 'behind-bowie-wordmark.webp'));
console.log('behind-bowie-wordmark.webp');
