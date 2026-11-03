// Fills each [data-swipe] row's dots (one per [data-swipe-item]) and keeps the
// visible item's dot marked `on`. The IntersectionObserver uses the track as
// its root, so it follows the scrollable axis in LTR and RTL alike.
function init(row: HTMLElement) {
  const track = row.querySelector<HTMLElement>('.swipe__track');
  const dotsBox = row.querySelector<HTMLElement>('.swipe__dots');
  if (!track || !dotsBox) return;

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

document.querySelectorAll<HTMLElement>('[data-swipe]').forEach(init);
