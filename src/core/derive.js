// Mesin turunan: dari metrik yang terbaca, hitung semua rasio funnel.
// Bekerja dua arah — kalau dashboard hanya menampilkan rasio (mis. TTR & Views),
// sistem bisa menghitung balik angka mentahnya (Impressions = Views ÷ TTR).
// Nilai yang dilaporkan TikTok selalu didahulukan daripada hasil hitung.

const ok = (v) => typeof v === 'number' && Number.isFinite(v);
const pos = (v) => ok(v) && v > 0;

// [target, dependensi, fungsi]. Urutan tidak penting; solver mengulang sampai stabil.
const RULES = [
  // Traffic
  ['ttr', ['views', 'impressions'], (v, i) => (v / i) * 100],
  ['impressions', ['views', 'ttr'], (v, t) => v / (t / 100)],
  ['views', ['impressions', 'ttr'], (i, t) => i * (t / 100)],
  ['showGpm', ['gmv', 'impressions'], (g, i) => (g / i) * 1000],
  ['watchGpm', ['gmv', 'views'], (g, v) => (g / v) * 1000],
  ['gmv', ['watchGpm', 'views'], (w, v) => (w * v) / 1000],

  // Retensi
  ['retention1m', ['views1min', 'views'], (a, v) => (a / v) * 100],
  ['views1min', ['retention1m', 'views'], (r, v) => (r / 100) * v],

  // Minat produk
  ['liveCtr', ['productClicks', 'views'], (c, v) => (c / v) * 100],
  ['productClicks', ['liveCtr', 'views'], (r, v) => (r / 100) * v],
  ['ctr', ['productClicks', 'productImpressions'], (c, p) => (c / p) * 100],
  ['productImpressions', ['productClicks', 'ctr'], (c, r) => c / (r / 100)],
  ['productExposure', ['productImpressions', 'views'], (p, v) => (p / v) * 100],

  // Konversi
  ['ctor', ['orders', 'productClicks'], (o, c) => (o / c) * 100],
  ['orders', ['ctor', 'productClicks'], (r, c) => (r / 100) * c],
  ['ctorSku', ['skuOrders', 'productClicks'], (o, c) => (o / c) * 100],
  ['skuOrders', ['orderRateSku', 'views'], (r, v) => (r / 100) * v],
  ['orderRate', ['orders', 'views'], (o, v) => (o / v) * 100],
  ['aov', ['gmv', 'orders'], (g, o) => g / o],
  ['orders', ['gmv', 'aov'], (g, a) => g / a],
  ['gmv', ['aov', 'orders'], (a, o) => a * o],
  ['itemsPerOrder', ['itemsSold', 'orders'], (i, o) => i / o],
  ['ordersPerCustomer', ['orders', 'customers'], (o, c) => o / c],

  // Iklan
  ['tacos', ['adsCost', 'gmv'], (a, g) => (a / g) * 100],
  ['roi', ['gmv', 'adsCost'], (g, a) => g / a, { estimate: true }],

  // Durasi & per jam
  ['durationHours', ['gmv', 'gmvPerHour'], (g, h) => g / h],
  ['gmvPerHour', ['gmv', 'durationHours'], (g, d) => g / d],
  ['impressionsPerHour', ['impressions', 'durationHours'], (i, d) => i / d],

  // Interaksi
  ['followRate', ['newFollowers', 'views'], (f, v) => (f / v) * 100],
  ['commentRate', ['comments', 'views'], (c, v) => (c / v) * 100],
  ['shareRate', ['shares', 'views'], (s, v) => (s / v) * 100],
  ['likeRate', ['likes', 'views'], (l, v) => (l / v) * 100],
  ['newFollowers', ['followRate', 'views'], (r, v) => (r / 100) * v],
  ['comments', ['commentRate', 'views'], (r, v) => (r / 100) * v],
  ['shares', ['shareRate', 'views'], (r, v) => (r / 100) * v],
];

/**
 * @param {Record<string, number|null>} reported nilai yang terbaca dari screenshot
 * @returns {{ values: Record<string, number>, source: Record<string, 'reported'|'derived'|'estimate'> }}
 */
export function derive(reported) {
  const values = {};
  const source = {};
  for (const [k, v] of Object.entries(reported || {})) {
    if (ok(v)) {
      values[k] = v;
      source[k] = 'reported';
    }
  }
  // Satu-satunya fallback "lunak": Est. GMV bila Attributed GMV tidak terbaca.
  if (!ok(values.gmv) && ok(values.estGmv)) {
    values.gmv = values.estGmv;
    source.gmv = 'derived';
  }

  for (let pass = 0; pass < 6; pass++) {
    let changed = false;
    for (const [target, deps, fn, meta] of RULES) {
      if (ok(values[target])) continue;
      const args = deps.map((d) => values[d]);
      if (!args.every(pos)) continue;
      const out = fn(...args);
      if (!ok(out)) continue;
      values[target] = out;
      source[target] = meta?.estimate ? 'estimate' : 'derived';
      changed = true;
    }
    if (!changed) break;
  }
  return { values, source };
}
