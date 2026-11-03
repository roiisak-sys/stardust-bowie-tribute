import { setSmoothScrollPaused } from './smooth-scroll';
import { prefersReducedMotion } from './reduced-motion';

const dialog = document.getElementById('lightbox') as HTMLDialogElement | null;

if (dialog) {
  const track = dialog.querySelector<HTMLElement>('.lightbox__track')!;
  const captionEl = dialog.querySelector<HTMLElement>('.lightbox__caption')!;
  const countEl = dialog.querySelector<HTMLElement>('.lightbox__count')!;
  const closeBtn = dialog.querySelector<HTMLButtonElement>('.lightbox__close')!;
  const prevBtn = dialog.querySelector<HTMLButtonElement>('.lightbox__prev')!;
  const nextBtn = dialog.querySelector<HTMLButtonElement>('.lightbox__next')!;

  let triggers: HTMLElement[] = [];
  let slides: HTMLElement[] = [];
  let opener: HTMLElement | null = null;
  let current = -1;
  let observer: IntersectionObserver | null = null;

  const isRtl = () => getComputedStyle(dialog).direction === 'rtl';

  /** Load the slide's full-size image (once). */
  function load(i: number) {
    const img = slides[i]?.querySelector<HTMLImageElement>('img');
    if (img && !img.getAttribute('src')) img.src = img.dataset.full!;
  }

  /** Mark slide i as current: caption, counter, button state, and load it plus its neighbours. */
  function setCurrent(i: number) {
    if (i === current || i < 0 || i >= slides.length) return;
    current = i;
    for (const j of [i - 1, i, i + 1]) load(j);
    captionEl.textContent = triggers[i].dataset.caption ?? '';
    countEl.textContent = slides.length > 1 ? `${i + 1} / ${slides.length}` : '';
    prevBtn.setAttribute('aria-disabled', String(i === 0));
    nextBtn.setAttribute('aria-disabled', String(i === slides.length - 1));
  }

  function goTo(i: number, smooth: boolean) {
    const slide = slides[i];
    if (!slide) return;
    slide.scrollIntoView({
      behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto',
      inline: 'start',
      block: 'nearest',
    });
  }

  function open(trigger: HTMLElement) {
    const set = trigger.dataset.lightbox;
    if (!set) return;
    opener = trigger;
    triggers = Array.from(document.querySelectorAll<HTMLElement>('[data-lightbox][data-full]')).filter(
      (el) => el.dataset.lightbox === set,
    );
    const start = Math.max(0, triggers.indexOf(trigger));

    slides = triggers.map((t) => {
      const slide = document.createElement('div');
      slide.className = 'lightbox__slide';
      const img = document.createElement('img');
      img.alt = t.dataset.caption ?? '';
      img.decoding = 'async';
      img.dataset.full = t.dataset.full ?? '';
      slide.append(img);
      return slide;
    });
    track.replaceChildren(...slides);

    const single = slides.length < 2;
    prevBtn.hidden = single;
    nextBtn.hidden = single;

    current = -1;
    document.documentElement.classList.add('lb-open');
    setSmoothScrollPaused(true);
    dialog!.showModal();

    setCurrent(start);
    goTo(start, false);

    observer?.disconnect();
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) setCurrent(slides.indexOf(entry.target as HTMLElement));
          }
        },
        { root: track, threshold: 0.6 },
      );
      slides.forEach((s) => observer!.observe(s));
    }
  }

  function step(delta: number) {
    const i = current + delta;
    if (i < 0 || i >= slides.length) return;
    goTo(i, true);
  }

  // Open: one delegated listener for every trigger on the page.
  document.addEventListener('click', (e) => {
    const trigger = (e.target as Element).closest<HTMLElement>('[data-lightbox][data-full]');
    if (!trigger || dialog.open) return;
    e.preventDefault();
    open(trigger);
  });

  closeBtn.addEventListener('click', () => dialog.close());
  prevBtn.addEventListener('click', () => step(-1));
  nextBtn.addEventListener('click', () => step(1));

  // Backdrop click: anywhere that is not the image or a control.
  dialog.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t === dialog || t === track || t.classList.contains('lightbox__slide')) dialog.close();
  });

  // Arrow keys follow the reading direction: "next" is to the left in RTL.
  dialog.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const forward = (e.key === 'ArrowRight') !== isRtl();
    step(forward ? 1 : -1);
  });

  // Fires for Escape, the close button and the backdrop alike.
  dialog.addEventListener('close', () => {
    observer?.disconnect();
    observer = null;
    track.replaceChildren();
    slides = [];
    current = -1;
    document.documentElement.classList.remove('lb-open');
    setSmoothScrollPaused(false);
    // Safari does not focus buttons on click, so the browser's own restore is not enough.
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    opener = null;
  });
}
