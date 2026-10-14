// Dashboard TikTok menulis angka dengan bagian bulat BESAR dan desimal + satuan KECIL
// ("8" + ".42K"). Titik desimal yang kecil sering hilang saat OCR ("842K", "286%").
// Di sini kita membangun ulang teks angka dari tinggi tiap simbol: perpindahan dari
// digit tinggi ke digit pendek = posisi titik desimal.

const DIGIT = /[0-9]/;
const SUFFIX_FIX = { m: 'M', k: 'K', b: 'B' };

/**
 * @param {{text: string, symbols?: Array<{text: string, bbox: {y0: number, y1: number}}>}} word
 * @returns {string}
 */
export function rebuildNumeric(word) {
  const syms = (word.symbols || []).filter((s) => s.text && s.bbox);
  if (syms.length < 2) return normalizeSuffix(word.text);
  const digitHeights = syms.filter((s) => DIGIT.test(s.text)).map((s) => s.bbox.y1 - s.bbox.y0);
  if (digitHeights.length < 2) return normalizeSuffix(word.text);
  const tall = Math.max(...digitHeights);
  let out = '';
  let seenTall = false;
  let inserted = /[.,]/.test(word.text);
  for (const s of syms) {
    const hgt = s.bbox.y1 - s.bbox.y0;
    if (DIGIT.test(s.text)) {
      const small = hgt < tall * 0.8;
      if (!small) seenTall = true;
      else if (seenTall && !inserted && /\d$/.test(out)) {
        out += '.';
        inserted = true;
      }
    }
    out += s.text;
  }
  return normalizeSuffix(out);
}

function normalizeSuffix(t) {
  return String(t).replace(/(\d)\s*([mkb])$/, (_, d, s) => d + SUFFIX_FIX[s]);
}

/**
 * Perbaikan terakhir berbasis format TikTok bila tinggi simbol tidak membantu:
 * persen > 100 atau diawali 0 tanpa pemisah, dan angka ber-akhiran K/M/B 3+ digit
 * tanpa pemisah → sisipkan titik sebelum 2 digit terakhir.
 */
export function repairTikTokFormat(raw, unit) {
  const s = String(raw).trim();
  if (/[.,]/.test(s)) return s;
  const pct = s.match(/^(\d+)%$/);
  if (pct && (unit === 'percent' || !unit)) {
    const d = pct[1];
    if (d.length >= 2 && d[0] === '0') return `0.${d.slice(1)}%`;
    if (+d > 100 && d.length >= 3) return `${d.slice(0, -2)}.${d.slice(-2)}%`;
    return s;
  }
  const suf = s.match(/^(\d{3,})([KMB])$/i);
  if (suf) return `${suf[1].slice(0, -2)}.${suf[1].slice(-2)}${suf[2].toUpperCase()}`;
  if (unit === 'ratio' && /^\d{3,}$/.test(s)) return `${s.slice(0, -2)}.${s.slice(-2)}`;
  return s;
}
