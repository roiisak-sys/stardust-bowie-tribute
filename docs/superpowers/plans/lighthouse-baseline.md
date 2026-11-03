# Lighthouse and page-height baseline

Target: `http://localhost:4322/he/` (`npm run build` + `npx astro preview --port 4322`), Lighthouse mobile form factor, performance category only, headless Chrome, run on branch `stage-lights` before any redesign change.

## Before

| Run | Performance | LCP | TBT |
|-----|-------------|-----|-----|
| 1 | 88 | 3.9 s (3928 ms) | 0 ms |
| 2 | 92 | 3.4 s (3394 ms) | 10 ms (6.5 ms) |
| 3 | 92 | 3.4 s (3391 ms) | 10 ms (12.5 ms) |
| **Median** | **92** | **3.4 s** | **~10 ms (6.5 ms exact)** |

Page height at a 375x812 viewport: `document.documentElement.scrollHeight` of `/he/` = **17,370 px** (all lazy images scrolled into view and fonts loaded; value unchanged before and after).

## After

### Final (after the performance fix, commits 7371d49 and the "Defer off-screen swipe-row images" commit)

Same method as Before (`npm run build` + `npx astro preview --port 4322`, `npx lighthouse` 13.6.0, mobile, performance only, headless Chrome, three consecutive runs).

| Run | Performance | LCP | TBT | FCP | Speed Index |
|-----|-------------|-----|-----|-----|-------------|
| 1 | 92 | 3.3 s (3321 ms) | 0 ms | 921 ms | 1.8 s |
| 2 | 92 | 3.4 s (3396 ms) | 0 ms | 921 ms | 1.9 s |
| 3 | 92 | 3.4 s (3398 ms) | 0 ms | 941 ms | 2.4 s |
| **Median** | **92** | **3.4 s** | **0 ms** | **0.9 s** | |

Target (>= 92, the Before median) met. Page height at a 375x812 viewport (all lazy images loaded, scrolled through): `/he/` = **7,362 px**, `/en/` = **7,882 px** (Before: 17,370 px). Desktop 1280 wide: 7,502 px.

Run-to-run noise on this machine is large (the lab score swings by 20+ points on TBT outliers), so the pre-redesign commit 1d98940 was measured alongside as a control in the same sessions: 88/87/89 in a busy period and 92/88/92/66/89 later, against 87/91/92/92 for the final build in the same later interleaved batch. The final build is level with or better than the old site.

### What changed to recover performance

1. Click-to-load video facade (`WatchVideo.astro`): the YouTube iframe (about 1 MB of third-party JS) sat inside Chrome's lazy-load distance once the page became 7k px tall and loaded at start. It is now a local WebP poster (`/assets/video/showreel-poster.webp`, 896x504) with a play button; a click swaps in the same `youtube-nocookie.com` iframe with `autoplay=1`. Without JS the facade is a plain link to the YouTube watch page. Alone: 62 -> 70-73.
2. Every gallery and poster image is `loading="lazy"` (the first two of each were eager, which put 260 KB of Medium-priority image weight into the simulated LCP graph): 72 -> 87-88, LCP 6.7 s -> 3.4 s.
3. `content-visibility: auto` with `contain-intrinsic-block-size: auto <estimate>` on the band, Bowie eras, upcoming, past shows, watch, explore and final sections (estimates measured at 375 px and 1280 px): fewer requests before LCP (54 -> 38) and less first-layout work.
4. Swipe rows initialise (dots, arrows) when they come within 300 px of the viewport instead of all measuring layout on load: TBT 140-200 ms -> about 0.

Intermediate measurements, kept for the record:

| Step | Perf (3 runs) | LCP |
|------|---------------|-----|
| First measurement after redesign, before the performance fix (a1c2a58) | 61 / 62 / 62 | 14.5 s |
| Reproduced at the start of the fix | 62 / 62 / 61 | 14.3-14.4 s |
| Video facade | 70 / 72 / 73 | 6.6-6.8 s |
| + content-visibility on four sections | 73 / 72 / 72 | 6.7 s |
| + all gallery/poster images lazy | 87 / 87 / 88 | 3.4 s |
| + deferred swipe-row init | 90 / 88 / 89 | 3.3-3.4 s |
| + content-visibility on watch/explore/final | 88 / 90 / 90 | 3.4 s |
| Final | 92 / 92 / 92 | 3.3-3.4 s |

The earlier 61/62/62 result and its diagnosis (lazy items falling inside Chrome's lazy-load distance on the shorter page) are in the task 10 report.
