import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import pagesHe from './content/pages.he.json';
import pagesEn from './content/pages.en.json';

// Content pages: copy checks run on the JSON, structure checks on the built HTML
// (npm test builds the site first, see "pretest").
const DIST = join(process.cwd(), 'dist');
const slugs = Object.keys(pagesHe);
const locales = [
  { code: 'he', data: pagesHe as Record<string, any>, file: (s: string) => join(DIST, 'he', s, 'index.html'), path: (s: string) => `/he/${s}/` },
  { code: 'en', data: pagesEn as Record<string, any>, file: (s: string) => join(DIST, s, 'index.html'), path: (s: string) => `/${s}/` },
];
const SITE = 'https://stardustbowie.com';

describe('content page copy', () => {
  it('has the same pages in Hebrew and English', () => {
    expect(Object.keys(pagesEn).sort()).toEqual(Object.keys(pagesHe).sort());
  });

  for (const l of locales) {
    it(`${l.code}: every page has a title, description, h1, lead and a FAQ`, () => {
      for (const s of slugs) {
        const p = l.data[s];
        expect(p.title, `${l.code}/${s} title`).toBeTruthy();
        expect(p.description, `${l.code}/${s} description`).toBeTruthy();
        expect(p.h1, `${l.code}/${s} h1`).toBeTruthy();
        expect(p.lead, `${l.code}/${s} lead`).toBeTruthy();
        expect(p.faq.length, `${l.code}/${s} faq`).toBeGreaterThan(0);
      }
    });

    it(`${l.code}: titles are unique and within search-result lengths`, () => {
      const titles = slugs.map((s) => l.data[s].title as string);
      expect(new Set(titles).size).toBe(titles.length);
      for (const t of titles) expect([...t].length, t).toBeLessThanOrEqual(62);
      for (const s of slugs) {
        const d = [...(l.data[s].description as string)].length;
        expect(d, `${l.code}/${s} description length`).toBeGreaterThanOrEqual(80);
        expect(d, `${l.code}/${s} description length`).toBeLessThanOrEqual(160);
      }
    });

    it(`${l.code}: no em or en dashes in the copy`, () => {
      expect(JSON.stringify(l.data)).not.toMatch(/[—–]/);
    });

    it(`${l.code}: every internal link points at a real page`, () => {
      const known = new Set(slugs.map((s) => l.path(s)));
      const text = JSON.stringify(l.data);
      for (const m of text.matchAll(/\]\((\/[^)\s]+)\)/g)) {
        expect(known.has(m[1]), `${l.code}: ${m[1]}`).toBe(true);
      }
      for (const s of slugs) for (const r of l.data[s].related ?? []) expect(slugs, `related ${r}`).toContain(r);
    });
  }

  it('covers the Hebrew search terms the site is meant to rank for', () => {
    const all = JSON.stringify(pagesHe);
    for (const term of [
      'מופע מחווה לדיוויד בואי',
      'להקה לאירועים',
      'להקות האירועים',
      'להקת קאברים לאירועים',
      'מופע לאירוע חברה',
      'מופע מיוחד',
      'דייויד בואי',
      'דיוויד בואי',
      'זיגי סטארדאסט',
      'הופעות מחווה',
    ]) {
      expect(all, term).toContain(term);
    }
  });
});

describe('built content pages', () => {
  for (const l of locales) {
    for (const s of slugs) {
      describe(`${l.code}/${s}`, () => {
        const html = () => readFileSync(l.file(s), 'utf-8');

        it('exists and has one H1 with text', () => {
          expect(existsSync(l.file(s))).toBe(true);
          const h1s = html().match(/<h1[\s>][\s\S]*?<\/h1>/g) ?? [];
          expect(h1s).toHaveLength(1);
          expect(h1s[0].replace(/<[^>]+>/g, '').trim().length).toBeGreaterThan(10);
        });

        it('has the right canonical, hreflang pair and language', () => {
          const h = html();
          expect(h).toContain(`rel="canonical" href="${SITE}${l.path(s)}"`);
          expect(h).toContain(`hreflang="en" href="${SITE}/${s}/"`);
          expect(h).toContain(`hreflang="he" href="${SITE}/he/${s}/"`);
          expect(h).toMatch(new RegExp(`<html[^>]*lang="${l.code}"`));
        });

        it('toggles to the same page in the other language', () => {
          const other = l.code === 'he' ? `/${s}/` : `/he/${s}/`;
          expect(html()).toContain(`data-href-other="${other}"`);
        });

        it('has valid JSON-LD with breadcrumbs and the FAQ', () => {
          const m = html().match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
          expect(m).not.toBeNull();
          const types = (JSON.parse(m![1])['@graph'] as any[]).map((n) => n['@type']);
          expect(types).toContain('BreadcrumbList');
          expect(types).toContain('FAQPage');
          expect(types).toContain('MusicGroup');
          if (s === 'events' || s === 'corporate-events') expect(types).toContain('Service');
        });

        it('has no unfilled {{tokens}} and no em dashes in the visible text', () => {
          const h = html();
          expect(h).not.toContain('{{');
          const body = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
          expect(body).not.toMatch(/[—–]/);
        });

        it('links to the home page and to other pages, and every image has size and alt', () => {
          const h = html();
          const hrefs = [...h.matchAll(/<a[^>]*\shref="([^"]+)"/g)].map((m) => m[1]);
          expect(hrefs.filter((x) => x.startsWith(l.code === 'he' ? '/he/' : '/')).length).toBeGreaterThanOrEqual(5);
          for (const tag of h.match(/<img[^>]*>/g) ?? []) {
            expect(tag).toMatch(/\salt="[^"]*"/);
            expect(tag).toMatch(/\swidth="\d+"/);
            expect(tag).toMatch(/\sheight="\d+"/);
          }
        });
      });
    }
  }

  it('lists every page in the sitemap, in both languages', () => {
    const xml = readFileSync(join(DIST, 'sitemap.xml'), 'utf-8');
    for (const s of slugs) {
      expect(xml).toContain(`<loc>${SITE}/${s}/</loc>`);
      expect(xml).toContain(`<loc>${SITE}/he/${s}/</loc>`);
    }
  });

  it('links to every content page from both home pages', () => {
    for (const [file, prefix] of [
      [join(DIST, 'index.html'), '/'],
      [join(DIST, 'he', 'index.html'), '/he/'],
    ] as const) {
      const html = readFileSync(file, 'utf-8');
      for (const s of slugs) expect(html, `${prefix}${s}/`).toContain(`href="${prefix}${s}/"`);
    }
  });
});
