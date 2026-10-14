// Mesin insight: mengubah angka menjadi diagnosa + aksi yang bisa langsung dijalankan admin/host.
// Tiga lapis pengecekan:
//   1. Patokan absolut per KPI (benchmarks.js)            → "angka ini rendah"
//   2. Pola antar-metrik (rasio yang jomplang)             → "masalahnya di sini, bukan di sana"
//   3. Perbandingan dengan median live sebelumnya & momentum dalam satu live → "beda dari biasanya"

import { derive } from './derive.js';
import { resolveKpis, statusOf, scoreOf, STAGES, STATUS, DEFAULT_SETTINGS } from './benchmarks.js';
import { CORE_16 } from './metrics.js';
import { fmt } from './format.js';

const ok = (v) => typeof v === 'number' && Number.isFinite(v);
const BAD = new Set(['critical', 'warning']);
const SEV_RANK = { critical: 0, warning: 1, info: 2, good: 3 };

export function median(arr) {
  const a = arr.filter(ok).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

// Metrik mentah yang dibandingkan dengan histori (selain KPI).
const TREND_METRICS = [
  { id: 'gmvPerHour', label: 'GMV per jam', unit: 'currency', higher: true },
  { id: 'gmv', label: 'GMV', unit: 'currency', higher: true },
  { id: 'impressions', label: 'Impressions', unit: 'count', higher: true },
  { id: 'views', label: 'Views', unit: 'count', higher: true },
  { id: 'orders', label: 'Orders', unit: 'count', higher: true },
  { id: 'aov', label: 'AOV', unit: 'currency', higher: true },
  { id: 'watchGpm', label: 'Watch GPM', unit: 'currency', higher: true },
];

export function gradeOf(score) {
  if (!ok(score)) return { key: 'none', label: 'Data kurang', status: 'info' };
  if (score >= 75) return { key: 'good', label: 'Sehat', status: 'good' };
  if (score >= 55) return { key: 'ok', label: 'Cukup', status: 'ok' };
  if (score >= 35) return { key: 'warning', label: 'Perlu perhatian', status: 'warning' };
  return { key: 'critical', label: 'Kritis', status: 'critical' };
}

/**
 * @param {object} p
 * @param {Record<string, number>} p.reported           nilai terbaca untuk snapshot ini
 * @param {Array<{reported: object}>} [p.history]      snapshot final dari live-live sebelumnya
 * @param {Array<{capturedAt: string, reported: object}>} [p.snapshots] semua snapshot live ini (urut waktu)
 * @param {object} [p.settings]
 * @param {object} [p.kpiOverrides]
 */
export function analyze({ reported, history = [], snapshots = [], settings = {}, kpiOverrides = {} }) {
  const cfg = { ...DEFAULT_SETTINGS, ...settings };
  const { values: v, source } = derive(reported);
  const kpiDefs = resolveKpis(kpiOverrides, cfg);

  // ---- Median histori ----
  const recent = history.slice(-cfg.historyWindow).map((h) => derive(h.reported).values);
  const hasHistory = recent.length >= 3;
  const med = (id) => (hasHistory ? median(recent.map((r) => r[id])) : null);

  // ---- KPI ----
  const kpis = kpiDefs.map((k) => {
    const value = v[k.id];
    const m = med(k.id);
    return {
      ...k,
      value: ok(value) ? value : null,
      source: source[k.id] ?? null,
      status: statusOf(k, value),
      score: scoreOf(k, value),
      median: m,
      delta: ok(value) && ok(m) && m !== 0 ? (value - m) / Math.abs(m) : null,
    };
  });
  const K = Object.fromEntries(kpis.map((k) => [k.id, k]));
  const S = (id) => K[id]?.status ?? null;
  const bad = (id) => BAD.has(S(id));
  const fine = (id) => S(id) === 'ok' || S(id) === 'good';
  const val = (id, unit) => fmt(v[id], unit ?? K[id]?.unit);
  const goal = (id) => `${K[id].higher ? '≥' : '≤'} ${fmt(K[id].good, K[id].unit)}`;

  // ---- Skor per tahap & skor kesehatan ----
  const stages = {};
  let wSum = 0;
  let sSum = 0;
  for (const [key, st] of Object.entries(STAGES)) {
    const scores = kpis.filter((k) => k.stage === key && ok(k.score)).map((k) => k.score);
    const score = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    stages[key] = { ...st, key, score, grade: gradeOf(score) };
    if (ok(score)) {
      wSum += st.weight;
      sSum += st.weight * score;
    }
  }
  const healthScore = wSum >= 0.3 ? sSum / wSum : null;
  const health = { score: healthScore, ...gradeOf(healthScore) };

  // ---- Funnel ----
  const paid = ok(v.orders) && ok(v.paymentRate) ? v.orders * (v.paymentRate / 100) : null;
  const funnel = [
    { id: 'impressions', label: 'Muncul di feed', metric: 'Impressions', value: v.impressions },
    { id: 'views', label: 'Masuk live', metric: 'Views', value: v.views, rateKpi: 'ttr' },
    { id: 'views1min', label: 'Bertahan > 1 menit', metric: '> 1 min. views', value: v.views1min, rateKpi: 'retention1m' },
    { id: 'productClicks', label: 'Klik produk', metric: 'Product clicks', value: v.productClicks, rateKpi: 'liveCtr', rateNote: 'dari views' },
    { id: 'orders', label: 'Pesan', metric: 'Orders', value: v.orders, rateKpi: 'ctor', rateNote: 'dari klik' },
    { id: 'paid', label: 'Bayar', metric: 'Paid orders', value: paid, rateKpi: 'paymentRate' },
  ].map((f) => ({
    ...f,
    rate: f.rateKpi ? K[f.rateKpi]?.value ?? null : null,
    status: f.rateKpi ? S(f.rateKpi) : null,
    good: f.rateKpi ? K[f.rateKpi]?.good : null,
  }));

  // ---- Bottleneck: tahap funnel dengan skor terendah ----
  const leakCandidates = [
    { kpi: ok(K.ttr.value) ? 'ttr' : 'ttrPreview', step: 'Feed → Masuk live' },
    { kpi: ok(K.retention1m.value) ? 'retention1m' : 'avgViewDuration', step: 'Masuk → Bertahan' },
    { kpi: 'liveCtr', step: 'Menonton → Klik produk' },
    { kpi: 'ctor', step: 'Klik → Pesan' },
    { kpi: 'paymentRate', step: 'Pesan → Bayar' },
  ].filter((c) => ok(K[c.kpi]?.score));
  leakCandidates.sort((a, b) => K[a.kpi].score - K[b.kpi].score);
  const worst = leakCandidates[0];
  const bottleneck = worst && K[worst.kpi].score < 65
    ? { ...worst, label: K[worst.kpi].label, value: K[worst.kpi].value, unit: K[worst.kpi].unit, status: K[worst.kpi].status, goal: goal(worst.kpi), stage: K[worst.kpi].stage }
    : null;

  // ---- Insight ----
  const out = [];
  const add = (i) => out.push(i);
  const sevOf = (...ids) => (ids.some((id) => S(id) === 'critical') ? 'critical' : 'warning');
  const highTicket = ok(v.aov) && v.aov >= cfg.highTicketAov;

  // 1) Traffic: orang tidak tap masuk (pakai TTR terburuk antara total & via preview)
  const ttrIds = ['ttr', 'ttrPreview'].filter((id) => ok(K[id].value));
  const ttrId = ttrIds.sort((a, b) => K[a].score - K[b].score)[0] ?? 'ttr';
  const hookOk = ttrIds.length > 0 && ttrIds.every(fine);
  if (bad(ttrId)) {
    const retentionFine = fine('avgViewDuration') || fine('retention1m');
    add({
      id: 'traffic-ttr', severity: sevOf(ttrId), stage: 'traffic',
      title: retentionFine ? 'Isi live bagus, tapi "etalase"-nya kurang memancing' : 'Sedikit orang yang tap masuk dari feed',
      detail: `Hanya ${val(ttrId)} orang yang masuk setelah melihat live kamu (patokan ${goal(ttrId)})` +
        (ok(v.impressions) ? ` — live sudah tampil ${val('impressions', 'count')} kali di feed.` : '.') +
        (retentionFine ? ' Orang yang masuk justru betah, jadi masalahnya ada di tampilan preview, bukan isi live.' : ''),
      metrics: [ttrId, 'impressions', 'views'],
      actions: [
        'Pastikan produk & host terlihat jelas di tengah frame dengan cahaya terang — preview di FYP kecil.',
        'Selalu ada aksi di layar (demo, unboxing, try-on). Preview yang diam jarang di-tap.',
        'Pakai judul live yang menyebut promo spesifik, mis. "Flash sale 99rb sampai jam 21.00".',
        'Hindari momen kosong: host jangan menunduk lihat HP atau meninggalkan frame.',
      ],
    });
  }

  // 2) Retensi: orang cepat keluar
  if (bad('avgViewDuration') || bad('retention1m')) {
    const parts = [];
    if (ok(v.avgViewDuration)) parts.push(`rata-rata hanya ${val('avgViewDuration', 'duration')} per view`);
    if (ok(v.retention1m)) parts.push(`cuma ${val('retention1m', 'percent')} yang bertahan > 1 menit`);
    add({
      id: 'retention', severity: sevOf('avgViewDuration', 'retention1m'), stage: 'retention',
      title: hookOk ? 'Hook menarik, tapi penonton cepat pergi' : 'Penonton cepat keluar dari live',
      detail: `Penonton ${parts.join(' dan ')} (patokan ${ok(v.retention1m) ? goal('retention1m') : goal('avgViewDuration')}).` +
        (hookOk ? ' Orang sudah mau masuk, jadi yang perlu dibenahi adalah apa yang mereka lihat di 10–30 detik pertama.' : '') +
        ' Retensi rendah membuat algoritma mengurangi dorongan traffic.',
      metrics: ['avgViewDuration', 'retention1m', 'views1min'],
      actions: [
        'Ulangi hook tiap 2–3 menit: sebut promo + alasan bertahan ("5 menit lagi harga turun!").',
        'Sapa penonton baru dengan nama dan langsung jelaskan apa yang sedang dijual.',
        'Buat alasan menunggu: hitung mundur flash sale, kuis, giveaway di menit tertentu.',
        'Ganti angle / demo produk berkala supaya selalu ada hal baru di layar.',
      ],
    });
  }

  // 3) Minat produk: penonton tidak klik
  if (bad('liveCtr') || bad('ctr') || bad('productExposure')) {
    const watching = fine('avgViewDuration') || fine('retention1m');
    const exposureBad = bad('productExposure');
    const bits = [];
    if (ok(v.liveCtr)) bits.push(`LIVE CTR ${val('liveCtr', 'percent')} (patokan ${goal('liveCtr')})`);
    if (ok(v.ctr)) bits.push(`CTR produk ${val('ctr', 'percent')}`);
    if (ok(v.productExposure)) bits.push(`exposure produk ${val('productExposure', 'percent')}`);
    add({
      id: 'interest', severity: sevOf('liveCtr', 'ctr', 'productExposure'), stage: 'interest',
      title: exposureBad ? 'Produk jarang ditampilkan ke penonton' : watching ? 'Penonton betah, tapi tidak membuka keranjang' : 'Penonton tidak tertarik klik produk',
      detail: `${bits.join(', ')}.` + (watching ? ' Penonton sudah bertahan cukup lama — yang kurang adalah ajakan dan cara produk ditampilkan.' : ''),
      metrics: ['liveCtr', 'ctr', 'productExposure', 'productClicks'],
      actions: [
        exposureBad ? 'Aktifkan keranjang sejak awal & pin produk yang sedang dibahas; ganti pin setiap ganti produk.' : 'Pin produk yang sedang dibahas, ganti pin setiap ganti produk.',
        'CTA jelas tiap 2–3 menit: "klik keranjang kuning, produk nomor 3".',
        'Sebut harga & potongan dengan jelas sambil tunjukkan produk dekat ke kamera.',
        'Mulai dengan produk paling murah / best seller untuk memancing klik pertama.',
      ],
    });
  }

  // 4) Konversi: klik banyak, order sedikit
  if (bad('ctor') || (!ok(v.ctor) && bad('orderRate'))) {
    const interestFine = fine('liveCtr');
    const id = ok(v.ctor) ? 'ctor' : 'orderRate';
    const detailBase = ok(v.productClicks) && ok(v.orders)
      ? `${fmt(v.productClicks, 'count')} klik produk hanya menghasilkan ${fmt(v.orders, 'count')} pesanan (${K[id].label} ${val(id)}, patokan ${goal(id)}).`
      : `${K[id].label} ${val(id)} (patokan ${goal(id)}).`;
    add({
      id: 'conversion', severity: sevOf(id), stage: 'conversion',
      title: interestFine ? 'Minat tinggi, tapi tidak jadi beli — masalah di penawaran' : 'Sedikit sekali yang checkout',
      detail: detailBase +
        (interestFine ? ' Orang sudah klik (minat ada), jadi hambatannya ada di harga, promo, kepercayaan, atau proses checkout.' : '') +
        (highTicket ? ` AOV ${fmt(v.aov, 'currency')} termasuk tinggi — konversi rendah wajar, tapi masih bisa didorong dengan rasa aman & opsi bayar.` : ''),
      metrics: [id, 'productClicks', 'orders', 'aov'],
      actions: [
        'Cek halaman produk: harga, voucher, dan stok harus sama dengan yang diucapkan host.',
        'Beri alasan beli SEKARANG: flash sale berwaktu, stok terbatas, bonus untuk N pembeli pertama.',
        'Jawab keraguan berulang-ulang: garansi, review/testimoni, ongkir, COD.',
        highTicket ? 'Tawarkan paylater / cicilan atau paket hemat sebagai pintu masuk.' : 'Pandu cara checkout langkah demi langkah di layar.',
      ],
    });
  }

  // 5) Pembayaran
  if (bad('paymentRate')) {
    add({
      id: 'payment', severity: sevOf('paymentRate'), stage: 'conversion',
      title: 'Banyak pesanan belum dibayar',
      detail: `Payment rate ${val('paymentRate', 'percent')} (patokan ${goal('paymentRate')}).` +
        (ok(paid) && ok(v.orders) ? ` Dari ${fmt(v.orders, 'count')} pesanan, sekitar ${Math.round(v.orders - paid)} belum dibayar.` : ''),
      metrics: ['paymentRate', 'orders'],
      actions: [
        'Ingatkan penonton yang sudah checkout untuk segera bayar sebelum promo berakhir.',
        'Pastikan metode bayar populer aktif (COD, e-wallet, paylater).',
        'Setelah live, follow up pesanan "Belum dibayar" lewat chat toko.',
      ],
    });
  }

  // 6) Iklan
  if (ok(v.roi)) {
    const est = source.roi === 'estimate' ? ' (estimasi: GMV total ÷ biaya iklan)' : '';
    if (S('roi') === 'critical') {
      add({
        id: 'ads-loss', severity: 'critical', stage: 'ads',
        title: 'Iklan rugi — ROI di bawah titik impas',
        detail: `ROI ${val('roi', 'ratio')}${est} di bawah titik impas ${fmt(cfg.breakEvenRoi, 'ratio')}. Biaya iklan ${val('adsCost', 'currency')}.`,
        metrics: ['roi', 'adsCost', 'tacos'],
        actions: [
          'Turunkan budget atau naikkan target ROI di GMV Max.',
          'Arahkan iklan ke produk dengan CTOR terbaik.',
          'Benahi konversi live dulu sebelum menambah budget — iklan hanya memperbesar hasil yang ada.',
        ],
      });
    } else if (S('roi') === 'warning') {
      add({
        id: 'ads-below', severity: 'warning', stage: 'ads',
        title: 'ROI iklan di bawah target',
        detail: `ROI ${val('roi', 'ratio')}${est}, target toko ${fmt(cfg.targetRoi, 'ratio')}.`,
        metrics: ['roi', 'adsCost'],
        actions: ['Naikkan target ROI di GMV Max atau kurangi budget di jam sepi.', 'Pastikan live sedang ramai & konversi bagus saat iklan berjalan.'],
      });
    } else if (S('roi') === 'good' && ok(v.adsCost)) {
      add({
        id: 'ads-scale', severity: 'info', stage: 'ads',
        title: 'Iklan sangat efisien — ada ruang menambah budget',
        detail: `ROI ${val('roi', 'ratio')}${est} jauh di atas target ${fmt(cfg.targetRoi, 'ratio')}. Setiap Rp1 iklan menghasilkan sekitar Rp${v.roi.toFixed(1)}.`,
        metrics: ['roi', 'adsCost'],
        actions: [
          `Naikkan budget GMV Max bertahap 20–30% sambil menjaga ROI di atas ${fmt(cfg.targetRoi, 'ratio')}.`,
          'Jadwalkan iklan di jam penonton paling ramai.',
        ],
      });
    }
  }

  // 7) Interaksi
  const engBad = ['commentRate', 'followRate', 'shareRate'].filter(bad);
  if (engBad.length) {
    add({
      id: 'engagement', severity: engBad.some((id) => S(id) === 'critical') && engBad.length >= 2 ? 'critical' : 'warning', stage: 'engagement',
      title: 'Live sepi interaksi',
      detail: engBad.map((id) => `${K[id].label} ${val(id)} (patokan ${goal(id)})`).join(', ') +
        '. Komentar, follow, dan share adalah sinyal yang membuat algoritma menambah traffic.',
      metrics: engBad,
      actions: [
        'Ajukan pertanyaan pilihan ganda ("ketik 1 kalau mau warna hitam, 2 kalau putih").',
        'Giveaway untuk yang komentar/follow, umumkan pemenang di live.',
        'Balas komentar dengan menyebut nama — orang lain ikut berkomentar.',
        'Ajak follow dengan alasan: "follow biar dapat notif flash sale berikutnya".',
      ],
    });
  } else if (['commentRate', 'followRate'].every((id) => S(id) === 'good') && (bad('ctor') || bad('liveCtr'))) {
    add({
      id: 'engaged-not-buying', severity: 'warning', stage: 'conversion',
      title: 'Penonton aktif, tapi bukan pembeli',
      detail: 'Interaksi bagus namun klik/pembelian rendah. Penonton datang untuk hiburan, bukan belanja.',
      metrics: ['commentRate', 'liveCtr', 'ctor'],
      actions: ['Arahkan obrolan kembali ke produk; kurangi topik di luar jualan.', 'Uji produk yang lebih relevan dengan audiens yang aktif.'],
    });
  }

  // 8) Ukuran keranjang
  if (ok(v.itemsPerOrder) && ok(v.orders) && v.orders >= 5) {
    if (v.itemsPerOrder < 1.15) {
      add({
        id: 'basket', severity: 'info', stage: 'conversion',
        title: 'Pembeli hanya ambil 1 item',
        detail: `Rata-rata ${v.itemsPerOrder.toFixed(2)} item per pesanan.`,
        metrics: ['itemsPerOrder', 'itemsSold', 'orders'],
        actions: ['Buat bundling "beli 2 lebih hemat".', 'Tawarkan produk pelengkap murah saat orang checkout.'],
      });
    } else if (v.itemsPerOrder >= 1.6) {
      add({ id: 'basket-good', severity: 'good', stage: 'conversion', title: 'Bundling berjalan', detail: `Rata-rata ${v.itemsPerOrder.toFixed(2)} item per pesanan.`, metrics: ['itemsPerOrder'], actions: [] });
    }
  }

  // 9) Dibanding median live sebelumnya
  if (hasHistory) {
    const rows = [
      ...kpis.filter((k) => ok(k.delta)).map((k) => ({ id: k.id, label: k.label, unit: k.unit, higher: k.higher, value: k.value, median: k.median, delta: k.delta })),
      ...TREND_METRICS.map((t) => {
        const m = med(t.id);
        return ok(v[t.id]) && ok(m) && m !== 0 ? { ...t, value: v[t.id], median: m, delta: (v[t.id] - m) / Math.abs(m) } : null;
      }).filter(Boolean),
    ];
    const worse = rows.filter((r) => (r.higher ? -r.delta : r.delta) >= cfg.deviationThreshold)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    const better = rows.filter((r) => (r.higher ? r.delta : -r.delta) >= cfg.deviationThreshold)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    const line = (r) => `${r.label} ${fmt(r.value, r.unit)} vs biasanya ${fmt(r.median, r.unit)} (${r.delta > 0 ? '+' : ''}${Math.round(r.delta * 100)}%)`;
    if (worse.length) {
      add({
        id: 'vs-history-down', severity: worse.some((r) => Math.abs(r.delta) >= 0.5) ? 'critical' : 'warning', stage: 'history',
        title: `Jomplang dibanding ${recent.length} live terakhir`,
        detail: worse.slice(0, 4).map(line).join(' · '),
        metrics: worse.map((r) => r.id),
        actions: ['Bandingkan apa yang berbeda: host, jam tayang, produk, promo, budget iklan.', 'Buka menu Riwayat untuk melihat tren lengkap metrik ini.'],
      });
    }
    if (better.length) {
      add({
        id: 'vs-history-up', severity: 'good', stage: 'history',
        title: 'Lebih baik dari biasanya',
        detail: better.slice(0, 4).map(line).join(' · '),
        metrics: better.map((r) => r.id),
        actions: ['Catat apa yang dilakukan di live ini supaya bisa diulang.'],
      });
    }
  }

  // 10) Momentum dalam satu live (butuh ≥ 2 snapshot)
  const momentum = momentumOf(snapshots);
  if (momentum) {
    if (momentum.gmvChange <= -0.4) {
      add({
        id: 'momentum-down', severity: 'warning', stage: 'momentum',
        title: 'Momentum penjualan melambat',
        detail: `Dalam ${momentum.minutes} menit terakhir GMV per jam ${fmt(momentum.lastGmvRate, 'currency')}, turun ${Math.round(-momentum.gmvChange * 100)}% dibanding periode sebelumnya.`,
        metrics: ['gmv', 'gmvPerHour'],
        actions: ['Lakukan "reset": flash sale atau giveaway untuk menarik penonton lagi.', 'Ganti ke produk best seller.', 'Cek energi host — pertimbangkan rotasi host.'],
      });
    } else if (momentum.gmvChange >= 0.4) {
      add({
        id: 'momentum-up', severity: 'good', stage: 'momentum',
        title: 'Momentum penjualan naik',
        detail: `Dalam ${momentum.minutes} menit terakhir GMV per jam ${fmt(momentum.lastGmvRate, 'currency')}, naik ${Math.round(momentum.gmvChange * 100)}% dibanding periode sebelumnya.`,
        metrics: ['gmv'],
        actions: ['Pertahankan format & produk saat ini; ini waktu yang tepat menambah budget iklan.'],
      });
    }
  }

  // 11) Kekuatan
  const strengths = kpis.filter((k) => k.status === 'good');
  if (strengths.length) {
    add({
      id: 'strengths', severity: 'good', stage: 'summary',
      title: 'Yang sudah bagus',
      detail: strengths.map((k) => `${k.label} ${fmt(k.value, k.unit)}`).join(' · '),
      metrics: strengths.map((k) => k.id),
      actions: [],
    });
  }

  // 12) Kelengkapan data
  const missing = CORE_16.filter((m) => !ok(reported?.[m.id]) && !ok(v[m.id]));
  if (missing.length) {
    add({
      id: 'coverage', severity: 'info', stage: 'data',
      title: `${16 - missing.length} dari 16 metrik inti tersedia`,
      detail: `Belum ada: ${missing.map((m) => m.label).join(', ')}. Centang metrik ini di dashboard TikTok agar insight lebih tajam.`,
      metrics: missing.map((m) => m.id),
      actions: [],
    });
  }

  out.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);

  // ---- Aksi prioritas ----
  const actionsNow = [];
  for (const i of out) {
    if (i.severity !== 'critical' && i.severity !== 'warning') continue;
    if (i.actions[0] && !actionsNow.includes(i.actions[0])) actionsNow.push(i.actions[0]);
    if (actionsNow.length >= 3) break;
  }
  if (actionsNow.length < 3) {
    for (const i of out) {
      for (const a of i.actions.slice(1)) {
        if (actionsNow.length >= 3) break;
        if ((i.severity === 'critical' || i.severity === 'warning' || i.severity === 'info') && !actionsNow.includes(a)) actionsNow.push(a);
      }
    }
  }

  const summary = buildSummary({ health, bottleneck, strengths, kpis });

  return {
    values: v, source, kpis, stages, health, funnel, bottleneck, insights: out, actionsNow, summary, momentum,
    coverage: { have: 16 - missing.length, missing: missing.map((m) => m.id) },
    historyCount: recent.length,
  };
}

function buildSummary({ health, bottleneck, strengths }) {
  if (!ok(health.score)) return 'Data belum cukup untuk menilai kesehatan live. Lengkapi metrik inti.';
  const parts = [`Live ${health.label.toLowerCase()} (skor ${Math.round(health.score)}).`];
  if (bottleneck) parts.push(`Kebocoran terbesar di tahap ${bottleneck.step}: ${bottleneck.label} ${fmt(bottleneck.value, bottleneck.unit)}, patokan ${bottleneck.goal}.`);
  if (strengths.length) parts.push(`Kekuatan: ${strengths.slice(0, 2).map((k) => k.label).join(' & ')}.`);
  return parts.join(' ');
}

/** Bandingkan laju GMV di interval terakhir vs interval-interval sebelumnya dalam satu live. */
export function momentumOf(snapshots) {
  const s = (snapshots || [])
    .filter((x) => ok(x?.reported?.gmv) && x.capturedAt)
    .sort((a, b) => new Date(a.capturedAt) - new Date(b.capturedAt));
  if (s.length < 3) return null;
  const t = (x) => new Date(x.capturedAt).getTime() / 3.6e6;
  const [a, b, c] = s.slice(-3);
  const prevH = t(b) - t(a);
  const lastH = t(c) - t(b);
  if (prevH < 1 / 12 || lastH < 1 / 12) return null; // interval < 5 menit tidak bermakna
  const prevRate = (b.reported.gmv - a.reported.gmv) / prevH;
  const lastRate = (c.reported.gmv - b.reported.gmv) / lastH;
  if (prevRate <= 0) return null;
  return { prevGmvRate: prevRate, lastGmvRate: lastRate, gmvChange: (lastRate - prevRate) / prevRate, minutes: Math.round(lastH * 60) };
}

export { STATUS, STAGES };
