// Pure helpers behind the previous / next buttons of a swipe row, kept apart
// from the DOM so the direction and edge maths can be unit tested.

/** Which way a button moves the row: `next` goes toward the inline end. */
export function scrollDelta(which: 'prev' | 'next', direction: string, step: number): number {
  const inlineEnd = direction === 'rtl' ? -1 : 1;
  return (which === 'next' ? inlineEnd : -inlineEnd) * step;
}

/**
 * Where one press should end: the step is added to `base` (the pending target
 * of a smooth scroll still under way, else the current position) and clamped to
 * the row's travel, which runs 0..max in LTR and 0..-max in RTL.
 */
export function scrollTarget(
  base: number,
  delta: number,
  scrollWidth: number,
  clientWidth: number,
  direction: string,
): number {
  const max = Math.max(0, scrollWidth - clientWidth);
  const [lo, hi] = direction === 'rtl' ? [-max, 0] : [0, max];
  return Math.min(hi, Math.max(lo, base + delta));
}

/**
 * Which directions the row can still travel. RTL rows report a zero or negative
 * scrollLeft, so only its magnitude counts. Two pixels of slack absorb
 * sub-pixel rounding at the ends.
 */
export function edgeState(scrollLeft: number, scrollWidth: number, clientWidth: number) {
  const max = Math.max(0, scrollWidth - clientWidth);
  const pos = Math.abs(scrollLeft);
  return { canPrev: pos > 2 && max > 2, canNext: max > 2 && pos < max - 2 };
}

/**
 * How far one press moves: a whole number of items, as many as fit in the
 * visible content width (one on a phone, several on desktop), never zero.
 * `pitch` is the distance between two neighbouring item starts.
 */
export function pageStep({ pitch, content, gap }: { pitch: number; content: number; gap: number }): number {
  const count = Math.max(1, Math.floor((content + gap + 1) / pitch));
  return count * pitch;
}
