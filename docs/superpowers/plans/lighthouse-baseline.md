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

### First measurement after the redesign, before the performance fix (branch `stage-lights` at a1c2a58)

Same method as Before (fresh build, `npx astro preview --port 4322`, `npx lighthouse` 13.6.0, mobile, performance only, headless Chrome, three runs).

| Run | Performance | LCP | TBT |
|-----|-------------|-----|-----|
| 1 | 61 | 14.5 s (14532 ms) | 0 ms |
| 2 | 62 | 14.6 s (14555 ms) | 0 ms |
| 3 | 62 | 14.5 s (14511 ms) | 0 ms |
| **Median** | **62** | **14.5 s** | **0 ms** |

Page height at a 375x812 viewport (all lazy images loaded): `/he/` = 7,370 px, `/en/` = 7,895 px (down from 17,370 px).

Why it dropped: the page became less than half as tall, so the `loading="lazy"` YouTube iframe (about 1 MB of third-party JS, 9 requests) and the below-the-fold swipe-row images fell inside Chrome's lazy-load distance and downloaded during the initial load: 3.17 MB / 60 requests before observed LCP against 1.66 MB / 42 requests on the old site. Re-running Lighthouse on the pre-redesign commit 1d98940 gave 88 and 89 (LCP 3.4 s), so the tool was not the cause. Observed (real, unthrottled) FCP and LCP did not change (about 1.65 s and 1.9 s in both): only Lighthouse's simulated (throttled) score moved.

### After the performance fix

What changed:

1. Click-to-load video facade (7371d49): a local WebP poster (`/assets/video/showreel-poster.webp`, 896x504) with a play button replaces the always-loaded YouTube iframe. A click swaps in the same `youtube-nocookie.com` iframe with autoplay; without JS the poster is a plain link to the YouTube watch page. Alone this moved 62 to 70-73.
2. Defer off-screen images (b14273c): every gallery and poster image is `loading="lazy"` (the first two of each had been eager, which put Medium-priority image weight into the simulated LCP graph; this was the biggest single step, 72 to 87); `content-visibility: auto` on the band, Bowie eras, upcoming, past shows, watch, explore and final sections so their lazy images wait until the section nears the viewport (54 to 38 requests before LCP); swipe rows set up their dots and arrows only when they near the viewport instead of all measuring layout on load (TBT about 150 ms to about 0).
3. Fix round (13d135e): the `content-visibility` size estimates now live in `src/styles/section-size.css`, fitted to measured heights at 320-1920 px in both languages (drift within 6% at every width measured, it had been up to 54% at tablet widths); the player iframe style no longer depends on Astro scoping.

Intermediate three-run sets (performance, same method):

| Step | Runs | LCP |
|------|------|-----|
| Reproduced at the start of the fix | 62 / 62 / 61 | 14.3-14.4 s |
| Facade only | 70 / 72 / 73 | 6.6-6.8 s |
| + content-visibility on four sections | 73 / 72 / 72 | 6.7 s |
| + all gallery and poster images lazy | 87 / 87 / 88 | 3.4 s |
| + deferred swipe-row init | 90 / 88 / 89 | 3.3-3.4 s |
| + content-visibility on watch, explore, final | 88 / 90 / 90 | 3.4 s |

Every run recorded for the build at b14273c (identical code apart from the commit message), in the order taken:

| Batch | Runs |
|-------|------|
| A (busy machine) | 89 / 88 / 71 |
| B (busy machine) | 85 / 75 / 88 |
| C (interleaved with the control, quiet machine) | 87 / 91 / (one run failed) / 92 / 92 |
| D (three consecutive runs) | 92 / 92 / 92 |

Pooled over those 13 runs the median is **89** (range 71-92). The three clean consecutive runs of batch D gave 92 / 92 / 92 (LCP 3.3-3.4 s, TBT 0, FCP 0.92 s, Speed Index 1.8-2.4 s), but that is one favourable batch, not a guaranteed floor.

Control, the pre-redesign commit 1d98940 built in a temporary worktree and measured on the same machine: 88 / 87 / 89, then 92 / 90 / 66, then 92 / 88 / 92 / 66 / 89 in the interleaved batch C. The new build is level with the old site within noise (and has fewer TBT outliers).

After the fix round (13d135e), same method:

| Batch | Runs |
|-------|------|
| E | 90 / 90 / 87 (LCP 3.4 s, 3.4 s, 4.0 s) |
| F | 90 / 86 / 90 |
| G, interleaved with b14273c (prior commit: 90 / 88 / 90 / 90) | 90 / 90 / 90 / 90 |

Median of those 10 runs is 90. The machine was in a slower state during this round (Speed Index about 3.5 s, FCP about 1.1 s, against 1.8 s and 0.92 s in batch D), and the previous commit scored the same 88-90 in the same interleaved batch, so the fix round did not change the score: it fixes the player layout and the scroll-height estimates.

Lab noise on this machine is large: the same build scored from 71 to 92, and total blocking time alone swings between 0 and about 1,200 ms from run to run. Expect 88-92 for the new site, the same band as the old one. Observed (unthrottled) FCP and LCP did not change at any point in this work; what moved from 62 to the high 80s/low 90s is Lighthouse's simulated score, because the lazy iframe and eager images no longer appear in the request graph before LCP. The hero (LCP element, a 563 KB logo animation with a poster) is untouched and is what keeps simulated LCP at about 3.4 s (LCP score 0.67), so 92 is near the ceiling for this page without changing the hero.

Page height at a 375x812 viewport (scrolled through, all sections rendered): `/he/` = **7,362 px**, `/en/` = **7,882 px**; at 768 wide 7,320 / 7,523 px; at 1280 wide 7,602 / 7,842 px (Before: 17,370 px at 375).
