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
