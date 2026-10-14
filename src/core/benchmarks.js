// Patokan (benchmark) awal untuk live commerce TikTok Shop.
// Angka ini titik awal yang wajar, BUKAN angka resmi TikTok — tiap kategori & harga
// produk berbeda. Admin bisa mengubahnya di Pengaturan, dan sistem juga selalu
// membandingkan dengan median live kamu sendiri.

export const STAGES = {
  traffic: { label: 'Traffic', short: 'Orang masuk', weight: 0.2 },
  retention: { label: 'Retensi', short: 'Orang bertahan', weight: 0.2 },
  interest: { label: 'Minat produk', short: 'Orang klik produk', weight: 0.2 },
  conversion: { label: 'Konversi', short: 'Orang membeli', weight: 0.25 },
  ads: { label: 'Efisiensi iklan', short: 'Iklan untung', weight: 0.08 },
  engagement: { label: 'Interaksi', short: 'Orang ikut ramai', weight: 0.07 },
};

/**
 * critical / warning / good: ambang batas. higher=true → makin tinggi makin bagus.
 * Status: < critical = kritis, < warning = waspada, < good = cukup, ≥ good = bagus.
 */
export const DEFAULT_KPIS = [
  { id: 'ttr', stage: 'traffic', label: 'Tap-through rate', unit: 'percent', higher: true, critical: 2, warning: 4, good: 8,
    why: 'Dari semua orang yang melihat live kamu di feed, berapa persen yang masuk.' },
  { id: 'ttrPreview', stage: 'traffic', label: 'TTR via LIVE preview', unit: 'percent', higher: true, critical: 2, warning: 4, good: 7,
    why: 'Daya tarik preview live di For You (3 detik pertama yang terlihat orang).' },
  { id: 'avgViewDuration', stage: 'retention', label: 'Rata-rata durasi tonton', unit: 'duration', higher: true, critical: 15, warning: 30, good: 60,
    why: 'Lama orang bertahan per kunjungan — sinyal utama ke algoritma.' },
  { id: 'retention1m', stage: 'retention', label: 'Retensi > 1 menit', unit: 'percent', higher: true, critical: 5, warning: 10, good: 20,
    why: 'Persentase view yang bertahan lebih dari 1 menit.' },
  { id: 'productExposure', stage: 'interest', label: 'Exposure produk', unit: 'percent', higher: true, critical: 25, warning: 50, good: 90,
    why: 'Seberapa sering produk benar-benar ditampilkan ke penonton.' },
  { id: 'liveCtr', stage: 'interest', label: 'LIVE CTR', unit: 'percent', higher: true, critical: 5, warning: 10, good: 20,
    why: 'Dari penonton yang masuk, berapa persen yang klik produk.' },
  { id: 'ctr', stage: 'interest', label: 'CTR produk', unit: 'percent', higher: true, critical: 3, warning: 6, good: 12,
    why: 'Dari produk yang terlihat, berapa persen yang diklik.' },
  { id: 'ctor', stage: 'conversion', label: 'CTOR (klik → order)', unit: 'percent', higher: true, critical: 1, warning: 3, good: 6,
    why: 'Dari klik produk, berapa persen jadi pesanan.' },
  { id: 'orderRate', stage: 'conversion', label: 'Order rate', unit: 'percent', higher: true, critical: 0.3, warning: 1, good: 2.5,
    why: 'Dari semua view, berapa persen yang memesan.' },
  { id: 'paymentRate', stage: 'conversion', label: 'Payment rate', unit: 'percent', higher: true, critical: 70, warning: 85, good: 92,
    why: 'Pesanan yang benar-benar dibayar.' },
  { id: 'roi', stage: 'ads', label: 'GMV Max ROI', unit: 'ratio', higher: true, critical: 'breakEvenRoi', warning: 'targetRoi', good: 'goodRoi',
    why: 'Penjualan dari iklan per Rp1 biaya iklan.' },
  { id: 'tacos', stage: 'ads', label: 'Rasio biaya iklan', unit: 'percent', higher: false, critical: 33, warning: 20, good: 10,
    why: 'Biaya iklan sebagai % dari GMV. Makin kecil makin sehat.' },
  { id: 'followRate', stage: 'engagement', label: 'Follow rate', unit: 'percent', higher: true, critical: 0.3, warning: 1, good: 2,
    why: 'Penonton yang jadi follower baru.' },
  { id: 'commentRate', stage: 'engagement', label: 'Comment rate', unit: 'percent', higher: true, critical: 1, warning: 3, good: 8,
    why: 'Komentar per view. Live ramai komentar didorong algoritma.' },
  { id: 'shareRate', stage: 'engagement', label: 'Share rate', unit: 'percent', higher: true, critical: 0.1, warning: 0.3, good: 1,
    why: 'Share per view. Share membawa penonton baru gratis.' },
];

export const DEFAULT_SETTINGS = {
  breakEvenRoi: 3,
  targetRoi: 6,
  historyWindow: 10,
  deviationThreshold: 0.3,
  highTicketAov: 500000,
};

/** Gabungkan default dengan override dari Pengaturan; ROI memakai angka target toko. */
export function resolveKpis(overrides = {}, settings = DEFAULT_SETTINGS) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  return DEFAULT_KPIS.map((k) => {
    const o = overrides[k.id] || {};
    const pick = (key) => {
      const v = o[key] ?? k[key];
      if (v === 'breakEvenRoi') return s.breakEvenRoi;
      if (v === 'targetRoi') return s.targetRoi;
      if (v === 'goodRoi') return s.targetRoi * 1.5;
      return v;
    };
    return { ...k, critical: pick('critical'), warning: pick('warning'), good: pick('good') };
  });
}

export const STATUS = {
  critical: { label: 'Kritis', rank: 0 },
  warning: { label: 'Waspada', rank: 1 },
  ok: { label: 'Cukup', rank: 2 },
  good: { label: 'Bagus', rank: 3 },
};

export function statusOf(kpi, v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  if (kpi.higher) {
    if (v < kpi.critical) return 'critical';
    if (v < kpi.warning) return 'warning';
    if (v < kpi.good) return 'ok';
    return 'good';
  }
  if (v > kpi.critical) return 'critical';
  if (v > kpi.warning) return 'warning';
  if (v > kpi.good) return 'ok';
  return 'good';
}

/** Skor 0–100 piecewise-linear di antara ambang. */
export function scoreOf(kpi, v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  const lerp = (x, x0, x1, y0, y1) => y0 + ((x - x0) / (x1 - x0 || 1)) * (y1 - y0);
  const { critical: c, warning: w, good: g } = kpi;
  let s;
  if (kpi.higher) {
    if (v <= 0) s = 0;
    else if (v < c) s = lerp(v, 0, c, 0, 25);
    else if (v < w) s = lerp(v, c, w, 25, 50);
    else if (v < g) s = lerp(v, w, g, 50, 80);
    else s = lerp(Math.min(v, g * 1.6), g, g * 1.6, 80, 100);
  } else {
    if (v >= c * 1.5) s = 0;
    else if (v > c) s = lerp(v, c * 1.5, c, 0, 25);
    else if (v > w) s = lerp(v, c, w, 25, 50);
    else if (v > g) s = lerp(v, w, g, 50, 80);
    else s = lerp(Math.max(v, g * 0.4), g, g * 0.4, 80, 100);
  }
  return Math.max(0, Math.min(100, s));
}
