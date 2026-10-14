// Halaman hasil satu live: skor kesehatan, aksi prioritas, funnel, insight, KPI, snapshot.
import { listLivesWithData, deleteLive, deleteSnapshot, saveLive } from '../data/db.js';
import { analyzeLive, historyBefore } from '../data/analysis.js';
import { derive } from '../core/derive.js';
import { median } from '../core/insights.js';
import { getSettings } from '../data/settings.js';
import { coachWithClaude } from '../extract/ai.js';
import { STAGES } from '../core/benchmarks.js';
import { labelOf, unitOf, METRIC_BY_ID, DERIVED } from '../core/metrics.js';
import { fmt, dateLabel, timeLabel, signedPct } from '../core/format.js';
import { perHundred } from '../core/plain.js';
import { icon } from '../ui/icons.js';
import { esc, num, statusChip, sevChip, $ } from '../ui/dom.js';
import { gauge, meter, lineChart, STATUS_COLOR } from '../ui/charts.js';
import { toast } from '../ui/toast.js';
import { fx } from '../fx/scene.js';
import { pageMotion, gsap, countUp, revealOnScroll, draw, reduced } from '../fx/motion.js';
import { SplitText } from 'gsap/SplitText';

export async function render(root, { id, q = {} }) {
  const settings = getSettings();
  const lives = await listLivesWithData();
  const live = lives.find((l) => l.id === id);
  if (!live) {
    root.innerHTML = `<div class="page"><div class="card empty">${icon('alert')}<h3>Live tidak ditemukan</h3><p>Mungkin sudah dihapus.</p><a class="btn" href="#/history">Ke riwayat</a></div></div>`;
    return;
  }
  const a = analyzeLive(live, lives, settings);
  const v = a.values;
  const statusKey = a.health.status === 'info' ? 'none' : a.health.status;
  fx.setMood(a.health.status);

  const heroKpi = (label, id, unit) => {
    const k = a.kpis.find((x) => x.id === id);
    const medVal = k?.median ?? null;
    let delta = '';
    const hist = a.historyCount >= 3 ? medianOf(lives, live, id, settings.historyWindow) : null;
    const base = medVal ?? hist;
    if (Number.isFinite(v[id]) && Number.isFinite(base) && base) {
      const d = (v[id] - base) / Math.abs(base);
      const dir = Math.abs(d) < 0.03 ? 'flat' : d > 0 ? 'up' : 'down';
      delta = `<div class="delta ${dir}">${icon(dir === 'down' ? 'arrowDown' : 'arrowUp')}${signedPct(d)} vs median</div>`;
    }
    return `<div><div class="label">${label}</div>${num(v[id], unit)}${delta}</div>`;
  };

  const leakKpi = a.bottleneck?.kpi;
  const funnelMax = Math.max(...a.funnel.map((f) => (Number.isFinite(f.value) ? f.value : 0)), 1);
  const widthOf = (val) => (Number.isFinite(val) && val > 0 ? Math.max(1.5, (Math.log10(val + 1) / Math.log10(funnelMax + 1)) * 100) : 0);

  const stageOrder = Object.keys(STAGES);
  const kpisByStage = stageOrder
    .map((s) => [s, a.kpis.filter((k) => k.stage === s && Number.isFinite(k.value))])
    .filter(([, ks]) => ks.length);

  const allRows = Object.keys(v)
    .filter((k) => METRIC_BY_ID[k] || DERIVED[k])
    .sort((x, y) => (a.source[x] === 'reported' ? 0 : 1) - (a.source[y] === 'reported' ? 0 : 1) || (METRIC_BY_ID[x]?.rec ?? 99) - (METRIC_BY_ID[y]?.rec ?? 99));

  root.innerHTML = `
  <div class="page">
    <div class="page-head">
      <div>
        <a href="#/history" class="btn btn-sm btn-ghost" style="margin-left:-12px">${icon('arrowLeft')}<span>Riwayat</span></a>
        <h1 class="page-title" style="margin-top:4px">${esc(live.title || 'Live tanpa judul')}</h1>
        <p class="page-desc">${esc(dateLabel(live.date))}${live.startTime ? ' · mulai ' + esc(live.startTime) : ''}${live.host ? ' · host ' + esc(live.host) : ''} · ${live.snapshots.length} screenshot${Number.isFinite(v.durationHours) ? ` · ±${v.durationHours.toFixed(1)} jam live` : ''}</p>
      </div>
      <div class="btn-row">
        <a class="btn" href="#/analyze?live=${encodeURIComponent(live.id)}">${icon('plus')}Tambah screenshot</a>
        <button class="btn" id="btn-coach">${icon('sparkle')}Analisa AI</button>
        <button class="btn btn-ghost" id="btn-edit" title="Ubah judul/host">${icon('edit')}</button>
        <button class="btn btn-danger btn-sm" id="btn-del" title="Hapus live">${icon('trash')}</button>
      </div>
    </div>

    <section class="result-hero" id="hero">
      <div class="gauge">
        ${gauge(a.health.score, statusKey)}
        <div class="center"><div class="score">${Number.isFinite(a.health.score) ? Math.round(a.health.score) : '–'}</div><div class="of">skor live</div></div>
      </div>
      <div style="min-width:0">
        <span class="grade"><span class="dot s-${a.health.status}" style="background:${STATUS_COLOR[statusKey]}"></span>${esc(a.health.label)}</span>
        <h1 id="hero-title">${a.bottleneck ? esc(a.bottleneck.headline) : Number.isFinite(a.health.score) ? 'Tidak ada masalah besar — pertahankan' : 'Lengkapi metrik untuk penilaian'}</h1>
        <p class="summary">${esc(a.summary)}</p>
        <div class="hero-kpis">
          ${heroKpi('GMV', 'gmv', 'currency')}
          ${heroKpi('GMV per jam', 'gmvPerHour', 'currency')}
          ${heroKpi('Views', 'views', 'count')}
          ${heroKpi(a.source.roi === 'estimate' ? 'ROI (estimasi)' : 'GMV Max ROI', 'roi', 'ratio')}
        </div>
      </div>
    </section>

    ${a.actionsNow.length ? `
    <section class="card now-card" data-scroll>
      <div class="now-badge">${icon('bolt')}</div>
      <div>
        <div class="card-title">Lakukan sekarang</div>
        <div class="card-sub">Langsung jalankan di live ini — urut dari yang paling berdampak</div>
        <ol class="now-list">${a.actionsNow.map((x) => `<li><div>${actTag(x)}<p>${esc(x.text)}</p></div></li>`).join('')}</ol>
      </div>
    </section>` : ''}

    <section class="card" data-scroll>
      <div class="card-head">
        <div><div class="card-title">Perjalanan penonton sampai membeli</div><div class="card-sub">Di tahap mana orang paling banyak "hilang". Kotak merah = masalah utama.</div></div>
        ${a.bottleneck ? statusChip(a.bottleneck.status, `Masalah: ${a.bottleneck.headline}`) : ''}
      </div>
      <div class="funnel" id="funnel">
        ${a.funnel.map((f, i) => `
          ${i > 0 ? `<div class="f-conv"><span></span><div class="arrow">${icon('arrowDown')}${f.rateKpi && Number.isFinite(f.rate) ? `<b style="color:var(--text)">${esc(perHundred(f.rate))}</b> ${esc(FUNNEL_NOUN[f.id] || '')} ${statusChip(f.status)} <span class="muted">normal ${esc(perHundred(f.good))}</span>` : '<span class="muted">angka belum tersedia</span>'}</div></div>` : ''}
          <div class="f-step ${f.rateKpi && f.rateKpi === leakKpi ? 'f-leak' : ''}">
            <div class="name">${esc(f.label)}<small>${esc(f.metric)}</small></div>
            <div class="f-track"><div class="f-bar ${f.id === 'paid' || a.source[f.id] === 'derived' ? 'est' : ''} ${Number.isFinite(f.value) ? '' : 'none'}" style="width:${widthOf(f.value)}%"></div></div>
            <div class="f-val">${Number.isFinite(f.value) ? esc(fmt(f.value)) : '—'}<small>${f.id === 'paid' ? 'estimasi' : a.source[f.id] === 'derived' ? 'dihitung' : Number.isFinite(f.value) ? 'dari dashboard' : 'tidak ada'}</small></div>
          </div>`).join('')}
      </div>
    </section>

    <section>
      <div class="page-head" style="margin-bottom:16px"><div class="section-title">Apa yang salah & harus diapakan</div><span class="muted" style="font-size:13px">${a.historyCount >= 3 ? `dibandingkan dengan ${a.historyCount} live sebelumnya` : `perbandingan dengan live sebelumnya aktif setelah 3 live tersimpan (sekarang ${a.historyCount})`}</span></div>
      <div class="insights" data-scroll="stagger">
        ${a.insights.map((i) => `
          <article class="card insight s-${i.severity}">
            <div class="row">${sevChip(i.severity)}<span class="muted" style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em">${esc(stageLabel(i.stage))}</span></div>
            <h3>${esc(i.title)}</h3>
            <p>${esc(i.why)}</p>
            ${i.actions.length ? `<div class="todo-head">Yang harus dilakukan</div><ul class="todo">${i.actions.map((x) => `<li>${actTag(x)}<span>${esc(x.text)}</span></li>`).join('')}</ul>` : ''}
            ${i.tech ? `<p class="tech">Angka teknis: ${esc(i.tech)}</p>` : ''}
          </article>`).join('')}
      </div>
    </section>

    <section class="card coach" id="coach" hidden></section>

    <section>
      <div class="page-head" style="margin-bottom:16px"><div class="section-title">Detail angka</div><span class="muted" style="font-size:13px">Garis putih = live ini · garis abu = biasanya di tokomu · warna = merah buruk → hijau bagus</span></div>
      ${kpisByStage.map(([s, ks]) => `
        <div style="margin-bottom:22px">
          <div class="row" style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><span class="overline" style="color:var(--text-2)">${esc(STAGES[s].label)}</span>${a.stages[s].score != null ? `<span class="score-pill s-${a.stages[s].grade.status}">${Math.round(a.stages[s].score)}</span>` : ''}</div>
          <div class="kpi-grid" data-scroll="stagger">
            ${ks.map((k) => `
              <div class="card kpi">
                <div class="top"><span class="label">${esc(k.plain)}</span>${statusChip(k.status)}</div>
                ${num(k.value, k.unit)}
                ${meter(k)}
                <div class="why">${esc(k.why)}</div>
                <div class="top"><span class="src">${esc(k.label)} · ${k.source === 'reported' ? 'dari dashboard' : k.source === 'estimate' ? 'estimasi' : 'dihitung'}</span>${Number.isFinite(k.delta) ? `<span class="delta ${k.higher === k.delta > 0 ? 'up' : 'down'}" style="font-size:12px;font-weight:700">${signedPct(k.delta)} vs median</span>` : ''}</div>
              </div>`).join('')}
          </div>
        </div>`).join('') || '<div class="card empty"><p>Belum ada KPI yang bisa dinilai. Tambahkan screenshot dengan 16 metrik inti.</p></div>'}
    </section>

    ${live.snapshots.length > 1 ? `
    <section class="card" data-scroll>
      <div class="card-head"><div><div class="card-title">Perjalanan live ini</div><div class="card-sub">GMV kumulatif per screenshot${a.momentum ? ` · momentum ${a.momentum.gmvChange >= 0 ? 'naik' : 'turun'} ${Math.abs(Math.round(a.momentum.gmvChange * 100))}% di interval terakhir` : ''}</div></div></div>
      <div id="snap-chart"></div>
    </section>` : ''}

    <section class="card" data-scroll>
      <div class="card-head"><div><div class="card-title">Screenshot & data</div><div class="card-sub">${live.snapshots.length} snapshot · angka final memakai nilai terbaru</div></div></div>
      <div class="table-wrap"><table class="t">
        <thead><tr><th>Waktu</th><th>Sumber</th><th class="n">GMV</th><th class="n">Views</th><th class="n">Orders</th><th>Gambar</th><th></th></tr></thead>
        <tbody>
          ${live.snapshots.map((s) => `<tr>
            <td>${esc(dateLabel(s.capturedAt))} · ${esc(timeLabel(s.capturedAt))}</td>
            <td><span class="src-tag">${esc({ ocr: 'OCR', ai: 'AI Claude', manual: 'manual', import: 'impor' }[s.engine] || s.engine)}</span></td>
            <td class="n">${esc(fmt(s.reported.gmv, 'currency'))}</td>
            <td class="n">${esc(fmt(s.reported.views))}</td>
            <td class="n">${esc(fmt(s.reported.orders))}</td>
            <td>${(s.images || []).map((_, j) => `<button class="btn btn-sm btn-ghost" data-img="${esc(s.id)}:${j}">${icon('image')}Lihat</button>`).join('') || '<span class="muted">—</span>'}</td>
            <td class="n">${live.snapshots.length > 1 ? `<button class="btn btn-sm btn-ghost" data-del-snap="${esc(s.id)}" title="Hapus snapshot">${icon('trash')}</button>` : ''}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
      ${live.notes || live.snapshots.some((s) => s.note) ? `<p class="note" style="margin-top:12px">${icon('edit')} ${esc([live.notes, ...live.snapshots.map((s) => s.note)].filter(Boolean).join(' · '))}</p>` : ''}
    </section>

    <details class="card more" data-scroll>
      <summary>${icon('chevron')}Semua angka (${allRows.length})</summary>
      <div class="table-wrap" style="margin-top:12px"><table class="t">
        <thead><tr><th>Metrik</th><th>Sumber</th><th class="n">Nilai</th><th>Rumus</th></tr></thead>
        <tbody>${allRows.map((k) => `<tr><td>${esc(labelOf(k))}</td><td><span class="src-tag ${a.source[k]}">${a.source[k] === 'reported' ? 'dashboard' : a.source[k] === 'estimate' ? 'estimasi' : 'dihitung'}</span></td><td class="n">${esc(fmt(v[k], unitOf(k) === 'hours' ? 'hours' : unitOf(k), { full: unitOf(k) === 'currency' }))}</td><td class="formula">${a.source[k] !== 'reported' && DERIVED[k] ? esc(DERIVED[k].formula) : ''}</td></tr>`).join('')}</tbody>
      </table></div>
    </details>
  </div>`;

  // ---- grafik GMV dalam live ----
  const chartEl = $('#snap-chart', root);
  if (chartEl) {
    lineChart(chartEl, live.snapshots.map((s) => ({ label: timeLabel(s.capturedAt), sub: dateLabel(s.capturedAt), y: s.reported.gmv, title: `Views ${fmt(s.reported.views)} · Orders ${fmt(s.reported.orders)}` })), { unit: 'currency', title: 'GMV kumulatif' });
  }

  // ---- interaksi ----
  root.querySelectorAll('[data-img]').forEach((b) =>
    b.addEventListener('click', () => {
      const [sid, j] = b.dataset.img.split(':');
      const blob = live.snapshots.find((s) => s.id === sid)?.images?.[+j];
      if (blob) window.open(URL.createObjectURL(blob), '_blank', 'noopener');
    }),
  );
  root.querySelectorAll('[data-del-snap]').forEach((b) =>
    b.addEventListener('click', async () => {
      if (!confirm('Hapus snapshot ini? Angka live akan dihitung ulang dari snapshot lain.')) return;
      await deleteSnapshot(b.dataset.delSnap);
      toast('Snapshot dihapus');
      render(root, { id });
    }),
  );
  $('#btn-del', root).addEventListener('click', async () => {
    if (!confirm(`Hapus live "${live.title || 'tanpa judul'}" beserta ${live.snapshots.length} screenshot-nya? Tindakan ini tidak bisa dibatalkan.`)) return;
    await deleteLive(live.id);
    toast('Live dihapus');
    location.hash = '#/history';
  });
  $('#btn-edit', root).addEventListener('click', async () => {
    const title = prompt('Judul live', live.title || '');
    if (title === null) return;
    const host = prompt('Nama host', live.host || '');
    if (host === null) return;
    const { snapshots, reported, ...rest } = live;
    await saveLive({ ...rest, title: title.trim(), host: host.trim() });
    render(root, { id });
  });
  $('#btn-coach', root).addEventListener('click', () => runCoach(root, settings, a, live));

  // ---- gerak ----
  pageMotion(root, () => {
    const tl = gsap.timeline();
    tl.from('#hero', { y: 30, autoAlpha: 0, scale: 0.98, duration: 0.8, ease: 'expo.out' });
    tl.add(draw('.gauge-arc', { duration: 1.6 }), 0.2);
    const scoreEl = root.querySelector('.gauge .score');
    if (Number.isFinite(a.health.score)) {
      const o = { x: 0 };
      tl.to(o, { x: a.health.score, duration: 1.6, ease: 'power2.inOut', onUpdate: () => (scoreEl.textContent = Math.round(o.x)) }, 0.2);
    }
    const split = SplitText.create('#hero-title', { type: 'words', mask: 'words' });
    tl.from(split.words, { yPercent: 110, stagger: 0.04, duration: 0.6, ease: 'power4.out' }, 0.35);
    tl.from('.result-hero .summary, .result-hero .grade', { autoAlpha: 0, y: 10, duration: 0.5 }, 0.6);
    countUp(root.querySelector('.hero-kpis'), { delay: 0.5 });
    gsap.from('.f-bar', { scaleX: 0, duration: 1.1, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: '#funnel', start: 'top 85%', once: true } });
    root.querySelectorAll('.kpi-grid').forEach((g) => countUp(g, { delay: 0.2 }));
    revealOnScroll(root);
    if (q.fresh) {
      fx.pulse();
      gsap.fromTo('.now-card', { boxShadow: '0 0 0 0 rgba(69,171,170,.6)' }, { boxShadow: '0 0 0 18px rgba(69,171,170,0)', duration: 1.4, delay: 1.2, repeat: 1 });
    }
  });
  if (reduced()) root.querySelectorAll('.gauge .score').forEach((el) => (el.textContent = Number.isFinite(a.health.score) ? Math.round(a.health.score) : '–'));
}

// Kata benda untuk baris "x dari 100 ___" di antara tahap funnel.
const FUNNEL_NOUN = {
  views: 'orang di FYP yang masuk',
  views1min: 'penonton yang betah',
  productClicks: 'penonton yang klik keranjang',
  orders: 'klik yang jadi pesanan',
  paid: 'pesanan yang dibayar',
};

/** Label "HOST · Script" di depan setiap aksi. */
function actTag(a) {
  const who = String(a.who || '').toLowerCase();
  return `<span class="act-tag who-${esc(who)}">${esc(a.who)} · ${esc(a.tag)}</span>`;
}

function stageLabel(s) {
  return { traffic: 'Penonton masuk', retention: 'Penonton betah', interest: 'Klik produk', conversion: 'Pembelian', ads: 'Iklan', engagement: 'Interaksi', history: 'Dibanding biasanya', momentum: 'Selama live', summary: 'Ringkasan', data: 'Data' }[s] || s;
}

function medianOf(lives, live, id, windowSize) {
  const vals = historyBefore(live, lives).slice(-windowSize).map((l) => derive(l.reported).values[id]);
  return vals.filter(Number.isFinite).length >= 3 ? median(vals) : null;
}

async function runCoach(root, settings, a, live) {
  const box = $('#coach', root);
  if (!settings.apiKey) {
    toast('Isi API key Claude di Pengaturan untuk memakai Analisa AI.', 'err', 5000);
    return;
  }
  box.hidden = false;
  box.innerHTML = `<div class="card-head"><div><div class="card-title">${icon('sparkle')} Analisa AI</div><div class="card-sub">Claude sedang membaca angka & temuan…</div></div></div>
    <div class="body"><div class="skeleton" style="height:18px;width:80%"></div><div class="skeleton" style="height:18px;width:65%"></div><div class="skeleton" style="height:80px"></div></div>`;
  box.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
  try {
    const out = await coachWithClaude({ apiKey: settings.apiKey, analysis: a, live, history: a.historyCount });
    box.innerHTML = `<div class="card-head"><div><div class="card-title">${icon('sparkle')} Analisa AI</div><div class="card-sub">oleh Claude · berdasarkan angka live ini & ${a.historyCount} live sebelumnya</div></div></div>
      <div class="body">
        <p style="font-size:16px;font-weight:600">${esc(out.ringkasan)}</p>
        <div class="grid-2">${out.diagnosa.map((d) => `<div class="mx" style="grid-template-columns:1fr"><div><h4>${esc(d.judul)}</h4><p>${esc(d.penjelasan)}</p></div></div>`).join('')}</div>
        <div class="grid-2">
          <div><h4>Sekarang, saat live</h4><ul class="todo">${out.aksi_sekarang.map((x) => `<li>${actTag({ who: x.untuk, tag: x.topik })}<span>${esc(x.tindakan)}</span></li>`).join('')}</ul></div>
          <div><h4>Untuk live berikutnya</h4><ul>${out.untuk_live_berikutnya.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
        </div>
      </div>`;
    if (!reduced()) gsap.from(box.querySelectorAll('.body > *'), { autoAlpha: 0, y: 14, stagger: 0.08, duration: 0.5 });
  } catch (e) {
    box.innerHTML = `<div class="card-head"><div class="card-title">${icon('alert')} Analisa AI gagal</div></div><p class="note warn">${esc(e.message || e)}</p>`;
  }
}
