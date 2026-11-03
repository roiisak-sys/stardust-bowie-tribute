import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');

/**
 * Source files whose CSS is guarded by the redesign rules (reduced motion +
 * logical properties only). Only paths that EXIST are checked, so later tasks
 * simply append the component they create or rewrite to this list.
 */
export const GUARDED_SOURCES = [
  'src/styles/motion.css',
  'src/components/SwipeRow.astro',
  'src/components/Lightbox.astro',
  'src/components/ActionBar.astro',
  'src/components/Ticker.astro',
  'src/components/BandGallery.astro',
  'src/components/BandMembers.astro',
];

/** Files that must exist as of Task 2. */
const REQUIRED_NOW = [
  'src/styles/motion.css',
  'src/scripts/reveal.ts',
  'src/components/SwipeRow.astro',
  'src/scripts/swipe-row.ts',
  'src/components/Lightbox.astro',
  'src/scripts/lightbox.ts',
];

/** The CSS of a source: the whole file for .css, the <style> blocks for .astro. */
function cssOf(path: string): string {
  const text = readFileSync(join(ROOT, path), 'utf-8');
  if (path.endsWith('.css')) return text;
  return [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
}

/** Remove every `@media (prefers-reduced-motion: no-preference) { ... }` block (brace matched). */
function stripNoPreferenceBlocks(css: string): string {
  const marker = /@media\s*\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)\s*\{/g;
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = marker.exec(css))) {
    out += css.slice(last, m.index);
    let depth = 1;
    let i = marker.lastIndex;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }
    last = i;
    marker.lastIndex = i;
  }
  return out + css.slice(last);
}

const existing = () => GUARDED_SOURCES.filter((p) => existsSync(join(ROOT, p)));

describe('redesign shared pieces exist', () => {
  for (const p of REQUIRED_NOW) {
    it(`${p} exists`, () => {
      expect(existsSync(join(ROOT, p))).toBe(true);
    });
  }
});

describe('redesign guard — CSS sources', () => {
  it('(a) any animation:/transition: comes with a prefers-reduced-motion rule', () => {
    for (const p of existing()) {
      const css = cssOf(p);
      if (/\b(animation|transition)\s*:/.test(css)) {
        expect(css, `${p} animates without a prefers-reduced-motion rule`).toContain('prefers-reduced-motion');
      }
    }
  });

  it('(b) uses logical properties only (no left/right physical properties)', () => {
    const forbidden = [
      /\bmargin-(left|right)\b/,
      /\bpadding-(left|right)\b/,
      /\bborder-(left|right)\b/,
      /(^|[\s;{])(left|right)\s*:/m,
    ];
    for (const p of existing()) {
      const css = cssOf(p).replace(/\/\*[\s\S]*?\*\//g, '');
      for (const re of forbidden) {
        expect(css, `${p} matches ${re}`).not.toMatch(re);
      }
    }
  });

  it('(d) .js [data-reveal] and [data-colorize] styles live only inside a no-preference block', () => {
    const css = readFileSync(join(ROOT, 'src/styles/motion.css'), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toMatch(/prefers-reduced-motion\s*:\s*no-preference/);
    expect(css).toContain('.js [data-reveal]');
    expect(css).toContain('.js [data-colorize]');
    const outside = stripNoPreferenceBlocks(css);
    expect(outside).not.toContain('[data-reveal]');
    expect(outside).not.toContain('[data-colorize]');
  });
});

describe('redesign guard — built /he/', () => {
  let html = '';
  beforeAll(() => {
    const file = join(DIST, 'he', 'index.html');
    if (!existsSync(file)) throw new Error('dist/he/index.html not found. Run `npm run build` first.');
    html = readFileSync(file, 'utf-8');
  });

  it('(c) adds the js class from an inline <head> script, not statically', () => {
    const head = html.slice(html.indexOf('<head'), html.indexOf('</head>'));
    expect(head).toContain("classList.add('js')");
    const htmlTag = html.match(/<html[^>]*>/)![0];
    expect(htmlTag).not.toMatch(/class="[^"]*\bjs\b/);
  });

  it('(c) contains id="lightbox" exactly once', () => {
    expect(html.match(/id="lightbox"/g) ?? []).toHaveLength(1);
  });
});

describe('Task 3 — opening pill, ticker and action bar', () => {
  const read = (rel: string) => {
    const file = join(DIST, rel);
    if (!existsSync(file)) throw new Error(`dist/${rel} not found. Run \`npm run build\` first.`);
    return readFileSync(file, 'utf-8');
  };
  const homes = ['he/index.html', 'index.html', 'en/index.html'];
  const contentPages = ['he/show/index.html', 'show/index.html'];

  for (const rel of homes) {
    it(`${rel} has the action bar (WhatsApp + #watch) and no floating button`, () => {
      const html = read(rel);
      expect(html).toContain('class="action-bar"');
      const bar = html.slice(html.indexOf('class="action-bar"'));
      expect(bar).toContain('https://wa.me/');
      expect(bar).toContain('href="#watch"');
      expect(html).not.toContain('id="floating-whatsapp"');
    });

    it(`${rel} has an aria-hidden ticker`, () => {
      const html = read(rel);
      expect(html).toMatch(/<div[^>]*class="[^"]*\bticker\b[^"]*"[^>]*aria-hidden="true"|<div[^>]*aria-hidden="true"[^>]*class="[^"]*\bticker\b/);
      expect(html).toContain('STARDUST ✦ DAVID BOWIE TRIBUTE ✦ LIVE ✦');
    });
  }

  it('the play button has a real aria-label', () => {
    expect(read('he/index.html')).toMatch(/class="action-bar__play"[^>]*aria-label="[^"]+"|aria-label="[^"]+"[^>]*class="action-bar__play"/);
  });

  for (const rel of contentPages) {
    it(`${rel} keeps the floating WhatsApp and has no action bar`, () => {
      const html = read(rel);
      expect(html).toContain('id="floating-whatsapp"');
      expect(html).not.toContain('class="action-bar"');
    });
  }

  const shows = JSON.parse(readFileSync(join(ROOT, 'src/content/shows.json'), 'utf-8')) as {
    status: string;
    dateISO: string;
    cityHe: string;
    cityEn: string;
  }[];
  const today = new Date().toISOString().slice(0, 10);
  const next = shows
    .filter((s) => s.status === 'upcoming' && s.dateISO >= today)
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO))[0];

  it.skipIf(!next)('/he/ shows the next-show pill with date and city', () => {
    const html = read('he/index.html');
    const [, m, d] = next!.dateISO.split('-');
    expect(html).toContain('class="hero__pill"');
    const pill = html.slice(html.indexOf('class="hero__pill"'), html.indexOf('</a>', html.indexOf('class="hero__pill"')));
    expect(pill).toContain(`${Number(d)}.${Number(m)}`);
    expect(pill).toContain(next!.cityHe);
  });

  it.skipIf(!next)('/en/ shows the next-show pill with date and city', () => {
    const html = read('en/index.html');
    const pill = html.slice(html.indexOf('class="hero__pill"'), html.indexOf('</a>', html.indexOf('class="hero__pill"')));
    expect(pill).toContain(next!.cityEn);
  });

  it.skipIf(!!next)('no pill element when no upcoming show', () => {
    expect(read('he/index.html')).not.toContain('class="hero__pill"');
  });
});

describe('Task 4 — gallery swipe row, viewer and read more', () => {
  const read = (rel: string) => {
    const file = join(DIST, rel);
    if (!existsSync(file)) throw new Error(`dist/${rel} not found. Run \`npm run build\` first.`);
    return readFileSync(file, 'utf-8');
  };
  const copyHe = JSON.parse(readFileSync(join(ROOT, 'src/content/copy.he.json'), 'utf-8'));
  const copyEn = JSON.parse(readFileSync(join(ROOT, 'src/content/copy.en.json'), 'utf-8'));
  const galleryOf = (html: string) =>
    html.slice(html.indexOf('id="band-gallery"'), html.indexOf('</section>', html.indexOf('id="band-gallery"')));

  const pages: [string, typeof copyHe][] = [
    ['he/index.html', copyHe],
    ['en/index.html', copyEn],
    ['index.html', copyEn],
  ];

  for (const [rel, copy] of pages) {
    it(`${rel} has 12 gallery triggers, each labelled and captioned`, () => {
      const gallery = galleryOf(read(rel));
      const triggers = gallery.match(/<button[^>]*data-lightbox="gallery"[^>]*>/g) ?? [];
      expect(triggers).toHaveLength(12);
      for (const t of triggers) {
        expect(t).toContain('class="zoomable"');
        expect(t).toMatch(/data-full="\/assets\/gallery\/[^"]+\.webp"/);
        expect(t).toMatch(/data-caption="[^"]+"/);
        expect(t).toContain(`aria-label="${copy.ui.enlarge}"`);
      }
      expect(gallery).toContain('data-swipe');
      expect((gallery.match(/<div[^>]*data-swipe-item/g) ?? []).length).toBe(12);
    });

    it(`${rel} keeps the full intro text and a data-readmore button with copy labels`, () => {
      const html = read(rel);
      const escaped = copy.band.introParagraph
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      expect(html.includes(copy.band.introParagraph) || html.includes(escaped)).toBe(true);
      const btn = html.match(/<button[^>]*data-readmore[^>]*>[\s\S]*?<\/button>/);
      expect(btn).not.toBeNull();
      expect(btn![0]).toContain('aria-expanded="false"');
      expect(btn![0]).toContain(`data-more="${copy.ui.readMore}"`);
      expect(btn![0]).toContain(`data-less="${copy.ui.readLess}"`);
      expect(btn![0]).toContain(copy.ui.readMore);
    });
  }

  it('first two gallery images are not lazy, the other ten are', () => {
    const imgs = galleryOf(read('he/index.html')).match(/<img[^>]*>/g) ?? [];
    expect(imgs).toHaveLength(12);
    imgs.forEach((img, i) => {
      expect(img).toMatch(/width="\d+"/);
      expect(img).toMatch(/height="\d+"/);
      if (i < 2) expect(img).not.toContain('loading="lazy"');
      else expect(img).toContain('loading="lazy"');
    });
  });

  it('the read-more clamp is scoped under .js and the button is hidden otherwise', () => {
    const css = cssOf('src/components/BandGallery.astro').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toMatch(/-webkit-line-clamp\s*:\s*3/);
    // every rule that mentions line-clamp sits under a .js selector
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*line-clamp[^{}]*)\}/g)];
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) expect(r[1]).toMatch(/\.js(?![\w-])/);
    // the button is not shown without .js
    expect(css).toMatch(/\[data-readmore\][^{}]*\{[^{}]*display\s*:\s*none/);
    expect(css).toMatch(/\.js[^{}]*\[data-readmore\][^{}]*\{[^{}]*display\s*:\s*(inline-)?(block|flex)/);
  });

  it('the old GSAP gallery entrance is gone', () => {
    const src = readFileSync(join(ROOT, 'src/components/BandGallery.astro'), 'utf-8');
    expect(src).not.toContain('gsap');
    expect(src).not.toContain('data-gallery-cell');
  });
});

describe('Task 5 — band cards with a bio sheet', () => {
  const read = (rel: string) => {
    const file = join(DIST, rel);
    if (!existsSync(file)) throw new Error(`dist/${rel} not found. Run \`npm run build\` first.`);
    return readFileSync(file, 'utf-8');
  };
  const copyHe = JSON.parse(readFileSync(join(ROOT, 'src/content/copy.he.json'), 'utf-8'));
  const copyEn = JSON.parse(readFileSync(join(ROOT, 'src/content/copy.en.json'), 'utf-8'));
  const core = (
    JSON.parse(readFileSync(join(ROOT, 'src/content/band-members.json'), 'utf-8')) as {
      role: string;
      nameHe: string;
      nameEn: string;
      bioHe: string;
      bioEn: string;
    }[]
  ).filter((m) => m.role === 'core');
  const decode = (t: string) =>
    t.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const bandOf = (html: string) =>
    html.slice(html.indexOf('id="band"'), html.indexOf('</section>', html.indexOf('id="band"')));

  const pages: [string, 'He' | 'En', typeof copyHe][] = [
    ['he/index.html', 'He', copyHe],
    ['en/index.html', 'En', copyEn],
    ['index.html', 'En', copyEn],
  ];

  it('there are six core members', () => {
    expect(core).toHaveLength(6);
  });

  for (const [rel, L, copy] of pages) {
    it(`${rel} has every bio inside a .band__bio element, once`, () => {
      const html = read(rel);
      const bios = [...html.matchAll(/<p[^>]*class="band__bio"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => decode(m[1]));
      expect(bios).toHaveLength(6);
      for (const m of core) {
        expect(bios).toContain(m[`bio${L}` as 'bioHe' | 'bioEn']);
        // no bio text duplicated anywhere else (the shared sheet is filled by script)
        const escaped = m[`bio${L}` as 'bioHe' | 'bioEn'];
        expect(decode(html).split(escaped).length - 1).toBe(1);
      }
    });

    it(`${rel} has exactly one band-sheet dialog, labelled, with a localized close button`, () => {
      const html = read(rel);
      expect(html.match(/id="band-sheet"/g) ?? []).toHaveLength(1);
      const dialog = html.match(/<dialog[^>]*id="band-sheet"[^>]*>[\s\S]*?<\/dialog>/);
      expect(dialog).not.toBeNull();
      const d = dialog![0];
      expect(d).toMatch(/aria-labelledby="([^"]+)"/);
      const id = d.match(/aria-labelledby="([^"]+)"/)![1];
      expect(d).toContain(`id="${id}"`);
      expect(d).toContain(`aria-label="${copy.ui.bandSheetClose}"`);
    });

    it(`${rel} has six open buttons, each carrying the member name, with a colorize photo`, () => {
      const band = bandOf(read(rel));
      const buttons = band.match(/<button[^>]*class="band__open"[^>]*>[\s\S]*?<\/button>/g) ?? [];
      expect(buttons).toHaveLength(6);
      buttons.forEach((b, i) => {
        expect(b).toContain('type="button"');
        expect(decode(b)).toContain(core[i][`name${L}` as 'nameHe' | 'nameEn']);
        const img = b.match(/<img[^>]*>/)![0];
        expect(img).toContain('data-colorize');
        expect(img).toMatch(/width="\d+"/);
        expect(img).toMatch(/height="\d+"/);
        expect(img).toMatch(/src="[^"]+\.webp"/);
        expect(img).toMatch(/\salt(=""|\s|>)/);
      });
      expect((band.match(/<article[^>]*class="band__card"[^>]*data-reveal|<article[^>]*data-reveal[^>]*class="band__card"/g) ?? []).length).toBe(6);
      expect(band).toContain('data-swipe');
      expect((band.match(/data-swipe-item/g) ?? []).length).toBe(6);
    });

    it(`${rel} keeps the statement paragraph above the row`, () => {
      const band = bandOf(read(rel));
      const at = band.indexOf('class="band__statement"');
      expect(at).toBeGreaterThan(-1);
      expect(at).toBeLessThan(band.indexOf('data-swipe'));
      expect(decode(band)).toContain(copy.band.statement);
    });
  }

  it('the section is dark, not off-white, and the old GSAP entrance and hover grayscale are gone', () => {
    const src = readFileSync(join(ROOT, 'src/components/BandMembers.astro'), 'utf-8');
    expect(src).not.toContain('gsap');
    expect(src).not.toContain('data-band-member');
    const css = cssOf('src/components/BandMembers.astro').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).not.toContain('grayscale');
    const band = css.match(/(^|\})\s*\.band\s*\{([^{}]*)\}/);
    expect(band).not.toBeNull();
    expect(band![2]).toMatch(/background\s*:\s*var\(--color-black/);
    expect(band![2]).not.toMatch(/background\s*:\s*var\(--color-off-white/);
  });

  it('the .band__bio hide rule is scoped under .js (visible without JavaScript)', () => {
    const css = cssOf('src/components/BandMembers.astro').replace(/\/\*[\s\S]*?\*\//g, '');
    const rules = [...css.matchAll(/([^{}]*\.band__bio[^{}]*)\{([^{}]*)\}/g)];
    const hiding = rules.filter((r) => /clip|visibility\s*:\s*hidden|display\s*:\s*none|position\s*:\s*absolute/.test(r[2]));
    expect(hiding.length).toBeGreaterThan(0);
    for (const r of hiding) expect(r[1]).toMatch(/\.js(?![\w-])/);
  });

  it('the sheet slides up only with no-preference motion, and the photo is anchored on the face', () => {
    const css = cssOf('src/components/BandMembers.astro').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toMatch(/object-position\s*:\s*center 20%/);
    const outside = stripNoPreferenceBlocks(css);
    expect(outside).not.toMatch(/(animation|transition)\s*:/);
  });
});
