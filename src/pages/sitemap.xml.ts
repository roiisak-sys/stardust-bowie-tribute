// sitemap.xml: lists the two real pages (English at the bare domain, Hebrew at
// /he/) with their hreflang alternates. /en/ is left out on purpose: it
// renders the same page as / and canonicalises to it.
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://stardustbowie.com');
  const en = new URL('/', base).toString();
  const he = new URL('/he/', base).toString();
  const lastmod = new Date().toISOString().slice(0, 10);

  const entry = (loc: string) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <xhtml:link rel="alternate" hreflang="en" href="${en}" />
    <xhtml:link rel="alternate" hreflang="he" href="${he}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${en}" />
  </url>`;

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entry(en)}
${entry(he)}
</urlset>
`;

  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
