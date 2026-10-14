// Pengaturan: mesin pembaca, target bisnis, patokan KPI, dan data (ekspor/impor/hapus).
import { getSettings, saveSettings } from '../data/settings.js';
import { exportAll, importAll, clearAll } from '../data/db.js';
import { DEFAULT_KPIS, DEFAULT_SETTINGS, STAGES } from '../core/benchmarks.js';
import { icon } from '../ui/icons.js';
import { esc, download, $ } from '../ui/dom.js';
import { toast } from '../ui/toast.js';
import { pageMotion, enterPage } from '../fx/motion.js';

const UNIT_SUFFIX = { percent: '%', duration: 'detik', ratio: '×', currency: 'Rp', count: '' };

export async function render(root) {
  const s = getSettings();
  const ov = s.kpiOverrides || {};
  const editable = DEFAULT_KPIS.filter((k) => k.id !== 'roi');
  const val = (k, key) => ov[k.id]?.[key] ?? k[key];

  root.innerHTML = `
  <div class="page">
    <div class="page-head" data-reveal>
      <div><div class="overline">Pengaturan</div><h1 class="page-title">Sesuaikan dengan tokomu</h1>
      <p class="page-desc">Semua pengaturan & data tersimpan di browser ini saja. Gunakan ekspor/impor untuk memindahkan ke komputer lain.</p></div>
    </div>

    <section class="card" data-reveal>
      <div class="card-head"><div><div class="card-title">Mesin pembaca screenshot</div><div class="card-sub">OCR gratis berjalan di browser tanpa internet tambahan. AI Claude lebih tahan terhadap tampilan yang berbeda & menulis analisa naratif.</div></div></div>
      <div class="seg" id="engine" role="group" aria-label="Mesin pembaca">
        <button type="button" data-engine="ocr" class="${s.engine !== 'ai' ? 'on' : ''}">OCR gratis (Tesseract)</button>
        <button type="button" data-engine="ai" class="${s.engine === 'ai' ? 'on' : ''}">AI Claude</button>
      </div>
      <div class="field" style="margin-top:18px;max-width:640px">
        <label for="key">API key Anthropic (untuk mode AI & tombol "Analisa AI")</label>
        <div class="key-row">
          <input class="input" id="key" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-..." value="${esc(s.apiKey)}" />
          <button class="btn" type="button" id="key-show">${icon('eye')}</button>
          <button class="btn btn-primary" type="button" id="key-save">Simpan</button>
        </div>
        <p class="note">Key disimpan di browser ini (localStorage) dan dikirim langsung ke api.anthropic.com saat analisa AI. Buat key khusus dengan batas pemakaian di console.anthropic.com, dan jangan simpan key di komputer yang dipakai bersama orang yang tidak dipercaya.</p>
        <p class="note">Model: Claude Opus 5.5. Perkiraan biaya ±Rp300–800 per screenshot; Analisa AI sedikit lebih mahal.</p>
        ${s.apiKey ? `<button class="btn btn-sm btn-danger" type="button" id="key-del" style="width:fit-content">${icon('trash')}Hapus key</button>` : ''}
      </div>
    </section>

    <form class="card" id="targets" data-reveal>
      <div class="card-head"><div><div class="card-title">Target bisnis</div><div class="card-sub">Dipakai untuk menilai iklan & membandingkan dengan histori.</div></div></div>
      <div class="grid-3">
        <div class="field"><label for="t-be">ROI titik impas</label><input class="input" id="t-be" type="number" step="0.1" min="0" value="${s.breakEvenRoi}" /><span class="note">= 1 ÷ margin kotor. Margin 33% → 3.</span></div>
        <div class="field"><label for="t-roi">ROI target</label><input class="input" id="t-roi" type="number" step="0.1" min="0" value="${s.targetRoi}" /><span class="note">ROI ≥ 1.5× target dianggap layak tambah budget.</span></div>
        <div class="field"><label for="t-aov">AOV dianggap "harga tinggi" (Rp)</label><input class="input" id="t-aov" type="number" step="1000" min="0" value="${s.highTicketAov}" /></div>
        <div class="field"><label for="t-win">Jumlah live pembanding</label><input class="input" id="t-win" type="number" min="3" max="60" value="${s.historyWindow}" /><span class="note">Median dari N live terakhir.</span></div>
        <div class="field"><label for="t-dev">Ambang "jomplang" vs median (%)</label><input class="input" id="t-dev" type="number" min="5" max="200" value="${Math.round(s.deviationThreshold * 100)}" /></div>
        <div class="field"><label for="t-studio">Nama toko / studio</label><input class="input" id="t-studio" maxlength="60" value="${esc(s.studio)}" /></div>
      </div>
      <div class="btn-row" style="margin-top:18px;justify-content:flex-end"><button class="btn btn-primary" type="submit">Simpan target</button></div>
    </form>

    <form class="card" id="bench" data-reveal>
      <div class="card-head"><div><div class="card-title">Patokan KPI</div><div class="card-sub">Batas kritis / waspada / bagus. Patokan awal bersifat umum — ubah sesuai kategori & harga produkmu.</div></div>
        <button class="btn btn-sm btn-ghost" type="button" id="bench-reset">${icon('refresh')}Kembalikan default</button></div>
      <div class="table-wrap"><table class="t bench-table">
        <thead><tr><th>Tahap</th><th>KPI</th><th class="n">Kritis</th><th class="n">Waspada</th><th class="n">Bagus</th><th>Satuan</th></tr></thead>
        <tbody>
          ${editable.map((k) => `<tr>
            <td class="dim">${esc(STAGES[k.stage].label)}</td>
            <td><b>${esc(k.label)}</b><div class="note">${k.higher ? 'makin tinggi makin bagus' : 'makin rendah makin bagus'}</div></td>
            ${['critical', 'warning', 'good'].map((f) => `<td class="n"><input class="input" type="number" step="any" data-k="${k.id}" data-f="${f}" value="${val(k, f)}" aria-label="${esc(k.label)} ${f}" /></td>`).join('')}
            <td class="dim">${UNIT_SUFFIX[k.unit]}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
      <div class="btn-row" style="margin-top:18px;justify-content:flex-end"><button class="btn btn-primary" type="submit">Simpan patokan</button></div>
    </form>

    <section class="card" data-reveal>
      <div class="card-head"><div><div class="card-title">Data</div><div class="card-sub">Cadangkan rutin. Ekspor JSON berisi semua live & angka (tanpa gambar screenshot).</div></div></div>
      <div class="btn-row">
        <button class="btn" id="exp">${icon('download')}Ekspor JSON</button>
        <label class="btn" for="imp-file">${icon('upload')}Impor JSON</label><input id="imp-file" type="file" accept="application/json,.json" hidden />
        <a class="btn" href="#/history">${icon('file')}Ekspor CSV di Riwayat</a>
        <button class="btn btn-danger" id="wipe">${icon('trash')}Hapus semua data</button>
      </div>
    </section>
  </div>`;

  // Mesin
  root.querySelectorAll('[data-engine]').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.dataset.engine === 'ai' && !getSettings().apiKey) {
        toast('Simpan API key dulu untuk mengaktifkan mode AI.', 'err');
        return;
      }
      saveSettings({ engine: b.dataset.engine });
      root.querySelectorAll('[data-engine]').forEach((x) => x.classList.toggle('on', x === b));
      toast(b.dataset.engine === 'ai' ? 'Mode AI Claude aktif' : 'Mode OCR gratis aktif');
    }),
  );
  $('#key-show', root).addEventListener('click', () => {
    const k = $('#key', root);
    k.type = k.type === 'password' ? 'text' : 'password';
  });
  $('#key-save', root).addEventListener('click', () => {
    const key = $('#key', root).value.trim();
    if (key && !/^sk-ant-/.test(key)) {
      toast('Format key tidak dikenali (harus diawali sk-ant-).', 'err');
      return;
    }
    saveSettings({ apiKey: key, engine: key ? getSettings().engine : 'ocr' });
    toast(key ? 'API key disimpan di browser ini' : 'API key dikosongkan');
    render(root);
  });
  $('#key-del', root)?.addEventListener('click', () => {
    saveSettings({ apiKey: '', engine: 'ocr' });
    toast('API key dihapus dari browser ini');
    render(root);
  });

  // Target
  $('#targets', root).addEventListener('submit', (e) => {
    e.preventDefault();
    const n = (id, d) => {
      const x = parseFloat($(id, root).value);
      return Number.isFinite(x) && x >= 0 ? x : d;
    };
    saveSettings({
      breakEvenRoi: n('#t-be', DEFAULT_SETTINGS.breakEvenRoi),
      targetRoi: n('#t-roi', DEFAULT_SETTINGS.targetRoi),
      highTicketAov: n('#t-aov', DEFAULT_SETTINGS.highTicketAov),
      historyWindow: Math.max(3, Math.round(n('#t-win', DEFAULT_SETTINGS.historyWindow))),
      deviationThreshold: Math.max(0.05, n('#t-dev', 30) / 100),
      studio: $('#t-studio', root).value.trim(),
    });
    toast('Target disimpan — semua live dinilai ulang');
  });

  // Patokan
  $('#bench', root).addEventListener('submit', (e) => {
    e.preventDefault();
    const out = {};
    for (const input of root.querySelectorAll('[data-k]')) {
      const k = DEFAULT_KPIS.find((x) => x.id === input.dataset.k);
      const v = parseFloat(input.value);
      if (!Number.isFinite(v) || v === k[input.dataset.f]) continue;
      (out[k.id] ||= {})[input.dataset.f] = v;
    }
    for (const [id, o] of Object.entries(out)) {
      const k = DEFAULT_KPIS.find((x) => x.id === id);
      const c = o.critical ?? k.critical;
      const w = o.warning ?? k.warning;
      const g = o.good ?? k.good;
      const okOrder = k.higher ? c <= w && w <= g : c >= w && w >= g;
      if (!okOrder) {
        toast(`Urutan patokan ${k.label} tidak masuk akal (${k.higher ? 'kritis ≤ waspada ≤ bagus' : 'kritis ≥ waspada ≥ bagus'}).`, 'err', 5000);
        return;
      }
    }
    saveSettings({ kpiOverrides: out });
    toast('Patokan disimpan');
  });
  $('#bench-reset', root).addEventListener('click', () => {
    saveSettings({ kpiOverrides: {} });
    toast('Patokan dikembalikan ke default');
    render(root);
  });

  // Data
  $('#exp', root).addEventListener('click', async () => {
    const data = await exportAll();
    download(`livepulse-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2));
  });
  $('#imp-file', root).addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const r = await importAll(JSON.parse(await f.text()));
      toast(`Impor selesai: ${r.lives} live, ${r.snaps} snapshot`);
    } catch (err) {
      toast(err.message || 'File tidak valid', 'err', 5000);
    }
    e.target.value = '';
  });
  $('#wipe', root).addEventListener('click', async () => {
    if (!confirm('Hapus SEMUA live dan screenshot dari browser ini? Ekspor JSON dulu bila ingin menyimpan cadangan.')) return;
    await clearAll();
    toast('Semua data dihapus');
  });

  pageMotion(root, () => enterPage(root));
}
