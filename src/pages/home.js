import { listLivesWithData } from '../data/db.js';
import { analyzeLive } from '../data/analysis.js';
import { getSettings } from '../data/settings.js';
import { icon } from '../ui/icons.js';
import { esc, num, statusChip } from '../ui/dom.js';
import { ring } from '../ui/charts.js';
import { fmt, dateLabel } from '../core/format.js';
import { addPendingImages } from '../state.js';
import { pageMotion, enterPage, countUp, revealOnScroll, gsap } from '../fx/motion.js';

export async function render(root) {
  const settings = getSettings();
  const lives = await listLivesWithData();
  const analyzed = lives.map((l) => ({ live: l, a: analyzeLive(l, lives, settings) }));
  const recent = analyzed.slice(0, 7);
  const scored = recent.filter((x) => Number.isFinite(x.a.health.score));
  const avgScore = scored.length ? scored.reduce((s, x) => s + x.a.health.score, 0) / scored.length : null;
  const sum = (id) => recent.reduce((s, x) => s + (Number.isFinite(x.a.values[id]) ? x.a.values[id] : 0), 0);
  const gphs = recent.map((x) => x.a.values.gmvPerHour).filter(Number.isFinite);
  const best = [...analyzed].filter((x) => Number.isFinite(x.a.values.gmvPerHour)).sort((a, b) => b.a.values.gmvPerHour - a.a.values.gmvPerHour)[0];

  root.innerHTML = `
  <div class="page">
    <section class="hero" data-reveal>
      <div>
        <div class="overline">Asisten admin TikTok LIVE</div>
        <h1>Screenshot masuk, <em>insight keluar.</em></h1>
        <p>Tempel screenshot dashboard LIVE. LivePulse membaca 16 metrik inti, mencari rasio yang jomplang, lalu memberi tahu apa yang perlu dilakukan host — saat live masih berjalan.</p>
        <div class="hero-points">
          <span>${icon('check')}Tanpa login</span>
          <span>${icon('lock')}Data tetap di browser kamu</span>
          <span>${icon('trend')}Bandingkan dari live ke live</span>
        </div>
      </div>
      <label class="drop" id="drop" tabindex="0" aria-label="Pilih atau seret screenshot dashboard LIVE">
        <input type="file" accept="image/*" multiple hidden id="file" />
        <div class="drop-icon">${icon('image')}</div>
        <strong>Tempel, seret, atau pilih screenshot</strong>
        <small>Screenshot dengan <span class="kbd">Win</span>+<span class="kbd">Shift</span>+<span class="kbd">S</span>, lalu tekan <span class="kbd">Ctrl</span>+<span class="kbd">V</span> di sini</small>
        <span class="btn btn-light" style="margin-top:8px">${icon('upload')}Pilih screenshot</span>
        <small>atau <a href="#/analyze?manual=1">isi angka manual</a> · mode ${settings.engine === 'ai' && settings.apiKey ? 'AI Claude' : 'OCR gratis'}</small>
      </label>
    </section>

    ${lives.length ? `
    <section class="stat-row" data-scroll="stagger">
      <div class="card stat"><div class="label">Skor rata-rata (7 live)</div>${num(avgScore != null ? Math.round(avgScore) : null, 'count')}<div class="sub">dari 100 · ${scored.length} live dinilai</div></div>
      <div class="card stat"><div class="label">Total GMV (7 live)</div>${num(sum('gmv'), 'currency')}<div class="sub">${recent.length} live terakhir</div></div>
      <div class="card stat"><div class="label">Rata-rata GMV per jam</div>${num(gphs.length ? gphs.reduce((a, b) => a + b, 0) / gphs.length : null, 'currency')}<div class="sub">${best ? `terbaik: ${esc(best.live.title || dateLabel(best.live.date))}` : '—'}</div></div>
      <div class="card stat"><div class="label">Live tersimpan</div>${num(lives.length, 'count')}<div class="sub">${lives.reduce((s, l) => s + l.snapshots.length, 0)} screenshot dianalisa</div></div>
    </section>

    <section>
      <div class="page-head" style="margin-bottom:16px">
        <div class="section-title">Live terakhir</div>
        <a class="btn btn-sm btn-ghost" href="#/history">Lihat semua ${icon('arrowRight')}</a>
      </div>
      <div class="live-list" data-scroll="stagger">
        ${recent.map(({ live, a }) => liveCard(live, a)).join('')}
      </div>
    </section>` : onboarding()}
  </div>`;

  const input = root.querySelector('#file');
  const drop = root.querySelector('#drop');
  const go = (files) => {
    if (addPendingImages(files)) location.hash = '#/analyze';
  };
  input.addEventListener('change', () => go(input.files));
  drop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      input.click();
    }
  });
  drop.addEventListener('dragenter', () => drop.classList.add('over'));
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    drop.classList.remove('over');
    e.preventDefault();
    go(e.dataTransfer.files);
  });

  pageMotion(root, () => {
    enterPage(root);
    gsap.from('.drop', { scale: 0.96, autoAlpha: 0, duration: 0.9, delay: 0.25, ease: 'expo.out' });
    countUp(root, { delay: 0.3 });
    revealOnScroll(root);
    root.querySelectorAll('.ring-arc').forEach((el) => gsap.from(el, { drawSVG: '0%', duration: 1.2, delay: 0.4, ease: 'power2.inOut' }));
  });
}

function liveCard(live, a) {
  const issue = a.bottleneck
    ? statusChip(a.bottleneck.status, `Bocor: ${a.bottleneck.step}`)
    : a.insights.find((i) => i.severity === 'critical' || i.severity === 'warning')
      ? statusChip('warning', a.insights.find((i) => i.severity === 'critical' || i.severity === 'warning').title)
      : statusChip(a.health.status === 'info' ? 'info' : 'good', a.health.label);
  return `<a class="card live-card" href="#/live/${encodeURIComponent(live.id)}">
    ${ring(a.health.score, a.health.status)}
    <div style="min-width:0">
      <h3>${esc(live.title || 'Live tanpa judul')}</h3>
      <div class="meta">${esc(dateLabel(live.date))}${live.startTime ? ' · ' + esc(live.startTime) : ''}${live.host ? ' · ' + esc(live.host) : ''} · ${live.snapshots.length} screenshot</div>
      <div class="kv"><span>GMV <b>${fmt(a.values.gmv, 'currency')}</b></span><span>Views <b>${fmt(a.values.views)}</b></span><span>Order <b>${fmt(a.values.orders)}</b></span></div>
      <div class="issue">${issue}</div>
    </div>
  </a>`;
}

function onboarding() {
  return `
  <section class="grid-3" data-scroll="stagger">
    <a class="card tip" href="#/guide" style="text-decoration:none;color:inherit">${icon('book')}<h4>1 · Centang 16 metrik</h4><p>Atur dashboard TikTok LIVE supaya menampilkan 16 metrik inti yang dibutuhkan sistem. Lihat panduannya.</p></a>
    <div class="card tip">${icon('image')}<h4>2 · Screenshot & tempel</h4><p>Setiap 30–60 menit saat live (dan di akhir live), screenshot dashboard lalu tempel di sini dengan Ctrl+V.</p></div>
    <div class="card tip">${icon('sparkle')}<h4>3 · Jalankan aksinya</h4><p>Dapatkan skor kesehatan, kebocoran funnel terbesar, dan 3 aksi prioritas untuk host. Semua tersimpan untuk perbandingan.</p></div>
  </section>`;
}
