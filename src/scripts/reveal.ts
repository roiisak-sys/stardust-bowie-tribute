// Adds `.in` to [data-reveal] / [data-colorize] elements as they enter the
// viewport. The visual effect lives in styles/motion.css and only applies
// when the user has not asked for reduced motion.
const targets = document.querySelectorAll<HTMLElement>('[data-reveal], [data-colorize]');

if (targets.length) {
  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -6% 0px' },
    );
    targets.forEach((el) => io.observe(el));
  }
}
