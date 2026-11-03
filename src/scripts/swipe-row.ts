// Fills each [data-swipe] row's dots (one per [data-swipe-item]) and keeps the
// visible item's dot marked `on`. The IntersectionObserver uses the track as
// its root, so it follows the scrollable axis in LTR and RTL alike.
//
// The previous / next buttons (shown by CSS only for mouse users) scroll the
// track by whole items and disable themselves at either end.
import { createPendingScroll, edgeState, pageStep, scrollDelta, wrapScroll } from '../lib/swipe-nav';
import { initWhenNear } from '../lib/lazy-init';
import { prefersReducedMotion } from './reduced-motion';

function initArrows(row: HTMLElement, track: HTMLElement) {
  const prev = row.querySelector<HTMLButtonElement>('[data-swipe-prev]');
  const next = row.querySelector<HTMLButtonElement>('[data-swipe-next]');
  if (!prev || !next) return;

  // Where the smooth scroll under way is heading, so rapid presses land on whole items.
  const pending = createPendingScroll();

  const sync = () => {
    const { canPrev, canNext } = edgeState(track.scrollLeft, track.scrollWidth, track.clientWidth);
    const hadFocus = document.activeElement;
    prev.disabled = !canPrev;
    next.disabled = !canNext;
    // A button that just disabled itself drops focus: hand it to its partner.
    if (hadFocus === prev && !canPrev && canNext) next.focus({ preventScroll: true });
    if (hadFocus === next && !canNext && canPrev) prev.focus({ preventScroll: true });
  };

  const go = (which: 'prev' | 'next') => {
    const items = track.querySelectorAll<HTMLElement>('[data-swipe-item]');
    if (!items.length) return;
    const first = items[0].getBoundingClientRect();
    const pitch = items.length > 1 ? Math.abs(items[1].getBoundingClientRect().left - first.left) : first.width;
    const cs = getComputedStyle(track);
    const content = track.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const step = pageStep({ pitch, content, gap: Math.max(0, pitch - first.width) });
    const target = pending.press(
      track.scrollLeft,
      scrollDelta(which, cs.direction, step),
      track.scrollWidth,
      track.clientWidth,
      cs.direction,
    );
    track.scrollTo({ left: target, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  prev.addEventListener('click', () => go('prev'));
  next.addEventListener('click', () => go('next'));
  track.addEventListener(
    'scroll',
    () => {
      pending.scrolled(track.scrollLeft);
      sync();
    },
    { passive: true },
  );
  // The scroll came to rest (or the user took over): the next press starts from where the row is.
  track.addEventListener('scrollend', pending.clear);
  track.addEventListener('pointerdown', pending.clear);
  track.addEventListener('wheel', pending.clear, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(sync).observe(track);
  sync();
}

const FLOW_PX_PER_SECOND = 30;
const FLOW_RESUME_MS = 1500;

// Rows marked data-swipe-auto flow on their own like a slow marquee: a copy of
// the items follows the originals, and the position wraps from the end of the
// originals back to the start of the copy, so the loop has no seam. The visitor
// is always in charge: any scroll we did not make (touch, wheel, the buttons'
// smooth scroll) holds the flow until it has been still for a moment, and so do
// keyboard focus in the row, an open viewer and a row out of sight. Visitors who
// asked for reduced motion get no flow.
function startFlow(row: HTMLElement, track: HTMLElement, items: HTMLElement[]): HTMLElement[] {
  if (prefersReducedMotion() || !('requestAnimationFrame' in window)) return [];
  const cs = getComputedStyle(track);
  const dir = cs.direction === 'rtl' ? -1 : 1;
  const trigger = (item: HTMLElement) => item.querySelector<HTMLElement>('button');

  const makeCopy = () =>
    items.map((item) => {
      const clone = item.cloneNode(true) as HTMLElement;
      clone.removeAttribute('data-swipe-item');
      clone.removeAttribute('data-reveal');
      clone.setAttribute('data-swipe-clone', '');
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('[data-lightbox]').forEach((el) => el.removeAttribute('data-lightbox'));
      clone.querySelectorAll('button, a').forEach((el) => el.setAttribute('tabindex', '-1'));
      clone.addEventListener('click', () => trigger(item)?.click());
      return clone;
    });
  const first = makeCopy();
  track.append(...first);
  const clones = [...first];
  // A second copy only when one is not enough to cover the visible width.
  const loopWidth = () => Math.abs(first[0].getBoundingClientRect().left - items[0].getBoundingClientRect().left);
  if (loopWidth() < track.clientWidth * 1.5) {
    const more = makeCopy();
    track.append(...more);
    clones.push(...more);
  }
  row.classList.add('swipe--flow');

  let visible = false;
  let focused = false;
  let resumeAt = 0;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
    }, { threshold: 0.2 }).observe(row);
  } else {
    visible = true;
  }
  row.addEventListener('focusin', () => {
    focused = true;
  });
  row.addEventListener('focusout', () => {
    focused = false;
  });
  // A hand on the row (finger, mouse button, wheel, the buttons) holds the flow
  // at once: the first frames of a smooth scroll move less than a pixel, too
  // little for the "someone else moved it" check below, and writing the
  // position would cancel it.
  let pressed = false;
  const holdFor = (ms: number) => {
    resumeAt = performance.now() + ms;
  };
  track.addEventListener('pointerdown', () => {
    pressed = true;
  });
  const release = () => {
    if (!pressed) return;
    pressed = false;
    holdFor(FLOW_RESUME_MS);
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  track.addEventListener('wheel', () => holdFor(FLOW_RESUME_MS), { passive: true });
  row
    .querySelectorAll('[data-swipe-prev], [data-swipe-next]')
    .forEach((b) => b.addEventListener('click', () => holdFor(FLOW_RESUME_MS + 600)));

  let loop = loopWidth();
  if ('ResizeObserver' in window) new ResizeObserver(() => (loop = loopWidth())).observe(track);

  let pos = track.scrollLeft;
  let expected = pos;
  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(now - last, 100);
    last = now;
    const cur = track.scrollLeft;
    if (Math.abs(cur - expected) > 1.5) {
      // Someone else moved the row: take over from where they left it.
      resumeAt = now + FLOW_RESUME_MS;
      pos = cur;
      expected = cur;
    }
    const held = !visible || focused || pressed || document.hidden || !!document.querySelector('dialog[open]') || now < resumeAt;
    if (!held && loop > 0) {
      pos = wrapScroll(pos + (dir * FLOW_PX_PER_SECOND * dt) / 1000, loop);
      track.scrollLeft = pos;
      expected = track.scrollLeft;
    } else {
      pos = cur;
      expected = cur;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return clones;
}

function init(row: HTMLElement) {
  const track = row.querySelector<HTMLElement>('.swipe__track');
  const dotsBox = row.querySelector<HTMLElement>('.swipe__dots');
  if (!track || !dotsBox) return;

  initArrows(row, track);

  const items = Array.from(track.querySelectorAll<HTMLElement>('[data-swipe-item]'));
  dotsBox.replaceChildren();
  if (items.length < 2) return;
  const clones = row.hasAttribute('data-swipe-auto') ? startFlow(row, track, items) : [];

  const dots = items.map(() => {
    const dot = document.createElement('span');
    dotsBox.append(dot);
    return dot;
  });
  dots[0].classList.add('on');

  if (!('IntersectionObserver' in window)) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const at = [...items, ...clones].indexOf(entry.target as HTMLElement);
        if (at < 0) continue;
        const i = at % items.length;
        dots.forEach((d, j) => d.classList.toggle('on', j === i));
      }
    },
    { root: track, threshold: 0.6 },
  );
  items.forEach((item) => io.observe(item));
  clones.forEach((clone) => io.observe(clone));
}

// Set a row up only when it nears the viewport. Measuring every row on load
// forced layout of the off-screen (content-visibility: auto) sections inside the
// first long task; the controls of a row nobody can see yet are not needed.
initWhenNear(
  document.querySelectorAll<HTMLElement>('[data-swipe]'),
  init,
  'IntersectionObserver' in window
    ? (callback, options) => new IntersectionObserver(callback, options)
    : null,
);
