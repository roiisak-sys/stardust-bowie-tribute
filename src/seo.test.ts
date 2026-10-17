import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// These run against the built site (npm test builds it first, see "pretest").
const DIST = join(process.cwd(), 'dist');
const read = (...p: string[]) => readFileSync(join(DIST, ...p), 'utf-8');

const pages = [
  { name: 'English root', file: ['index.html'], lang: 'en' },
  { name: 'Hebrew /he/', file: ['he', 'index.html'], lang: 'he' },
];

describe('discovery files', () => {
  it('serves robots.txt that allows crawling and points to the sitemap', () => {
    const robots = read('robots.txt');
    expect(robots).toMatch(/User-agent: \*\s+Allow: \//);
    expect(robots).toContain('Sitemap: https://stardustbowie.com/sitemap.xml');
  });

  it('serves a sitemap with both pages, hreflang alternates, and not /en/', () => {
    const xml = read('sitemap.xml');
    expect(xml).toContain('<loc>https://stardustbowie.com/</loc>');
    expect(xml).toContain('<loc>https://stardustbowie.com/he/</loc>');
    expect(xml).toContain('hreflang="he"');
    expect(xml).toContain('hreflang="x-default"');
    expect(xml).not.toContain('/en/');
  });

  it('has the link preview image', () => {
    expect(existsSync(join(DIST, 'assets', 'og', 'stardust-og.jpg'))).toBe(true);
  });
});

for (const p of pages) {
  describe(`SEO head and content: ${p.name}`, () => {
    const html = () => read(...p.file);

    it('has link preview tags (og:image, og:url, og:locale, twitter:image)', () => {
      expect(html()).toContain('property="og:image" content="https://stardustbowie.com/assets/og/stardust-og.jpg"');
      expect(html()).toContain('property="og:url"');
      expect(html()).toContain('property="og:locale"');
      expect(html()).toContain('name="twitter:image"');
    });

    it('has valid JSON-LD with the band, its members and the showreel video', () => {
      const m = html().match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      expect(m).not.toBeNull();
      const graph = JSON.parse(m![1])['@graph'] as any[];
      const types = graph.map((n) => n['@type']);
      expect(types).toContain('WebSite');
      expect(types).toContain('MusicGroup');
      expect(types).toContain('VideoObject');
      const band = graph.find((n) => n['@type'] === 'MusicGroup');
      expect(band.alternateName).toContain('YADAYADAS');
      expect(band.member.length).toBe(6);
      expect(band.sameAs.some((u: string) => u.includes('instagram.com/stardustbowie.il'))).toBe(true);
    });

    it('has an H1 with real text, not only an image', () => {
      const h1 = html().match(/<h1[^>]*>([\s\S]*?)<\/h1>/)![1];
      const text = h1.replace(/<[^>]+>/g, '').trim();
      expect(text.length).toBeGreaterThan(10);
      expect(text).toMatch(/Bowie|בואי/);
    });

    it('has no em or en dashes in the title, description or visible copy', () => {
      const h = html();
      const title = h.match(/<title>([\s\S]*?)<\/title>/)![1];
      const desc = h.match(/<meta name="description" content="([^"]*)"/)![1];
      const body = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
      for (const s of [title, desc, body]) expect(s).not.toMatch(/[—–]/);
    });

    it('keeps the description within 160 characters', () => {
      const desc = html().match(/<meta name="description" content="([^"]*)"/)![1];
      expect(desc.length).toBeLessThanOrEqual(160);
      expect(desc.length).toBeGreaterThan(80);
    });

    it('gives every image explicit width and height (no layout shift)', () => {
      const imgs = html().match(/<img[^>]*>/g) ?? [];
      expect(imgs.length).toBeGreaterThan(0);
      for (const tag of imgs) {
        expect(tag, tag).toMatch(/\swidth="\d+"/);
        expect(tag, tag).toMatch(/\sheight="\d+"/);
      }
    });

    it('serves images as WebP, not heavy JPG or PNG', () => {
      const srcs = [...html().matchAll(/<img[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
      for (const s of srcs) expect(s, s).toMatch(/\.webp$/);
    });

    it('does not load the background video during the first paint', () => {
      const h = html();
      expect(h).not.toMatch(/<source[^>]*hero-bg-video/);
      expect(h).toContain('preload="none"');
    });
  });
}
