import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './reduced-motion';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

if (!prefersReducedMotion()) {
  const instance = new Lenis({ duration: 1.1, smoothWheel: true });
  lenis = instance;

  instance.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    instance.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);
}

/** Pause or resume smooth scrolling (used while a modal viewer is open). No-op under reduced motion. */
export function setSmoothScrollPaused(paused: boolean): void {
  if (!lenis) return;
  if (paused) lenis.stop();
  else lenis.start();
}
