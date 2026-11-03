# "Stage Lights" redesign: design

Site: https://stardustbowie.com (Astro 5 static, Hebrew under `/he/`, English at `/`). Repo: `C:\GIT\Yadayadas`.

## Intent and why

The owner finds the site "slightly archaic". They want a more dynamic, creative look and feel with subtle animation, photos that are more dynamic and can be expanded, and past performances that are not a never-ending list. The text stays essentially the same. Mobile first, because most visitors arrive on a phone.

Measured today on a 375 px phone (Hebrew home page): the page is about 21 screens tall (17,370 px). Band section 4,500 px, "Who was Bowie" collage 2,782 px (mostly empty black while it waits for scroll), past shows 3,615 px (36 list rows plus 11 posters).

## Goals

- Phone page height roughly halved (an estimate, to be measured after the build).
- Every photo and poster can be tapped to open full screen (swipe between, pinch zoom, close button, Escape, focus trap).
- Past shows: the 11 posters become a swipe row that opens full screen (chosen by the owner, "option B"). The full list of 36 shows sits behind an "all shows" button and, when open, is a short scrolling panel with year chips (all, 2026, 2025, 2024 and so on), not a long page.
- Subtle motion: slow zoom on the opening photo, sections sliding in, orange ticker line, photo and card transitions, black-and-white photos turn to colour as they scroll into view (phones have no hover).
- Keep the black and orange identity, the animated hero logo and background video.

## Non-goals

- No new copy, no changed URLs, no new pages, no removed pages.
- No framework change (stay on Astro, GSAP, Lenis as today).

## Anti-goals (a failure even if it technically works)

- SEO or speed regressing: all 163 tests must keep passing, and Lighthouse mobile performance must stay at or above today's 82. Content that is now in the HTML (all show names, member bios, FAQ) must stay in the HTML, not be loaded only after a click.
- Animation that fires for people who set reduced motion, or content that is invisible without JavaScript.
- Anything that breaks right-to-left layout.

## The design, by section (decided with the owner)

1. **Opening.** Animated logo and background video stay. Add a pill with the next show (date and city, from `shows.json`), a running ticker line in orange, and a WhatsApp button pinned along the bottom (replaces the floating round button; the call button stays in the footer). The pill and ticker are the designer's ideas, shown in the mockup the owner approved.
2. **Photos.** The 12 stage photos become a swipe gallery (CSS scroll-snap) with dots; tapping opens the full-screen viewer. The long intro paragraph shows about three lines with "read more" (full text stays in the HTML).
3. **The band.** Six cards in a swipe row (name and instrument on the photo). Tapping a card opens the bio in a bottom sheet. Photos turn from black-and-white to colour when scrolled into view.
4. **Bowie section.** The "Who was David Bowie?" collage becomes a swipe strip of the eight eras, with the heading and fragments kept. This is the designer's guess and was not mocked up.
5. **Video, story paragraph.** Keep as today with the new spacing and entrance motion.
6. **Shows.** Next show as a ticket-style card (big date, venue, city, tickets button). Past shows as described under goals.
7. **Explore links, footer.** Same treatment (cards that slide in, consistent spacing). No new content.
8. **Desktop.** Same design with wider grids (galleries and rows show more cards at once). The designer's guess.

## Constraints

- Both languages, plus the content pages (`/show/`, `/events/` and so on) must keep working and keep their SEO markup.
- Reduced motion: no animation, content fully visible.
- No-JavaScript: content visible; sheets, the viewer and the "all shows" panel degrade to plain visible content or links.
- Accessibility tests (`src/a11y.test.ts`) and image rules (width/height, WebP, alt text) stay.
- Deploy is manual (`netlify deploy --prod`), and the owner approves each deploy.

## Left to the builder

Component structure, which small libraries (if any) to use for the viewer, exact easing, durations and spacing, card sizes, how the sheet and viewer are implemented, how the pill picks the next show, and how many photos preload.

## The approved mockup

`docs/superpowers/specs/2026-11-03-stage-lights-mockup/redesign-overview.html` (open it in a browser, phone-sized previews with real motion). It is the visual reference for the opening, photos, band and shows screens. In it, orange is the accent (ticker, dates, chips, headings) and **green stays the colour of the main buttons** (WhatsApp, tickets), as today. The band section is dark, like the rest of the page. Nothing changes in the colour tokens.

## Calls made by the designer (settled without the owner; marked so they can be checked)

1. **Action bar is home page only.** The content pages (`/show/`, `/events/` and so on) keep the current floating WhatsApp button; the bar's play button scrolls to the home page's video, so it exists only where that video exists. While the viewer or a band sheet is open the bar sits underneath it.
2. **No upcoming show.** The pill is simply not shown (the opening layout does not depend on it). The ticket card becomes today's empty state, "next show: coming soon" with the "want us at your place?" WhatsApp button. "Next show" means the earliest upcoming entry in `shows.json`. The pill uses a short label, "ההופעה הבאה" / "Next show", taken from wording already on the site, plus the date and city; the ticker text is brand text, not new copy.
3. **Band bios without JavaScript** show as plain text under each card. With JavaScript they open in the bottom sheet. The band section is dark.
4. **Viewer.** Swiping is within one section (stage photos, band, Bowie eras, posters), each its own set. Posters stay decorative with no captions (empty alt, as today); images that have alt text show it.
5. **Performance gate.** Baseline: Lighthouse mobile, default throttling, run locally on the built `dist` for `/he/` before any change (last measured 82), then compared after the build. Slides beyond the first two lazy-load.
6. **"All shows".** The list expands inline on the page (no overlay). Year chips filter by hiding rows. Without JavaScript all 36 rows are visible. All rows stay in the HTML.

## Open items for the owner to check when reading

- The ticker text ("STARDUST ✦ DAVID BOWIE TRIBUTE ✦ LIVE") and the next-show pill wording.
- The bottom action bar: WhatsApp as the main button, plus a small "play" button that scrolls to the video.
