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

/** Timer functions the controller uses; tests pass fakes, the page uses the globals. */
export interface PendingTimers {
  set: (fn: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
}

const globalTimers: PendingTimers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * The state behind rapid presses of a swipe row's buttons: where the smooth
 * scroll under way is heading (`pending`). A press steps from there rather than
 * from wherever the animation happens to be, so presses always land on a whole
 * item. The target is forgotten once the row gets there (within 2px), when the
 * user takes over (`clear`, from pointerdown / wheel / scrollend), or after
 * `quietMs` without a scroll event. The last one matters because Lenis swallows
 * native `scrollend` events.
 */
export function createPendingScroll(timers: PendingTimers = globalTimers, quietMs = 200) {
  let pending: number | null = null;
  let handle: unknown = null;

  const disarm = () => {
    if (handle !== null) timers.clear(handle);
    handle = null;
  };
  const clear = () => {
    pending = null;
    disarm();
  };
  const arm = () => {
    disarm();
    handle = timers.set(clear, quietMs);
  };

  return {
    /** The target of the scroll under way, or null when the row is at rest. */
    get target() {
      return pending;
    },
    /** A button press: returns where to scroll to and remembers it while it is still ahead. */
    press(current: number, delta: number, scrollWidth: number, clientWidth: number, direction: string): number {
      const target = scrollTarget(pending ?? current, delta, scrollWidth, clientWidth, direction);
      if (Math.abs(target - current) > 2) {
        pending = target;
        arm();
      } else {
        clear();
      }
      return target;
    },
    /** A scroll event at position `current`. */
    scrolled(current: number) {
      if (pending !== null && Math.abs(current - pending) <= 2) clear();
      if (pending !== null) arm();
    },
    clear,
  };
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

/** What the auto-advance of a row does on a tick, or null when it should hold still. */
export function autoAction(state: {
  visible: boolean;
  hovering: boolean;
  focused: boolean;
  docHidden: boolean;
  dialogOpen: boolean;
  now: number;
  resumeAt: number;
  canNext: boolean;
}): 'next' | 'restart' | null {
  const { visible, hovering, focused, docHidden, dialogOpen, now, resumeAt, canNext } = state;
  if (!visible || hovering || focused || docHidden || dialogOpen || now < resumeAt) return null;
  return canNext ? 'next' : 'restart';
}
