import { gsap } from 'gsap';
import { icon } from './icons.js';
import { esc } from './dom.js';

let wrap = null;

export function toast(message, kind = 'ok', ms = 3200) {
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-live', 'polite');
    document.body.appendChild(wrap);
  }
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = `${icon(kind === 'err' ? 'alert' : 'check')}<span>${esc(message)}</span>`;
  wrap.appendChild(el);
  gsap.from(el, { y: 16, autoAlpha: 0, duration: 0.35, ease: 'power3.out' });
  setTimeout(() => gsap.to(el, { y: 8, autoAlpha: 0, duration: 0.25, onComplete: () => el.remove() }), ms);
}
