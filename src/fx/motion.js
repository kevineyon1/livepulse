// Koreografi GSAP. Semua animasi lewat gsap.matchMedia supaya pengguna yang memilih
// "reduce motion" mendapat tampilan statis tanpa kehilangan informasi.
import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { splitDisplay } from '../core/format.js';

gsap.registerPlugin(DrawSVGPlugin, ScrambleTextPlugin, SplitText, ScrollTrigger);
gsap.defaults({ ease: 'power3.out', duration: 0.6 });

export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let pageCtx = null;

/** Jalankan animasi halaman dalam satu context agar mudah dibersihkan saat pindah halaman. */
export function pageMotion(root, fn) {
  pageCtx?.revert();
  ScrollTrigger.getAll().forEach((t) => t.kill());
  pageCtx = gsap.context(() => {
    if (!reduced()) fn();
  }, root);
  return pageCtx;
}

export function cleanupPage() {
  pageCtx?.revert();
  pageCtx = null;
}

/** Masuk halaman: judul per kata, lalu kartu berurutan. */
export function enterPage(root) {
  const title = root.querySelector('.page-title, .hero h1');
  const tl = gsap.timeline();
  if (title) {
    const split = SplitText.create(title, { type: 'words', mask: 'words' });
    tl.from(split.words, { yPercent: 110, duration: 0.7, stagger: 0.045, ease: 'power4.out' });
  }
  const items = root.querySelectorAll('[data-reveal]');
  if (items.length) {
    tl.from(items, { y: 26, autoAlpha: 0, duration: 0.65, stagger: 0.06 }, title ? '-=0.45' : 0);
  }
  return tl;
}

/** Elemen yang baru terlihat saat di-scroll. */
export function revealOnScroll(root) {
  root.querySelectorAll('[data-scroll]').forEach((el) => {
    gsap.from(el.children.length && el.dataset.scroll === 'stagger' ? el.children : el, {
      y: 30, autoAlpha: 0, duration: 0.6, stagger: 0.06,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
}

/** Hitung naik angka bergaya dashboard (.num[data-v]). */
export function countUp(root, { duration = 1.3, delay = 0 } = {}) {
  root.querySelectorAll('.num[data-v]').forEach((el) => {
    const v = parseFloat(el.dataset.v);
    if (!Number.isFinite(v)) return;
    const unit = el.dataset.unit;
    const main = el.querySelector('.num-i');
    const rest = el.querySelector('.num-d');
    const obj = { x: 0 };
    gsap.to(obj, {
      x: v, duration, delay, ease: 'power2.out',
      onUpdate() {
        const d = splitDisplay(obj.x, unit);
        main.textContent = d.main;
        rest.textContent = d.rest;
      },
      onComplete() {
        const d = splitDisplay(v, unit);
        main.textContent = d.main;
        rest.textContent = d.rest;
      },
    });
  });
}

/** Garis/busur SVG tergambar. */
export function draw(targets, opt = {}) {
  return gsap.from(targets, { drawSVG: '0%', duration: 1.4, ease: 'power2.inOut', ...opt });
}

/** Efek "membaca angka" ala mesin saat OCR menemukan nilai. */
export function scramble(el, text) {
  if (reduced()) {
    el.textContent = text;
    return;
  }
  gsap.to(el, { duration: 0.7, scrambleText: { text, chars: '0123456789.%KM', speed: 0.6 } });
}

export { gsap };
