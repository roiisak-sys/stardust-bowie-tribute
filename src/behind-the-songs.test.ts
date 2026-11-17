import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import copy from './content/behind-the-songs.he.json';

// The Hebrew-only landing page /he/behind-the-songs/. Runs against the built
// site (npm test builds it first, see "pretest").
const DIST = join(process.cwd(), 'dist');
const URL = 'https://stardustbowie.com/he/behind-the-songs/';
const html = () => readFileSync(join(DIST, 'he', 'behind-the-songs', 'index.html'), 'utf-8');

describe('behind-the-songs landing page', () => {
  it('is built as Hebrew, right to left, with its own canonical', () => {
    const h = html();
    expect(h).toMatch(/<html[^>]*lang="he"[^>]*dir="rtl"/);
    expect(h).toContain(`<link rel="canonical" href="${URL}"`);
  });

  it('has no English twin: no en or x-default alternates', () => {
    const h = html();
    expect(h).toContain(`hreflang="he" href="${URL}"`);
    expect(h).not.toContain('hreflang="en"');
    expect(h).not.toContain('hreflang="x-default"');
  });

  it('has exactly one h1, naming the show and carrying the three poster lines', () => {
    const h = html();
    expect(h.match(/<h1[\s>]/g)).toHaveLength(1);
    const h1 = h.match(/<h1[\s\S]*?<\/h1>/)![0];
    expect(h1).toContain('מופע מחווה לדיוויד בואי');
    for (const line of copy.headline) expect(h1).toContain(line);
  });

  it('states the facts the show is sold on', () => {
    const text = JSON.stringify(copy);
    expect(text).toContain('75 עד 90');
    expect(text).toContain('כל הגילאים');
    expect(copy.facts.map((f) => f.big)).toContain('6');
    expect(copy.badge.number).toBe('80');
    expect(copy.badge.note).toContain('1947');
  });

  it('has a booking path: WhatsApp and phone', () => {
    const h = html();
    expect(h).toContain('href="https://wa.me/972509841722?text=');
    expect(h).toContain('href="tel:+972509841722"');
  });

  it('carries FAQ structured data that matches the visible questions', () => {
    const h = html();
    const blocks = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const graph = blocks.flatMap((b) => b['@graph'] ?? [b]);
    const faq = graph.find((n: any) => n['@type'] === 'FAQPage');
    expect(faq.mainEntity).toHaveLength(copy.faq.length);
    for (const f of copy.faq) expect(h).toContain(f.q);
    expect(graph.find((n: any) => n['@type'] === 'WebPage').url).toBe(URL);
  });

  it('gives every image an alt attribute and a size, and every file exists', () => {
    const h = html();
    const imgs = [...h.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
    expect(imgs.length).toBeGreaterThan(8);
    for (const tag of imgs) {
      expect(tag, tag).toMatch(/\balt=/);
      expect(tag, tag).toMatch(/\bwidth="\d+"/);
      expect(tag, tag).toMatch(/\bheight="\d+"/);
      const src = tag.match(/\bsrc="([^"]+)"/)![1];
      expect(existsSync(join(DIST, src)), src).toBe(true);
    }
  });

  it('is in the sitemap, without hreflang alternates', () => {
    const xml = readFileSync(join(DIST, 'sitemap.xml'), 'utf-8');
    expect(xml).toMatch(new RegExp(`<loc>${URL}</loc>\\s*<lastmod>[^<]+</lastmod>\\s*</url>`));
  });

  it('is linked from the Hebrew show and David Bowie pages', () => {
    for (const page of ['show', 'david-bowie']) {
      const h = readFileSync(join(DIST, 'he', page, 'index.html'), 'utf-8');
      expect(h, page).toContain('href="/he/behind-the-songs/"');
    }
  });

  it('keeps em and en dashes out of the copy', () => {
    expect(JSON.stringify(copy)).not.toMatch(/[—–]/);
  });

  it('keeps the title and description within search-result lengths', () => {
    expect([...copy.title].length).toBeLessThanOrEqual(62);
    const d = [...copy.description].length;
    expect(d).toBeGreaterThanOrEqual(80);
    expect(d).toBeLessThanOrEqual(160);
  });
});
