// Fills each [data-swipe] row's dots (one per [data-swipe-item]) and keeps the
// visible item's dot marked `on`. The IntersectionObserver uses the track as
// its root, so it follows the scrollable axis in LTR and RTL alike.
//
// The previous / next buttons (shown by CSS only for mouse users) scroll the
// track by whole items and disable themselves at either end.
import { autoAction, createPendingScroll, edgeState, pageStep, scrollDelta } from '../lib/swipe-nav';
import { initWhenNear } from '../lib/lazy-init';
import { prefersReducedMotion } from './reduced-motion';

type Go = (which: 'prev' | 'next', unit?: 'page' | 'item') => void;

function initArrows(row: HTMLElement, track: HTMLElement): Go | null {
  const prev = row.querySelector<HTMLButtonElement>('[data-swipe-prev]');
  const next = row.querySelector<HTMLButtonElement>('[data-swipe-next]');
  if (!prev || !next) return null;

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

  const go: Go = (which, unit = 'page') => {
    const items = track.querySelectorAll<HTMLElement>('[data-swipe-item]');
    if (!items.length) return;
    const first = items[0].getBoundingClientRect();
    const pitch = items.length > 1 ? Math.abs(items[1].getBoundingClientRect().left - first.left) : first.width;
    const cs = getComputedStyle(track);
    const content = track.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const step = unit === 'item' ? pitch : pageStep({ pitch, content, gap: Math.max(0, pitch - first.width) });
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
  return go;
}

const AUTO_EVERY_MS = 3500;
const AUTO_RESUME_MS = 8000;

// Rows marked data-swipe-auto move on their own, one step at a time, and start
// over from the first item at the end. Any sign of the visitor (hover, focus,
// touch, wheel, keys, the buttons) holds it still, and so do a hidden tab, an
// open viewer and a row scrolled out of sight. Visitors who asked for reduced
// motion get no auto-advance.
function initAuto(row: HTMLElement, track: HTMLElement, go: Go) {
  if (prefersReducedMotion()) return;
  let visible = false;
  let hovering = false;
  let focused = false;
  let resumeAt = 0;
  const hold = () => {
    resumeAt = Date.now() + AUTO_RESUME_MS;
  };

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
    }, { threshold: 0.4 }).observe(row);
  } else {
    visible = true;
  }

  row.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'mouse') hovering = true;
  });
  row.addEventListener('pointerleave', () => {
    hovering = false;
  });
  row.addEventListener('focusin', () => {
    focused = true;
  });
  row.addEventListener('focusout', () => {
    focused = false;
  });
  for (const type of ['pointerdown', 'touchstart', 'wheel', 'keydown'] as const) {
    track.addEventListener(type, hold, { passive: true });
  }
  row.querySelectorAll('[data-swipe-prev], [data-swipe-next]').forEach((b) => b.addEventListener('click', hold));

  setInterval(() => {
    const { canNext } = edgeState(track.scrollLeft, track.scrollWidth, track.clientWidth);
    const action = autoAction({
      visible,
      hovering,
      focused,
      docHidden: document.hidden,
      dialogOpen: !!document.querySelector('dialog[open]'),
      now: Date.now(),
      resumeAt,
      canNext,
    });
    if (action === 'next') go('next', 'item');
    else if (action === 'restart') track.scrollTo({ left: 0, behavior: 'smooth' });
  }, AUTO_EVERY_MS);
}

function init(row: HTMLElement) {
  const track = row.querySelector<HTMLElement>('.swipe__track');
  const dotsBox = row.querySelector<HTMLElement>('.swipe__dots');
  if (!track || !dotsBox) return;

  const go = initArrows(row, track);
  if (go && row.hasAttribute('data-swipe-auto')) initAuto(row, track, go);

  const items = Array.from(track.querySelectorAll<HTMLElement>('[data-swipe-item]'));
  dotsBox.replaceChildren();
  if (items.length < 2) return;

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
        const i = items.indexOf(entry.target as HTMLElement);
        if (i < 0) continue;
        dots.forEach((d, j) => d.classList.toggle('on', j === i));
      }
    },
    { root: track, threshold: 0.6 },
  );
  items.forEach((item) => io.observe(item));
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
