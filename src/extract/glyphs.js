// Memisahkan angka dashboard menjadi bagian BESAR (bilangan bulat) dan KECIL
// (desimal + satuan) lewat analisis piksel kolom per kolom pada gambar hitam-putih.
// Bagian kecil lalu diperbesar sendiri sebelum OCR → titik desimal, K/M, dan %
// terbaca jauh lebih andal.

/**
 * @param {{data: Uint8Array, width: number, height: number}} mask  1 = tinta (teks), 0 = latar
 * @param {{x0:number,y0:number,x1:number,y1:number}} box  area angka (koordinat mask)
 */
export function splitGlyphs(mask, box) {
  const x0 = Math.max(0, Math.floor(box.x0));
  const x1 = Math.min(mask.width, Math.ceil(box.x1));
  const y0 = Math.max(0, Math.floor(box.y0));
  const y1 = Math.min(mask.height, Math.ceil(box.y1));
  if (x1 - x0 < 4 || y1 - y0 < 4) return null;

  // 1) Rentang tinta per kolom
  const runs = [];
  let cur = null;
  for (let x = x0; x < x1; x++) {
    let top = -1;
    let bottom = -1;
    for (let y = y0; y < y1; y++) {
      if (mask.data[y * mask.width + x]) {
        if (top < 0) top = y;
        bottom = y;
      }
    }
    if (top >= 0) {
      if (!cur) cur = { xs: x, xe: x, top, bottom };
      else {
        cur.xe = x;
        cur.top = Math.min(cur.top, top);
        cur.bottom = Math.max(cur.bottom, bottom);
      }
    } else if (cur) {
      runs.push(cur);
      cur = null;
    }
  }
  if (cur) runs.push(cur);
  if (!runs.length) return null;
  for (const r of runs) r.h = r.bottom - r.top + 1;

  // 2) Garis dasar = median dasar glyph yang bukan tanda baca. Tinggi glyph diukur
  //    dari garis dasar ke atas, supaya koma yang menempel ke digit tidak mengacaukan.
  const maxH = Math.max(...runs.map((r) => r.h));
  const bottoms = runs.filter((r) => r.h > maxH * 0.3).map((r) => r.bottom).sort((a, b) => a - b);
  const baseline = bottoms[Math.floor(bottoms.length / 2)];
  for (const r of runs) r.hb = Math.max(1, Math.min(baseline, r.bottom) - r.top + 1);
  const tallH = Math.max(...runs.map((r) => r.hb));

  // 3) Buang yang jauh di kanan (indikator delta "▼12.50%")
  const kept = [runs[0]];
  for (let i = 1; i < runs.length; i++) {
    if (runs[i].xs - kept[kept.length - 1].xe > tallH * 0.55) break;
    kept.push(runs[i]);
  }

  // 4) Glyph terakhir yang "tinggi" = batas bagian besar
  let lastTall = -1;
  kept.forEach((r, i) => {
    if (r.hb >= tallH * 0.8) lastTall = i;
  });
  if (lastTall < 0) return null;
  const tall = kept.slice(0, lastTall + 1);
  const small = kept.slice(lastTall + 1);
  const tallTop = Math.min(...tall.map((r) => r.top));
  const pad = Math.max(2, Math.round(tallH * 0.18));
  const out = {
    tallH,
    baseline,
    runs: kept.map((r, i) => ({
      ...r,
      punct: r.hb < tallH * 0.3,
      comma: r.hb < tallH * 0.3 && r.bottom > baseline + tallH * 0.06,
      part: i <= lastTall ? 'tall' : 'small',
    })),
    full: { x0: kept[0].xs - pad, y0: tallTop - pad, x1: kept[kept.length - 1].xe + pad, y1: baseline + pad },
    tall: { x0: tall[0].xs - pad, y0: tallTop - pad, x1: tall[tall.length - 1].xe + pad, y1: baseline + pad },
    small: null,
    smallH: 0,
  };
  if (small.length) {
    // tinggi huruf kecil = glyph kecil tertinggi (abaikan titik & koma)
    const smallH = Math.max(...small.map((r) => r.hb));
    const sTop = Math.min(...small.map((r) => r.top));
    const sBottom = Math.max(...small.map((r) => r.bottom), baseline);
    // batas potong tepat di tengah celah, supaya tepi glyph besar tidak ikut terbaca "1"
    const cut = Math.round((tall[tall.length - 1].xe + small[0].xs) / 2);
    out.tall.x1 = cut;
    out.smallH = smallH;
    out.small = { x0: cut, y0: sTop - pad, x1: small[small.length - 1].xe + pad, y1: sBottom + pad };
  }
  return out;
}

/**
 * Gambar ulang sekumpulan glyph dengan jarak antar-huruf yang lega (huruf tebal yang
 * rapat sering terbaca sebagai satu karakter). Hasil: RGBA hitam di atas putih.
 * @param {{data: Uint8Array, width: number}} mask
 * @param {Array<{xs:number, xe:number}>} runs
 * @param {{top: number, bottom: number, k?: number}} opt  rentang vertikal & faktor perbesaran
 */
export function renderRuns(mask, runs, { top, bottom, k = 1 }) {
  const srcH = bottom - top + 1;
  const outH = Math.round(srcH * k);
  const margin = Math.round(outH * 0.35);
  const gap = Math.round(outH * 0.22);
  const widths = runs.map((r) => Math.max(1, Math.round((r.xe - r.xs + 1) * k)));
  const width = margin * 2 + widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, runs.length - 1);
  const height = outH + margin * 2;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  let ox = margin;
  runs.forEach((r, i) => {
    const w = widths[i];
    for (let y = 0; y < outH; y++) {
      const sy = top + Math.min(srcH - 1, Math.floor(y / k));
      for (let x = 0; x < w; x++) {
        const sx = r.xs + Math.min(r.xe - r.xs, Math.floor(x / k));
        if (mask.data[sy * mask.width + sx]) {
          const p = ((y + margin) * width + (x + ox)) * 4;
          data[p] = data[p + 1] = data[p + 2] = 0;
        }
      }
    }
    ox += w + gap;
  });
  return { data, width, height };
}

/**
 * Gambar ulang glyph (tanpa tanda baca) dalam satu baris dengan TINGGI SERAGAM:
 * bagian kecil diperbesar setinggi bagian besar & disejajarkan di garis dasar.
 * Hasil OCR-nya bisa dipetakan kembali per posisi glyph.
 */
export function renderNormalized(mask, runs, { baseline, tallH, smallH }) {
  const kSmall = smallH ? tallH / smallH : 1;
  const margin = Math.round(tallH * 0.4);
  const gap = Math.round(tallH * 0.25);
  const items = runs.map((r) => {
    const k = r.part === 'small' ? kSmall : 1;
    return { r, k, w: Math.max(1, Math.round((r.xe - r.xs + 1) * k)) };
  });
  const width = margin * 2 + items.reduce((a, it) => a + it.w, 0) + gap * Math.max(0, items.length - 1);
  const height = tallH + margin * 2;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  let ox = margin;
  for (const { r, k, w } of items) {
    const srcTop = baseline - Math.ceil(tallH / k) + 1;
    for (let y = 0; y < tallH; y++) {
      const sy = srcTop + Math.floor(y / k);
      if (sy < 0 || sy >= mask.data.length / mask.width) continue;
      for (let x = 0; x < w; x++) {
        const sx = r.xs + Math.min(r.xe - r.xs, Math.floor(x / k));
        if (mask.data[sy * mask.width + sx]) {
          const p = ((y + margin) * width + (x + ox)) * 4;
          data[p] = data[p + 1] = data[p + 2] = 0;
        }
      }
    }
    ox += w + gap;
  }
  return { data, width, height };
}

/** Ubah RGBA hitam-putih (hasil binarizeRGBA) menjadi mask 1/0. */
export function maskFromRGBA(data, width, height) {
  const m = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < m.length; i++, p += 4) m[i] = data[p] < 128 ? 1 : 0;
  return { data: m, width, height };
}
