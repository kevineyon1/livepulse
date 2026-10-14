import './styles/tokens.css';
import './styles/app.css';
import { initScene } from './fx/scene.js';
import { cleanupPage, gsap, reduced } from './fx/motion.js';
import { icon } from './ui/icons.js';
import { getSettings } from './data/settings.js';
import { addPendingImages, imagesFromEvent } from './state.js';
import { toast } from './ui/toast.js';
import { warmUpOcr } from './extract/ocr.js';

const PAGES = {
  home: () => import('./pages/home.js'),
  analyze: () => import('./pages/analyze.js'),
  live: () => import('./pages/live.js'),
  history: () => import('./pages/history.js'),
  guide: () => import('./pages/guide.js'),
  settings: () => import('./pages/settings.js'),
};

const NAV = [
  { key: 'home', href: '#/', label: 'Beranda', icon: 'home' },
  { key: 'analyze', href: '#/analyze', label: 'Analisa Baru', icon: 'scan', cta: true },
  { key: 'history', href: '#/history', label: 'Riwayat & Tren', icon: 'history' },
  { key: 'guide', href: '#/guide', label: 'Panduan 16 Metrik', icon: 'book' },
  { key: 'settings', href: '#/settings', label: 'Pengaturan', icon: 'settings' },
];

const brand = `
  <a class="brand" href="#/" aria-label="LivePulse beranda" style="text-decoration:none;color:inherit">
    <span class="brand-mark">${icon('pulse')}</span>
    <span><div class="brand-name">LivePulse</div><div class="brand-sub">TikTok LIVE Insight</div></span>
  </a>`;

function shell() {
  const s = getSettings();
  document.getElementById('app').innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        ${brand}
        <nav class="nav" aria-label="Navigasi utama">
          ${NAV.map((n) => `<a href="${n.href}" data-nav="${n.key}" class="${n.cta ? 'cta' : ''}">${icon(n.icon)}<span>${n.label}</span></a>`).join('')}
        </nav>
        <div class="sidebar-foot">
          <span class="engine-pill" id="engine-pill"><i></i>${s.engine === 'ai' && s.apiKey ? 'Mode AI (Claude)' : 'Mode OCR gratis'}</span>
          <span>Tekan <b>Ctrl+V</b> di halaman mana pun untuk menempel screenshot.</span>
          <span>Data tersimpan di browser ini.</span>
        </div>
      </aside>
      <header class="topbar">${brand}<a class="btn btn-sm btn-primary" href="#/analyze">${icon('scan')}Analisa</a></header>
      <main class="main" id="main" tabindex="-1"></main>
      <nav class="tabbar" aria-label="Navigasi">
        ${NAV.map((n) => `<a href="${n.href}" data-nav="${n.key}" class="${n.cta ? 'cta' : ''}">${icon(n.icon)}<span>${n.label.split(' ')[0]}</span></a>`).join('')}
      </nav>
    </div>`;
}

function parseRoute() {
  const [path, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const [name, ...rest] = path.split('/');
  const q = Object.fromEntries(new URLSearchParams(query));
  if (!name) return { name: 'home', params: { q } };
  if (name === 'live' && rest[0]) return { name: 'live', params: { id: decodeURIComponent(rest[0]), q } };
  return { name: PAGES[name] ? name : 'home', params: { q } };
}

let renderToken = 0;
async function route() {
  const token = ++renderToken;
  const { name, params } = parseRoute();
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === name || (name === 'live' && a.dataset.nav === 'history')));
  const main = document.getElementById('main');
  cleanupPage();
  const mod = await PAGES[name]();
  if (token !== renderToken) return;
  if (!reduced()) gsap.fromTo(main, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: 'power1.out' });
  main.innerHTML = '';
  window.scrollTo(0, 0);
  try {
    await mod.render(main, params);
  } catch (e) {
    console.error(e);
    main.innerHTML = `<div class="page"><div class="card empty">${icon('alert')}<h3>Terjadi kesalahan</h3><p>${String(e.message || e)}</p><a class="btn" href="#/">Kembali ke beranda</a></div></div>`;
  }
}

// Tempel (Ctrl+V) atau seret screenshot di mana saja → langsung ke Analisa.
function globalImageInput() {
  window.addEventListener('paste', (e) => {
    if (e.target.closest?.('input, textarea')) return;
    const imgs = imagesFromEvent(e);
    if (!imgs.length) return;
    e.preventDefault();
    addPendingImages(imgs);
    toast(`${imgs.length} screenshot ditempel`);
    if (parseRoute().name !== 'analyze') location.hash = '#/analyze';
  });
  window.addEventListener('dragover', (e) => {
    if ([...(e.dataTransfer?.types || [])].includes('Files')) e.preventDefault();
  });
  window.addEventListener('drop', (e) => {
    if (e.defaultPrevented) return;
    const imgs = imagesFromEvent(e);
    if (!imgs.length) return;
    e.preventDefault();
    addPendingImages(imgs);
    if (parseRoute().name !== 'analyze') location.hash = '#/analyze';
  });
}

function updateEnginePill() {
  const s = getSettings();
  const el = document.getElementById('engine-pill');
  if (el) el.innerHTML = `<i></i>${s.engine === 'ai' && s.apiKey ? 'Mode AI (Claude)' : 'Mode OCR gratis'}`;
}

shell();
initScene(document.getElementById('fx'));
globalImageInput();
window.addEventListener('hashchange', route);
window.addEventListener('settings-changed', updateEnginePill);
route();

// Unduh mesin OCR saat browser santai, supaya analisa pertama cepat.
const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
idle(() => {
  if (getSettings().engine !== 'ai') warmUpOcr();
});
