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
  'src/components/BowieCollage.astro',
  'src/components/UpcomingShows.astro',
  'src/components/PastShows.astro',
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
  const today = new Date().toISOString().slice(0, 10);
  const next = shows
    .filter((s) => s.status === 'upcoming' && s.dateISO >= today)
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
      const [year, month, day] = next!.dateISO.split('-');
      expect(section).toMatch(/class="ticket__date[ "]/);
      expect(section).toContain(`datetime="${next!.dateISO}"`);
      expect(section).toMatch(/<time[^>]*class="ticket__date/);
      expect(section).toMatch(new RegExp(`class="ticket__day[^"]*"[^>]*>\\s*${day}\\s*<`));
      expect(section).toMatch(new RegExp(`class="ticket__year[^"]*"[^>]*>\\s*${year}\\s*<`));
      const expectedMonth = new Date(`${next!.dateISO}T00:00:00Z`)
        .toLocaleDateString(loc === 'he' ? 'he-IL' : 'en-US', { month: 'short', timeZone: 'UTC' })
        .toUpperCase();
      expect(section).toMatch(new RegExp(`class="ticket__month[^"]*"[^>]*>\\s*${expectedMonth}\\s*<`));
      expect(Number(month)).toBeGreaterThan(0);
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
    expect(pastYearsExpected).not.toContain('2021');
    expect(pastYearsExpected).not.toContain('2027');
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
      expect(panel![0]).toContain(`aria-label="${copy.pastShows.heading}"`);
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
