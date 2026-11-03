// Run `init` for each target once, when it first nears the viewport. Without
// IntersectionObserver every target is initialised straight away.

export interface ObserverLike {
  observe(target: Element): void;
  unobserve(target: Element): void;
}
export type ObserverFactory = (
  callback: (entries: { isIntersecting: boolean; target: Element }[]) => void,
  options: { rootMargin: string },
) => ObserverLike;

export function initWhenNear<T extends Element>(
  targets: Iterable<T>,
  init: (target: T) => void,
  makeObserver: ObserverFactory | null,
  rootMargin = '300px 0px',
): void {
  if (!makeObserver) {
    for (const t of targets) init(t);
    return;
  }
  const waiting: ObserverLike = makeObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        waiting.unobserve(entry.target);
        init(entry.target as T);
      }
    },
    { rootMargin },
  );
  for (const t of targets) waiting.observe(t);
}
