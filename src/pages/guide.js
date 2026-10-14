// Panduan: 16 metrik yang harus dicentang di dashboard TikTok LIVE + alasannya.
import { CORE_16, DERIVED } from '../core/metrics.js';
import { DEFAULT_KPIS } from '../core/benchmarks.js';
import { fmt } from '../core/format.js';
import { icon } from '../ui/icons.js';
import { esc } from '../ui/dom.js';
import { pageMotion, enterPage, revealOnScroll, gsap } from '../fx/motion.js';

// Susunan panel "pilih metrik" di dashboard TikTok (urutan sama seperti di layar).
const PANEL = [
  ['Transaction', ['AOV', 'Customers', 'Attributed SKU orders', 'Attributed orders', 'Payment Rate', 'Est. GMV', 'GMV with subsidies']],
  ['Traffic Efficiency', ['Product clicks', 'LIVE CTR', 'Views', 'Tap-through rate', 'Avg. viewing duration', 'Product Impressions', 'CTOR (SKU orders)', 'Show GPM', 'Watch GPM', 'CTOR', 'Impressions', 'Impressions per hour', 'GMV per hour', 'CTR', 'Avg. viewing duration per view', 'Tap-through rate (via LIVE preview)', 'Order rate (SKU orders)', '> 1 min. views']],
  ['Interactions', ['New followers', 'Shares', 'Comments', 'Likes', 'Comment rate', 'Follow rate', 'Like rate', 'Share rate']],
  ['Ads', ['Ads Cost', 'GMV Max ROI']],
];

// Pola "jomplang" → apa yang terjadi → apa yang dikerjakan (bahasa lapangan).
const PATTERNS = [
  ['Banyak tampil di FYP, sedikit yang mampir', 'Tampilan depan live kurang menarik → rapikan kamera & lampu, produk di tengah layar, ganti judul jadi promo yang jelas.'],
  ['Banyak yang mampir, tapi cepat pergi', 'Isi live belum menahan → perbaiki script pembuka, ulangi promo tiap 2–3 menit, naikkan energi host.'],
  ['Penonton betah, tapi jarang klik keranjang', 'Ajakan kurang jelas → pin produk yang sedang dibahas, host bilang "klik keranjang kuning nomor 3", susun ulang etalase.'],
  ['Banyak klik, sedikit yang beli', 'Ada yang bikin ragu bayar → cek harga & voucher, perbaiki script closing (harga coret → harga live → bonus → batas waktu).'],
  ['Banyak pesanan belum dibayar', 'Pembeli lupa / ragu → ingatkan bayar saat live, aktifkan COD & PayLater, chat pembeli setelah live.'],
  ['Iklan sangat untung', 'Saatnya tambah budget → naikkan GMV Max 20–30% dulu sambil cek hasilnya.'],
  ['Ramai komentar, tapi tidak ada yang beli', 'Penonton datang untuk hiburan → kurangi ngobrol di luar topik, arahkan ke produk.'],
  ['Jauh lebih jelek dari biasanya', 'Ada yang berubah → bandingkan host, jam tayang, produk, promo, dan budget iklan dengan live terbaik.'],
];

const WHY = {
  impressions: 'Ukuran dorongan algoritma. Tanpa ini TTR & Show GPM tidak bisa dihitung.',
  views: 'Penyebut hampir semua rasio (LIVE CTR, order rate, follow rate…).',
  ttrPreview: 'Mendeteksi masalah "etalase" live di FYP secara khusus.',
  avgViewDuration: 'Sinyal retensi utama — kunci algoritma mau menambah traffic.',
  views1min: 'Memisahkan penonton lewat dari calon pembeli; dasar retensi > 1 menit.',
  productImpressions: 'Apakah produk benar-benar ditampilkan/di-pin; dasar CTR produk.',
  productClicks: 'Jembatan antara menonton dan membeli; dasar LIVE CTR & CTOR.',
  orders: 'Hasil akhir funnel; dasar CTOR, order rate, dan AOV.',
  customers: 'Pembeli unik — menunjukkan repeat order & ukuran basis pembeli.',
  paymentRate: 'Menangkap pesanan yang tidak dibayar (penting untuk COD).',
  gmvPerHour: 'Pembanding paling adil antar live dengan durasi berbeda.',
  adsCost: 'Biaya iklan; dasar rasio biaya iklan terhadap GMV.',
  roi: 'Efisiensi iklan GMV Max — rugi, impas, atau layak ditambah budget.',
  newFollowers: 'Aset traffic gratis untuk live berikutnya; dasar follow rate.',
  comments: 'Interaksi utama yang dinilai algoritma; dasar comment rate.',
  shares: 'Pembawa traffic dari luar FYP; dasar share rate.',
};

export async function render(root) {
  const coreLabels = new Set(CORE_16.map((m) => m.label.toLowerCase()));
  const numberOf = {};
  for (const [, items] of PANEL) for (const it of items) if (coreLabels.has(it.toLowerCase())) numberOf[it] = CORE_16.find((m) => m.label.toLowerCase() === it.toLowerCase()).rec;
  const kpiOf = Object.fromEntries(DEFAULT_KPIS.map((k) => [k.id, k]));

  root.innerHTML = `
  <div class="page">
    <div class="page-head" data-reveal>
      <div>
        <div class="overline">Panduan setup</div>
        <h1 class="page-title">16 metrik yang wajib dicentang</h1>
        <p class="page-desc">Di dashboard TikTok LIVE, klik ikon pensil di pojok kanan atas kartu GMV → pilih metrik. Maksimal 16. Pilih persis 16 ini: kombinasinya membentuk funnel lengkap dari <b>muncul di feed</b> sampai <b>pesanan dibayar</b>, sehingga sistem bisa menghitung sendiri semua rasio lainnya.</p>
      </div>
    </div>

    <section class="guide-panel" data-reveal aria-label="Tampilan panel pemilihan metrik">
      ${PANEL.map(([g, items]) => `
        <div class="guide-group">
          <h4>${esc(g)}</h4>
          <div class="guide-items">
            ${items.map((it) => {
              const on = numberOf[it];
              return `<div class="gi ${on ? 'on' : ''}"><span class="cb">${on ? icon('check') : ''}</span><span>${esc(it)}</span>${on ? `<span class="n">#${on}</span>` : ''}</div>`;
            }).join('')}
          </div>
        </div>`).join('')}
      <p class="note">Kartu atas (Attributed GMV, Attributed items sold, Current viewers) selalu tampil dan ikut terbaca — tidak memakai slot 16.</p>
    </section>

    <section>
      <div class="section-title" style="margin-bottom:16px">Kenapa 16 ini?</div>
      <div class="metric-explain" data-scroll="stagger">
        ${CORE_16.map((m) => `<div class="mx"><span class="n">${m.rec}</span><div><h4>${esc(m.label)}</h4><p>${esc(m.desc)}</p><p class="note" style="margin-top:6px">${esc(WHY[m.id] || '')}</p></div></div>`).join('')}
      </div>
    </section>

    <section class="card" data-scroll>
      <div class="card-head"><div><div class="card-title">Tidak perlu dicentang — dihitung otomatis</div><div class="card-sub">Menghemat slot dashboard. Bila metrik ini kebetulan terlihat di screenshot, nilai dari TikTok yang dipakai.</div></div></div>
      <div class="table-wrap"><table class="t">
        <thead><tr><th>Metrik</th><th>Rumus</th><th class="n">Patokan bagus</th></tr></thead>
        <tbody>${Object.entries(DERIVED).filter(([id]) => id !== 'durationHours').map(([id, d]) => `<tr><td>${esc(d.label)}</td><td class="formula">${esc(d.formula)}</td><td class="n">${kpiOf[id] ? `${kpiOf[id].higher ? '≥' : '≤'} ${esc(fmt(kpiOf[id].good, kpiOf[id].unit))}` : '<span class="muted">vs median toko</span>'}</td></tr>`).join('')}</tbody>
      </table></div>
    </section>

    <section>
      <div class="section-title" style="margin-bottom:6px">Cara sistem menemukan angka yang "jomplang"</div>
      <p class="page-desc" style="margin-bottom:16px">Sistem melihat di tahap mana penonton paling banyak "hilang" (masuk → betah → klik → beli → bayar), lalu menerjemahkannya jadi tindakan:</p>
      <div class="metric-explain" data-scroll="stagger">
        ${PATTERNS.map(([a, b], i) => `<div class="mx"><span class="n">${icon(i < 5 ? 'target' : i === 5 ? 'bolt' : i === 6 ? 'chat' : 'trend')}</span><div><h4>${esc(a)}</h4><p>${esc(b)}</p></div></div>`).join('')}
      </div>
    </section>

    <section class="tips" data-scroll="stagger">
      <div class="card tip">${icon('image')}<h4>Screenshot yang bagus</h4><p>Seluruh kartu GMV & 16 metrik terlihat, bahasa Inggris, zoom browser 100%, tanpa popup menutupi angka.</p></div>
      <div class="card tip">${icon('clock')}<h4>Kapan screenshot</h4><p>Setiap 30–60 menit selama live dan sekali di akhir. Tambahkan ke live yang sama agar momentum terbaca.</p></div>
      <div class="card tip">${icon('settings')}<h4>Sesuaikan patokan</h4><p>Patokan awal bersifat umum. Setelah ±10 live, ubah di Pengaturan sesuai kategori & harga produkmu.</p></div>
    </section>
  </div>`;

  pageMotion(root, () => {
    enterPage(root);
    gsap.from('.gi.on .cb', { scale: 0, duration: 0.4, stagger: 0.04, delay: 0.5, ease: 'back.out(3)' });
    revealOnScroll(root);
  });
}
