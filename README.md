# LivePulse — Insight TikTok LIVE dari screenshot

Admin live cukup **tempel screenshot dashboard TikTok LIVE** (Ctrl+V). LivePulse membaca angkanya, mencari rasio yang *jomplang*, lalu memberi **skor kesehatan live, kebocoran funnel terbesar, dan 3 aksi prioritas untuk host**. Setiap analisa tersimpan sehingga bisa dibandingkan dari live ke live.

**Website:** https://kevineyon1.github.io/livepulse/

- Tanpa login, tanpa server. Data tersimpan di browser (IndexedDB) dan bisa diekspor/impor.
- OCR gratis berjalan di browser (Tesseract.js). Screenshot tidak dikirim ke mana pun.
- Opsional: mode **AI Claude** untuk membaca screenshot & menulis analisa naratif (pakai API key sendiri).

---

## 16 metrik yang wajib dicentang di dashboard

Di dashboard TikTok LIVE: ikon pensil di kartu GMV → pilih metrik (maksimal 16). Pilih 16 ini:

| # | Metrik (nama di dashboard) | Grup TikTok | Kenapa |
|---|---|---|---|
| 1 | Impressions | Traffic Efficiency | Jatah dorongan algoritma; dasar TTR & Show GPM |
| 2 | Views | Traffic Efficiency | Penyebut hampir semua rasio |
| 3 | Tap-through rate (via LIVE preview) | Traffic Efficiency | Daya tarik "etalase" live di FYP |
| 4 | Avg. viewing duration per view | Traffic Efficiency | Sinyal retensi utama untuk algoritma |
| 5 | > 1 min. views | Traffic Efficiency | Calon pembeli serius; dasar retensi > 1 menit |
| 6 | Product Impressions | Traffic Efficiency | Apakah produk benar-benar ditampilkan |
| 7 | Product clicks | Traffic Efficiency | Jembatan menonton → membeli |
| 8 | Attributed orders | Transaction | Hasil akhir funnel |
| 9 | Customers | Transaction | Pembeli unik / repeat order |
| 10 | Payment Rate | Transaction | Pesanan yang tidak dibayar (COD) |
| 11 | GMV per hour | Traffic Efficiency | Pembanding adil antar live berbeda durasi |
| 12 | Ads Cost | Ads | Biaya iklan |
| 13 | GMV Max ROI | Ads | Efisiensi iklan |
| 14 | New followers | Interactions | Aset traffic live berikutnya |
| 15 | Comments | Interactions | Interaksi utama yang dinilai algoritma |
| 16 | Shares | Interactions | Traffic gratis dari luar FYP |

Kartu atas (**Attributed GMV, Attributed items sold, Current viewers**) selalu tampil dan ikut terbaca — tidak memakai slot.

### Tidak perlu dicentang — dihitung otomatis

| Metrik | Rumus |
|---|---|
| Tap-through rate | Views ÷ Impressions |
| LIVE CTR | Product clicks ÷ Views |
| CTR produk | Product clicks ÷ Product impressions |
| CTOR | Orders ÷ Product clicks |
| Order rate | Orders ÷ Views |
| AOV | GMV ÷ Orders |
| Watch GPM / Show GPM | GMV ÷ Views × 1.000 / GMV ÷ Impressions × 1.000 |
| Retensi > 1 menit | > 1 min. views ÷ Views |
| Rasio biaya iklan | Ads Cost ÷ GMV |
| Follow / Comment / Share rate | New followers / Comments / Shares ÷ Views |

Mesin turunan bekerja dua arah: kalau screenshot hanya berisi rasio (mis. TTR + Views), angka mentahnya dihitung balik (Impressions = Views ÷ TTR). Nilai dari TikTok selalu didahulukan.

## Cara sistem menemukan angka yang jomplang

1. **Patokan per KPI**: kritis / waspada / cukup / bagus (bisa diubah di Pengaturan).
2. **Funnel**: Muncul di feed → Masuk live → Bertahan > 1 menit → Klik produk → Pesan → Bayar. Tahap dengan skor terendah = **kebocoran terbesar**.
3. **Pola antar-metrik** untuk menemukan penyebab:

| Pola | Artinya |
|---|---|
| TTR rendah, durasi tonton bagus | Isi live bagus, preview di FYP kurang memancing |
| TTR bagus, durasi tonton rendah | Hook berhasil, isi live tidak menahan |
| Retensi bagus, LIVE CTR rendah | Penonton betah tapi tidak membuka keranjang |
| LIVE CTR tinggi, CTOR rendah | Minat ada, hambatan di harga/promo/kepercayaan/checkout |
| Payment rate rendah | Banyak pesanan menggantung |
| ROI jauh di atas target | Iklan efisien → ruang tambah budget |
| Interaksi tinggi, konversi rendah | Penonton hiburan, bukan pembeli |

4. **Histori**: dibandingkan dengan median N live terakhir (default 10). Perubahan ≥ 30% ditandai.
5. **Momentum**: bila satu live punya beberapa screenshot, laju GMV per jam di interval terakhir dibandingkan interval sebelumnya.

> Patokan awal adalah titik mulai yang umum untuk live commerce, **bukan angka resmi TikTok**. Sesuaikan setelah ±10 live dengan kategori & harga produkmu.

## Cara pakai

1. Buka **Panduan 16 Metrik** dan atur dashboard TikTok LIVE.
2. Saat live, screenshot dashboard (Win+Shift+S) setiap 30–60 menit, lalu tekan **Ctrl+V** di LivePulse.
3. Periksa angka yang terbaca (kuning = sebaiknya dicek), isi judul & host, klik **Analisa & simpan**.
4. Jalankan 3 aksi di kartu **Lakukan sekarang**. Screenshot berikutnya → pilih live yang sama agar momentum terbaca.
5. Buka **Riwayat & Tren** untuk melihat tren & membandingkan 2 live.

## Pembacaan screenshot (OCR)

Dashboard TikTok menulis angka dengan bagian bulat besar dan desimal kecil (`8` + `.42K`), yang sering membuat OCR kehilangan titik desimal. Pipeline-nya:

1. Gambar diperbesar & di-threshold (Otsu) → teks hitam di atas putih.
2. Tesseract membaca seluruh teks; label metrik dicocokkan (fuzzy) dan angka diambil dari posisi di bawah/kanan label.
3. Setiap angka dipisah per glyph lewat analisis piksel; bagian kecil diperbesar lalu dibaca ulang dengan 3 strategi (baris berspasi, per karakter, glyph setinggi sama).
4. **Voting**: bacaan yang formatnya cocok dengan dashboard TikTok dan digitnya disepakati bacaan lain yang menang. Bacaan yang kurang yakin ditandai kuning untuk dicek admin.

## Mode AI (opsional)

Pengaturan → isi API key Anthropic → pilih **AI Claude**. Key disimpan di browser itu saja dan dikirim langsung ke `api.anthropic.com`. Model: Claude Opus 5.5 dengan structured output (JSON schema). Tombol **Analisa AI** di halaman hasil menulis diagnosa naratif dari angka + temuan mesin aturan. Gunakan key khusus dengan batas pemakaian.

## Pengembangan

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit test mesin insight & pembaca OCR
npm run build    # hasil di dist/
npm run deploy   # build + publikasikan dist/ ke branch gh-pages (GitHub Pages)
```

GitHub Pages memakai sumber **branch `gh-pages`**. Untuk deploy otomatis setiap push, beri token `gh` izin workflow (`gh auth refresh -h github.com -s workflow`), pindahkan `deploy/github-actions-pages.yml` ke `.github/workflows/`, lalu ubah sumber Pages ke **GitHub Actions** di Settings → Pages.

### Struktur

```
src/
  core/       metrics.js (katalog), parse.js, format.js, derive.js (rumus 2 arah),
              benchmarks.js (patokan & skor), insights.js (mesin diagnosa)
  extract/    preprocess.js, layout-parse.js, glyphs.js, symbols.js, pipeline.js (OCR), ocr.js, ai.js (Claude)
  data/       db.js (IndexedDB), settings.js, analysis.js
  fx/         scene.js (three.js), motion.js (GSAP)
  ui/         charts.js (SVG), dom.js, icons.js, toast.js
  pages/      home, analyze, live, history, guide, settings
design/design-dna.json   profil desain hasil ekstraksi dari screenshot dashboard
tests/                   node:test
scripts/deploy.mjs       build + publikasi ke branch gh-pages
deploy/                  template GitHub Actions (opsional)
```

### Desain

- **Design DNA** ([zanwei/design-dna](https://github.com/zanwei/design-dna)): palet diukur langsung dari screenshot dashboard (crimson `#8b3143` → teal `#304745`, aksen `#007471`), lihat `design/design-dna.json`.
- **GSAP** ([greensock/gsap-skills](https://github.com/greensock/gsap-skills)): SplitText untuk judul, ScrambleText untuk angka yang sedang dibaca, DrawSVG untuk gauge & grafik, ScrollTrigger untuk reveal, `matchMedia`/reduced-motion dihormati.
- **three.js** ([cloudai-x/threejs-skills](https://github.com/cloudai-x/threejs-skills)): latar shader noise yang mengalir + partikel "like" yang naik; makin cepat saat OCR berjalan dan berubah warna mengikuti skor live. Fallback ke gradien CSS bila WebGL tidak tersedia.

## Privasi

- Semua data live hanya ada di browser yang dipakai. Ekspor JSON untuk cadangan / pindah komputer.
- Folder `samples/` (screenshot asli) di-ignore git — jangan commit screenshot berisi data penjualan.
