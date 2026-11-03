# Stage Lights Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give stardustbowie.com a more dynamic mobile-first look (swipe rows, tap-to-enlarge photos, bio sheet, short past-shows panel, subtle motion) with the same content, and about half the phone scroll length.

**Architecture:** Astro static site stays as is. New shared pieces are small and framework-free: a `SwipeRow` component (CSS scroll-snap plus dots), one `<dialog>` photo viewer, one `<dialog>` bio sheet, and an IntersectionObserver reveal helper driven by CSS. All content stays in the HTML at build time; JavaScript only enhances it (a `js` class on `<html>` switches the enhanced layouts on, so no-JS visitors see everything).

**Tech Stack:** Astro 5, TypeScript, plain CSS (logical properties, for RTL), GSAP and Lenis (already installed, untouched), Vitest against the built `dist`.

**Spec:** `docs/superpowers/specs/2026-11-03-stage-lights-redesign-design.md` (mockup: `docs/superpowers/specs/2026-11-03-stage-lights-mockup/redesign-overview.html`)

## Global Constraints

- Both languages: `/he/` (RTL) and `/en/` plus the bare `/` (which renders `src/pages/en/index.astro`). Only the two files `src/pages/he/index.astro` and `src/pages/en/index.astro` compose the home page.
- No new copy beyond the small UI strings in Task 1 (`ui` block); no changed URLs; no new pages; no removed pages.
- Colours: orange (`--color-accent-orange`) is the accent; green (`--color-accent-green`) stays on the main buttons; the band section is dark. No token changes.
- Use CSS logical properties (`inline-start`, `margin-inline`, `padding-block`, `inset-inline`) in all new CSS, never `left`/`right`.
- Every new animation or transition must be off under `prefers-reduced-motion: reduce`.
- Content that is in the HTML today (all 36 past-show rows, all six bios, the full gallery intro, FAQ) must stay in the built HTML and be visible without JavaScript.
- The 163 existing tests keep passing. Lighthouse mobile performance on `/he/` must be at or above the baseline measured in Task 0 (last known 82).
- Images keep explicit `width`/`height`, WebP, and `alt` (empty alt stays on decorative posters).
- Commit after each task. Do not push, merge or deploy; the owner approves each deploy.

## Review Focus

1. **Zero upcoming shows:** no pill, no empty slot; the ticket card falls back to today's empty state. Pinned by Task 1's `nextShow`/`nextShowPill` tests (empty list returns `null`) and Task 7's built-HTML test.
2. **RTL breakage:** a hard-coded `left`/`right` makes swipe rows, dots and the sheet wrong in Hebrew. Pinned by Task 2's "new files use logical properties only" test.
3. **No JavaScript:** bios, all 36 rows, the full intro and all posters must be in the HTML and visible. Pinned by the built-HTML tests in Tasks 5, 6 and 8, plus the `.js`-scoped CSS rule test in Task 2.
4. **Reduced motion:** any new `animation:`/`transition:` without a matching `prefers-reduced-motion` rule. Pinned by Task 2's test over every new CSS source.
5. **Content pages regress:** the action bar must not leak onto `/he/show/` and friends, which keep the floating button. Pinned by Task 3's test.

## File Structure

Create:
- `src/lib/shows-ui.ts` and `src/lib/shows-ui.test.ts`: pure show helpers (next show, pill text, years).
- `src/components/SwipeRow.astro` and `src/scripts/swipe-row.ts`: reusable swipe row with dots.
- `src/components/Lightbox.astro` and `src/scripts/lightbox.ts`: the one full-screen photo viewer.
- `src/components/ActionBar.astro`: bottom WhatsApp and play bar (home pages only).
- `src/components/Ticker.astro`: running orange ticker line.
- `src/scripts/reveal.ts` and `src/styles/motion.css`: reveal-on-scroll and colourise-on-scroll.
- `src/redesign.test.ts`: tests over the built `dist` for everything above.
- `docs/superpowers/plans/lighthouse-baseline.md`: before and after numbers.

Modify: `src/layouts/BaseLayout.astro`, `src/content/copy.he.json`, `src/content/copy.en.json`, `src/components/{Hero,BandGallery,BandMembers,BowieCollage,UpcomingShows,PastShows,ExploreLinks,FinalScene,WatchVideo}.astro`, `src/pages/he/index.astro`, `src/pages/en/index.astro`, `src/content.schema.test.ts`.

Test commands: `npm run build` then `npx vitest run src/redesign.test.ts` (tests read `dist`); the full suite is `npm test` (builds first). Expected full-suite result at every commit: all tests pass.

---

### Task 0: Branch and performance baseline

**Files:** Create `docs/superpowers/plans/lighthouse-baseline.md`.

- [ ] **Step 1:** In `C:\GIT\Yadayadas` run `git checkout -b stage-lights`.
- [ ] **Step 2:** `npm run build`, then start `npx astro preview --port 4322` in the background.
- [ ] **Step 3:** Run `npx lighthouse http://localhost:4322/he/ --only-categories=performance --form-factor=mobile --output=json --quiet --chrome-flags="--headless"` three times; record each performance score, LCP and total blocking time, and the median, in the baseline file under "Before".
- [ ] **Step 4:** With the preview open at a 375x812 viewport, record `document.documentElement.scrollHeight` of `/he/` (last measured 17,370) under "Before".
- [ ] **Step 5:** Commit: `git add docs/superpowers/plans/lighthouse-baseline.md && git commit -m "Record performance and page-height baseline"`.

---

### Task 1: Show helpers and UI strings

**Files:**
- Create: `src/lib/shows-ui.ts`, `src/lib/shows-ui.test.ts`
- Modify: `src/content/copy.he.json`, `src/content/copy.en.json`, `src/content.schema.test.ts`

**Interfaces:**
- Produces (`src/lib/shows-ui.ts`):
  - `type ShowRow = { id: string; status: 'past' | 'upcoming'; dateISO: string; venueHe: string; venueEn: string; cityHe: string; cityEn: string; ticketUrl: string; eventUrl: string }`
  - `nextShow(shows: ShowRow[], today: string): ShowRow | null` earliest `upcoming` show with `dateISO >= today`, else `null`.
  - `nextShowPill(shows: ShowRow[], locale: 'he' | 'en', label: string, today: string): { label: string; text: string; href: string } | null` where `text` is `"7.11 · Hod HaSharon"` style (day and month without leading zeros, then the city in that locale) and `href` is the show's `ticketUrl || eventUrl || '#upcoming-shows'`.
  - `pastYears(shows: ShowRow[]): string[]` distinct years of past shows, newest first, as strings.
  - `showYear(show: ShowRow): string`.
- Produces (`copy.{he,en}.json`): a top-level `ui` object with exactly these keys: `nextShowLabel`, `enlarge`, `close`, `prev`, `next`, `readMore`, `readLess`, `allShows`, `hideShows`, `allYears`, `swipeHint`, `playShowreel`, `bandSheetClose`. Hebrew values: "ההופעה הבאה", "הגדלה", "סגירה", "הקודם", "הבא", "קראו עוד", "הסתר", "כל המופעים", "הסתר את הרשימה", "הכל", "החליקו", "צפו בסרטון", "סגירת הביוגרפיה". English values: "Next show", "Enlarge", "Close", "Previous", "Next", "Read more", "Show less", "All shows", "Hide the list", "All", "Swipe", "Watch the video", "Close biography".

- [ ] **Step 1: Write failing tests** in `src/lib/shows-ui.test.ts`: `nextShow([], '2026-11-03')` is `null`; with one past and one upcoming show dated after `today` it returns the upcoming one; an `upcoming` show dated before `today` is ignored; two upcoming shows return the earlier; `nextShowPill` for `2026-11-07` in Hod HaSharon gives `text` `'7.11 · הוד השרון'` in `he` and `'7.11 · Hod HaSharon'` in `en`, and returns `null` when there is no next show; `pastYears` of shows from 2026, 2025, 2025, 2024 returns `['2026','2025','2024']`.
- [ ] **Step 2:** Add to `src/content.schema.test.ts` a test that `Object.keys(copyHe.ui).sort()` equals `Object.keys(copyEn.ui).sort()` and every value is a non-empty string.
- [ ] **Step 3:** Run `npx vitest run src/lib/shows-ui.test.ts src/content.schema.test.ts`. Expected: FAIL (module and `ui` missing).
- [ ] **Step 4:** Implement `src/lib/shows-ui.ts` and add the `ui` blocks to both copy files with the values above.
- [ ] **Step 5:** Re-run the same command. Expected: PASS.
- [ ] **Step 6:** Commit `Show helpers and UI strings`.

---

### Task 2: Shared pieces (motion, swipe row, viewer, `js` class) with guard tests

**Files:**
- Create: `src/styles/motion.css`, `src/scripts/reveal.ts`, `src/components/SwipeRow.astro`, `src/scripts/swipe-row.ts`, `src/components/Lightbox.astro`, `src/scripts/lightbox.ts`, `src/redesign.test.ts`
- Modify: `src/layouts/BaseLayout.astro`

**Interfaces:**
- Produces:
  - `BaseLayout` sets `class="js"` on `<html>` via an inline script in `<head>` (`document.documentElement.classList.add('js')`) and imports `src/styles/motion.css` and `src/scripts/reveal.ts`.
  - Markup contract for reveal: any element with `data-reveal` gets class `in` when it enters the viewport; any element with `data-colorize` gets class `in` likewise. `motion.css` styles `.js [data-reveal]` (hidden, translated 18px) and `.js [data-reveal].in` (visible) only inside `@media (prefers-reduced-motion: no-preference)`, and `.js [data-colorize]` (grayscale 1) to `.in` (grayscale 0) likewise.
  - `SwipeRow.astro` props `{ label: string }`, one default slot of items; renders `<div class="swipe" data-swipe role="group" aria-label={label}>` with a scroll-snap track (`.swipe__track`, children each marked `data-swipe-item` by the parent), plus `<div class="swipe__dots" aria-hidden="true"></div>` filled by `swipe-row.ts` (one dot per item, the visible item's dot has class `on`).
  - Viewer contract: a trigger is `<button type="button" class="zoomable" data-lightbox="SET" data-full="URL" data-caption="TEXT" aria-label="...">` containing the `<img>`. Clicking opens `<dialog id="lightbox">` (rendered once by `Lightbox.astro`, with close/prev/next buttons labelled from `ui`) showing all triggers of the same `SET` in DOM order, starting at the clicked one. Swiping uses a scroll-snap track; Escape, the close button and a backdrop click close it; focus returns to the trigger; page scroll is locked while open; each slide's `<img>` loads its `data-full` only when it is the current or adjacent slide.

- [ ] **Step 1: Write failing guard tests** in `src/redesign.test.ts` (reads `dist`, plus the new source files): (a) every new CSS source (`src/styles/motion.css` and the `<style>` blocks of `SwipeRow.astro`, `Lightbox.astro`, `ActionBar.astro`, `Ticker.astro`, and later the modified components) that contains `animation:` or `transition:` also contains `prefers-reduced-motion`; (b) none of those sources contains `margin-left`, `margin-right`, `padding-left`, `padding-right`, or a bare `left:`/`right:` declaration (`inset-inline-*` and `translate` are fine, and a `.swipe__dots` centring using `left: 50%` is **not** allowed, use `justify-content: center`); (c) `dist/he/index.html` has `class="js"` set by an inline script (the string `classList.add('js')`) and contains `id="lightbox"` exactly once; (d) `.js [data-reveal]` appears in motion.css only inside a `prefers-reduced-motion: no-preference` block.
- [ ] **Step 2:** `npm run build && npx vitest run src/redesign.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement the files and the `BaseLayout` changes per the contracts above. Add `<Lightbox />` to both home pages after `</main>`. Approach: native `<dialog>` + `showModal()`, scroll-snap tracks, `IntersectionObserver` for dots and reveal; no libraries.
- [ ] **Step 4:** Build and re-run the test file. Expected: PASS. Then `npm test`; expected: all pass.
- [ ] **Step 5:** Commit `Shared swipe row, viewer and reveal motion`.

---

### Task 3: Opening: next-show pill, ticker, action bar

**Files:**
- Create: `src/components/ActionBar.astro`, `src/components/Ticker.astro`
- Modify: `src/components/Hero.astro`, `src/pages/he/index.astro`, `src/pages/en/index.astro`, `src/redesign.test.ts`

**Interfaces:**
- Consumes: `nextShowPill` and `copy.ui` from Task 1.
- Produces:
  - `Hero.astro` gains optional prop `pill?: { label: string; text: string; href: string } | null`; when set it renders `<a class="hero__pill" href=...>● {label} · {text}</a>` (green outline, as in the mockup) below the descriptor, and `<Ticker text="STARDUST ✦ DAVID BOWIE TRIBUTE ✦ LIVE ✦" />` below that. No pill element when `pill` is null.
  - `Ticker.astro` props `{ text: string }`: renders the text repeated enough to loop seamlessly, `aria-hidden="true"`, orange band, linear CSS animation inside a `no-preference` media query.
  - `ActionBar.astro` props `{ whatsappHref: string; whatsappLabel: string; playLabel: string }`: fixed bottom bar, green WhatsApp button (flex 1) plus a small outlined play button linking to `#watch`; respects `env(safe-area-inset-bottom)`; adds bottom padding to `body` so the footer is never covered (`body:has(.action-bar)`).
  - Home pages render `<ActionBar>` and no longer render `<FloatingWhatsApp>`. `ContentPage.astro` is **not** changed.

- [ ] **Step 1: Write failing tests:** home pages (`dist/he/index.html`, `dist/index.html`) contain `class="action-bar"` with the `wa.me` link and `href="#watch"`, and do **not** contain `id="floating-whatsapp"`; `dist/he/show/index.html` and `dist/show/index.html` **do** contain `id="floating-whatsapp"` and not `class="action-bar"`; `dist/he/index.html` contains `class="hero__pill"` with `7.11` and `הוד השרון` while a show on 2026-11-07 is upcoming (make the assertion read the next upcoming show from `shows.json` rather than hard-coding the date; skip the pill assertions with `it.skipIf` when no upcoming show exists); the ticker has `aria-hidden="true"`.
- [ ] **Step 2:** Build, run the file. Expected: FAIL.
- [ ] **Step 3:** Implement. In the home pages compute `const today = new Date().toISOString().slice(0, 10); const pill = nextShowPill(shows, locale, copy.ui.nextShowLabel, today);` and pass it to `Hero`. The existing GSAP zoom on the background video stays as the opening's slow zoom; add no new hero zoom.
- [ ] **Step 4:** Build, run tests. Expected: PASS. In the browser pane at 375x812 check `/he/` and `/en/`: pill and ticker show, the bar sits at the bottom, the footer is not covered, the ticker moves; with `prefers-reduced-motion` emulated the ticker is still.
- [ ] **Step 5:** Commit `Opening pill, ticker and bottom action bar`.

---

### Task 4: Photo gallery as swipe row with viewer and "read more"

**Files:** Modify `src/components/BandGallery.astro`, `src/redesign.test.ts`.

**Interfaces:** Consumes `SwipeRow`, the viewer contract, `copy.ui.readMore/readLess/enlarge`. Each of the 12 photos is a `.zoomable` trigger with `data-lightbox="gallery"`, `data-full` the same WebP URL, `data-caption` the alt text (dominant photo keeps its alt, the rest keep `alt=""`). Keep the current photo order (first is the highlighted one) and `loading="lazy"` on all but the first two.

- [ ] **Step 1: Write failing tests:** `dist/he/index.html` has exactly 12 `data-lightbox="gallery"` triggers, each with an `aria-label`; the full intro paragraph text from `copy.he.json` (`band.introParagraph`) appears verbatim in the HTML; a `data-readmore` button exists; the CSS that clamps the paragraph is scoped under `.js`.
- [ ] **Step 2:** Build, run. Expected: FAIL.
- [ ] **Step 3:** Implement. The clamp (about three lines) and the toggle button exist only under `.js`; the button toggles `aria-expanded` and its label between `readMore` and `readLess`.
- [ ] **Step 4:** Build, run tests. Expected: PASS. Browser check at 375 wide in both languages: swipe works in the right direction for RTL, dots follow, tapping opens the viewer, Escape closes it and focus returns.
- [ ] **Step 5:** Commit `Gallery swipe row with full-screen viewer`.

---

### Task 5: The band as cards with a bio sheet

**Files:** Modify `src/components/BandMembers.astro`, `src/redesign.test.ts`.

**Interfaces:** Consumes `SwipeRow`, `data-colorize`, `copy.ui.bandSheetClose`. Section becomes dark (`--color-black` background, off-white text). Each member is an `<article class="band__card" data-reveal>` with a `<button type="button" class="band__open">` (photo, then name and instrument on a bottom gradient) and, after it, `<p class="band__bio">` with the full bio. One shared `<dialog id="band-sheet">` (bottom sheet) is filled from the clicked card's name, instrument and `.band__bio` text; no bio text is duplicated in the HTML. Under `.js` the `.band__bio` is visually hidden (still in the DOM); without JS it is visible under the card. The photo has `data-colorize`. Keep `statement` paragraph above the row.

- [ ] **Step 1: Write failing tests:** `dist/he/index.html` contains all six `bioHe` strings from `band-members.json` (core members), each inside an element with class `band__bio`; exactly one `id="band-sheet"`; six `band__open` buttons; the `.band__bio` hide rule is scoped under `.js`; the section background is not `--color-off-white`.
- [ ] **Step 2:** Build, run. Expected: FAIL.
- [ ] **Step 3:** Implement. Sheet: `dialog` positioned at the bottom with a slide-up transition (no-preference only), grab handle, close button, Escape and backdrop close, focus returns to the card.
- [ ] **Step 4:** Build, run tests. Expected: PASS. Browser check in Hebrew and English: tapping a card opens the right bio; the photo turns colour when scrolled into view; with reduced motion the photos are simply in colour (no animation).
- [ ] **Step 5:** Commit `Band cards with bio sheet`.

---

### Task 6: Bowie eras as a swipe strip

**Files:** Modify `src/components/BowieCollage.astro`, `src/redesign.test.ts`.

**Interfaces:** Consumes `SwipeRow` and the viewer contract. Heading, fragments line and wordmark stay. The 8 era cards (3:4, name label on the photo, same head-preserving `object-position` rules as today's cells) are viewer triggers with `data-lightbox="eras"` and `data-caption` the existing era alt text. Remove the desktop mosaic grid and the empty-until-scroll behaviour (no GSAP opacity-0 start); cards use `data-reveal`.

- [ ] **Step 1: Write failing tests:** 8 `data-lightbox="eras"` triggers in `dist/he/index.html`; each era `name` from `copy.he.json` (`bowies.eras`) appears; no element in this section starts hidden without `.js` (the section's CSS has no bare `opacity: 0`).
- [ ] **Step 2:** Build, run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Build, run tests. Expected: PASS. Browser check: the section is no longer a long mostly-empty stretch on a phone.
- [ ] **Step 5:** Commit `Bowie eras swipe strip`.

---

### Task 7: Upcoming show as a ticket card

**Files:** Modify `src/components/UpcomingShows.astro`, `src/redesign.test.ts`.

**Interfaces:** Each upcoming show renders `<div class="ticket">`: a date block (orange, month abbreviation in the page's locale uppercased, large day number, year) beside venue, city, and the existing tickets/details button (green, same hrefs and copy as today). The poster image, when present, is a viewer trigger (`data-lightbox="upcoming"`) kept at its own proportions (as fixed earlier). The empty state (no upcoming shows) is unchanged.

- [ ] **Step 1: Write failing tests:** while an upcoming show exists, `dist/he/index.html` contains `class="ticket"` with the day number and the `ticketUrl` link; the heading is still present. Also add a build-free test importing `nextShow` showing that with an empty list the page would use the empty state (the component receives zero upcoming shows, so assert the empty-state class `upcoming__empty` exists in the component source).
- [ ] **Step 2:** Build, run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Build, run tests. Expected: PASS. Temporarily set the show's `status` to `past` locally, rebuild, confirm the empty state and no pill, then restore `shows.json` (`git checkout src/content/shows.json`).
- [ ] **Step 5:** Commit `Ticket-style upcoming show card`.

---

### Task 8: Past shows: poster swipe row and "all shows" panel

**Files:** Modify `src/components/PastShows.astro`, `src/redesign.test.ts`.

**Interfaces:** Consumes `SwipeRow`, viewer contract, `pastYears`, `showYear`, `copy.ui.allShows/hideShows/allYears`. Order: heading, poster swipe row (the 11 existing posters, each a `data-lightbox="posters"` trigger, `alt=""` kept, aria-label from `ui.enlarge`), then a `<button type="button" data-allshows aria-expanded aria-controls="past-panel">` and `<div id="past-panel">` containing a chip row (`<button type="button" data-year="ALL|YYYY">` for each year from `pastYears`) and the list (`<li class="past__row" data-year="YYYY">`, all past shows, same content as today). The panel is a short scroller (`max-height: 22rem; overflow-y: auto`). Under `.js` the panel starts collapsed (`hidden` set by script, not in the HTML) and the button expands it inline; chips hide rows whose `data-year` differs. Without JS the panel is simply visible and the button is not rendered visible (`.js`-scoped).

- [ ] **Step 1: Write failing tests:** the number of `past__row` elements in `dist/he/index.html` equals the number of `past` shows in `shows.json`; every row carries a `data-year` that matches its date; one chip per distinct year plus one "all" chip and no chip for a year without shows; 11 `data-lightbox="posters"` triggers; `id="past-panel"` has no `hidden` attribute in the HTML; the `[data-allshows]` button is hidden without `.js` (CSS rule scoped `html:not(.js)` or default-hidden).
- [ ] **Step 2:** Build, run. Expected: FAIL.
- [ ] **Step 3:** Implement. Remove the masonry collage CSS and the per-row GSAP fade.
- [ ] **Step 4:** Build, run tests. Expected: PASS. Browser check in both languages: posters swipe and enlarge; "all shows" expands the panel; chips filter; the panel scrolls on its own; with JS disabled (DevTools) everything is visible.
- [ ] **Step 5:** Commit `Past shows: poster row and short list panel`.

---

### Task 9: Remaining sections, reveal motion and desktop widths

**Files:** Modify `src/components/ExploreLinks.astro`, `FinalScene.astro`, `WatchVideo.astro`, `BowieStory.astro` (spacing only), the five components that have swipe rows, `src/redesign.test.ts`.

**Interfaces:** Explore cards, the watch frame and footer blocks get `data-reveal`. At `min-width: 1000px` the swipe rows show more cards at once: gallery 3, band 4, eras 4, posters 5 per view, centred in a `max-width: 72rem` column. Existing GSAP reveals in untouched sections remain.

- [ ] **Step 1: Write failing tests:** `data-reveal` present on the Explore section's cards in `dist/he/index.html`; the no-JS guard still holds (motion.css hides only under `.js`); the guard tests from Task 2 still pass over the newly modified component styles (add the modified components to its source list).
- [ ] **Step 2:** Build, run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Build, run `npm test`. Expected: all pass.
- [ ] **Step 5:** Browser check at 375x812 and 1280x800, both languages, light scroll-through: no horizontal page scroll, nothing cut off, the bottom bar never hides content, the language toggle still works.
- [ ] **Step 6:** Commit `Reveal motion and desktop widths`.

---

### Task 10: Verify against the goals and report

**Files:** Modify `docs/superpowers/plans/lighthouse-baseline.md`.

- [ ] **Step 1:** `npm test`. Expected: all pass (163 plus the new tests).
- [ ] **Step 2:** Repeat the Task 0 Lighthouse runs on the new build (`/he/`, mobile, three runs, median). Expected: median performance >= the baseline median. If lower, find the cause (likely image loading in the swipe rows or viewer preloads) and fix it before continuing.
- [ ] **Step 3:** Measure `/he/` page height at 375x812. Expected: at most 10,000 px (about half of 17,370); record the actual.
- [ ] **Step 4:** In the browser pane verify at 375 wide, Hebrew and English: viewer (swipe, Escape, focus returns, scroll locked), bio sheet, "all shows" and chips, bar, pill, ticker; emulate reduced motion and confirm no movement and all content visible; disable JavaScript and confirm all bios, all 36 rows, the full intro and all images are visible.
- [ ] **Step 5:** Fill the "After" section of the baseline file and commit `Record post-redesign measurements`.
- [ ] **Step 6:** Report the numbers and screenshots to the owner and ask for approval to merge to `master` and deploy (`npm run build && npx netlify deploy --prod --dir=dist`).

---

## Self-review notes

- Spec coverage: opening (Task 3), photos and read-more (4), band and sheet and dark (5), Bowie strip (6), ticket card and empty state (3 pill, 7 card), past shows panel and posters (8), explore/footer/video motion and desktop (9), measurable goals (10), no-JS and reduced-motion and RTL guards (2 plus each task's tests), content pages keep the floating button (3).
- Not yet pinned by an automated test (checked by hand in Task 10): viewer focus return, scroll lock, and swipe direction in RTL.
