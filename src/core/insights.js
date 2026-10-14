// Mesin insight: mengubah angka menjadi diagnosa + aksi yang bisa langsung dijalankan admin/host.
// Tiga lapis pengecekan:
//   1. Patokan absolut per KPI (benchmarks.js)            → "angka ini rendah"
//   2. Pola antar-metrik (rasio yang jomplang)             → "masalahnya di sini, bukan di sana"
//   3. Perbandingan dengan median live sebelumnya & momentum dalam satu live → "beda dari biasanya"
//
// Bahasa output sengaja bahasa lapangan (script, etalase, kamera, promo), bukan istilah
// metrik. Angka teknis tetap ada di field `tech` untuk yang ingin melihat.

import { derive } from './derive.js';
import { resolveKpis, statusOf, scoreOf, STAGES, STATUS, DEFAULT_SETTINGS } from './benchmarks.js';
import { CORE_16 } from './metrics.js';
import { fmt } from './format.js';
import { perHundred, baseFor, cap, lowerFirst, rupiah, angka, durasi, perRupiah, change, plainValue } from './plain.js';

const ok = (v) => typeof v === 'number' && Number.isFinite(v);
const BAD = new Set(['critical', 'warning']);
const SEV_RANK = { critical: 0, warning: 1, info: 2, good: 3 };

/** Satu langkah aksi: siapa yang mengerjakan, topiknya, dan kalimat perintahnya. */
const act = (who, tag, text) => ({ who, tag, text });

export function median(arr) {
  const a = arr.filter(ok).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

// Metrik mentah yang dibandingkan dengan histori (selain KPI).
const TREND_METRICS = [
  { id: 'gmvPerHour', label: 'GMV per jam', plain: 'Omzet per jam', unit: 'currency', higher: true },
  { id: 'gmv', label: 'GMV', plain: 'Omzet', unit: 'currency', higher: true },
  { id: 'impressions', label: 'Impressions', plain: 'Tampil di FYP', unit: 'count', higher: true },
  { id: 'views', label: 'Views', plain: 'Penonton masuk', unit: 'count', higher: true },
  { id: 'orders', label: 'Orders', plain: 'Jumlah pesanan', unit: 'count', higher: true },
  { id: 'aov', label: 'AOV', plain: 'Nilai belanja per pesanan', unit: 'currency', higher: true },
  { id: 'watchGpm', label: 'Watch GPM', plain: 'Omzet per 1.000 penonton', unit: 'currency', higher: true },
];

// Kalimat utama per tahap funnel yang paling bocor.
const LEAK_TEXT = {
  ttr: { headline: 'Live jarang dimampiri dari FYP', fix: 'perbaiki tampilan awal & judul live' },
  ttrPreview: { headline: 'Live jarang dimampiri dari FYP', fix: 'perbaiki tampilan awal & judul live' },
  retention1m: { headline: 'Penonton cepat pergi', fix: 'perbaiki script pembuka & energi host' },
  avgViewDuration: { headline: 'Penonton cepat pergi', fix: 'perbaiki script pembuka & energi host' },
  liveCtr: { headline: 'Penonton jarang klik keranjang', fix: 'perbaiki ajakan klik & susunan etalase' },
  ctor: { headline: 'Banyak yang klik, sedikit yang beli', fix: 'perbaiki penawaran & cara closing' },
  paymentRate: { headline: 'Banyak pesanan belum dibayar', fix: 'ingatkan pembayaran & follow up pembeli' },
};

export function gradeOf(score) {
  if (!ok(score)) return { key: 'none', label: 'Data kurang', status: 'info' };
  if (score >= 75) return { key: 'good', label: 'Sehat', status: 'good' };
  if (score >= 55) return { key: 'ok', label: 'Cukup', status: 'ok' };
  if (score >= 35) return { key: 'warning', label: 'Perlu dibenahi', status: 'warning' };
  return { key: 'critical', label: 'Bermasalah', status: 'critical' };
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
  const tech = (...ids) => ids.filter((id) => K[id] && ok(K[id].value))
    .map((id) => `${K[id].label} ${fmt(K[id].value, K[id].unit)} (patokan ${K[id].higher ? '≥' : '≤'} ${fmt(K[id].good, K[id].unit)})`)
    .join(' · ');
  // patokan ditulis dengan basis yang sama dengan nilainya ("dari 100" vs "dari 1.000")
  const normal = (id) => (K[id].higher ? `normalnya minimal ${perHundred(K[id].good, baseFor(K[id].value))}` : `sebaiknya di bawah ${fmt(K[id].good, K[id].unit)}`);

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
    { id: 'impressions', label: 'Muncul di FYP', metric: 'Impressions', value: v.impressions },
    { id: 'views', label: 'Mampir masuk live', metric: 'Views', value: v.views, rateKpi: 'ttr' },
    { id: 'views1min', label: 'Betah > 1 menit', metric: '> 1 min. views', value: v.views1min, rateKpi: 'retention1m' },
    { id: 'productClicks', label: 'Klik keranjang', metric: 'Product clicks', value: v.productClicks, rateKpi: 'liveCtr', rateNote: 'dari penonton' },
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
    { kpi: ok(K.ttr.value) ? 'ttr' : 'ttrPreview', step: 'FYP → Masuk live' },
    { kpi: ok(K.retention1m.value) ? 'retention1m' : 'avgViewDuration', step: 'Masuk → Betah' },
    { kpi: 'liveCtr', step: 'Nonton → Klik keranjang' },
    { kpi: 'ctor', step: 'Klik → Pesan' },
    { kpi: 'paymentRate', step: 'Pesan → Bayar' },
  ].filter((c) => ok(K[c.kpi]?.score));
  leakCandidates.sort((a, b) => K[a.kpi].score - K[b.kpi].score);
  const worst = leakCandidates[0];
  const bottleneck = worst && K[worst.kpi].score < 65
    ? {
        ...worst,
        ...LEAK_TEXT[worst.kpi],
        label: K[worst.kpi].label,
        value: K[worst.kpi].value,
        unit: K[worst.kpi].unit,
        status: K[worst.kpi].status,
        goal: `${K[worst.kpi].higher ? '≥' : '≤'} ${fmt(K[worst.kpi].good, K[worst.kpi].unit)}`,
        stage: K[worst.kpi].stage,
      }
    : null;

  // ---- Insight ----
  const out = [];
  const add = (i) => out.push({ ...i, why: cap(i.why) });
  const sevOf = (...ids) => (ids.some((id) => S(id) === 'critical') ? 'critical' : 'warning');
  const highTicket = ok(v.aov) && v.aov >= cfg.highTicketAov;

  // 1) Orang di FYP tidak mampir masuk (pakai yang terburuk antara TTR total & via preview)
  const ttrIds = ['ttr', 'ttrPreview'].filter((id) => ok(K[id].value));
  const ttrId = ttrIds.sort((a, b) => K[a].score - K[b].score)[0] ?? 'ttr';
  const hookOk = ttrIds.length > 0 && ttrIds.every(fine);
  if (bad(ttrId)) {
    const contentOk = fine('avgViewDuration') || fine('retention1m');
    add({
      id: 'traffic-ttr', severity: sevOf(ttrId), stage: 'traffic',
      title: contentOk ? 'Isi live sudah bagus, tapi tampilan depannya kurang menarik' : 'Live muncul di FYP, tapi jarang yang mampir',
      why: `${ok(v.impressions) ? `Live kamu tampil ${angka(v.impressions)} kali di FYP, tapi` : 'Dari orang yang melihat live kamu di FYP,'} cuma ${perHundred(K[ttrId].value)} orang yang masuk (${normal(ttrId)}).` +
        (contentOk ? ' Yang sudah masuk justru betah — jadi yang perlu dibenahi adalah tampilan 3 detik pertama yang dilihat orang di FYP.' : ''),
      tech: tech(ttrId),
      metrics: [ttrId, 'impressions', 'views'],
      actions: [
        act('Admin', 'Kamera', 'Rapikan tampilan layar: produk & wajah host di tengah, lampu lebih terang, kamera lebih dekat. Orang di FYP melihat layar kecil — harus langsung jelas jual apa.'),
        act('Admin', 'Judul', 'Ganti judul live jadi promo yang jelas, contoh: "FLASH SALE 99RB sampai jam 9 malam" — jangan judul umum seperti "Live sore".'),
        act('Host', 'Script', 'Jangan ada momen diam. Selalu sedang demo, unboxing, atau mencoba produk — preview di FYP hanya menampilkan potongan beberapa detik.'),
        act('Admin', 'Setting', 'Tambahkan banner harga / tulisan promo besar di background yang terbaca dari layar HP.'),
      ],
    });
  }

  // 2) Penonton cepat pergi
  if (bad('avgViewDuration') || bad('retention1m')) {
    const parts = [];
    if (ok(v.avgViewDuration)) parts.push(`rata-rata orang cuma menonton ${durasi(v.avgViewDuration)}`);
    if (ok(v.retention1m)) parts.push(`hanya ${perHundred(v.retention1m)} orang yang bertahan lebih dari 1 menit`);
    const ref = ok(v.retention1m) ? 'retention1m' : 'avgViewDuration';
    add({
      id: 'retention', severity: sevOf('avgViewDuration', 'retention1m'), stage: 'retention',
      title: hookOk ? 'Banyak yang mampir, tapi cepat pergi — isi live belum menahan' : 'Penonton cepat keluar dari live',
      why: `${parts.join(', dan ')} (${ref === 'retention1m' ? normal('retention1m') : `normalnya minimal ${durasi(K.avgViewDuration.good)}`}). Kalau penonton cepat pergi, TikTok mengurangi kiriman penonton baru.`,
      tech: tech('avgViewDuration', 'retention1m'),
      metrics: ['avgViewDuration', 'retention1m', 'views1min'],
      actions: [
        act('Host', 'Script', 'Perbaiki script pembuka dan ulangi tiap 2–3 menit: "Yang baru masuk, hari ini ada promo ___, tunggu sampai jam ___ ada harga spesial!"'),
        act('Host', 'Script', 'Kasih alasan untuk bertahan: hitung mundur flash sale, kuis berhadiah, atau "giveaway di menit ke-30, jangan ke mana-mana!"'),
        act('Host', 'Energi', 'Naikkan energi host: sapa nama penonton yang masuk, jangan menunduk melihat HP terlalu lama.'),
        act('Admin', 'Kamera', 'Ganti angle / close-up produk setiap beberapa menit supaya layar tidak monoton.'),
      ],
    });
  }

  // 3) Penonton tidak klik keranjang
  if (bad('liveCtr') || bad('ctr') || bad('productExposure')) {
    const watching = fine('avgViewDuration') || fine('retention1m');
    const exposureBad = bad('productExposure');
    const ref = ok(v.liveCtr) ? 'liveCtr' : ok(v.ctr) ? 'ctr' : 'productExposure';
    add({
      id: 'interest', severity: sevOf('liveCtr', 'ctr', 'productExposure'), stage: 'interest',
      title: exposureBad ? 'Produk jarang ditampilkan ke penonton' : watching ? 'Penonton betah, tapi jarang buka keranjang kuning' : 'Penonton tidak tertarik klik produk',
      why: ref === 'productExposure'
        ? `Produk hanya muncul ke sekitar ${perHundred(v.productExposure)} penonton (${normal('productExposure')}).`
        : `Dari penonton yang masuk, cuma ${perHundred(K[ref].value)} yang klik produk (${normal(ref)}).` +
          (watching ? ' Penonton sudah betah — yang kurang adalah ajakan dan cara produk ditampilkan.' : ''),
      tech: tech('liveCtr', 'ctr', 'productExposure'),
      metrics: ['liveCtr', 'ctr', 'productExposure', 'productClicks'],
      actions: [
        act('Admin', 'Etalase', exposureBad
          ? 'Aktifkan keranjang dari awal live dan pin produk terus-menerus; ganti pin setiap host pindah produk.'
          : 'Pin produk yang sedang dibahas host, dan ganti pin setiap host pindah produk.'),
        act('Host', 'Script', 'Tambahkan ajakan klik yang jelas tiap 2–3 menit: "Klik keranjang kuning ya kak, nomor 3, yang warna hitam!"'),
        act('Admin', 'Etalase', 'Susun ulang etalase: taruh produk paling laku / paling murah di nomor 1–3, singkirkan produk yang jarang laku.'),
        act('Host', 'Script', 'Sebut harga dan potongannya dengan jelas sambil memegang produk dekat ke kamera.'),
      ],
    });
  }

  // 4) Banyak klik, sedikit yang beli
  if (bad('ctor') || (!ok(v.ctor) && bad('orderRate'))) {
    const interestOk = fine('liveCtr');
    const id = ok(v.ctor) ? 'ctor' : 'orderRate';
    const why = ok(v.productClicks) && ok(v.orders)
      ? `Produk diklik ${angka(v.productClicks)} kali, tapi cuma jadi ${angka(v.orders)} pesanan — sekitar ${perHundred(K[id].value)} klik (${normal(id)}).`
      : `Hanya ${perHundred(K[id].value)} ${id === 'ctor' ? 'klik' : 'penonton'} yang jadi pesanan (${normal(id)}).`;
    const actions = [
      act('Admin', 'Promo', 'Cek harga di keranjang: harus sama atau lebih murah dari yang disebut host. Pasang voucher toko / potongan ongkir khusus live.'),
      act('Host', 'Script', 'Perbaiki script closing: harga coret → harga live → bonus → batas waktu. Contoh: "Normalnya 250 ribu, khusus live 199 ribu plus bonus pouch, cuma sampai jam 9!"'),
      act('Host', 'Script', 'Jawab keraguan sebelum ditanya: garansi, bisa COD, ongkir, pilihan ukuran/warna, dan tunjukkan review pembeli.'),
      act('Admin', 'Promo', 'Buat flash sale 5–10 menit dan umumkan sisa stok: "Tinggal 5 lagi ya kak!"'),
    ];
    if (highTicket) {
      actions.splice(2, 0, act('Admin', 'Etalase', `Harga rata-rata ${rupiah(v.aov)} per pesanan termasuk tinggi. Tambahkan pilihan lebih murah di etalase (paket kecil / ukuran mini) dan tawarkan cicilan / PayLater.`));
    } else {
      actions.push(act('Host', 'Script', 'Peragakan cara checkout di layar: klik keranjang → pilih varian → pakai voucher → bayar.'));
    }
    add({
      id: 'conversion', severity: sevOf(id), stage: 'conversion',
      title: interestOk ? 'Banyak yang klik produk, tapi hampir tidak ada yang checkout' : 'Sedikit sekali yang membeli',
      why: why + (interestOk ? ' Orang sudah tertarik, tapi ada yang membuat ragu membayar — biasanya harga, promo, ongkir, atau kepercayaan.' : ''),
      tech: tech(id, 'aov'),
      metrics: [id, 'productClicks', 'orders', 'aov'],
      actions,
    });
  }

  // 5) Pesanan belum dibayar
  if (bad('paymentRate')) {
    add({
      id: 'payment', severity: sevOf('paymentRate'), stage: 'conversion',
      title: 'Banyak pesanan yang belum dibayar',
      why: `Cuma ${perHundred(v.paymentRate)} pesanan yang benar-benar dibayar (${normal('paymentRate')}).` +
        (ok(paid) && ok(v.orders) ? ` Sekitar ${angka(v.orders - paid)} pesanan masih menggantung.` : ''),
      tech: tech('paymentRate'),
      metrics: ['paymentRate', 'orders'],
      actions: [
        act('Host', 'Script', 'Ingatkan berkala: "Yang sudah checkout langsung dibayar ya kak, promonya cuma sampai jam ___!"'),
        act('Admin', 'Toko', 'Pastikan COD, e-wallet, dan PayLater aktif di toko.'),
        act('Admin', 'Follow up', 'Setelah live, chat pembeli yang belum bayar dan ingatkan batas waktunya.'),
      ],
    });
  }

  // 6) Iklan
  if (ok(v.roi)) {
    const est = source.roi === 'estimate' ? ' (perkiraan dari omzet total ÷ biaya iklan)' : '';
    if (S('roi') === 'critical') {
      add({
        id: 'ads-loss', severity: 'critical', stage: 'ads',
        title: 'Iklan sedang rugi',
        why: `Setiap Rp1 untuk iklan hanya kembali ${perRupiah(v.roi)}${est}, di bawah titik impas toko ${perRupiah(cfg.breakEvenRoi)}. Biaya iklan live ini ${rupiah(v.adsCost)}.`,
        tech: tech('roi', 'tacos'),
        metrics: ['roi', 'adsCost', 'tacos'],
        actions: [
          act('Owner', 'Iklan', 'Turunkan budget GMV Max hari ini, atau naikkan target ROI-nya.'),
          act('Owner', 'Iklan', 'Pakai iklan hanya untuk produk yang paling laku.'),
          act('Host', 'Evaluasi', 'Benahi cara jualan di live dulu (lihat saran lain) — iklan hanya memperbesar hasil yang sudah ada.'),
        ],
      });
    } else if (S('roi') === 'warning') {
      add({
        id: 'ads-below', severity: 'warning', stage: 'ads',
        title: 'Iklan belum mencapai target',
        why: `Setiap Rp1 iklan kembali ${perRupiah(v.roi)}${est}, target toko ${perRupiah(cfg.targetRoi)}.`,
        tech: tech('roi'),
        metrics: ['roi', 'adsCost'],
        actions: [
          act('Owner', 'Iklan', 'Kurangi budget iklan di jam sepi, nyalakan lagi saat live sedang ramai.'),
          act('Owner', 'Iklan', 'Naikkan target ROI di GMV Max supaya iklan lebih selektif.'),
        ],
      });
    } else if (S('roi') === 'good' && ok(v.adsCost)) {
      add({
        id: 'ads-scale', severity: 'info', stage: 'ads',
        title: 'Iklan sangat untung — saatnya tambah budget',
        why: `Setiap Rp1 iklan kembali ${perRupiah(v.roi)}${est}, jauh di atas target toko ${perRupiah(cfg.targetRoi)}.`,
        tech: tech('roi'),
        metrics: ['roi', 'adsCost'],
        actions: [
          act('Owner', 'Iklan', `Naikkan budget GMV Max pelan-pelan, 20–30% dulu, sambil cek hasilnya tetap di atas ${perRupiah(cfg.targetRoi)} per Rp1.`),
          act('Owner', 'Iklan', 'Fokuskan budget di jam live yang paling ramai.'),
        ],
      });
    }
  }

  // 7) Interaksi
  const engBad = ['commentRate', 'followRate', 'shareRate'].filter(bad);
  if (engBad.length) {
    const words = { commentRate: 'komentar', followRate: 'follow', shareRate: 'share' };
    add({
      id: 'engagement', severity: engBad.some((id) => S(id) === 'critical') && engBad.length >= 2 ? 'critical' : 'warning', stage: 'engagement',
      title: 'Live sepi interaksi, TikTok jadi kurang mendorong',
      why: engBad.map((id) => `cuma ${perHundred(K[id].value)} penonton yang ${words[id]}`).join(', ') +
        '. Komentar, follow, dan share adalah sinyal ke TikTok bahwa live kamu layak dikirim ke lebih banyak orang.',
      tech: tech(...engBad),
      metrics: engBad,
      actions: [
        act('Host', 'Script', 'Pancing komentar dengan pertanyaan gampang: "Ketik 1 kalau mau warna hitam, ketik 2 kalau putih!"'),
        act('Host', 'Interaksi', 'Balas komentar sambil menyebut nama: "Makasih kak Rina, ini aku tunjukin ya…"'),
        act('Admin', 'Promo', 'Adakan giveaway kecil untuk yang komentar + follow, umumkan pemenangnya di live.'),
        act('Host', 'Script', 'Ajak follow dengan alasan: "Follow dulu biar dapat notif flash sale besok!"'),
      ],
    });
  } else if (['commentRate', 'followRate'].every((id) => S(id) === 'good') && (bad('ctor') || bad('liveCtr'))) {
    add({
      id: 'engaged-not-buying', severity: 'warning', stage: 'conversion',
      title: 'Penonton ramai, tapi datang untuk hiburan — bukan belanja',
      why: 'Komentar dan follow bagus, tapi yang klik atau membeli sedikit.',
      tech: tech('commentRate', 'liveCtr', 'ctor'),
      metrics: ['commentRate', 'liveCtr', 'ctor'],
      actions: [
        act('Host', 'Script', 'Kurangi obrolan di luar topik, arahkan setiap obrolan kembali ke produk.'),
        act('Admin', 'Etalase', 'Coba produk lain yang lebih cocok dengan penonton yang aktif ini.'),
      ],
    });
  }

  // 8) Ukuran keranjang
  if (ok(v.itemsPerOrder) && ok(v.orders) && v.orders >= 5) {
    if (v.itemsPerOrder < 1.15) {
      add({
        id: 'basket', severity: 'info', stage: 'conversion',
        title: 'Pembeli cuma ambil 1 barang',
        why: `Rata-rata hanya ${v.itemsPerOrder.toLocaleString('id-ID', { maximumFractionDigits: 1 })} barang per pesanan.`,
        tech: `Item per order ${v.itemsPerOrder.toFixed(2)}`,
        metrics: ['itemsPerOrder', 'itemsSold', 'orders'],
        actions: [
          act('Admin', 'Etalase', 'Buat paket bundling "Beli 2 lebih hemat" dan taruh di etalase nomor 1.'),
          act('Host', 'Script', 'Tawarkan produk pelengkap: "Sekalian sama ___-nya kak, tambah 20 ribu aja."'),
        ],
      });
    } else if (v.itemsPerOrder >= 1.6) {
      add({
        id: 'basket-good', severity: 'good', stage: 'conversion',
        title: 'Paket bundling jalan — pertahankan',
        why: `Rata-rata ${v.itemsPerOrder.toLocaleString('id-ID', { maximumFractionDigits: 1 })} barang per pesanan.`,
        tech: `Item per order ${v.itemsPerOrder.toFixed(2)}`,
        metrics: ['itemsPerOrder'],
        actions: [],
      });
    }
  }

  // 9) Dibanding median live sebelumnya
  if (hasHistory) {
    const rows = [
      ...kpis.filter((k) => ok(k.delta)).map((k) => ({ id: k.id, label: k.label, plain: k.plain, unit: k.unit, higher: k.higher, value: k.value, median: k.median, delta: k.delta })),
      ...TREND_METRICS.map((t) => {
        const m = med(t.id);
        return ok(v[t.id]) && ok(m) && m !== 0 ? { ...t, value: v[t.id], median: m, delta: (v[t.id] - m) / Math.abs(m) } : null;
      }).filter(Boolean),
    ];
    const worse = rows.filter((r) => (r.higher ? -r.delta : r.delta) >= cfg.deviationThreshold)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    const better = rows.filter((r) => (r.higher ? r.delta : -r.delta) >= cfg.deviationThreshold)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    const line = (r) => `${r.plain}: ${plainValue(r.value, r.unit)}, biasanya ${plainValue(r.median, r.unit)} (${change(r.delta)})`;
    const techLine = (r) => `${r.label} ${fmt(r.value, r.unit)} vs median ${fmt(r.median, r.unit)}`;
    if (worse.length) {
      add({
        id: 'vs-history-down', severity: worse.some((r) => Math.abs(r.delta) >= 0.5) ? 'critical' : 'warning', stage: 'history',
        title: `Lebih jelek dari biasanya (dibanding ${recent.length} live terakhir)`,
        why: worse.slice(0, 4).map(line).join('. ') + '.',
        tech: worse.slice(0, 4).map(techLine).join(' · '),
        metrics: worse.map((r) => r.id),
        actions: [
          act('Owner', 'Evaluasi', 'Bandingkan dengan live terbaikmu: apa yang beda — host, jam tayang, produk, promo, atau budget iklan?'),
          act('Admin', 'Evaluasi', 'Kalau hari ini ganti host / produk / jam, coba kembali ke format live yang biasanya berhasil.'),
        ],
      });
    }
    if (better.length) {
      add({
        id: 'vs-history-up', severity: 'good', stage: 'history',
        title: 'Lebih bagus dari biasanya — catat resepnya',
        why: better.slice(0, 4).map(line).join('. ') + '.',
        tech: better.slice(0, 4).map(techLine).join(' · '),
        metrics: better.map((r) => r.id),
        actions: [act('Admin', 'Catatan', 'Tulis di catatan live apa yang beda hari ini (host, promo, produk, jam) supaya bisa diulang.')],
      });
    }
  }

  // 10) Momentum dalam satu live (butuh ≥ 2 snapshot + jam mulai, atau ≥ 3 snapshot)
  const momentum = momentumOf(snapshots);
  if (momentum) {
    if (momentum.gmvChange <= -0.4) {
      add({
        id: 'momentum-down', severity: 'warning', stage: 'momentum',
        title: `Penjualan melambat di ${momentum.minutes} menit terakhir`,
        why: `Omzet per jam sekarang ${rupiah(momentum.lastGmvRate)}, ${change(momentum.gmvChange)} dibanding sebelumnya.`,
        tech: `GMV/jam interval terakhir ${fmt(momentum.lastGmvRate, 'currency')} vs ${fmt(momentum.prevGmvRate, 'currency')}`,
        metrics: ['gmv', 'gmvPerHour'],
        actions: [
          act('Admin', 'Promo', 'Lakukan "reset" sekarang: flash sale kilat 5 menit atau giveaway.'),
          act('Host', 'Etalase', 'Pindah membahas produk yang paling laku.'),
          act('Owner', 'Host', 'Kalau host sudah kelihatan lelah, pertimbangkan ganti / rotasi host.'),
        ],
      });
    } else if (momentum.gmvChange >= 0.4) {
      add({
        id: 'momentum-up', severity: 'good', stage: 'momentum',
        title: `Penjualan sedang naik di ${momentum.minutes} menit terakhir`,
        why: `Omzet per jam sekarang ${rupiah(momentum.lastGmvRate)}, ${change(momentum.gmvChange)} dibanding sebelumnya.`,
        tech: `GMV/jam interval terakhir ${fmt(momentum.lastGmvRate, 'currency')} vs ${fmt(momentum.prevGmvRate, 'currency')}`,
        metrics: ['gmv'],
        actions: [act('Host', 'Script', 'Jangan ubah formula: pertahankan produk & cara bicara sekarang. Ini waktu yang pas untuk menambah budget iklan.')],
      });
    }
  }

  // 11) Kekuatan
  const strengths = kpis.filter((k) => k.status === 'good');
  if (strengths.length) {
    add({
      id: 'strengths', severity: 'good', stage: 'summary',
      title: 'Yang sudah bagus — pertahankan',
      why: strengths.map((k) => `${k.plain}: ${k.id === 'roi' ? perRupiah(k.value) : plainValue(k.value, k.unit)}`).join(' · '),
      tech: strengths.map((k) => `${k.label} ${fmt(k.value, k.unit)}`).join(' · '),
      metrics: strengths.map((k) => k.id),
      actions: [],
    });
  }

  // 12) Kelengkapan data
  const missing = CORE_16.filter((m) => !ok(reported?.[m.id]) && !ok(v[m.id]));
  if (missing.length) {
    add({
      id: 'coverage', severity: 'info', stage: 'data',
      title: `Saran bisa lebih tajam: ${missing.length} metrik belum dicentang`,
      why: `Centang ini di dashboard TikTok: ${missing.map((m) => m.label).join(', ')}.`,
      tech: `${16 - missing.length} dari 16 metrik inti tersedia`,
      metrics: missing.map((m) => m.id),
      actions: [],
    });
  }

  // Urutan: tingkat keparahan, lalu masalah utama (bottleneck) paling depan.
  const LEAK_INSIGHT = { ttr: 'traffic-ttr', ttrPreview: 'traffic-ttr', retention1m: 'retention', avgViewDuration: 'retention', liveCtr: 'interest', ctor: 'conversion', paymentRate: 'payment' };
  const mainId = bottleneck ? LEAK_INSIGHT[bottleneck.kpi] : null;
  out.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || (b.id === mainId) - (a.id === mainId));

  // ---- Aksi prioritas: aksi pertama dari tiap masalah terberat, topik tidak dobel ----
  const actionsNow = [];
  const seen = new Set();
  const push = (a) => {
    if (actionsNow.length >= 3 || seen.has(a.text)) return;
    seen.add(a.text);
    actionsNow.push(a);
  };
  for (const i of out) if (i.severity === 'critical' || i.severity === 'warning') if (i.actions[0]) push(i.actions[0]);
  for (const i of out) if (i.severity !== 'good') i.actions.slice(1).forEach(push);

  const summary = buildSummary({ health, bottleneck, strengths });

  return {
    values: v, source, kpis, stages, health, funnel, bottleneck, insights: out, actionsNow, summary, momentum,
    coverage: { have: 16 - missing.length, missing: missing.map((m) => m.id) },
    historyCount: recent.length,
  };
}

const VERDICT = {
  good: 'Live ini sehat.',
  ok: 'Live ini cukup baik, masih bisa ditingkatkan.',
  warning: 'Live ini perlu dibenahi.',
  critical: 'Live ini sedang bermasalah.',
};

function buildSummary({ health, bottleneck, strengths }) {
  if (!ok(health.score)) return 'Angka belum cukup untuk menilai live ini. Centang 16 metrik inti di dashboard TikTok.';
  const parts = [VERDICT[health.key] || ''];
  if (bottleneck) parts.push(`Masalah utama: ${bottleneck.headline.toLowerCase()} — ${bottleneck.fix}.`);
  if (strengths.length) parts.push(`Yang sudah bagus: ${strengths.slice(0, 2).map((k) => lowerFirst(k.plain)).join(' dan ')}.`);
  return parts.join(' ');
}

/** Bandingkan laju GMV di interval terakhir vs interval sebelumnya dalam satu live. */
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
