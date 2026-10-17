// sitemap.xml: lists every real page (English at the root, Hebrew under /he/)
// with its hreflang alternates. /en/ is left out on purpose: it renders the
// same page as / and canonicalises to it.
import type { APIRoute } from 'astro';
import { slugs, pagePath, homePath } from '../lib/pages';

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://stardustbowie.com');
  const lastmod = new Date().toISOString().slice(0, 10);
  const url = (path: string) => new URL(path, base).toString();

  // [English path, Hebrew path]
  const pairs: [string, string][] = [
    [homePath('en'), homePath('he')],
    ...slugs.map((s) => [pagePath('en', s), pagePath('he', s)] as [string, string]),
  ];

  const entry = (loc: string, en: string, he: string) => `  <url>
    <loc>${url(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <xhtml:link rel="alternate" hreflang="en" href="${url(en)}" />
    <xhtml:link rel="alternate" hreflang="he" href="${url(he)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${url(en)}" />
  </url>`;

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pairs.map(([en, he]) => [entry(en, en, he), entry(he, en, he)].join('\n')).join('\n')}
</urlset>
`;

  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
