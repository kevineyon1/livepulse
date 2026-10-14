// Riwayat: tren metrik dari live ke live, filter host/tanggal, bandingkan 2 live, ekspor CSV.
import { listLivesWithData } from '../data/db.js';
import { analyzeLive } from '../data/analysis.js';
import { getSettings } from '../data/settings.js';
import { median } from '../core/insights.js';
import { METRICS, DERIVED, labelOf, unitOf } from '../core/metrics.js';
import { fmt, dateLabel } from '../core/format.js';
import { icon } from '../ui/icons.js';
import { esc, statusChip, download, $ } from '../ui/dom.js';
import { lineChart } from '../ui/charts.js';
import { pageMotion, enterPage, gsap, draw, revealOnScroll, reduced } from '../fx/motion.js';

const TRENDS = [
  { id: 'score', label: 'Skor', unit: 'count', higher: true },
  { id: 'gmv', label: 'GMV', unit: 'currency', higher: true },
  { id: 'gmvPerHour', label: 'GMV / jam', unit: 'currency', higher: true },
  { id: 'views', label: 'Views', unit: 'count', higher: true },
  { id: 'impressions', label: 'Impressions', unit: 'count', higher: true },
  { id: 'ttr', label: 'TTR', unit: 'percent', higher: true },
  { id: 'avgViewDuration', label: 'Durasi tonton', unit: 'duration', higher: true },
  { id: 'retention1m', label: 'Retensi >1m', unit: 'percent', higher: true },
  { id: 'liveCtr', label: 'LIVE CTR', unit: 'percent', higher: true },
  { id: 'ctor', label: 'CTOR', unit: 'percent', higher: true },
  { id: 'aov', label: 'AOV', unit: 'currency', higher: true },
  { id: 'roi', label: 'ROI', unit: 'ratio', higher: true },
];

const CMP_ROWS = [
  'gmv', 'gmvPerHour', 'impressions', 'views', 'ttr', 'ttrPreview', 'avgViewDuration', 'retention1m', 'productClicks', 'liveCtr', 'ctr',
  'orders', 'ctor', 'orderRate', 'paymentRate', 'aov', 'adsCost', 'roi', 'tacos', 'newFollowers', 'followRate', 'commentRate', 'shareRate',
];
const LOWER_IS_BETTER = new Set(['adsCost', 'tacos']);

export async function render(root) {
  const settings = getSettings();
  const lives = await listLivesWithData();
  const rows = lives.map((l) => ({ live: l, a: analyzeLive(l, lives, settings) }));
  const hosts = [...new Set(lives.map((l) => l.host).filter(Boolean))];
  const st = { host: '', range: 'all', q: '', metric: 'score', picked: [] };

  if (!lives.length) {
    root.innerHTML = `<div class="page"><div class="page-head" data-reveal><div><div class="overline">Riwayat & tren</div><h1 class="page-title">Belum ada live tersimpan</h1></div></div>
      <div class="card empty" data-reveal>${icon('history')}<h3>Riwayat akan muncul di sini</h3><p>Setiap screenshot yang kamu analisa tersimpan otomatis, sehingga kamu bisa melihat tren & membandingkan live.</p><a class="btn btn-primary" href="#/analyze">${icon('scan')}Analisa live pertama</a></div></div>`;
    pageMotion(root, () => enterPage(root));
    return;
  }

  root.innerHTML = `
  <div class="page">
    <div class="page-head" data-reveal>
      <div>
        <div class="overline">Riwayat & tren</div>
        <h1 class="page-title">Dari live ke live</h1>
        <p class="page-desc">${lives.length} live tersimpan. Klik titik di grafik untuk membuka live, atau centang 2 live untuk dibandingkan.</p>
      </div>
      <div class="btn-row">
        <button class="btn btn-sm" id="csv">${icon('download')}Ekspor CSV</button>
      </div>
    </div>

    <div class="filters" data-reveal>
      <select class="input" id="f-host" aria-label="Filter host"><option value="">Semua host</option>${hosts.map((h) => `<option>${esc(h)}</option>`).join('')}</select>
      <div class="seg" id="f-range" role="group" aria-label="Rentang waktu">
        ${[['7', '7 hari'], ['30', '30 hari'], ['90', '90 hari'], ['all', 'Semua']].map(([k, l]) => `<button data-range="${k}" class="${k === st.range ? 'on' : ''}">${l}</button>`).join('')}
      </div>
      <input class="input" id="f-q" placeholder="Cari judul / catatan…" aria-label="Cari" />
    </div>

    <section class="card" data-reveal>
      <div class="card-head">
        <div><div class="card-title" id="trend-title">Tren</div><div class="card-sub" id="trend-sub"></div></div>
      </div>
      <div class="metric-pick" id="pick">${TRENDS.map((t) => `<button data-m="${t.id}" class="${t.id === st.metric ? 'on' : ''}">${t.label}</button>`).join('')}</div>
      <div id="chart" style="margin-top:16px"></div>
    </section>

    <section class="card" data-reveal>
      <div class="table-wrap">
        <table class="t" id="tbl">
          <thead><tr><th><span class="sr-only">Bandingkan</span></th><th>Tanggal</th><th>Live</th><th>Host</th><th class="n">Skor</th><th class="n">GMV</th><th class="n">GMV/jam</th><th class="n">Views</th><th class="n">CTOR</th><th class="n">ROI</th><th>Masalah utama</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </section>

    <section id="cmp"></section>
    <div class="cmp-bar" id="cmp-bar" hidden><span id="cmp-text"></span><div class="btn-row"><button class="btn btn-sm btn-ghost" id="cmp-clear">Batal</button><button class="btn btn-sm btn-primary" id="cmp-go">${icon('compare')}Bandingkan</button></div></div>
  </div>`;

  const valueOf = (r, id) => (id === 'score' ? (Number.isFinite(r.a.health.score) ? Math.round(r.a.health.score) : null) : r.a.values[id]);
  const filtered = () => {
    const now = Date.now();
    return rows.filter((r) => {
      if (st.host && r.live.host !== st.host) return false;
      if (st.range !== 'all' && r.live.date && now - new Date(r.live.date + 'T00:00:00') > +st.range * 864e5) return false;
      if (st.q && !`${r.live.title} ${r.live.notes} ${r.live.host}`.toLowerCase().includes(st.q.toLowerCase())) return false;
      return true;
    });
  };

  function drawChart() {
    const t = TRENDS.find((x) => x.id === st.metric);
    const list = [...filtered()].reverse(); // lama → baru
    const pts = list.map((r) => ({ label: shortDate(r.live.date), sub: `${dateLabel(r.live.date)}${r.live.startTime ? ' · ' + r.live.startTime : ''}`, title: r.live.title || r.live.host || '', y: valueOf(r, st.metric), id: r.live.id }));
    const vals = pts.map((p) => p.y).filter(Number.isFinite);
    const med = vals.length >= 3 ? median(vals) : null;
    $('#trend-title', root).textContent = `Tren ${t.label}`;
    $('#trend-sub', root).textContent = vals.length ? `${vals.length} live · median ${fmt(med ?? median(vals), t.unit)} · terakhir ${fmt(vals[vals.length - 1], t.unit)}` : 'Belum ada data untuk metrik ini';
    const chart = lineChart($('#chart', root), pts, { unit: t.unit, title: t.label, median: med, onClick: (p) => (location.hash = `#/live/${encodeURIComponent(p.id)}`) });
    if (chart?.line && !reduced()) {
      draw(chart.line, { duration: 1.1 });
      gsap.from(chart.area, { autoAlpha: 0, duration: 0.8, delay: 0.4 });
      gsap.from(chart.dots, { scale: 0, transformOrigin: 'center', stagger: 0.03, duration: 0.3, delay: 0.3 });
    }
  }

  function drawTable() {
    const tb = $('#tbl tbody', root);
    tb.innerHTML = filtered().map((r) => {
      const { live, a } = r;
      const s = a.health.score;
      return `<tr>
        <td><input type="checkbox" class="cmp-check" data-pick="${esc(live.id)}" ${st.picked.includes(live.id) ? 'checked' : ''} aria-label="Pilih untuk dibandingkan" /></td>
        <td style="white-space:nowrap">${esc(shortDate(live.date))}${live.startTime ? ` <span class="muted">${esc(live.startTime)}</span>` : ''}</td>
        <td><a href="#/live/${encodeURIComponent(live.id)}">${esc(live.title || 'Tanpa judul')}</a></td>
        <td class="dim">${esc(live.host || '—')}</td>
        <td class="n"><span class="score-pill s-${a.health.status}">${Number.isFinite(s) ? Math.round(s) : '–'}</span></td>
        <td class="n">${esc(fmt(a.values.gmv, 'currency'))}</td>
        <td class="n">${esc(fmt(a.values.gmvPerHour, 'currency'))}</td>
        <td class="n">${esc(fmt(a.values.views))}</td>
        <td class="n">${esc(fmt(a.values.ctor, 'percent'))}</td>
        <td class="n">${esc(fmt(a.values.roi, 'ratio'))}</td>
        <td>${a.bottleneck ? statusChip(a.bottleneck.status, a.bottleneck.headline) : '<span class="muted">—</span>'}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="11" class="muted" style="text-align:center;padding:30px">Tidak ada live yang cocok dengan filter.</td></tr>';
  }

  function updateCmpBar() {
    const bar = $('#cmp-bar', root);
    bar.hidden = st.picked.length === 0;
    $('#cmp-text', root).textContent = st.picked.length === 2 ? '2 live dipilih' : `Pilih ${2 - st.picked.length} live lagi untuk dibandingkan`;
    $('#cmp-go', root).disabled = st.picked.length !== 2;
  }

  function drawCompare() {
    const [A, B] = st.picked.map((id) => rows.find((r) => r.live.id === id)).sort((x, y) => (x.live.date || '').localeCompare(y.live.date || ''));
    const lines = CMP_ROWS.filter((id) => Number.isFinite(A.a.values[id]) || Number.isFinite(B.a.values[id])).map((id) => {
      const va = A.a.values[id];
      const vb = B.a.values[id];
      const d = Number.isFinite(va) && Number.isFinite(vb) && va !== 0 ? (vb - va) / Math.abs(va) : null;
      const good = d == null || Math.abs(d) < 0.03 ? null : LOWER_IS_BETTER.has(id) ? d < 0 : d > 0;
      return { id, va, vb, d, good };
    });
    const ups = lines.filter((l) => l.good === true).sort((x, y) => Math.abs(y.d) - Math.abs(x.d)).slice(0, 3);
    const downs = lines.filter((l) => l.good === false).sort((x, y) => Math.abs(y.d) - Math.abs(x.d)).slice(0, 3);
    const nm = (r) => esc(r.live.title || dateLabel(r.live.date));
    const pct = (d) => `${d > 0 ? '+' : ''}${Math.round(d * 100)}%`;
    $('#cmp', root).innerHTML = `
      <div class="card">
        <div class="card-head"><div><div class="card-title">${nm(A)} → ${nm(B)}</div><div class="card-sub">${esc(dateLabel(A.live.date))} vs ${esc(dateLabel(B.live.date))} · skor ${Math.round(A.a.health.score ?? 0)} → ${Math.round(B.a.health.score ?? 0)}</div></div></div>
        <div class="grid-2" style="margin-bottom:18px">
          <div class="mx" style="grid-template-columns:1fr"><div><h4 style="color:#6fdca0">Membaik</h4><p>${ups.map((l) => `${esc(labelOf(l.id))} ${pct(l.d)}`).join(' · ') || 'Tidak ada perubahan positif signifikan.'}</p></div></div>
          <div class="mx" style="grid-template-columns:1fr"><div><h4 style="color:#ff8297">Memburuk</h4><p>${downs.map((l) => `${esc(labelOf(l.id))} ${pct(l.d)}`).join(' · ') || 'Tidak ada penurunan signifikan.'}</p></div></div>
        </div>
        <div class="table-wrap"><table class="t cmp-table">
          <thead><tr><th>Metrik</th><th class="n">${nm(A)}</th><th class="n">${nm(B)}</th><th class="n">Perubahan</th></tr></thead>
          <tbody>${lines.map((l) => `<tr><td>${esc(labelOf(l.id))}</td><td class="n">${esc(fmt(l.va, unitOf(l.id)))}</td><td class="n">${esc(fmt(l.vb, unitOf(l.id)))}</td><td class="n ${l.good === true ? 'better' : l.good === false ? 'worse' : ''}">${l.d == null ? '—' : pct(l.d)}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>`;
    gsap.from('#cmp .card', { y: 20, autoAlpha: 0, duration: 0.5 });
    $('#cmp', root).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---- event ----
  $('#pick', root).addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    st.metric = b.dataset.m;
    root.querySelectorAll('[data-m]').forEach((x) => x.classList.toggle('on', x === b));
    drawChart();
  });
  $('#f-host', root).addEventListener('change', (e) => {
    st.host = e.target.value;
    drawChart();
    drawTable();
  });
  $('#f-range', root).addEventListener('click', (e) => {
    const b = e.target.closest('[data-range]');
    if (!b) return;
    st.range = b.dataset.range;
    root.querySelectorAll('[data-range]').forEach((x) => x.classList.toggle('on', x === b));
    drawChart();
    drawTable();
  });
  let qt;
  $('#f-q', root).addEventListener('input', (e) => {
    clearTimeout(qt);
    qt = setTimeout(() => {
      st.q = e.target.value.trim();
      drawChart();
      drawTable();
    }, 200);
  });
  $('#tbl', root).addEventListener('change', (e) => {
    const id = e.target.dataset?.pick;
    if (!id) return;
    if (e.target.checked) st.picked = [...st.picked, id].slice(-2);
    else st.picked = st.picked.filter((x) => x !== id);
    root.querySelectorAll('[data-pick]').forEach((c) => (c.checked = st.picked.includes(c.dataset.pick)));
    updateCmpBar();
  });
  $('#cmp-clear', root).addEventListener('click', () => {
    st.picked = [];
    root.querySelectorAll('[data-pick]').forEach((c) => (c.checked = false));
    $('#cmp', root).innerHTML = '';
    updateCmpBar();
  });
  $('#cmp-go', root).addEventListener('click', drawCompare);
  $('#csv', root).addEventListener('click', () => exportCsv(rows));

  drawTable();
  pageMotion(root, () => {
    enterPage(root);
    revealOnScroll(root);
  });
  drawChart();
}

function shortDate(iso) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function exportCsv(rows) {
  const ids = [...METRICS.map((m) => m.id), ...Object.keys(DERIVED).filter((k) => !METRICS.some((m) => m.id === k))];
  const head = ['tanggal', 'jam_mulai', 'judul', 'host', 'skor', 'masalah_utama', ...ids];
  const cell = (x) => {
    const s = x == null ? '' : String(x);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [head.join(',')];
  for (const { live, a } of [...rows].reverse()) {
    lines.push([
      live.date, live.startTime, live.title, live.host,
      Number.isFinite(a.health.score) ? Math.round(a.health.score) : '',
      a.bottleneck?.headline ?? '',
      ...ids.map((id) => (Number.isFinite(a.values[id]) ? Math.round(a.values[id] * 1000) / 1000 : '')),
    ].map(cell).join(','));
  }
  download(`livepulse-${new Date().toISOString().slice(0, 10)}.csv`, '﻿' + lines.join('\n'), 'text/csv;charset=utf-8');
}
