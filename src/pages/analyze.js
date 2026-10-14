// Alur analisa: pilih/tempel screenshot → animasi scan (OCR / AI) → review angka → simpan.
import { takePending, onPending, addPendingImages } from '../state.js';
import { readScreenshot } from '../extract/ocr.js';
import { extractWithClaude } from '../extract/ai.js';
import { getSettings, rememberHost } from '../data/settings.js';
import { listLivesWithData, saveLive, saveSnapshot, uid } from '../data/db.js';
import { METRIC_BY_ID, CORE_16, HEADER_METRICS, OPTIONAL_METRICS, GROUPS } from '../core/metrics.js';
import { parseValue } from '../core/parse.js';
import { fmt, dateLabel } from '../core/format.js';
import { icon } from '../ui/icons.js';
import { esc, todayISO, nowHM, $ } from '../ui/dom.js';
import { toast } from '../ui/toast.js';
import { fx } from '../fx/scene.js';
import { pageMotion, enterPage, gsap, scramble, reduced } from '../fx/motion.js';

const STEPS_OCR = [
  ['prepare', 'Menyiapkan gambar'],
  ['engine', 'Memuat mesin OCR'],
  ['read', 'Membaca semua teks'],
  ['match', 'Mencocokkan label metrik'],
  ['refine', 'Membaca ulang setiap angka'],
];
const STEPS_AI = [
  ['prepare', 'Menyiapkan gambar'],
  ['ai', 'Claude membaca screenshot'],
];

export async function render(root, { q = {} } = {}) {
  const settings = getSettings();
  const lives = await listLivesWithData();
  const state = {
    images: [],
    urls: [],
    active: 0,
    result: {}, // id -> {value, raw, conf, labelBox, valueBox, imageIndex}
    dims: [],
    engine: settings.engine === 'ai' && settings.apiKey ? 'ai' : 'ocr',
    targetLiveId: null,
    busy: false,
  };

  const unsub = onPending(() => {
    if (state.busy) return;
    const p = takePending();
    if (p.images.length) start(p.images, p.liveId);
  });
  const obs = new MutationObserver(() => {
    if (!root.isConnected || !root.querySelector('[data-analyze]')) {
      unsub();
      obs.disconnect();
      state.urls.forEach((u) => URL.revokeObjectURL(u));
    }
  });
  obs.observe(root, { childList: true });

  const pending = takePending();
  if (pending.images.length) start(pending.images, pending.liveId);
  else if (q.manual) review();
  else if (q.live) {
    state.targetLiveId = q.live;
    dropView();
  } else dropView();

  // ---------- Tampilan 1: pilih screenshot ----------
  function dropView() {
    fx.setEnergy(0);
    root.innerHTML = `
    <div class="page" data-analyze>
      <div class="page-head" data-reveal>
        <div>
          <div class="overline">Analisa baru</div>
          <h1 class="page-title">Tempel screenshot dashboard LIVE</h1>
          <p class="page-desc">Bisa 1–4 screenshot sekaligus (mis. bila metrik terbagi di dua layar). Pastikan kartu GMV dan 16 metrik inti terlihat jelas.</p>
        </div>
        <div class="seg" role="group" aria-label="Mesin pembaca">
          <button data-engine="ocr" class="${state.engine === 'ocr' ? 'on' : ''}">OCR gratis</button>
          <button data-engine="ai" class="${state.engine === 'ai' ? 'on' : ''}">AI Claude</button>
        </div>
      </div>
      <label class="drop card" id="drop" tabindex="0" data-reveal style="min-height:360px">
        <input type="file" accept="image/*" multiple hidden id="file" />
        <div class="drop-icon">${icon('clipboard')}</div>
        <strong>Tekan <span class="kbd">Ctrl</span>+<span class="kbd">V</span> untuk menempel</strong>
        <small>atau seret file ke sini · atau klik untuk memilih</small>
        <span class="btn btn-primary" style="margin-top:8px">${icon('upload')}Pilih screenshot</span>
        ${state.targetLiveId ? `<small style="margin-top:8px">${icon('layers')} Akan ditambahkan sebagai snapshot ke live yang dipilih</small>` : ''}
      </label>
      <div class="grid-3" data-reveal>
        <div class="card tip">${icon('eye')}<h4>Bahasa Inggris, zoom 100%</h4><p>OCR paling akurat dengan dashboard berbahasa Inggris dan tidak di-zoom out.</p></div>
        <div class="card tip">${icon('clock')}<h4>Tiap 30–60 menit</h4><p>Beberapa screenshot dalam satu live membuat sistem bisa membaca momentum penjualan.</p></div>
        <div class="card tip">${icon('check')}<h4>Selalu dicek</h4><p>Sebelum disimpan kamu bisa memeriksa & membetulkan setiap angka yang terbaca.</p></div>
      </div>
      <div style="text-align:center"><a href="#/analyze?manual=1" class="btn btn-ghost">${icon('edit')}Isi angka manual tanpa screenshot</a></div>
    </div>`;
    const input = $('#file', root);
    const drop = $('#drop', root);
    input.addEventListener('change', () => addPendingImages(input.files, state.targetLiveId));
    drop.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        input.click();
      }
    });
    drop.addEventListener('dragenter', () => drop.classList.add('over'));
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('over');
      addPendingImages(e.dataTransfer.files, state.targetLiveId);
    });
    root.querySelectorAll('[data-engine]').forEach((b) =>
      b.addEventListener('click', () => {
        if (b.dataset.engine === 'ai' && !settings.apiKey) {
          toast('Isi API key Claude di Pengaturan untuk memakai mode AI.', 'err');
          return;
        }
        state.engine = b.dataset.engine;
        root.querySelectorAll('[data-engine]').forEach((x) => x.classList.toggle('on', x === b));
      }),
    );
    pageMotion(root, () => enterPage(root));
  }

  // ---------- Tampilan 2: scanning ----------
  function shotHTML() {
    return `
      <div class="shot" id="shot">
        <img id="shot-img" src="${state.urls[state.active]}" alt="Screenshot dashboard yang sedang dianalisa" />
        <div class="shot-boxes" id="boxes"></div>
        <div class="scanline" id="scanline"></div>
      </div>
      ${state.urls.length > 1 ? `<div class="shot-thumbs">${state.urls.map((u, i) => `<button data-thumb="${i}" class="${i === state.active ? 'on' : ''}" aria-label="Screenshot ${i + 1}"><img src="${u}" alt="" /></button>`).join('')}</div>` : ''}`;
  }

  function bindThumbs() {
    root.querySelectorAll('[data-thumb]').forEach((b) =>
      b.addEventListener('click', () => {
        state.active = +b.dataset.thumb;
        $('#shot-img', root).src = state.urls[state.active];
        root.querySelectorAll('[data-thumb]').forEach((x) => x.classList.toggle('on', x === b));
        drawBoxes(false);
      }),
    );
  }

  function drawBoxes(animate = true, onlyId = null) {
    const wrap = $('#boxes', root);
    if (!wrap) return;
    const dim = state.dims[state.active];
    if (!dim) return;
    const pct = (b) => `left:${(b.x0 / dim.width) * 100}%;top:${(b.y0 / dim.height) * 100}%;width:${((b.x1 - b.x0) / dim.width) * 100}%;height:${((b.y1 - b.y0) / dim.height) * 100}%`;
    const items = Object.entries(state.result).filter(([id, r]) => r.imageIndex === state.active && (!onlyId || id === onlyId));
    if (!onlyId) wrap.innerHTML = '';
    for (const [id, r] of items) {
      if (r.labelBox && !onlyId) wrap.insertAdjacentHTML('beforeend', `<div class="shot-box label" data-lbox="${id}" style="${pct(r.labelBox)}"></div>`);
      if (r.valueBox) {
        wrap.querySelector(`[data-vbox="${id}"]`)?.remove();
        wrap.insertAdjacentHTML('beforeend', `<div class="shot-box" data-vbox="${id}" style="${pct(r.valueBox)}"><span class="tag">${esc(METRIC_BY_ID[id]?.label ?? id)}</span></div>`);
      }
    }
    const boxes = onlyId ? wrap.querySelectorAll(`[data-vbox="${onlyId}"]`) : wrap.querySelectorAll('.shot-box');
    if (animate && !reduced()) gsap.fromTo(boxes, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.45, stagger: 0.02, ease: 'back.out(2)' });
    else gsap.set(boxes, { autoAlpha: 1 });
    wrap.querySelectorAll('.tag').forEach((t) => gsap.set(t, { autoAlpha: 0 }));
  }

  async function start(images, liveId) {
    state.busy = true;
    state.urls.forEach((u) => URL.revokeObjectURL(u));
    state.images = images;
    state.urls = images.map((f) => URL.createObjectURL(f));
    state.active = 0;
    state.result = {};
    state.dims = [];
    if (liveId) state.targetLiveId = liveId;
    const steps = state.engine === 'ai' ? STEPS_AI : STEPS_OCR;

    root.innerHTML = `
    <div class="page" data-analyze>
      <div class="page-head">
        <div>
          <div class="overline">${state.engine === 'ai' ? 'Mode AI Claude' : 'Mode OCR gratis · diproses di browser'}</div>
          <h1 class="page-title">Membaca dashboard…</h1>
        </div>
      </div>
      <div class="analyze-grid">
        <div class="shot-stage">${shotHTML()}</div>
        <div class="card">
          <div class="progress-steps" id="steps">
            ${steps.map(([k, label]) => `<div class="pstep" data-step="${k}"><span class="ic">${icon('check')}</span><span>${label}</span></div>`).join('')}
          </div>
          <div class="bar" style="margin-top:20px"><i id="pbar"></i></div>
          <div class="live-read" id="live-read" aria-live="polite"></div>
        </div>
      </div>
    </div>`;
    bindThumbs();
    root.querySelectorAll('.pstep .ic svg').forEach((s) => (s.style.display = 'none'));
    fx.setEnergy(1);

    const scan = $('#scanline', root);
    let scanTween = null;
    if (!reduced()) {
      const h = () => $('#shot', root)?.clientHeight || 400;
      gsap.set(scan, { autoAlpha: 1 });
      scanTween = gsap.fromTo(scan, { y: -120 }, { y: () => h(), duration: 1.8, ease: 'sine.inOut', repeat: -1, yoyo: true });
    }

    const stepOrder = steps.map((s) => s[0]);
    let current = -1;
    const setStep = (key) => {
      const idx = stepOrder.indexOf(key);
      if (idx < 0 || idx < current) return;
      current = idx;
      root.querySelectorAll('.pstep').forEach((el, i) => {
        el.classList.toggle('done', i < idx);
        el.classList.toggle('on', i === idx);
        const svg = el.querySelector('svg');
        if (svg) svg.style.display = i < idx ? '' : 'none';
      });
    };
    const bar = $('#pbar', root);
    const setBar = (p) => gsap.to(bar, { width: `${Math.round(p * 100)}%`, duration: 0.4, ease: 'power2.out' });
    const readList = $('#live-read', root);
    const showRead = (id, value) => {
      if (value == null || !METRIC_BY_ID[id]) return;
      let row = readList.querySelector(`[data-read="${id}"]`);
      if (!row) {
        readList.insertAdjacentHTML('beforeend', `<div data-read="${id}"><span>${esc(METRIC_BY_ID[id].label)}</span><b></b></div>`);
        row = readList.lastElementChild;
        if (!reduced()) gsap.from(row, { autoAlpha: 0, x: 12, duration: 0.35 });
      }
      scramble(row.querySelector('b'), fmt(value, METRIC_BY_ID[id].unit));
    };

    try {
      if (state.engine === 'ai') {
        setStep('prepare');
        setBar(0.15);
        setStep('ai');
        const tick = gsap.to({}, { duration: 14, onUpdate() { setBar(0.15 + this.progress() * 0.75); } });
        const out = await extractWithClaude(images, settings.apiKey);
        tick.kill();
        for (const [id, v] of Object.entries(out.metrics || {})) {
          if (typeof v === 'number' && Number.isFinite(v)) {
            state.result[id] = { value: v, raw: '', conf: 0.95, imageIndex: 0 };
            showRead(id, v);
          }
        }
        if (out.notes) toast(`Catatan AI: ${out.notes}`, 'ok', 6000);
      } else {
        for (let i = 0; i < images.length; i++) {
          state.active = i;
          if (images.length > 1) {
            $('#shot-img', root).src = state.urls[i];
            root.querySelectorAll('[data-thumb]').forEach((x) => x.classList.toggle('on', +x.dataset.thumb === i));
          }
          const base = i / images.length;
          const span = 1 / images.length;
          const natural = await imageSize(images[i]);
          state.dims[i] = natural;
          const live = {}; // hasil sementara screenshot ini, untuk animasi kotak
          const res = await readScreenshot(images[i], (step, info) => {
            setStep(step);
            if (step === 'engine' && info?.progress != null) setBar(base + span * 0.1 * info.progress);
            if (step === 'read') setBar(base + span * 0.2);
            if (step === 'match' && info?.layout) {
              setBar(base + span * 0.45);
              for (const [id, r] of Object.entries(info.layout)) live[id] = { ...r, value: null, imageIndex: i };
              Object.assign(state.result, Object.fromEntries(Object.entries(live).filter(([id]) => !state.result[id] || state.result[id].value == null)));
              drawBoxes(true);
            }
            if (step === 'refine' && info) {
              setBar(base + span * (0.45 + 0.55 * (info.done / info.total)));
              const cur = state.result[info.id];
              if (cur && cur.imageIndex === i) {
                Object.assign(cur, info.item, { imageIndex: i });
                if (cur.value != null) {
                  drawBoxes(true, info.id);
                  showRead(info.id, cur.value);
                }
              }
            }
          });
          state.dims[i] = { width: res.width, height: res.height };
          for (const [id, r] of Object.entries(res.metrics)) {
            const prev = state.result[id];
            if (!prev || (prev.value == null && r.value != null) || (r.value != null && r.conf > (prev.conf ?? 0))) {
              state.result[id] = { ...r, imageIndex: i };
            }
          }
          drawBoxes(true);
        }
      }
      setBar(1);
      setStep(stepOrder[stepOrder.length - 1]);
      root.querySelectorAll('.pstep').forEach((el) => {
        el.classList.add('done');
        el.classList.remove('on');
        const svg = el.querySelector('svg');
        if (svg) svg.style.display = '';
      });
      fx.pulse();
    } catch (e) {
      console.error(e);
      toast(e.message || 'Gagal membaca screenshot', 'err', 6000);
      if (state.engine === 'ai') {
        toast('Beralih ke OCR gratis…', 'ok');
        state.engine = 'ocr';
        scanTween?.kill();
        state.busy = false;
        return start(images, liveId);
      }
    } finally {
      scanTween?.kill();
      fx.setEnergy(0);
    }
    state.busy = false;
    if (import.meta.env.DEV) window.__lpResult = state.result;
    const found = Object.values(state.result).filter((r) => r.value != null).length;
    if (!found) toast('Tidak ada metrik yang terbaca. Isi manual atau coba screenshot yang lebih jelas.', 'err', 6000);
    setTimeout(review, reduced() ? 0 : 500);
  }

  // ---------- Tampilan 3: review & simpan ----------
  function review() {
    state.busy = false;
    const today = todayISO();
    const recentLives = lives.slice(0, 12);
    const target = state.targetLiveId && lives.find((l) => l.id === state.targetLiveId);
    const has = (id) => state.result[id]?.value != null;
    const coreCount = CORE_16.filter((m) => has(m.id)).length;
    const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    const row = (m) => {
      const r = state.result[m.id];
      const v = r?.value;
      const unsure = v != null && (r.conf ?? 1) < 0.75;
      const cls = v != null ? (unsure ? 'unsure' : 'read') : 'missing';
      const hint = v != null
        ? unsure ? `perlu dicek · terbaca "${r.raw}"` : state.engine === 'ai' && !r.valueBox ? 'dibaca AI' : `terbaca ${Math.round((r.conf ?? 1) * 100)}%`
        : 'tidak terlihat';
      return `<div class="mrow ${cls}">
        <div class="top">${m.rec ? `<span class="badge16">${m.rec}</span>` : ''}<span title="${esc(m.label)}">${esc(m.label)}</span></div>
        <input class="input" name="m_${m.id}" data-metric="${m.id}" inputmode="decimal" autocomplete="off" value="${v != null ? esc(inputText(r, m.unit)) : ''}" placeholder="${placeholder(m.unit)}" />
        <div class="hint">${esc(hint)}</div>
      </div>`;
    };
    const coreGroups = Object.keys(GROUPS)
      .map((g) => [g, CORE_16.filter((m) => m.group === g)])
      .filter(([, ms]) => ms.length);
    const optionalFound = OPTIONAL_METRICS.filter((m) => has(m.id));
    const optionalRest = OPTIONAL_METRICS.filter((m) => !has(m.id));

    root.innerHTML = `
    <div class="page" data-analyze>
      <div class="page-head" data-reveal>
        <div>
          <div class="overline">Periksa sebelum disimpan</div>
          <h1 class="page-title">${state.images.length ? 'Cek angka yang terbaca' : 'Isi angka dari dashboard'}</h1>
          <p class="page-desc">Kotak hijau = terbaca yakin, kuning = sebaiknya dicek, putus-putus = tidak ditemukan. Klik kolom untuk melihat posisinya di screenshot.</p>
        </div>
      </div>
      <div class="analyze-grid">
        ${state.images.length ? `<div class="shot-stage" data-reveal>${shotHTML()}</div>` : ''}
        <form class="card review-form" id="form" data-reveal ${state.images.length ? '' : 'style="grid-column:1/-1"'}>
          <div class="cov">
            <div><div class="label">Metrik inti terisi</div><div style="font-weight:800;font-size:22px"><span id="cov-n">${coreCount}</span>/16</div></div>
            <div class="bar"><i id="cov-bar" style="width:${(coreCount / 16) * 100}%"></i></div>
          </div>

          <div class="grid-2">
            <div class="field">
              <label for="f-live">Simpan ke</label>
              <select class="input" id="f-live">
                <option value="">+ Live baru</option>
                ${recentLives.map((l) => `<option value="${esc(l.id)}" ${target && target.id === l.id ? 'selected' : ''}>${esc(l.title || 'Live')} · ${esc(dateLabel(l.date))}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label for="f-at">Waktu screenshot</label>
              <input class="input" type="datetime-local" id="f-at" value="${nowLocal}" />
            </div>
          </div>
          <div class="grid-2" id="new-live" ${target ? 'hidden' : ''}>
            <div class="field"><label for="f-title">Judul / tema live</label><input class="input" id="f-title" placeholder="mis. Flash Sale Payday" maxlength="80" /></div>
            <div class="field"><label for="f-host">Host</label><input class="input" id="f-host" list="hosts" placeholder="Nama host" maxlength="40" /><datalist id="hosts">${settings.hosts.map((h) => `<option value="${esc(h)}">`).join('')}</datalist></div>
            <div class="field"><label for="f-date">Tanggal live</label><input class="input" type="date" id="f-date" value="${today}" /></div>
            <div class="field"><label for="f-start">Jam mulai (opsional)</label><input class="input" type="time" id="f-start" placeholder="${nowHM()}" /></div>
          </div>

          <div class="mgroup">
            <h4>${icon('coin')} Kartu atas dashboard</h4>
            <div class="mrows">${HEADER_METRICS.map(row).join('')}</div>
          </div>
          ${coreGroups.map(([g, ms]) => `<div class="mgroup"><h4>${esc(GROUPS[g].label)}</h4><div class="mrows">${ms.map(row).join('')}</div></div>`).join('')}
          ${optionalFound.length ? `<div class="mgroup"><h4>Metrik tambahan yang terbaca</h4><div class="mrows">${optionalFound.map(row).join('')}</div></div>` : ''}
          <details class="more mgroup"><summary>${icon('chevron')}Metrik opsional lain (${optionalRest.length})</summary><div class="mrows" style="margin-top:12px">${optionalRest.map(row).join('')}</div></details>

          <div class="field"><label for="f-notes">Catatan (opsional)</label><textarea class="input" id="f-notes" placeholder="mis. ganti host jam 21.00, promo 12.12, budget iklan dinaikkan" maxlength="500"></textarea></div>

          <div class="btn-row" style="justify-content:flex-end">
            <a class="btn btn-ghost" href="#/">Batal</a>
            <button class="btn btn-primary btn-lg" type="submit">${icon('sparkle')}Analisa & simpan</button>
          </div>
        </form>
      </div>
    </div>`;

    if (state.images.length) {
      bindThumbs();
      const img = $('#shot-img', root);
      const ready = () => {
        // dimensi untuk mode AI/manual (tanpa kotak) tetap diisi agar overlay aman
        state.dims = state.dims.length ? state.dims : state.images.map(() => ({ width: img.naturalWidth, height: img.naturalHeight }));
        drawBoxes(false);
      };
      if (img.complete) ready();
      else img.addEventListener('load', ready, { once: true });
    }

    const form = $('#form', root);
    const liveSel = $('#f-live', root);
    liveSel.addEventListener('change', () => {
      $('#new-live', root).hidden = !!liveSel.value;
    });
    // fokus kolom → sorot kotak di screenshot
    form.addEventListener('focusin', (e) => {
      const id = e.target.dataset?.metric;
      root.querySelectorAll('.shot-box').forEach((b) => b.classList.remove('focus'));
      if (!id) return;
      const r = state.result[id];
      if (r && r.imageIndex !== state.active && state.urls[r.imageIndex]) {
        root.querySelector(`[data-thumb="${r.imageIndex}"]`)?.click();
      }
      const box = root.querySelector(`[data-vbox="${id}"]`);
      if (box) {
        box.classList.add('focus');
        gsap.set(box.querySelector('.tag'), { autoAlpha: 1 });
      }
    });
    form.addEventListener('focusout', (e) => {
      const id = e.target.dataset?.metric;
      const box = id && root.querySelector(`[data-vbox="${id}"]`);
      if (box) gsap.set(box.querySelector('.tag'), { autoAlpha: 0 });
    });
    form.addEventListener('input', (e) => {
      const id = e.target.dataset?.metric;
      if (!id) return;
      const m = METRIC_BY_ID[id];
      const v = parseValue(e.target.value, m.unit);
      const rowEl = e.target.closest('.mrow');
      rowEl.classList.remove('unsure', 'missing', 'read');
      rowEl.classList.add(e.target.value.trim() === '' ? 'missing' : v == null ? 'unsure' : 'read');
      rowEl.querySelector('.hint').textContent = e.target.value.trim() === '' ? 'kosong' : v == null ? 'format tidak dikenali' : `= ${fmt(v, m.unit, { full: true })}`;
      const n = CORE_16.filter((c) => parseValue(form.querySelector(`[data-metric="${c.id}"]`)?.value, c.unit) != null).length;
      $('#cov-n', root).textContent = n;
      $('#cov-bar', root).style.width = `${(n / 16) * 100}%`;
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const reported = {};
      for (const input of form.querySelectorAll('[data-metric]')) {
        const m = METRIC_BY_ID[input.dataset.metric];
        const v = parseValue(input.value, m.unit);
        if (v != null) reported[m.id] = v;
      }
      if (!Object.keys(reported).length) {
        toast('Belum ada angka yang diisi.', 'err');
        return;
      }
      const btn = form.querySelector('[type=submit]');
      btn.disabled = true;
      try {
        let liveId = liveSel.value;
        if (!liveId) {
          const host = $('#f-host', root).value.trim();
          const live = await saveLive({
            id: uid(),
            title: $('#f-title', root).value.trim(),
            host,
            date: $('#f-date', root).value || todayISO(),
            startTime: $('#f-start', root).value || '',
            notes: $('#f-notes', root).value.trim(),
          });
          rememberHost(host);
          liveId = live.id;
        }
        const at = $('#f-at', root).value;
        const images = await Promise.all(state.images.map(shrink));
        await saveSnapshot({
          liveId,
          capturedAt: at ? new Date(at).toISOString() : new Date().toISOString(),
          reported,
          engine: state.images.length ? state.engine : 'manual',
          note: liveSel.value ? $('#f-notes', root).value.trim() : '',
          images: images.filter(Boolean),
        });
        location.hash = `#/live/${encodeURIComponent(liveId)}?fresh=1`;
      } catch (err) {
        console.error(err);
        toast('Gagal menyimpan: ' + (err.message || err), 'err');
        btn.disabled = false;
      }
    });

    pageMotion(root, () => {
      enterPage(root);
      gsap.from(form.querySelectorAll('.mrow.read, .mrow.unsure'), { autoAlpha: 0, y: 10, stagger: 0.02, duration: 0.4, delay: 0.3 });
    });
  }
}

async function imageSize(file) {
  try {
    const bmp = await createImageBitmap(file);
    const out = { width: bmp.width, height: bmp.height };
    bmp.close?.();
    return out;
  } catch {
    return null;
  }
}

/** Teks di kolom review: pakai bacaan asli (mis. "8.42K", "12,480,350") agar presisi tidak hilang. */
function inputText(r, unit) {
  if (r.raw && parseValue(r.raw, unit) === r.value) return r.raw;
  return fmt(r.value, unit, { full: true });
}

function placeholder(unit) {
  return { percent: 'mis. 3.92%', currency: 'mis. 2.36M', duration: 'mis. 21s', ratio: 'mis. 11.27', count: 'mis. 8.42K' }[unit] || '';
}

/** Simpan salinan screenshot yang diperkecil (JPEG) sebagai arsip di IndexedDB. */
async function shrink(file) {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1400 / bmp.width);
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82));
  } catch {
    return null;
  }
}
