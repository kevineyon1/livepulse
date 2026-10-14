// Persiapan gambar sebelum OCR: perbesar, grayscale, threshold Otsu.
// Dashboard TikTok memakai teks putih di atas gradien merah-hijau gelap; setelah
// threshold, teks jadi hitam pekat di atas putih — format favorit Tesseract.
// Teks delta merah ("▼12.50%") sengaja hilang karena luminansinya rendah.

/** Threshold Otsu dari histogram luminansi. */
function otsu(hist, total) {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

/**
 * Ubah RGBA (in-place) menjadi hitam-putih: teks hitam, latar putih.
 * @param {Uint8ClampedArray|Uint8Array} data RGBA
 */
export function binarizeRGBA(data, width, height) {
  const n = width * height;
  const lum = new Uint8Array(n);
  const hist = new Uint32Array(256);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const y = (0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]) | 0;
    lum[i] = y;
    hist[y]++;
  }
  let t = otsu(hist, n);
  // Mayoritas piksel = latar. Latar gelap → teks terang (mode gelap).
  let darkPixels = 0;
  for (let i = 0; i < t; i++) darkPixels += hist[i];
  const darkMode = darkPixels > n / 2;
  // Di mode gelap, naikkan sedikit ambang supaya label abu-abu tetap masuk tapi gradien tidak.
  if (darkMode) t = Math.min(200, Math.max(t, 135));
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const isText = darkMode ? lum[i] > t : lum[i] < t;
    const v = isText ? 0 : 255;
    data[p] = data[p + 1] = data[p + 2] = v;
    data[p + 3] = 255;
  }
  return { threshold: t, darkMode };
}

/** Skala agar teks kecil (label 12–14px) cukup besar untuk OCR. */
export function pickScale(width) {
  if (width < 900) return 3;
  if (width < 1800) return 2;
  return 1.25;
}

/**
 * Browser: muat file/Blob → canvas hitam-putih siap OCR.
 * @returns {Promise<{canvas: HTMLCanvasElement, scale: number, width: number, height: number}>}
 */
export async function prepareImage(blob) {
  const bmp = await createImageBitmap(blob);
  const scale = pickScale(bmp.width);
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  binarizeRGBA(img.data, w, h);
  ctx.putImageData(img, 0, 0);
  const out = { canvas, scale, width: bmp.width, height: bmp.height };
  bmp.close?.();
  return out;
}
