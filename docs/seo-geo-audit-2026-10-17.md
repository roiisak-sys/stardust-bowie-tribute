# SEO + GEO review: stardustbowie.com (Hebrew market)

Reviewed 17 Oct 2026. Pages measured: `/` (English), `/he/` (Hebrew). Goal: appear in Hebrew results
for David Bowie tribute shows, and be named by AI assistants (ChatGPT, Gemini, Perplexity, AI Overviews)
when someone asks about Bowie tribute shows in Israel.

## Verdict

The foundation is healthy, but the site cannot be found yet. Lighthouse (mobile, measured today) gives SEO 100,
Accessibility 100, Best Practices 100, and the HTML is server rendered, so Google and AI crawlers can read
everything. What is missing is discovery (no sitemap, no robots.txt, no structured data, no analytics, no
link preview image), depth (one page per language, so there is nothing to rank for most queries), and a
footprint under the new name (the places that win these Hebrew results still say YADAYADAS or do not list
you at all). It needs a short fix list plus new pages, not a rebuild.

Honest expectation: "דיוויד בואי" on its own belongs to Wikipedia and the big news sites, and you will not
take it. The winnable targets are "מופע מחווה לדיוויד בואי", the booking queries, and your own brand name.
Plan on 3 to 6 months for a new domain to rank on those.

## What is already good

- Static, server rendered HTML. Nothing is hidden behind JavaScript.
- Correct `lang="he" dir="rtl"`, a valid hreflang pair plus x-default, self canonicals, HTTPS everywhere.
- Old domain 301s to the new one, so old links keep their value.
- Hebrew title (34 chars) and description (136 chars) are within limits and contain "מחווה לדיוויד בואי".
- Every image has an alt attribute. Layout shift is 0. Server response is 250 ms.
- Real content depth to build on: the Bowie story, member bios, shows, a video.

## Top 3 priorities

1. Make the site discoverable: robots.txt, sitemap, Search Console and Bing, Change of Address from the
   old domain, a link preview image, analytics.
2. Build the Hebrew pages that match how people actually search, for both intents: people who want to
   attend a show, and venues or agencies who want to book one.
3. Win the third party surfaces. The Hebrew results for this query are ticketing and event listing pages
   (Muzi, Makore, Confia, Eventbuzz, Habama, Gray Club, Eventer), an agency site (tribute.co.il) and press.
   One of them, Eventer, still lists you as "להקת Yadayadas".

## Measured facts

| Check | Result |
|---|---|
| Lighthouse mobile | Performance 68, SEO 100, Accessibility 100, Best Practices 100 |
| LCP / TBT / CLS | 5.9 s (poor) / 270 ms (ok) / 0 (good) |
| Page weight | 7.7 MB on first load (hero video 4.2 MB of it, logo PNG 546 KB, gallery JPGs 200 to 430 KB each) |
| Hero video file | 15.8 MB on disk |
| Cache headers | every asset is `max-age=0, must-revalidate` (nothing is cached by browsers) |
| robots.txt, sitemap.xml, llms.txt | all 404 |
| JSON-LD structured data | none |
| og:image, og:url | missing (WhatsApp and Facebook previews will be blank or generic) |
| Analytics | none installed (0 matches for GA, GTM, Plausible) |
| Internal links on the homepage | 0 (single page site) |
| Words | Hebrew 873, English 1023 |
| H1 | an image only (text lives in the alt attribute) |
| Em and en dashes | 7 in the Hebrew body plus title and description, 8 in the English body plus title and description |
| Bold text | 0 |
| Images | 43, none with width and height, 24 with empty alt, 42 in JPG or PNG |

## Hebrew keyword map

Google Israel autocomplete (real data, directional only, no volumes) and the live Hebrew results show this:

| Query | Signal | Use |
|---|---|---|
| מופע מחווה לדיוויד בואי | exact autocomplete phrase; also the title most ticket pages use | Primary. H1, title, show page |
| מחווה לדיוויד בואי | autocomplete | Same page, variant |
| דיוויד בואי הופעה בישראל | autocomplete | Shows page, "where to see a Bowie tribute in Israel" |
| להקת מחווה לדיוויד בואי | appears in result titles | Booking page |
| טריביוט לדיוויד בואי | no autocomplete, still used by agencies | Secondary, in body text and booking page |
| דייוויד בואי (double yod) | autocomplete, Hebrew Wikipedia spelling | Use both spellings naturally, never stuff |
| סטארדאסט + סטארדסט | brand, but autocomplete shows "חברה", "לאבס", "סרט" | Always pair with "מופע מחווה". Add the spelling without the second alef |
| זיגי סטארדאסט | the album and character; Ynet and Mako articles rank | Informational page, feeds the brand |
| מופע מחווה ל... (Queen, Beatles, Pink Floyd) | strong generic pattern | Confirms "מופע מחווה ל" plus artist is the way Israelis ask |

Competitors in the Hebrew results today: "העכבישים מפלוטו" (The David Bowie Show), "רוקוויל",
Blackstar Symphony, plus agencies and ticket pages. The pages ranking are thin (480 to 680 words, mostly
ticketing). The benchmark against three of them: they have 2 to 15 internal links, breadcrumbs, schema
(Organization, WebSite, BreadcrumbList) and reviews; you have none of these. You have more words and a
better story than any of them, so depth is your edge.

## Findings by area

### 1. Discovery and indexation (Blocking for growth)
- No robots.txt, no sitemap. Fix: add both. Use `@astrojs/sitemap` with the i18n option so `/` and `/he/` are
  listed with their hreflang alternates, and reference it in robots.txt.
- The new domain is days old and I could not see it in search results. Indexation status is not verified,
  because Search Console is not connected.
- Add a Search Console Domain property (DNS TXT record at GoDaddy) and a Bing Webmaster property. Submit the
  sitemap. Then use the Change of Address tool for `yadayadasmusic.com` to `stardustbowie.com`. The 301s are
  already in place, which is what that tool needs.
- Add analytics (GA4, or a privacy friendly one). Without it you cannot tell whether any of this works.

### 2. Titles, descriptions, headings
- Hebrew H1 is an image. Add real text: "סטארדאסט, מופע מחווה לדיוויד בואי" (keep the logo, put the
  text in the heading, hide it visually only if it matches the logo exactly).
- Suggested titles and descriptions (replace the dash with a comma or pipe):
  - HE title: `סטארדאסט | מופע מחווה לדיוויד בואי, להקה חיה`
  - HE description: `סטארדאסט, מופע מחווה לדיוויד בואי עם שישה מוזיקאים: רוקנרול חי, כינור וסקסופון, והסיפור שמאחורי השירים. הופעות והזמנות.`
  - EN title: `STARDUST | David Bowie Tribute Show from Israel`
  - EN description is 162 chars, trim to under 160.
- H2s are brand style ("מחווה, לא חיקוי."). Keep the voice, add keywords to the H2s on the new pages.
- Replace the em and en dashes in copy, titles and meta with commas. It is a visible AI writing tell.

### 3. Structured data (none today)
Add one JSON-LD graph per page: `WebSite`, `MusicGroup` (with members as `Person`, `sameAs` to Instagram,
Facebook, YouTube, Eventer), `Event` for the London Festival on 7 Nov 2026 (with the ticket URL),
`VideoObject` for the YouTube embed, `BreadcrumbList` on inner pages, and `FAQPage` where there is an FAQ.
Put `alternateName` on the band so the old and new names connect:

```json
{
  "@context": "https://schema.org",
  "@type": "MusicGroup",
  "name": "STARDUST - David Bowie Tribute",
  "alternateName": ["סטארדאסט", "Stardust", "YADAYADAS"],
  "url": "https://stardustbowie.com/",
  "genre": "Rock",
  "description": "מופע מחווה לדיוויד בואי של שישה מוזיקאים ישראלים: רוקנרול חי עם כינור, סקסופון והקשה.",
  "sameAs": [
    "https://www.instagram.com/stardustbowie.il/",
    "https://www.facebook.com/stardustbowie.il/"
  ]
}
```

### 4. Speed (Core Web Vitals risk)
- LCP 5.9 s on mobile is the one real performance problem. Causes: a 15.8 MB hero video with
  `preload="auto"`, a 546 KB logo PNG (also loaded for the 28 px corner mark), and full size JPG galleries.
- Fixes: compress the hero video to 2 to 3 MB and load it only on desktop and good connections, with a
  WebP poster as the LCP image; make a small logo for the corner mark; serve gallery images as WebP or AVIF
  with `width`, `height` and `srcset`.
- Add cache headers in `netlify.toml`: `/_astro/*` immutable for a year, `/assets/*` for 30 days. Right now
  repeat visitors download everything again.
- Not verified: real user data (CrUX). The domain is too new to have any.

### 5. Link previews and sharing
- Add `og:image` (1200x630, logo plus Hebrew and English text), `og:url`, `og:locale`, `og:locale:alternate`,
  and a Twitter image. In Israel most sharing happens in WhatsApp, and today a shared link shows no picture.

### 6. Content: one page per language is not enough
Today everything sits on one page, so one URL has to answer every question. Add these Hebrew pages (English
mirrors under `/`), each with a visible H1, an answer-first opening paragraph, internal links and schema:

| Page | Target | What it holds |
|---|---|---|
| `/he/show/` | מופע מחווה לדיוויד בואי | The show: format, length, lineup, repertoire by era, what the violin, sax and percussion add, FAQ |
| `/he/book/` | להקת מחווה, הזמנת מופע | For venues, cultural halls, agencies, festivals: lineup, technical needs, area covered, a short form |
| `/he/shows/` | דיוויד בואי הופעה בישראל | Upcoming and past shows with cities, one `Event` each |
| `/he/about/` | סטארדאסט להקה | Members as `Person` entities, history, "לשעבר YADAYADAS" |
| `/he/ziggy-stardust/` | זיגי סטארדאסט | An informational guide to the album and character. Ties the brand to a phrase Hebrew media already ranks for |
| `/he/faq/` or FAQ blocks | question queries | Real questions with direct answers (see GEO) |

Suggested opening paragraph for the Hebrew homepage (draft, needs your approval, numbers must be true):
"סטארדאסט הוא מופע מחווה לדיוויד בואי של שישה מוזיקאים ישראלים: רוקנרול חי עם כינור, סקסופון והקשה,
ובין השירים הסיפור של האיש ושל התקופות בחייו. ארבע שנים על הבמה, בברים, במועדונים ובפסטיבלים."

### 7. Images
- Names like `gallery-band-05.jpg` say nothing. Rename to `stardust-bowie-tribute-live-<venue>.jpg`.
- Give informative band photos a descriptive Hebrew alt (on `/he/`) and an English alt (on `/`). Keep empty alt
  only for decorative art.

### 8. Entity and brand name
- "סטארדאסט" alone returns other companies and a film. Always pair it with "מופע מחווה לדיוויד בואי" in
  titles, headings and social bios. Mention both spellings (סטארדאסט, סטארדסט) once in the About page.
- Keep a visible "לשעבר YADAYADAS" line so searches for the old name still reach you.

## GEO (AI assistants)

What AI answers pull from for this topic is third party: ticket and event pages, club pages, press and
agency sites. A site alone rarely gets named. So:

1. Crawler access is fine today (no robots.txt means everything is allowed). Add an explicit robots.txt that
   allows the AI search bots (OAI-SearchBot, PerplexityBot, Claude-SearchBot, Googlebot) and points to the
   sitemap. `llms.txt` has no confirmed effect, so it is optional.
2. Make passages quotable. Today the site has no numbers and no question headings. Add a fact box on the show
   page: number of musicians, years on stage, show length, instruments, languages, areas covered, how to
   book. Use only true figures. Add the questions people ask AI, as headings with a direct first sentence:
   "איך מזמינים מופע מחווה לדיוויד בואי?", "מה כולל המופע של סטארדאסט?", "איפה אפשר לראות מופע מחווה
   לדיוויד בואי בישראל?".
3. Keep one consistent description of the band (name, six musicians, violin, sax, percussion, Bowie
   tribute) on the site, Facebook, Instagram, YouTube, Eventer and every listing.
4. Third party footprint (the largest GEO lever):
   - Update the Eventer listing `eventer.co.il/bowie_g`, still named "להקת Yadayadas".
   - Get listed on Muzi, Makore, Confia, Eventbuzz and Habama for each show, and on the agency
     directory tribute.co.il.
   - Ask the venues you played (Bar Giyora, Bella Ciao, Babity, Tassa, The Hobbit) to link their event
     pages to `stardustbowie.com`.
   - Rename the YouTube channel and re-title the videos with "סטארדאסט" and "STARDUST". The channel is still
     "The Yadayadas".
   - The public GitHub repo `roiisak-sys/Yadayadas` shows up for the old name. Rename it, change its
     description, or make it private.
   - Pitch Israeli music press (Ynet, Mako, Maariv, local papers): Bowie ten years after his death, a live
     show that tells his story. Press mentions are what AI answers quote.
5. Measure: set up GA4 so AI referrals can be seen, and run a monthly panel of 8 to 10 Hebrew prompts in
   ChatGPT, Gemini and Perplexity ("מה המופעי מחווה לדיוויד בואי בישראל?") and note whether you are named.

## Language setup note (a decision for you)

English is served at the bare domain and Hebrew at `/he/`. That is correct technically (hreflang is in place)
and it was your call. If most bookings and ticket buyers are Israeli, consider making Hebrew the default
instead, since the root URL gets the most links and shares. Never auto redirect by browser language: Google
does not send one, so it would hide pages from it. Instead, always link Hebrew users to `/he/` from your
Hebrew social bios and listings (the Instagram bio link should be `stardustbowie.com/he/`).

## Action plan

| When | Action | Who |
|---|---|---|
| Week 1 | robots.txt, sitemap, og:image and og:url, cache headers | me |
| Week 1 | Hero video and image optimisation, small logo, image dimensions | me |
| Week 1 | Real H1 text, new titles and descriptions, dash cleanup | me |
| Week 1 | JSON-LD graph (band, website, event, video) | me |
| Week 1 | Search Console and Bing properties, sitemap, Change of Address | you sign in, I add the DNS record |
| Week 1 | Analytics | you pick the tool, I install |
| Week 1 | Eventer listing, YouTube rename, GitHub repo name | you |
| Weeks 2 to 4 | Hebrew pages: show, book, shows, about, Ziggy Stardust, FAQ, plus English mirrors | me, with your facts |
| Month 2 to 3 | Listings on ticket and event platforms, agency directory, venue links, press pitch | you, I draft the text |
| Monthly | Search Console review and the AI prompt panel | me |

## Not verified

- Indexation and rankings: Search Console is not connected, and the search tool I used is not Google Israel.
- Backlinks: no backlink data (the domain is new).
- Real user speed (CrUX): no field data yet. The Lighthouse numbers above are lab data.
- Search volumes: autocomplete shows what people type, not how often.
- Competitor positions: seen through a search tool, not a Google Israel results page.
