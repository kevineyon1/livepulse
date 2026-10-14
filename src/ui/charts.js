// Grafik SVG ringan (tanpa library) mengikuti aturan dataviz:
// garis 2px, marker ≥8px dengan cincin warna permukaan, grid hairline solid,
// teks memakai token teks (bukan warna data), tooltip hover selalu ada.

import { fmt } from '../core/format.js';
import { esc } from './dom.js';

export const STATUS_COLOR = { good: '#4fd18b', ok: '#8fb8ff', warning: '#f4b740', critical: '#ff5a74', info: '#9aa4b2', none: '#9aa4b2' };

export function ring(score, status, size = 64) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const v = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  const color = STATUS_COLOR[status] || STATUS_COLOR.info;
  return `<div class="ring" style="width:${size}px;height:${size}px" role="img" aria-label="Skor ${Number.isFinite(score) ? Math.round(score) : 'tidak ada'} dari 100">
    <svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="6"/>
    <circle class="ring-arc" cx="32" cy="32" r="${r}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${(c * v) / 100} ${c}"/></svg>
    <div class="val">${Number.isFinite(score) ? Math.round(score) : '–'}</div></div>`;
}

/** Gauge besar untuk skor kesehatan (busur 270°). */
export function gauge(score, status) {
  const cx = 100;
  const cy = 100;
  const r = 84;
  const start = 135;
  const sweep = 270;
  const polar = (deg, rr = r) => [cx + rr * Math.cos((deg * Math.PI) / 180), cy + rr * Math.sin((deg * Math.PI) / 180)];
  const arc = (a0, a1, rr = r) => {
    const [x0, y0] = polar(a0, rr);
    const [x1, y1] = polar(a1, rr);
    return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${rr} ${rr} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };
  const v = Number.isFinite(score) ? Math.max(0.5, Math.min(100, score)) : 0.5;
  const ticks = [];
  for (let i = 0; i <= 20; i++) {
    const a = start + (sweep * i) / 20;
    const [x0, y0] = polar(a, 97);
    const [x1, y1] = polar(a, i % 5 === 0 ? 90 : 93);
    ticks.push(`<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="rgba(255,255,255,${i % 5 === 0 ? 0.55 : 0.25})" stroke-width="1.5"/>`);
  }
  return `<svg viewBox="0 0 200 200" role="img" aria-label="Skor kesehatan ${Number.isFinite(score) ? Math.round(score) : '-'} dari 100">
    <defs><linearGradient id="gg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="${STATUS_COLOR[status] || '#fff'}"/></linearGradient></defs>
    ${ticks.join('')}
    <path d="${arc(start, start + sweep)}" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="12" stroke-linecap="round"/>
    <path class="gauge-arc" d="${arc(start, start + (sweep * v) / 100)}" fill="none" stroke="url(#gg)" stroke-width="12" stroke-linecap="round"/>
  </svg>`;
}

/** Meter zona patokan + posisi nilai + posisi median toko. */
export function meter(k) {
  if (!Number.isFinite(k.value)) return '<div class="meter" aria-hidden="true"></div>';
  const max = k.higher ? k.good * 1.6 : k.critical * 1.5;
  const pct = (x) => Math.max(0, Math.min(100, (x / max) * 100));
  const zones = k.higher
    ? [['critical', 0, k.critical], ['warning', k.critical, k.warning], ['ok', k.warning, k.good], ['good', k.good, max]]
    : [['good', 0, k.good], ['ok', k.good, k.warning], ['warning', k.warning, k.critical], ['critical', k.critical, max]];
  const z = zones.map(([s, a, b]) => `<i class="zone z-${s}" style="left:${pct(a)}%;width:${pct(b) - pct(a)}%"></i>`).join('');
  const med = Number.isFinite(k.median) ? `<i class="med" style="left:${pct(k.median)}%" title="Median live kamu: ${esc(fmt(k.median, k.unit))}"></i>` : '';
  return `<div class="meter" role="img" aria-label="${esc(k.label)} ${esc(fmt(k.value, k.unit))}, patokan bagus ${esc(fmt(k.good, k.unit))}">${z}${med}<i class="mark" style="left:${pct(k.value)}%"></i></div>
    <div class="scale"><span>0</span><span>${k.higher ? 'bagus ≥ ' : 'bagus ≤ '}${esc(fmt(k.good, k.unit))}</span></div>`;
}

export function sparkline(values, { w = 120, h = 32, color = '#45abaa' } = {}) {
  const v = values.filter(Number.isFinite);
  if (v.length < 2) return '';
  const min = Math.min(...v);
  const max = Math.max(...v);
  const xs = (i) => (i / (v.length - 1)) * (w - 6) + 3;
  const ys = (y) => h - 4 - ((y - min) / (max - min || 1)) * (h - 8);
  const d = v.map((y, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)} ${ys(y).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" opacity=".9"/><circle cx="${xs(v.length - 1)}" cy="${ys(v[v.length - 1])}" r="3" fill="${color}"/></svg>`;
}

function niceTicks(min, max, count = 4) {
  if (min === max) {
    min = min > 0 ? 0 : min - 1;
    max = max + 1;
  }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || mag * 10;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(+t.toFixed(10));
  return ticks;
}

/**
 * Grafik garis satu seri + garis median, dengan crosshair & tooltip.
 * @param {HTMLElement} el
 * @param {Array<{label: string, sub?: string, y: number|null, href?: string}>} points  urut waktu
 * @param {{unit: string, title: string, median?: number|null, onClick?: (p) => void}} opt
 */
export function lineChart(el, points, opt) {
  const W = 900;
  const H = 300;
  const m = { l: 64, r: 20, t: 18, b: 40 };
  const pts = points.filter((p) => Number.isFinite(p.y));
  if (pts.length < 2) {
    el.innerHTML = `<div class="empty" style="padding:40px 0"><p>Butuh minimal 2 live dengan metrik <b>${esc(opt.title)}</b> untuk menggambar tren.</p></div>`;
    return;
  }
  const ys = pts.map((p) => p.y);
  if (Number.isFinite(opt.median)) ys.push(opt.median);
  const ticks = niceTicks(Math.min(0, ...ys), Math.max(...ys));
  const y0 = ticks[0];
  const y1 = ticks[ticks.length - 1];
  const X = (i) => m.l + (pts.length === 1 ? 0.5 : i / (pts.length - 1)) * (W - m.l - m.r);
  const Y = (v) => m.t + (1 - (v - y0) / (y1 - y0 || 1)) * (H - m.t - m.b);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ');
  const area = `${line} L${X(pts.length - 1).toFixed(1)} ${Y(y0).toFixed(1)} L${X(0).toFixed(1)} ${Y(y0).toFixed(1)} Z`;
  const every = Math.ceil(pts.length / 8);
  const grid = ticks.map((t) => `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(t)}" y2="${Y(t)}" stroke="rgba(255,255,255,.07)"/><text x="${m.l - 10}" y="${Y(t) + 4}" text-anchor="end" fill="#8b8d8d" font-size="12" font-family="JetBrains Mono, monospace">${esc(fmt(t, opt.unit))}</text>`).join('');
  const xl = pts.map((p, i) => (i % every === 0 || i === pts.length - 1 ? `<text x="${X(i)}" y="${H - 14}" text-anchor="middle" fill="#8b8d8d" font-size="12">${esc(p.label)}</text>` : '')).join('');
  const med = Number.isFinite(opt.median)
    ? `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(opt.median)}" y2="${Y(opt.median)}" stroke="#c8c8c8" stroke-opacity=".45" stroke-width="1"/><text x="${W - m.r}" y="${Y(opt.median) - 6}" text-anchor="end" fill="#c8c8c8" font-size="11.5" font-weight="700">median ${esc(fmt(opt.median, opt.unit))}</text>`
    : '';
  const dots = pts.map((p, i) => `<circle class="pt" data-i="${i}" cx="${X(i)}" cy="${Y(p.y)}" r="4.5" fill="#45abaa" stroke="#1f2021" stroke-width="2"/>`).join('');
  const last = pts[pts.length - 1];
  el.innerHTML = `<div class="chart-box">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Tren ${esc(opt.title)} untuk ${pts.length} live">
      ${grid}${xl}
      <path class="area" d="${area}" fill="#45abaa" fill-opacity=".1"/>
      <path class="line" d="${line}" fill="none" stroke="#45abaa" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${med}
      <line class="xhair" y1="${m.t}" y2="${H - m.b}" stroke="rgba(255,255,255,.25)" stroke-width="1" opacity="0"/>
      ${dots}
      <text x="${X(pts.length - 1) + 8}" y="${Y(last.y) - 10}" text-anchor="end" fill="#fdfdfd" font-size="13" font-weight="800">${esc(fmt(last.y, opt.unit))}</text>
      <rect class="hit" x="${m.l}" y="0" width="${W - m.l - m.r}" height="${H}" fill="transparent"/>
    </svg>
    <div class="chart-tip"></div></div>`;
  const svg = el.querySelector('svg');
  const tip = el.querySelector('.chart-tip');
  const xh = el.querySelector('.xhair');
  const hit = el.querySelector('.hit');
  const circles = [...el.querySelectorAll('.pt')];
  const nearest = (evt) => {
    const r = svg.getBoundingClientRect();
    const x = ((evt.clientX - r.left) / r.width) * W;
    let best = 0;
    pts.forEach((_, i) => {
      if (Math.abs(X(i) - x) < Math.abs(X(best) - x)) best = i;
    });
    return best;
  };
  hit.addEventListener('pointermove', (evt) => {
    const i = nearest(evt);
    const p = pts[i];
    const r = svg.getBoundingClientRect();
    xh.setAttribute('x1', X(i));
    xh.setAttribute('x2', X(i));
    xh.setAttribute('opacity', '1');
    circles.forEach((c, j) => c.setAttribute('r', j === i ? '6.5' : '4.5'));
    const vsMed = Number.isFinite(opt.median) && opt.median ? ` · ${p.y >= opt.median ? '+' : ''}${Math.round(((p.y - opt.median) / Math.abs(opt.median)) * 100)}% vs median` : '';
    tip.innerHTML = `<div class="muted">${esc(p.sub || p.label)}</div><b>${esc(fmt(p.y, opt.unit))}</b><div class="muted">${esc(p.title || '')}${esc(vsMed)}</div>`;
    const px = (X(i) / W) * r.width;
    const py = (Y(p.y) / H) * r.height;
    tip.style.left = `${Math.min(r.width - 180, Math.max(0, px + 14))}px`;
    tip.style.top = `${Math.max(0, py - 70)}px`;
    tip.classList.add('on');
  });
  hit.addEventListener('pointerleave', () => {
    tip.classList.remove('on');
    xh.setAttribute('opacity', '0');
    circles.forEach((c) => c.setAttribute('r', '4.5'));
  });
  if (opt.onClick) {
    hit.style.cursor = 'pointer';
    hit.addEventListener('click', (evt) => opt.onClick(pts[nearest(evt)]));
  }
  return { svg, line: el.querySelector('.line'), area: el.querySelector('.area'), dots: circles };
}
