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

Same method as Before, on branch `stage-lights` at a1c2a58 (fresh `npm test` build, `npx astro preview --port 4322`, `npx lighthouse` 13.6.0, mobile, performance only, headless Chrome, three runs).

| Run | Performance | LCP | TBT |
|-----|-------------|-----|-----|
| 1 | 61 | 14.5 s (14532 ms) | 0 ms |
| 2 | 62 | 14.6 s (14555 ms) | 0 ms |
| 3 | 62 | 14.5 s (14511 ms) | 0 ms |
| **Median** | **62** | **14.5 s** | **0 ms** |

Page height at a 375x812 viewport (all lazy images loaded, fonts loaded): `/he/` = **7,370 px**, `/en/` = **7,895 px**.

Verdict: page height target met (7,370 px against a 10,000 px limit, down from 17,370); performance target NOT met (median 62 against 92, simulated LCP 14.5 s against 3.4 s). The same Lighthouse 13.6.0 re-run on the pre-redesign commit 1d98940 gave 88 and 89 (LCP 3.4 s), so the drop comes from the redesign, not the tool. Observed (unthrottled) FCP and LCP are unchanged at about 1.65 s and 1.9 s. Likely cause: the page is now less than half as tall, so the lazy-loaded below-the-fold images and the YouTube iframe fall inside Chrome's lazy-load distance and download during the initial load (3.17 MB before observed LCP, against 1.66 MB), which the simulated throttling counts against LCP. Removing the iframe and the below-the-fold images from a copy of the build restored 89 / LCP 3.2 s.
