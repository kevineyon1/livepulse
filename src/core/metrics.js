// Katalog metrik TikTok LIVE Dashboard.
// - `rec`  : urutan di "16 metrik inti" yang wajib dicentang di dashboard TikTok.
// - `header`: selalu tampil di kartu atas dashboard (tidak memakai slot 16).
// - `aliases`: variasi teks yang mungkin terbaca OCR / bahasa lain.
// Unit: count | currency | percent | duration (detik) | ratio

export const GROUPS = {
  revenue: { label: 'Penjualan', icon: 'coin' },
  traffic: { label: 'Traffic', icon: 'eye' },
  retention: { label: 'Retensi', icon: 'clock' },
  interest: { label: 'Minat Produk', icon: 'tap' },
  conversion: { label: 'Konversi', icon: 'cart' },
  ads: { label: 'Iklan', icon: 'bolt' },
  engagement: { label: 'Interaksi', icon: 'chat' },
};

export const METRICS = [
  // ---- Kartu header (gratis, selalu tampil) ----
  { id: 'gmv', label: 'Attributed GMV', unit: 'currency', group: 'revenue', header: true,
    aliases: ['attributed gmv (rp)', 'attributed gmv'],
    desc: 'Total nilai penjualan yang diatribusikan ke LIVE ini.' },
  { id: 'itemsSold', label: 'Attributed items sold', unit: 'count', group: 'conversion', header: true,
    aliases: ['attributed items sold', 'items sold'],
    desc: 'Jumlah unit produk terjual dari LIVE.' },
  { id: 'currentViewers', label: 'Current viewers', unit: 'count', group: 'traffic', header: true,
    aliases: ['current viewers'],
    desc: 'Penonton yang sedang menonton saat screenshot diambil.' },

  // ---- 16 metrik inti ----
  { id: 'impressions', rec: 1, label: 'Impressions', unit: 'count', group: 'traffic', tiktokGroup: 'Traffic Efficiency',
    desc: 'Berapa kali LIVE kamu muncul di layar orang (FYP, feed, LIVE tab). Ini "jatah" dorongan algoritma.' },
  { id: 'views', rec: 2, label: 'Views', unit: 'count', group: 'traffic', tiktokGroup: 'Traffic Efficiency',
    desc: 'Berapa kali orang benar-benar masuk ke room LIVE.' },
  { id: 'ttrPreview', rec: 3, label: 'Tap-through rate (via LIVE preview)', unit: 'percent', group: 'traffic', tiktokGroup: 'Traffic Efficiency',
    aliases: ['tap-through rate (via live preview)', 'tap through rate (via live preview)', 'via live preview'],
    desc: '% orang yang tap masuk dari preview LIVE di For You. Cermin kualitas "etalase" 3 detik pertama.' },
  { id: 'avgViewDuration', rec: 4, label: 'Avg. viewing duration per view', unit: 'duration', group: 'retention', tiktokGroup: 'Traffic Efficiency',
    aliases: ['avg. viewing duration per view', 'avg viewing duration per view'],
    desc: 'Rata-rata lama orang bertahan tiap kali masuk. Sinyal terkuat ke algoritma bahwa live kamu menarik.' },
  { id: 'views1min', rec: 5, label: '> 1 min. views', unit: 'count', group: 'retention', tiktokGroup: 'Traffic Efficiency',
    aliases: ['> 1 min. views', '>1 min. views', '1 min. views', '> 1 min views'],
    desc: 'Jumlah view yang bertahan lebih dari 1 menit — calon pembeli serius.' },
  { id: 'productImpressions', rec: 6, label: 'Product impressions', unit: 'count', group: 'interest', tiktokGroup: 'Traffic Efficiency',
    aliases: ['product impressions'],
    desc: 'Berapa kali produk (keranjang / pin) terlihat oleh penonton.' },
  { id: 'productClicks', rec: 7, label: 'Product clicks', unit: 'count', group: 'interest', tiktokGroup: 'Traffic Efficiency',
    aliases: ['product clicks'],
    desc: 'Berapa kali produk diklik. Tanda minat beli.' },
  { id: 'orders', rec: 8, label: 'Attributed orders', unit: 'count', group: 'conversion', tiktokGroup: 'Transaction',
    aliases: ['attributed orders'],
    desc: 'Jumlah pesanan dari LIVE.' },
  { id: 'customers', rec: 9, label: 'Customers', unit: 'count', group: 'conversion', tiktokGroup: 'Transaction',
    desc: 'Jumlah pembeli unik.' },
  { id: 'paymentRate', rec: 10, label: 'Payment Rate', unit: 'percent', group: 'conversion', tiktokGroup: 'Transaction',
    aliases: ['payment rate'],
    desc: '% pesanan yang benar-benar dibayar. Rendah = banyak checkout yang menggantung.' },
  { id: 'gmvPerHour', rec: 11, label: 'GMV per hour', unit: 'currency', group: 'revenue', tiktokGroup: 'Traffic Efficiency',
    aliases: ['gmv per hour'],
    desc: 'Penjualan per jam. Pembanding paling adil antar live yang durasinya beda.' },
  { id: 'adsCost', rec: 12, label: 'Ads Cost', unit: 'currency', group: 'ads', tiktokGroup: 'Ads',
    aliases: ['ads cost'],
    desc: 'Biaya iklan (GMV Max / LIVE ads) selama live.' },
  { id: 'roi', rec: 13, label: 'GMV Max ROI', unit: 'ratio', group: 'ads', tiktokGroup: 'Ads',
    aliases: ['gmv max roi'],
    desc: 'GMV dari iklan ÷ biaya iklan. Di bawah titik impas = iklan rugi.' },
  { id: 'newFollowers', rec: 14, label: 'New followers', unit: 'count', group: 'engagement', tiktokGroup: 'Interactions',
    aliases: ['new followers'],
    desc: 'Follower baru selama live. Aset traffic untuk live berikutnya.' },
  { id: 'comments', rec: 15, label: 'Comments', unit: 'count', group: 'engagement', tiktokGroup: 'Interactions',
    desc: 'Jumlah komentar. Interaksi = bahan bakar algoritma LIVE.' },
  { id: 'shares', rec: 16, label: 'Shares', unit: 'count', group: 'engagement', tiktokGroup: 'Interactions',
    desc: 'Jumlah share. Membawa traffic gratis dari luar FYP.' },

  // ---- Opsional: dikenali bila ada di screenshot, tapi bisa dihitung sistem ----
  { id: 'ttr', label: 'Tap-through rate', unit: 'percent', group: 'traffic', aliases: ['tap-through rate', 'tap through rate'] },
  { id: 'liveCtr', label: 'LIVE CTR', unit: 'percent', group: 'interest', aliases: ['live ctr'] },
  { id: 'ctr', label: 'CTR', unit: 'percent', group: 'interest' },
  { id: 'ctorSku', label: 'CTOR (SKU orders)', unit: 'percent', group: 'conversion', aliases: ['ctor (sku orders)'] },
  { id: 'ctor', label: 'CTOR', unit: 'percent', group: 'conversion' },
  { id: 'orderRateSku', label: 'Order rate (SKU orders)', unit: 'percent', group: 'conversion', aliases: ['order rate (sku orders)'] },
  { id: 'skuOrders', label: 'Attributed SKU orders', unit: 'count', group: 'conversion', aliases: ['attributed sku orders'] },
  { id: 'aov', label: 'AOV', unit: 'currency', group: 'revenue', aliases: ['aqv', 'a0v'] },
  { id: 'estGmv', label: 'Est. GMV', unit: 'currency', group: 'revenue', aliases: ['est. gmv', 'est gmv'] },
  { id: 'gmvSubsidies', label: 'GMV with subsidies', unit: 'currency', group: 'revenue', aliases: ['gmv with subsidies'] },
  { id: 'avgViewDurationAll', label: 'Avg. viewing duration', unit: 'duration', group: 'retention', aliases: ['avg. viewing duration', 'avg viewing duration'] },
  { id: 'showGpm', label: 'Show GPM', unit: 'currency', group: 'revenue', aliases: ['show gpm'] },
  { id: 'watchGpm', label: 'Watch GPM', unit: 'currency', group: 'revenue', aliases: ['watch gpm'] },
  { id: 'impressionsPerHour', label: 'Impressions per hour', unit: 'count', group: 'traffic', aliases: ['impressions per hour'] },
  { id: 'likes', label: 'Likes', unit: 'count', group: 'engagement' },
  { id: 'commentRate', label: 'Comment rate', unit: 'percent', group: 'engagement', aliases: ['comment rate'] },
  { id: 'followRate', label: 'Follow rate', unit: 'percent', group: 'engagement', aliases: ['follow rate'] },
  { id: 'likeRate', label: 'Like rate', unit: 'percent', group: 'engagement', aliases: ['like rate'] },
  { id: 'shareRate', label: 'Share rate', unit: 'percent', group: 'engagement', aliases: ['share rate'] },
];

export const METRIC_BY_ID = Object.fromEntries(METRICS.map((m) => [m.id, m]));
export const CORE_16 = METRICS.filter((m) => m.rec).sort((a, b) => a.rec - b.rec);
export const HEADER_METRICS = METRICS.filter((m) => m.header);
export const OPTIONAL_METRICS = METRICS.filter((m) => !m.rec && !m.header);

// Metrik turunan yang dihitung sistem (tidak perlu dipilih di dashboard).
export const DERIVED = {
  ttr: { label: 'Tap-through rate', unit: 'percent', formula: 'Views ÷ Impressions' },
  retention1m: { label: 'Retensi > 1 menit', unit: 'percent', formula: '> 1 min. views ÷ Views' },
  productExposure: { label: 'Exposure produk', unit: 'percent', formula: 'Product impressions ÷ Views' },
  liveCtr: { label: 'LIVE CTR', unit: 'percent', formula: 'Product clicks ÷ Views' },
  ctr: { label: 'CTR produk', unit: 'percent', formula: 'Product clicks ÷ Product impressions' },
  ctor: { label: 'CTOR', unit: 'percent', formula: 'Orders ÷ Product clicks' },
  orderRate: { label: 'Order rate', unit: 'percent', formula: 'Orders ÷ Views' },
  aov: { label: 'AOV', unit: 'currency', formula: 'GMV ÷ Orders' },
  watchGpm: { label: 'Watch GPM', unit: 'currency', formula: 'GMV ÷ Views × 1.000' },
  showGpm: { label: 'Show GPM', unit: 'currency', formula: 'GMV ÷ Impressions × 1.000' },
  itemsPerOrder: { label: 'Item per order', unit: 'ratio', formula: 'Items sold ÷ Orders' },
  ordersPerCustomer: { label: 'Order per pembeli', unit: 'ratio', formula: 'Orders ÷ Customers' },
  tacos: { label: 'Rasio biaya iklan', unit: 'percent', formula: 'Ads Cost ÷ GMV' },
  durationHours: { label: 'Durasi live (estimasi)', unit: 'hours', formula: 'GMV ÷ GMV per hour' },
  followRate: { label: 'Follow rate', unit: 'percent', formula: 'New followers ÷ Views' },
  commentRate: { label: 'Comment rate', unit: 'percent', formula: 'Comments ÷ Views' },
  shareRate: { label: 'Share rate', unit: 'percent', formula: 'Shares ÷ Views' },
};

export function labelOf(id) {
  return METRIC_BY_ID[id]?.label ?? DERIVED[id]?.label ?? id;
}

export function unitOf(id) {
  return METRIC_BY_ID[id]?.unit ?? DERIVED[id]?.unit ?? 'count';
}
