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

to be filled in Task 10
