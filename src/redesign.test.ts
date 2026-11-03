import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest';
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
  'src/components/BowieCollage.astro',
  'src/components/UpcomingShows.astro',
  'src/components/PastShows.astro',
  'src/components/ExploreLinks.astro',
  'src/components/FinalScene.astro',
  'src/components/WatchVideo.astro',
  'src/components/BowieStory.astro',
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
      // The bar element itself (it holds only links, svg and spans, so the first </div> closes it).
      const bar = html.match(/<div[^>]*class="action-bar"[^>]*>[\s\S]*?<\/div>/)?.[0];
      expect(bar).toBeDefined();
      expect(bar).toMatch(/<a[^>]*class="action-bar__wa"[^>]*href="https:\/\/wa\.me\/|<a[^>]*href="https:\/\/wa\.me\/[^"]*"[^>]*class="action-bar__wa"/);
      expect(bar).toMatch(/<a[^>]*class="action-bar__play"[^>]*href="#watch"|<a[^>]*href="#watch"[^>]*class="action-bar__play"/);
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

describe('Task 6 — Bowie eras swipe strip', () => {
  const read = (rel: string) => {
    const file = join(DIST, rel);
    if (!existsSync(file)) throw new Error(`dist/${rel} not found. Run \`npm run build\` first.`);
    return readFileSync(file, 'utf-8');
  };
  const copyHe = JSON.parse(readFileSync(join(ROOT, 'src/content/copy.he.json'), 'utf-8'));
  const copyEn = JSON.parse(readFileSync(join(ROOT, 'src/content/copy.en.json'), 'utf-8'));
  const decode = (t: string) =>
    t.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const collageOf = (html: string) =>
    html.slice(html.indexOf('id="bowie-collage"'), html.indexOf('</section>', html.indexOf('id="bowie-collage"')));

  const pages: [string, 'he' | 'en', typeof copyHe][] = [
    ['he/index.html', 'he', copyHe],
    ['en/index.html', 'en', copyEn],
    ['index.html', 'en', copyEn],
  ];

  for (const [rel, loc, copy] of pages) {
    it(`${rel} has 8 era triggers in a swipe row, each labelled and captioned`, () => {
      const section = collageOf(read(rel));
      const triggers = section.match(/<button[^>]*data-lightbox="eras"[^>]*>/g) ?? [];
      expect(triggers).toHaveLength(8);
      triggers.forEach((t, i) => {
        const name = copy.bowies.eras[i].name as string;
        const caption = loc === 'he' ? `דיוויד בואי, ${name}` : `David Bowie, ${name}`;
        expect(t).toContain('type="button"');
        expect(t).toContain('class="zoomable"');
        expect(t).toMatch(/data-full="\/assets\/bowie\/[^"]+\.webp"/);
        expect(decode(t)).toContain(`data-caption="${caption}"`);
        expect(t).toContain(`aria-label="${copy.ui.enlarge}"`);
      });
      expect(section).toContain('data-swipe');
      expect((section.match(/<div[^>]*data-swipe-item/g) ?? []).length).toBe(8);
    });

    it(`${rel} shows every era name once as a label, and no era line`, () => {
      const section = decode(collageOf(read(rel)));
      const labels = [...section.matchAll(/<span[^>]*class="collage__label[^"]*"[^>]*>([^<]*)<\/span>/g)].map((m) => m[1]);
      expect(labels).toEqual((copy.bowies.eras as { name: string }[]).map((e) => e.name));
      for (const era of copy.bowies.eras as { name: string; line: string }[]) {
        expect(section).not.toContain(era.line);
      }
    });

    it(`${rel} keeps the wordmark, heading and fragments line`, () => {
      const section = decode(collageOf(read(rel)));
      expect(section).toContain('bowie-wordmark.webp');
      expect(section).toContain(copy.question.heading);
      expect(section).toContain((copy.question.fragments as string[]).join(' · '));
    });
  }

  it('era images carry explicit size, keep the head-preserving crop, and the first is lazy', () => {
    const imgs = collageOf(read('he/index.html')).match(/<img[^>]*class="collage__image"[^>]*>/g) ?? [];
    expect(imgs).toHaveLength(8);
    for (const img of imgs) {
      expect(img).toMatch(/width="\d+"/);
      expect(img).toMatch(/height="\d+"/);
      expect(img).toMatch(/\salt(=""|\s|>)/);
      expect(img).toContain('loading="lazy"');
    }
  });

  it('no element starts hidden: no bare opacity: 0, no GSAP, no grid cells', () => {
    const src = readFileSync(join(ROOT, 'src/components/BowieCollage.astro'), 'utf-8');
    expect(src).not.toContain('gsap');
    expect(src).not.toContain('data-collage-cell');
    expect(src).not.toContain('data-collage-grid');
    const css = cssOf('src/components/BowieCollage.astro').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).not.toMatch(/opacity\s*:\s*0(?![.\d])/);
    expect(css).toMatch(/object-position\s*:\s*center top/);
    expect(css).toMatch(/object-position\s*:\s*50% 25%/);
    expect(css).toMatch(/aspect-ratio\s*:\s*3\s*\/\s*4/);
  });
});

describe('Task 7 — upcoming show as a ticket card', () => {
  const read = (rel: string) => {
    const file = join(DIST, rel);
    if (!existsSync(file)) throw new Error(`dist/${rel} not found. Run \`npm run build\` first.`);
    return readFileSync(file, 'utf-8');
  };
  const copyHe = JSON.parse(readFileSync(join(ROOT, 'src/content/copy.he.json'), 'utf-8'));
  const copyEn = JSON.parse(readFileSync(join(ROOT, 'src/content/copy.en.json'), 'utf-8'));
  const decode = (t: string) =>
    t.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const upcomingOf = (html: string) =>
    html.slice(html.indexOf('id="upcoming-shows"'), html.indexOf('</section>', html.indexOf('id="upcoming-shows"')));
  const shows = JSON.parse(readFileSync(join(ROOT, 'src/content/shows.json'), 'utf-8')) as {
    status: string;
    dateISO: string;
    venueHe: string;
    venueEn: string;
    cityHe: string;
    cityEn: string;
    posterImage: string;
    ticketUrl: string;
    eventUrl: string;
  }[];
  // The component renders every show whose status is 'upcoming' (it never compares
  // dates), so the test does the same and never reads the clock.
  const next = shows
    .filter((s) => s.status === 'upcoming')
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO))[0];

  const pages: [string, 'he' | 'en', typeof copyHe][] = [
    ['he/index.html', 'he', copyHe],
    ['en/index.html', 'en', copyEn],
    ['index.html', 'en', copyEn],
  ];

  for (const [rel, loc, copy] of pages) {
    it.skipIf(!next)(`${rel} renders the upcoming show as a ticket with date block, venue, city and tickets link`, () => {
      const section = decode(upcomingOf(read(rel)));
      expect(section).toContain(copy.upcomingShows.heading);
      expect(section).toMatch(/<div[^>]*class="ticket[ "]/);
      const [year, , day] = next!.dateISO.split('-');
      expect(section).toMatch(/class="ticket__date[ "]/);
      expect(section).toContain(`datetime="${next!.dateISO}"`);
      expect(section).toMatch(/<time[^>]*class="ticket__date/);
      expect(section).toMatch(new RegExp(`class="ticket__day[^"]*"[^>]*>\\s*${day}\\s*<`));
      expect(section).toMatch(new RegExp(`class="ticket__year[^"]*"[^>]*>\\s*${year}\\s*<`));
      const expectedMonth = new Date(`${next!.dateISO}T00:00:00Z`)
        .toLocaleDateString(loc === 'he' ? 'he-IL' : 'en-US', { month: 'short', timeZone: 'UTC' })
        .toUpperCase();
      expect(section).toMatch(new RegExp(`class="ticket__month[^"]*"[^>]*>\\s*${expectedMonth}\\s*<`));
      expect(section).toContain(loc === 'he' ? next!.venueHe : next!.venueEn);
      expect(section).toContain(loc === 'he' ? next!.cityHe : next!.cityEn);
      const cta = section.match(/<a[^>]*class="[^"]*\bticket__cta\b[^"]*"[^>]*>[\s\S]*?<\/a>/);
      expect(cta).not.toBeNull();
      const wantedUrl = next!.ticketUrl || next!.eventUrl;
      if (wantedUrl) {
        expect(cta![0]).toContain(`href="${wantedUrl}"`);
        expect(cta![0]).toContain(next!.ticketUrl ? copy.upcomingShows.ticketsCta : copy.upcomingShows.viewEventCta);
      }
    });

    it.skipIf(!next || !next?.posterImage)(`${rel} makes the poster a viewer trigger that keeps its proportions`, () => {
      const section = decode(upcomingOf(read(rel)));
      const trigger = section.match(/<button[^>]*data-lightbox="upcoming"[^>]*>/);
      expect(trigger).not.toBeNull();
      expect(trigger![0]).toContain('type="button"');
      expect(trigger![0]).toContain('class="zoomable"');
      expect(trigger![0]).toContain(`data-full="${next!.posterImage}"`);
      const alt = loc === 'he' ? `כרזה: ${next!.venueHe}, ${next!.cityHe}` : `Poster: ${next!.venueEn}, ${next!.cityEn}`;
      expect(trigger![0]).toContain(`data-caption="${alt}"`);
      expect(trigger![0]).toContain(`aria-label="${copy.ui.enlarge}"`);
      const img = section.match(/<img[^>]*>/)![0];
      expect(img).toContain(`alt="${alt}"`);
      expect(img).toMatch(/width="\d+"/);
      expect(img).toMatch(/height="\d+"/);
    });
  }

  it('the ticket text keeps real contrast: dark text on the orange block', () => {
    const css = cssOf('src/components/UpcomingShows.astro').replace(/\/\*[\s\S]*?\*\//g, '');
    const rule = css.match(/\.ticket__date\s*\{([^{}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule![1]).toMatch(/background\s*:\s*var\(--color-accent-orange/);
    expect(rule![1]).toMatch(/color\s*:\s*var\(--color-black/);
  });

  it('the poster stays uncropped: auto height, no object-fit cover, no fixed aspect ratio', () => {
    const css = cssOf('src/components/UpcomingShows.astro').replace(/\/\*[\s\S]*?\*\//g, '');
    const rules = [...css.matchAll(/([^{}]*)\{([^{}]*)\}/g)].filter((r) => /\.ticket__poster(?![\w-])/.test(r[1]));
    expect(rules.length).toBeGreaterThan(0);
    const body = rules.map((r) => r[2]).join(';');
    expect(body).toMatch(/block-size\s*:\s*auto/);
    expect(body).not.toMatch(/object-fit\s*:\s*cover/);
    expect(body).not.toMatch(/aspect-ratio\s*:/);
  });

  it('the component keeps the empty state (class and WhatsApp CTA) and all its props', () => {
    const src = readFileSync(join(ROOT, 'src/components/UpcomingShows.astro'), 'utf-8');
    expect(src).toContain('upcoming__empty');
    expect(src).toContain('upcoming__empty-cta');
    expect(src).toContain('wa.me');
    for (const prop of ['locale', 'heading', 'emptyLine', 'emptyCta', 'ticketsCta', 'viewEventCta', 'whatsappNumber', 'whatsappMessage', 'shows', 'enlargeLabel']) {
      expect(src).toMatch(new RegExp(`\\b${prop}\\b`));
    }
  });

  it('with no upcoming show the page uses the empty state (the next-show helper returns null)', async () => {
    const { nextShow } = await import('./lib/shows-ui');
    expect(nextShow([], '2026-11-03')).toBeNull();
    expect(nextShow(shows.map((s) => ({ ...s, status: 'past' as const })) as never, '2026-11-03')).toBeNull();
  });
});

describe('swipe item focus rings stay inside the clip box', () => {
  const offsetOf = (path: string, selector: string) => {
    const css = cssOf(path).replace(/\/\*[\s\S]*?\*\//g, '');
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((r) =>
      r[1].split(',').some((sel) => sel.trim() === selector),
    );
    expect(rules.length, `${path} has no rule for ${selector}`).toBeGreaterThan(0);
    return rules.map((r) => r[2].match(/outline-offset\s*:\s*(-?[\d.]+)(px|rem)?/)?.[1]);
  };

  it('.zoomable:focus-visible uses a negative outline-offset', () => {
    for (const v of offsetOf('src/components/Lightbox.astro', ':global(.zoomable:focus-visible)')) {
      expect(Number(v)).toBeLessThan(0);
    }
  });

  it('.band__open:focus-visible uses a negative outline-offset', () => {
    for (const v of offsetOf('src/components/BandMembers.astro', '.band__open:focus-visible')) {
      expect(Number(v)).toBeLessThan(0);
    }
  });

  it('an inset overlay ring is drawn above the photo for both triggers', () => {
    const lb = cssOf('src/components/Lightbox.astro');
    const bm = cssOf('src/components/BandMembers.astro');
    expect(lb).toMatch(/:global\(\.zoomable:focus-visible::after\)\s*\{[^{}]*inset\s*:\s*0[^{}]*box-shadow\s*:\s*inset/);
    expect(bm).toMatch(/\.band__open:focus-visible::after\s*\{[^{}]*inset\s*:\s*0[^{}]*box-shadow\s*:\s*inset/);
  });
});

describe('Task 8 — past shows: poster row and short list panel', () => {
  const read = (rel: string) => {
    const file = join(DIST, rel);
    if (!existsSync(file)) throw new Error(`dist/${rel} not found. Run \`npm run build\` first.`);
    return readFileSync(file, 'utf-8');
  };
  const copyHe = JSON.parse(readFileSync(join(ROOT, 'src/content/copy.he.json'), 'utf-8'));
  const copyEn = JSON.parse(readFileSync(join(ROOT, 'src/content/copy.en.json'), 'utf-8'));
  const decode = (t: string) =>
    t.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const pastOf = (html: string) =>
    html.slice(html.indexOf('id="past-shows"'), html.indexOf('</section>', html.indexOf('id="past-shows"')));
  const allShows = JSON.parse(readFileSync(join(ROOT, 'src/content/shows.json'), 'utf-8')) as {
    status: string;
    dateISO: string;
    venueHe: string;
    venueEn: string;
    cityHe: string;
    cityEn: string;
  }[];
  const past = allShows.filter((s) => s.status === 'past');
  const pastYearsExpected = [...new Set(past.map((s) => s.dateISO.slice(0, 4)))].sort().reverse();
  const stripCss = (path: string) => cssOf(path).replace(/\/\*[\s\S]*?\*\//g, '');

  const pages: [string, 'he' | 'en', typeof copyHe][] = [
    ['he/index.html', 'he', copyHe],
    ['en/index.html', 'en', copyEn],
    ['index.html', 'en', copyEn],
  ];

  it('the fixture has several past years, so the chip tests can fail', () => {
    expect(past.length).toBeGreaterThan(10);
    expect(pastYearsExpected.length).toBeGreaterThan(2);
  });

  for (const [rel, loc, copy] of pages) {
    it(`${rel} has one row per past show, in order, with the year of its date`, () => {
      const section = pastOf(read(rel));
      const rows = [...section.matchAll(/<li[^>]*class="[^"]*\bpast__row\b[^"]*"[^>]*>([\s\S]*?)<\/li>/g)];
      expect(rows).toHaveLength(past.length);
      rows.forEach((row, i) => {
        const year = past[i].dateISO.slice(0, 4);
        expect(row[0]).toContain(`data-year="${year}"`);
        const text = decode(row[1]);
        // the visible date carries the same year, and venue and city are unchanged
        expect(text).toContain(year);
        expect(text).toContain(loc === 'he' ? past[i].venueHe : past[i].venueEn);
        expect(text).toContain(loc === 'he' ? past[i].cityHe : past[i].cityEn);
      });
    });

    it(`${rel} has an "all" chip plus one chip per past year and none for other years`, () => {
      const section = pastOf(read(rel));
      const chips = [...section.matchAll(/<button[^>]*data-year="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)];
      expect(chips.map((c) => c[1])).toEqual(['ALL', ...pastYearsExpected]);
      // no chip for the years just outside the data's range (derived, not hardcoded)
      const rendered = chips.map((c) => c[1]);
      expect(rendered).not.toContain(String(Number(pastYearsExpected[pastYearsExpected.length - 1]) - 1));
      expect(rendered).not.toContain(String(Number(pastYearsExpected[0]) + 1));
      expect(decode(chips[0][2])).toContain(copy.ui.allYears);
      chips.forEach((c, i) => {
        expect(c[0]).toContain('type="button"');
        expect(c[0]).toContain(`aria-pressed="${i === 0 ? 'true' : 'false'}"`);
        if (i > 0) expect(c[2]).toContain(c[1]);
      });
    });

    it(`${rel} has 11 poster triggers in a swipe row; only the first two load eagerly`, () => {
      const section = pastOf(read(rel));
      const triggers = section.match(/<button[^>]*data-lightbox="posters"[^>]*>/g) ?? [];
      expect(triggers).toHaveLength(11);
      for (const t of triggers) {
        expect(t).toContain('type="button"');
        expect(t).toContain('class="zoomable"');
        expect(t).toMatch(/data-full="\/assets\/posters\/[^"]+\.webp"/);
        expect(t).toContain('data-caption=""');
        expect(t).toContain(`aria-label="${copy.ui.enlarge}"`);
      }
      expect(section).toContain('data-swipe');
      expect((section.match(/<div[^>]*data-swipe-item/g) ?? []).length).toBe(11);
      const imgs = section.match(/<img[^>]*>/g) ?? [];
      expect(imgs).toHaveLength(11);
      imgs.forEach((img, i) => {
        expect(img).toMatch(/\salt=""/);
        expect(img).toMatch(/width="\d+"/);
        expect(img).toMatch(/height="\d+"/);
        if (i < 2) expect(img).not.toContain('loading="lazy"');
        else expect(img).toContain('loading="lazy"');
      });
    });

    it(`${rel} has a labelled all-shows toggle and a panel that is not hidden in the HTML`, () => {
      const section = decode(pastOf(read(rel)));
      const btn = section.match(/<button[^>]*data-allshows[^>]*>[\s\S]*?<\/button>/);
      expect(btn).not.toBeNull();
      expect(btn![0]).toContain('type="button"');
      expect(btn![0]).toContain('aria-controls="past-panel"');
      expect(btn![0]).toMatch(/aria-expanded="(true|false)"/);
      expect(btn![0]).toContain(`data-show="${copy.ui.allShows}"`);
      expect(btn![0]).toContain(`data-hide="${copy.ui.hideShows}"`);
      expect(btn![0]).toContain(copy.ui.allShows);
      const panel = section.match(/<div[^>]*id="past-panel"[^>]*>/);
      expect(panel).not.toBeNull();
      expect(panel![0]).not.toMatch(/\shidden(\s|=|>)/);
      expect(panel![0]).toContain('data-lenis-prevent');
      expect(panel![0]).toContain('tabindex="0"');
      expect(panel![0]).toContain('role="region"');
      expect(panel![0]).toContain(`aria-label="${copy.ui.allShows}"`);
      expect(section.indexOf('data-allshows')).toBeLessThan(section.indexOf('id="past-panel"'));
    });

    it(`${rel} keeps the heading and puts the posters before the toggle`, () => {
      const section = decode(pastOf(read(rel)));
      expect(section).toContain(copy.pastShows.heading);
      expect(section.indexOf('data-lightbox="posters"')).toBeLessThan(section.indexOf('data-allshows'));
    });
  }

  it('the toggle and the chips are hidden by default and shown only under .js', () => {
    const css = stripCss('src/components/PastShows.astro');
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    for (const hook of ['[data-allshows]', '[data-chips]']) {
      const mine = rules.filter((r) => r[1].includes(hook));
      const hidden = mine.filter((r) => /display\s*:\s*none/.test(r[2]) && !/\.js(?![\w-])/.test(r[1]));
      expect(hidden.length, `${hook} needs a default display:none rule`).toBeGreaterThan(0);
      const shown = mine.filter((r) => /display\s*:\s*(?!none)\S/.test(r[2]));
      expect(shown.length, `${hook} needs a .js rule that shows it`).toBeGreaterThan(0);
      for (const r of shown) expect(r[1], `${hook} is shown outside .js`).toMatch(/\.js(?![\w-])/);
    }
  });

  it('a row hidden by a chip really disappears (display beats the grid)', () => {
    const css = stripCss('src/components/PastShows.astro');
    expect(css).toMatch(/\.past__row\[hidden\][^{}]*\{[^{}]*display\s*:\s*none/);
  });

  it('the panel is a short scroller that does not chain scrolling to the page', () => {
    const css = stripCss('src/components/PastShows.astro');
    const rule = css.match(/\.past__panel\s*\{([^{}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule![1]).toMatch(/max-block-size\s*:\s*22rem/);
    expect(rule![1]).toMatch(/overflow-y\s*:\s*auto/);
    expect(rule![1]).toMatch(/overscroll-behavior\s*:\s*contain/);
  });

  it('the masonry collage, the per-row GSAP fade and the initial opacity:0 are gone', () => {
    const src = readFileSync(join(ROOT, 'src/components/PastShows.astro'), 'utf-8');
    expect(src).not.toContain('gsap');
    expect(src).not.toContain('ScrollTrigger');
    expect(src).not.toContain('past__collage');
    expect(src).not.toContain('data-past-poster');
    expect(src).not.toContain('data-past-row');
    expect(stripCss('src/components/PastShows.astro')).not.toMatch(/opacity\s*:\s*0(?![.\d])/);
  });

  it('the component keeps its original props and takes the new ui labels', () => {
    const src = readFileSync(join(ROOT, 'src/components/PastShows.astro'), 'utf-8');
    for (const prop of ['locale', 'heading', 'shows', 'enlargeLabel', 'allShowsLabel', 'hideShowsLabel', 'allYearsLabel']) {
      expect(src).toMatch(new RegExp(`\\b${prop}\\b`));
    }
  });
});

describe('Task 9a — reveal motion, desktop widths and mouse reachability', () => {
  const read = (rel: string) => {
    const file = join(DIST, rel);
    if (!existsSync(file)) throw new Error(`dist/${rel} not found. Run \`npm run build\` first.`);
    return readFileSync(file, 'utf-8');
  };
  const src = (path: string) => readFileSync(join(ROOT, path), 'utf-8');
  const stripCss = (path: string) => cssOf(path).replace(/\/\*[\s\S]*?\*\//g, '');
  const copyHe = JSON.parse(src('src/content/copy.he.json'));
  const copyEn = JSON.parse(src('src/content/copy.en.json'));
  const pages: [string, typeof copyHe][] = [
    ['he/index.html', copyHe],
    ['en/index.html', copyEn],
    ['index.html', copyEn],
  ];

  /** The body of the first `@media (min-width: 1000px) { ... }` block, brace matched. */
  function desktopBlock(css: string): string {
    const m = /@media\s*\(\s*min-width\s*:\s*1000px\s*\)\s*\{/.exec(css);
    if (!m) return '';
    let depth = 1;
    let i = m.index + m[0].length;
    const start = i;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }
    return css.slice(start, i - 1);
  }

  const sectionOf = (html: string, id: string) =>
    html.slice(html.indexOf(`id="${id}"`), html.indexOf('</section>', html.indexOf(`id="${id}"`)));

  describe('reveal on the remaining sections', () => {
    for (const [rel, copy] of pages) {
      it(`${rel} reveals every Explore card, staggered`, () => {
        const section = sectionOf(read(rel), 'explore');
        const items = [...section.matchAll(/<li[^>]*>/g)].map((m) => m[0]);
        expect(items).toHaveLength(copy.explore.items.length);
        items.forEach((li, i) => {
          expect(li).toContain('data-reveal');
          expect(li).toContain(`--reveal-delay: ${Math.min(i, 3) * 80}ms`);
        });
      });

      it(`${rel} reveals the watch frame and the final blocks, but not the whole final section`, () => {
        const html = read(rel);
        expect(html).toMatch(/<div[^>]*class="watch__frame"[^>]*data-reveal|<div[^>]*data-reveal[^>]*class="watch__frame"/);
        const final = sectionOf(html, 'final-scene');
        expect(final.match(/data-reveal/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
        const tag = html.match(/<section[^>]*id="final-scene"[^>]*>/)![0];
        expect(tag).not.toContain('data-reveal');
      });
    }

    it('nothing starts hidden without JS: no bare opacity: 0 or GSAP in the converted sections', () => {
      for (const p of ['src/components/WatchVideo.astro', 'src/components/FinalScene.astro', 'src/components/ExploreLinks.astro']) {
        expect(src(p), p).not.toContain('gsap');
        expect(stripCss(p), p).not.toMatch(/opacity\s*:\s*0(?![.\d])/);
      }
    });

    it('the hero never carries data-reveal', () => {
      expect(src('src/components/Hero.astro')).not.toContain('data-reveal');
    });

    it('the converted components are on the redesign CSS guard list', () => {
      for (const p of [
        'src/components/ExploreLinks.astro',
        'src/components/FinalScene.astro',
        'src/components/WatchVideo.astro',
        'src/components/BowieStory.astro',
        'src/components/SwipeRow.astro',
      ]) {
        expect(GUARDED_SOURCES, p).toContain(p);
      }
    });
  });

  describe('desktop widths', () => {
    const cases: [string, number][] = [
      ['src/components/BandGallery.astro', 3],
      ['src/components/BandMembers.astro', 4],
      ['src/components/BowieCollage.astro', 4],
      ['src/components/PastShows.astro', 5],
    ];
    for (const [path, n] of cases) {
      it(`${path} shows exactly ${n} per view from 1000px`, () => {
        const block = desktopBlock(stripCss(path));
        const m = block.match(
          /--swipe-item\s*:\s*calc\(\s*\(\s*100%\s*-\s*(\d+)\s*\*\s*var\(\s*--swipe-gap\s*\)\s*\)\s*\/\s*(\d+)\s*\)/,
        );
        expect(m, `${path} has no --swipe-item calc in the 1000px block`).not.toBeNull();
        expect(Number(m![2])).toBe(n);
        expect(Number(m![1])).toBe(n - 1);
      });
    }

    it('SwipeRow centres the row in a 72rem column from 1000px', () => {
      const block = desktopBlock(stripCss('src/components/SwipeRow.astro'));
      expect(block).toMatch(/max-inline-size\s*:\s*72rem/);
      expect(block).toMatch(/margin-inline\s*:\s*auto/);
    });

    it('Explore grid widens to the same 72rem column from 1000px', () => {
      expect(desktopBlock(stripCss('src/components/ExploreLinks.astro'))).toMatch(/max-inline-size\s*:\s*72rem/);
    });
  });

  describe('SwipeRow gutter hook', () => {
    it('reads --swipe-gutter with a fallback and never redefines it on .swipe', () => {
      const css = stripCss('src/components/SwipeRow.astro');
      expect(css).toMatch(/padding-inline\s*:\s*var\(\s*--swipe-gutter\s*,/);
      expect(css).toMatch(/scroll-padding-inline\s*:\s*var\(\s*--swipe-gutter\s*,/);
      expect(css).not.toMatch(/--swipe-gutter\s*:/);
    });

    it('no section reaches into .swipe to set the gutter any more', () => {
      for (const p of [
        'src/components/BandMembers.astro',
        'src/components/PastShows.astro',
        'src/components/BandGallery.astro',
        'src/components/BowieCollage.astro',
      ]) {
        expect(stripCss(p), p).not.toMatch(/:global\(\.swipe\)/);
      }
    });

    it('a section can set the gutter itself (band keeps 2rem)', () => {
      expect(stripCss('src/components/BandMembers.astro')).toMatch(/\.band\s*\{[^{}]*--swipe-gutter\s*:\s*var\(--space-md\)/);
    });
  });

  describe('previous / next buttons for mouse users', () => {
    for (const [rel, copy] of pages) {
      for (const id of ['band-gallery', 'band', 'bowie-collage', 'past-shows']) {
        it(`${rel} #${id} has labelled prev and next buttons`, () => {
          const section = sectionOf(read(rel), id);
          const prev = section.match(/<button[^>]*data-swipe-prev[^>]*>/);
          const next = section.match(/<button[^>]*data-swipe-next[^>]*>/);
          expect(prev, 'prev').not.toBeNull();
          expect(next, 'next').not.toBeNull();
          expect(prev![0]).toContain('type="button"');
          expect(prev![0]).toContain(`aria-label="${copy.ui.prev}"`);
          expect(next![0]).toContain(`aria-label="${copy.ui.next}"`);
        });
      }
    }

    it('the buttons are hidden by default and only shown with .js on hover + fine pointer', () => {
      const css = stripCss('src/components/SwipeRow.astro');
      expect(css).toMatch(/\.swipe__arrow\s*\{[^{}]*display\s*:\s*none/);
      const gate = /@media\s*\(\s*hover\s*:\s*hover\s*\)\s*and\s*\(\s*pointer\s*:\s*fine\s*\)\s*\{/.exec(css);
      expect(gate, 'hover/pointer media query').not.toBeNull();
      const after = css.slice(gate!.index);
      expect(after).toMatch(/:global\(\.js\)\s+\.swipe__arrow\s*\{[^{}]*display\s*:\s*(grid|flex|inline-flex)/);
      expect(css).toMatch(/\.swipe__arrow\[disabled\]\s*\{[^{}]*visibility\s*:\s*hidden/);
      expect(css).toMatch(/\.swipe__arrow:focus-visible\s*\{[^{}]*outline\s*:[^;}]*var\(--color-accent-orange/);
    });

    it('the arrows sit with logical offsets, vertically centred', () => {
      const css = stripCss('src/components/SwipeRow.astro');
      expect(css).toMatch(/inset-inline-start\s*:/);
      expect(css).toMatch(/inset-inline-end\s*:/);
      expect(css).toMatch(/inset-block\s*:\s*0/);
    });

    it('SwipeRow takes prevLabel and nextLabel props', () => {
      const s = src('src/components/SwipeRow.astro');
      expect(s).toMatch(/prevLabel\s*:\s*string/);
      expect(s).toMatch(/nextLabel\s*:\s*string/);
    });

    it('the script scrolls with scrollTo and picks smooth/auto from reduced motion', () => {
      const s = src('src/scripts/swipe-row.ts');
      expect(s).toContain('scrollTo');
      expect(s).toContain('prefersReducedMotion');
      expect(s).toMatch(/'auto'/);
      expect(s).toMatch(/'smooth'/);
      expect(s).toContain('direction');
    });

    describe('scroll maths', () => {
      it('next goes toward the inline end: right in LTR, left in RTL', async () => {
        const { scrollDelta } = await import('./lib/swipe-nav');
        expect(scrollDelta('next', 'ltr', 300)).toBe(300);
        expect(scrollDelta('prev', 'ltr', 300)).toBe(-300);
        expect(scrollDelta('next', 'rtl', 300)).toBe(-300);
        expect(scrollDelta('prev', 'rtl', 300)).toBe(300);
      });

      it('edge state is sign-agnostic (RTL scrollLeft is zero or negative)', async () => {
        const { edgeState } = await import('./lib/swipe-nav');
        // 1000 wide content in a 400 wide track: 600 of travel
        expect(edgeState(0, 1000, 400)).toEqual({ canPrev: false, canNext: true });
        expect(edgeState(300, 1000, 400)).toEqual({ canPrev: true, canNext: true });
        expect(edgeState(600, 1000, 400)).toEqual({ canPrev: true, canNext: false });
        expect(edgeState(-300, 1000, 400)).toEqual({ canPrev: true, canNext: true });
        expect(edgeState(-599.6, 1000, 400)).toEqual({ canPrev: true, canNext: false });
        expect(edgeState(-0, 1000, 400)).toEqual({ canPrev: false, canNext: true });
      });

      it('edge state treats the last 2px at either end as the end, 3px as still travel', async () => {
        const { edgeState } = await import('./lib/swipe-nav');
        // 600 of travel
        expect(edgeState(598, 1000, 400)).toEqual({ canPrev: true, canNext: false });
        expect(edgeState(597, 1000, 400)).toEqual({ canPrev: true, canNext: true });
        expect(edgeState(2, 1000, 400)).toEqual({ canPrev: false, canNext: true });
        expect(edgeState(3, 1000, 400)).toEqual({ canPrev: true, canNext: true });
        expect(edgeState(-598, 1000, 400)).toEqual({ canPrev: true, canNext: false });
        expect(edgeState(-597, 1000, 400)).toEqual({ canPrev: true, canNext: true });
        // a row with only 2px of overflow has no travel at all
        expect(edgeState(0, 402, 400)).toEqual({ canPrev: false, canNext: false });
        expect(edgeState(0, 403, 400)).toEqual({ canPrev: false, canNext: true });
      });

      it('a press during a smooth scroll steps from the pending target, clamped to the travel', async () => {
        const { scrollTarget } = await import('./lib/swipe-nav');
        // 600 of travel, one step is 300
        expect(scrollTarget(0, 300, 1000, 400, 'ltr')).toBe(300);
        expect(scrollTarget(300, 300, 1000, 400, 'ltr')).toBe(600);
        expect(scrollTarget(600, 300, 1000, 400, 'ltr')).toBe(600);
        expect(scrollTarget(100, -300, 1000, 400, 'ltr')).toBe(0);
        // RTL runs from 0 down to -600
        expect(scrollTarget(0, -300, 1000, 400, 'rtl')).toBe(-300);
        expect(scrollTarget(-300, -300, 1000, 400, 'rtl')).toBe(-600);
        expect(scrollTarget(-600, -300, 1000, 400, 'rtl')).toBe(-600);
        expect(scrollTarget(-100, 300, 1000, 400, 'rtl')).toBe(0);
        // nothing to scroll
        expect(scrollTarget(0, 300, 400, 400, 'ltr')).toBe(0);
      });

      it('a row that fits has no travel in either direction', async () => {
        const { edgeState } = await import('./lib/swipe-nav');
        expect(edgeState(0, 400, 400)).toEqual({ canPrev: false, canNext: false });
      });

      it('one page moves by whole items: 4 cards of 250 with a 16 gap', async () => {
        const { pageStep } = await import('./lib/swipe-nav');
        // track content 1048 = 4 * 250 + 3 * 16
        expect(pageStep({ pitch: 266, content: 1048, gap: 16 })).toBe(4 * 266);
        // phone: one 82% card at a time
        expect(pageStep({ pitch: 300, content: 320, gap: 16 })).toBe(300);
        // never zero
        expect(pageStep({ pitch: 500, content: 100, gap: 0 })).toBe(500);
      });
    });
  });
});

describe('Task 9b — carried review fixes', () => {
  const src = (rel: string) => readFileSync(join(ROOT, rel), 'utf-8');
  const noComments = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '');
  /** Declaration bodies of every rule whose selector list mentions `needle` (comments removed). */
  const bodiesFor = (css: string, needle: RegExp) =>
    [...noComments(css).matchAll(/([^{}]*)\{([^{}]*)\}/g)].filter((r) => needle.test(r[1])).map((r) => r[2]);
  /** The text of the <script> block of an .astro file. */
  const scriptOf = (rel: string) => src(rel).match(/<script>([\s\S]*?)<\/script>/)![1];
  const read = (rel: string) => {
    const file = join(DIST, rel);
    if (!existsSync(file)) throw new Error(`dist/${rel} not found. Run \`npm run build\` first.`);
    return readFileSync(file, 'utf-8');
  };

  describe('action bar lets taps through its gradient', () => {
    const css = cssOf('src/components/ActionBar.astro');

    it('the full-width bar ignores pointer events', () => {
      const bodies = bodiesFor(css, /(^|[\s,])\.action-bar\s*$/);
      expect(bodies.some((b) => /pointer-events\s*:\s*none/.test(b))).toBe(true);
    });

    it('the WhatsApp and play links take pointer events back', () => {
      for (const cls of ['action-bar__wa', 'action-bar__play']) {
        const bodies = bodiesFor(css, new RegExp(`\\.${cls}\\s*$`));
        expect(bodies.some((b) => /pointer-events\s*:\s*auto/.test(b)), cls).toBe(true);
      }
    });
  });

  describe('lightbox counter and dialog name', () => {
    it('the counter is a left-to-right island so it reads "3 / 12" in RTL too', () => {
      for (const rel of ['he/index.html', 'en/index.html']) {
        const count = read(rel).match(/<p[^>]*class="lightbox__count"[^>]*>/);
        expect(count, rel).not.toBeNull();
        expect(count![0]).toMatch(/\sdir="ltr"/);
      }
      expect(src('src/components/Lightbox.astro')).toMatch(/<p[^>]*class="lightbox__count"[^>]*dir="ltr"/);
    });

    it('the dialog starts named by the caption', () => {
      for (const rel of ['he/index.html', 'en/index.html']) {
        const dialog = read(rel).match(/<dialog[^>]*id="lightbox"[^>]*>/)![0];
        expect(dialog, rel).toContain('aria-labelledby="lightbox-caption"');
      }
    });

    it('with an empty caption the script names the dialog from the trigger label or counter and drops aria-labelledby', () => {
      const s = src('src/scripts/lightbox.ts');
      expect(s).toMatch(/dialog!?\.removeAttribute\('aria-labelledby'\)/);
      expect(s).toMatch(/dialog!?\.setAttribute\('aria-label',/);
      expect(s).toMatch(/getAttribute\('aria-label'\)/);
      // ...and restores the caption reference (and drops the fallback label) when a caption exists
      expect(s).toMatch(/dialog!?\.setAttribute\('aria-labelledby',\s*'lightbox-caption'\)/);
      expect(s).toMatch(/dialog!?\.removeAttribute\('aria-label'\)/);
    });

    it('the naming runs whenever the current slide changes', () => {
      const s = src('src/scripts/lightbox.ts');
      const fn = s.match(/function setCurrent\([^)]*\)\s*\{([\s\S]*?)\n {2}\}\n/);
      expect(fn).not.toBeNull();
      expect(fn![1]).toMatch(/nameDialog\(/);
    });
  });

  describe('band sheet script', () => {
    const script = scriptOf('src/components/BandMembers.astro');

    it('locks the page only after showModal() has succeeded', () => {
      const open = script.indexOf('sheet.showModal()');
      expect(open).toBeGreaterThan(-1);
      expect(script.indexOf("classList.add('band-sheet-open')")).toBeGreaterThan(open);
      expect(script.indexOf('setSmoothScrollPaused(true)')).toBeGreaterThan(open);
    });

    it('a drag that starts in the panel and ends on the backdrop does not close the sheet', () => {
      expect(script).toMatch(/addEventListener\('pointerdown'/);
      const click = script.match(/sheet\.addEventListener\('click',[\s\S]*?\n {4}\}\);/)![0];
      // closes only when the click target is the dialog AND the press began on the dialog
      expect(click).toMatch(/e\.target === sheet\s*&&\s*pressedOnBackdrop|pressedOnBackdrop\s*&&\s*e\.target === sheet/);
      const down = script.match(/addEventListener\('pointerdown',[\s\S]*?\n {4}\}\);/)![0];
      expect(down).toMatch(/pressedOnBackdrop\s*=\s*e\.target === sheet/);
    });

    it('the release must also land on the backdrop (a drag from the backdrop into the panel does not close)', () => {
      const up = script.match(/addEventListener\('pointerup',[\s\S]*?\n {4}\}\);/)![0];
      expect(up).toMatch(/releasedOnBackdrop\s*=\s*e\.target === sheet/);
      const click = script.match(/sheet\.addEventListener\('click',[\s\S]*?\n {4}\}\);/)![0];
      expect(click).toMatch(/if \(e\.target === sheet && pressedOnBackdrop && releasedOnBackdrop\) sheet\.close\(\)/);
    });
  });

  describe('lightbox lock order', () => {
    it('locks the page only after showModal() has succeeded', () => {
      const s = src('src/scripts/lightbox.ts');
      const open = s.indexOf('dialog!.showModal()');
      expect(open).toBeGreaterThan(-1);
      expect(s.indexOf("classList.add('lb-open')")).toBeGreaterThan(open);
      expect(s.indexOf('setSmoothScrollPaused(true)')).toBeGreaterThan(open);
    });
  });

  describe('swipe row buttons', () => {
    const s = src('src/scripts/swipe-row.ts');
    const LTR = [1000, 400, 'ltr'] as const; // 600 of travel
    const RTL = [1000, 400, 'rtl'] as const;
    afterEach(() => vi.useRealTimers());

    it('uses the pending-scroll controller and clears it on pointerdown, wheel and scrollend', () => {
      expect(s).toContain('createPendingScroll');
      expect(s).toMatch(/addEventListener\('pointerdown',\s*pending\.clear\)/);
      expect(s).toMatch(/addEventListener\('wheel',\s*pending\.clear/);
      expect(s).toMatch(/addEventListener\('scrollend',\s*pending\.clear\)/);
    });

    it('rapid presses accumulate from the pending target, not the current position', async () => {
      vi.useFakeTimers();
      const { createPendingScroll } = await import('./lib/swipe-nav');
      const c = createPendingScroll();
      // the animation has not moved: the row still reports 0
      expect(c.press(0, 200, ...LTR)).toBe(200);
      expect(c.press(0, 200, ...LTR)).toBe(400);
      expect(c.target).toBe(400);
      expect(c.press(0, -200, ...LTR)).toBe(200);
    });

    it('clamps at both ends, including RTL negative positions', async () => {
      vi.useFakeTimers();
      const { createPendingScroll } = await import('./lib/swipe-nav');
      const ltr = createPendingScroll();
      expect(ltr.press(0, 500, ...LTR)).toBe(500);
      expect(ltr.press(0, 500, ...LTR)).toBe(600);
      expect(ltr.press(0, -500, ...LTR)).toBe(100);
      expect(ltr.press(0, -500, ...LTR)).toBe(0);
      const rtl = createPendingScroll();
      expect(rtl.press(0, -500, ...RTL)).toBe(-500);
      expect(rtl.press(0, -500, ...RTL)).toBe(-600);
      expect(rtl.press(0, 500, ...RTL)).toBe(-100);
      expect(rtl.press(0, 500, ...RTL)).toBe(0);
    });

    it('forgets the target once a scroll event is within 2px of it, then starts from the real position', async () => {
      vi.useFakeTimers();
      const { createPendingScroll } = await import('./lib/swipe-nav');
      const c = createPendingScroll();
      c.press(0, 300, ...LTR);
      c.scrolled(100);
      expect(c.target).toBe(300);
      c.scrolled(297); // 3px away: not there yet
      expect(c.target).toBe(300);
      c.scrolled(298); // 2px away: there
      expect(c.target).toBeNull();
      expect(c.press(298, 300, ...LTR)).toBe(598);
      c.scrolled(300);
      expect(c.target).toBe(598);
      c.scrolled(596);
      expect(c.target).toBeNull();
    });

    it('clear() (pointerdown, wheel, scrollend) drops the target at once and cancels the timer', async () => {
      vi.useFakeTimers();
      const { createPendingScroll } = await import('./lib/swipe-nav');
      const c = createPendingScroll();
      c.press(0, 300, ...LTR);
      expect(vi.getTimerCount()).toBe(1);
      c.clear();
      expect(c.target).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
      expect(c.press(120, 300, ...LTR)).toBe(420);
    });

    it('forgets the target after 200ms without a scroll event; each scroll event restarts the wait', async () => {
      vi.useFakeTimers();
      const { createPendingScroll } = await import('./lib/swipe-nav');
      const c = createPendingScroll();
      c.press(0, 300, ...LTR);
      vi.advanceTimersByTime(199);
      expect(c.target).toBe(300);
      c.scrolled(50); // still moving: the quiet period starts over
      vi.advanceTimersByTime(199);
      expect(c.target).toBe(300);
      vi.advanceTimersByTime(1);
      expect(c.target).toBeNull();
      expect(c.press(50, 300, ...LTR)).toBe(350);
    });

    it('a press that goes nowhere (already at the end) leaves no target or timer behind', async () => {
      vi.useFakeTimers();
      const { createPendingScroll } = await import('./lib/swipe-nav');
      const c = createPendingScroll();
      expect(c.press(600, 300, ...LTR)).toBe(600);
      expect(c.target).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('uses the timer functions it is given', async () => {
      const { createPendingScroll } = await import('./lib/swipe-nav');
      const fns: (() => void)[] = [];
      const c = createPendingScroll({ set: (fn) => fns.push(fn), clear: () => {} }, 200);
      c.press(0, 300, ...LTR);
      expect(c.target).toBe(300);
      fns[0]();
      expect(c.target).toBeNull();
    });

    it('relies on the ResizeObserver alone: no window resize listener', () => {
      expect(s).not.toMatch(/addEventListener\(\s*'resize'/);
      expect(s).toContain('new ResizeObserver');
    });
  });
});

describe('Task 10b — click-to-load video facade', () => {
  const read = (rel: string) => {
    const file = join(DIST, rel);
    if (!existsSync(file)) throw new Error(`dist/${rel} not found. Run \`npm run build\` first.`);
    return readFileSync(file, 'utf-8');
  };
  const src = (rel: string) => readFileSync(join(ROOT, rel), 'utf-8');
  const ID = 'fPsdsE5sYtk';
  const pages = ['he/index.html', 'en/index.html', 'index.html'];

  for (const rel of pages) {
    describe(rel, () => {
      const html = read(rel);
      const watch = html.slice(html.indexOf('id="watch"'), html.indexOf('</section>', html.indexOf('id="watch"')));

      it('has no iframe and no YouTube player URL in the initial HTML (no third-party load)', () => {
        expect(html).not.toMatch(/<iframe/i);
        // The click script (inlined by Astro) names the embed host, but no element may point at it.
        expect(html).not.toMatch(/(?:src|href)="https:\/\/www\.youtube-nocookie\.com/);
        expect(watch).not.toContain('<iframe');
      });

      it('keeps the #watch section, its heading and the aspect-ratio frame with reveal', () => {
        expect(html).toMatch(/<section[^>]*id="watch"/);
        expect(watch).toMatch(/<h2[^>]*class="watch__heading"/);
        expect(watch).toMatch(/<div[^>]*class="watch__frame"[^>]*data-reveal/);
      });

      it('shows a local WebP poster with real src, size attributes and decorative alt', () => {
        const img = watch.match(/<img[^>]*class="watch__poster"[^>]*>/)![0];
        expect(img).toMatch(/src="\/assets\/video\/showreel-poster\.webp"/);
        expect(img).toMatch(/width="\d+"/);
        expect(img).toMatch(/height="\d+"/);
        expect(img).toMatch(/alt=""/);
        expect(img).not.toContain('data-src');
        expect(existsSync(join(DIST, 'assets/video/showreel-poster.webp'))).toBe(true);
      });

      it('has a plain link to the YouTube watch page as the no-JS fallback', () => {
        const a = watch.match(/<a[^>]*class="[^"]*watch__facade--link[^"]*"[^>]*>/)![0];
        expect(a).toContain(`href="https://www.youtube.com/watch?v=${ID}"`);
        expect(a).toMatch(/aria-label="[^"]+"/);
        expect(a).toContain('rel="noopener noreferrer"');
      });

      it('has a real <button type="button"> with an accessible name for the JS path', () => {
        const b = watch.match(/<button[^>]*class="[^"]*watch__facade--button[^"]*"[^>]*>/)![0];
        expect(b).toContain('type="button"');
        expect(b).toMatch(/aria-label="[^"]+"/);
      });

      it('carries the id, iframe title and allow list for the click handler', () => {
        const frame = watch.match(/<div[^>]*class="watch__frame"[^>]*>/)![0];
        expect(frame).toContain(`data-video-id="${ID}"`);
        expect(frame).toContain('data-video-title="Stardust, David Bowie Tribute Show"');
        expect(frame).toMatch(/data-video-allow="[^"]*autoplay[^"]*picture-in-picture"/);
      });

      it('the action bar play button still just jumps to #watch', () => {
        expect(html).toMatch(/class="action-bar__play"[^>]*href="#watch"|href="#watch"[^>]*class="action-bar__play"/);
      });
    });
  }

  describe('component source', () => {
    const script = src('src/components/WatchVideo.astro').match(/<script>([\s\S]*?)<\/script>/)![1];

    it('the click script builds the nocookie embed with autoplay=1, title, allow and fullscreen', () => {
      expect(script).toContain('youtube-nocookie.com/embed/');
      expect(script).toContain('autoplay=1');
      expect(script).toContain('createElement(\'iframe\')');
      expect(script).toContain('iframe.title');
      expect(script).toContain('iframe.allow');
      expect(script).toContain('allowFullscreen');
    });

    it('moves focus to the player after the swap', () => {
      expect(script).toContain('iframe.focus()');
    });

    it('shows the button only with JS and hides the link then (the .js class comes from the head script)', () => {
      const css = cssOf('src/components/WatchVideo.astro').replace(/\/\*[\s\S]*?\*\//g, '');
      expect(css).toMatch(/\.watch__facade--button\s*\{\s*display:\s*none/);
      expect(css).toMatch(/:global\(\.js\)\s+\.watch__facade--link\s*\{\s*display:\s*none/);
      expect(css).toMatch(/:global\(\.js\)\s+\.watch__facade--button\s*\{\s*display:\s*flex/);
    });
  });

  it('the VideoObject keeps its embedUrl and thumbnail', () => {
    const html = read('he/index.html');
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1])['@graph'] as any[];
    const video = graph.find((n) => n['@type'] === 'VideoObject');
    expect(video.embedUrl).toBe(`https://www.youtube.com/embed/${ID}`);
    expect(video.thumbnailUrl).toContain(ID);
  });
});
