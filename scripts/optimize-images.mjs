// One-off script: converts the site's JPG/PNG images to WebP (smaller, faster LCP),
// renames the gallery files descriptively, makes two sizes of the logo (hero and
// corner mark) and builds the 1200x630 link-preview image (og:image).
//
// Originals are left in place; delete them after checking the output.
//
// Usage: node scripts/optimize-images.mjs
import sharp from 'sharp';
import { readdirSync, mkdirSync } from 'node:fs';
import { join, dirname, parse } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public');
const A = join(PUBLIC, 'assets');

const jobs = [
  // folder, max width, quality, optional rename
  { dir: 'gallery', width: 1400, quality: 78, rename: (n) => n.replace('gallery-band-', 'stardust-bowie-tribute-live-') },
  { dir: 'band', width: 900, quality: 80 },
  { dir: 'bowie', width: 1200, quality: 78 },
  { dir: 'posters', width: 900, quality: 80 },
];

async function toWebp(src, dest, width, quality) {
  const info = await sharp(src).rotate().resize({ width, withoutEnlargement: true }).webp({ quality, effort: 5 }).toFile(dest);
  return info;
}

for (const j of jobs) {
  const dir = join(A, j.dir);
  for (const f of readdirSync(dir)) {
    const p = parse(f);
    if (!['.jpg', '.jpeg', '.png'].includes(p.ext.toLowerCase())) continue;
    const base = j.rename ? j.rename(p.name) : p.name;
    const dest = join(dir, base + '.webp');
    const info = await toWebp(join(dir, f), dest, j.width, j.quality);
    console.log(`${j.dir}/${f} -> ${base}.webp (${Math.round(info.size / 1024)} KB, ${info.width}x${info.height})`);
  }
}

// Hero poster (also the LCP fallback while the video loads).
await toWebp(join(A, 'hero', 'hero-band-live.jpg'), join(A, 'hero', 'hero-band-live.webp'), 1600, 72);
console.log('hero poster -> hero-band-live.webp');

// Logo: a large version for the hero and footer, a small one for the corner mark.
const logoSrc = join(A, 'logo', 'stardust-logo.png');
await sharp(logoSrc).resize({ width: 1280 }).webp({ quality: 88, alphaQuality: 95 }).toFile(join(A, 'logo', 'stardust-logo.webp'));
await sharp(logoSrc).resize({ width: 360 }).webp({ quality: 90, alphaQuality: 95 }).toFile(join(A, 'logo', 'stardust-logo-small.webp'));
console.log('logo -> stardust-logo.webp, stardust-logo-small.webp');

// Link preview image, 1200x630: logo and dust centred on black.
const layout = JSON.parse((await import('node:fs')).readFileSync(join(__dirname, '..', 'src/content/logo-layout.json'), 'utf8'));
const W = 1200, H = 630, logoW = 880;
const logoMeta = await sharp(logoSrc).metadata();
const logoH = Math.round((logoW * logoMeta.height) / logoMeta.width);
const logoLeft = Math.round((W - logoW) / 2), logoTop = Math.round((H - logoH) / 2);
const dustW = Math.round(logoW * layout.dustWidthOfLogo), dustH = Math.round(dustW * layout.dustAspect);
const dustLeft = Math.round(logoLeft + logoW * layout.dustLeftOfLogo), dustTop = Math.round(logoTop + logoH * layout.dustTopOfLogo);
const pad = Math.max(dustW, dustH);
const dust = await sharp(join(A, 'logo', 'stardust-dust.webp')).resize(dustW, dustH).png().toBuffer();
const logo = await sharp(logoSrc).resize(logoW, logoH).png().toBuffer();
mkdirSync(join(A, 'og'), { recursive: true });
const big = await sharp({ create: { width: W + pad * 2, height: H + pad * 2, channels: 4, background: '#0a0a0a' } })
  .composite([{ input: dust, left: dustLeft + pad, top: dustTop + pad }, { input: logo, left: logoLeft + pad, top: logoTop + pad }])
  .png().toBuffer();
await sharp(big).extract({ left: pad, top: pad, width: W, height: H }).flatten({ background: '#0a0a0a' }).jpeg({ quality: 86, mozjpeg: true }).toFile(join(A, 'og', 'stardust-og.jpg'));
console.log('og image -> assets/og/stardust-og.jpg');
