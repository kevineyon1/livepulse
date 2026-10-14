// Mengubah teks angka dari screenshot (hasil OCR / AI / ketikan admin) menjadi number.
// Mendukung format dashboard TikTok: "8.42K", "2.36M", "12,480,350", "18.64%", "21s",
// "1m 5s", "01:05", "Rp1.2M", "11.27", plus akhiran Indonesia "rb" / "jt".

const MULT = { k: 1e3, rb: 1e3, m: 1e6, jt: 1e6, b: 1e9, t: 1e12 };

/** Perbaiki salah baca OCR yang umum di konteks angka. */
export function cleanOcrNumber(raw) {
  let s = String(raw ?? '').trim();
  s = s.replace(/[−–—]/g, '-');
  // huruf yang sering tertukar dengan digit, hanya bila diapit/di samping digit
  s = s.replace(/(?<=\d)[Oo](?=[\d.,%KkMm]|$)/g, '0').replace(/^[Oo](?=[\d.,])/, '0');
  s = s.replace(/(?<=\d)[lI|](?=[\d.,])/g, '1').replace(/(?<=[\d.,])[lI|](?=\d)/g, '1');
  s = s.replace(/(?<=\d)S(?=\d)/g, '5');
  // spasi di dalam angka: "12, 480,350" -> "12,480,350"
  s = s.replace(/(\d)\s+([.,])\s*(\d)/g, '$1$2$3').replace(/(\d)([.,])\s+(\d)/g, '$1$2$3');
  return s;
}

function parseDuration(s) {
  const t = s.toLowerCase().replace(/\s+/g, ' ');
  const clock = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (clock) {
    const [, a, b, c] = clock;
    return c != null ? +a * 3600 + +b * 60 + +c : +a * 60 + +b;
  }
  const h = t.match(/(\d+(?:[.,]\d+)?)\s*(?:h|hr|hrs|jam)\b/);
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*(?:m|min|mins|menit)\b/);
  const sec = t.match(/(\d+(?:[.,]\d+)?)\s*(?:s|sec|secs|dtk|detik)\b/);
  if (h || m || sec) {
    const n = (x) => (x ? parseFloat(x[1].replace(',', '.')) : 0);
    return n(h) * 3600 + n(m) * 60 + n(sec);
  }
  const plain = t.match(/^(\d+(?:[.,]\d+)?)$/);
  return plain ? parseFloat(plain[1].replace(',', '.')) : null;
}

/** Normalisasi string angka dengan pemisah ribuan/desimal yang ambigu. */
function normalizeNumber(num, { hasSuffix, unit }) {
  const hasComma = num.includes(',');
  const hasDot = num.includes('.');
  if (hasComma && hasDot) {
    const last = Math.max(num.lastIndexOf(','), num.lastIndexOf('.'));
    const dec = num[last];
    const thou = dec === '.' ? ',' : '.';
    return num.split(thou).join('').replace(dec, '.');
  }
  const sep = hasComma ? ',' : hasDot ? '.' : null;
  if (!sep) return num;
  const parts = num.split(sep);
  const thousandsShape = parts.length > 1 && parts.slice(1).every((p) => p.length === 3) && parts[0].length <= 3;
  const decimalUnit = unit === 'percent' || unit === 'ratio';
  if (thousandsShape && !hasSuffix && !decimalUnit) return parts.join('');
  if (parts.length > 2) return parts.join(''); // "1.234.567" tanpa akhiran
  return parts.join('.');
}

/**
 * @param {string|number} raw
 * @param {'count'|'currency'|'percent'|'duration'|'ratio'} [unit]
 * @returns {number|null}
 */
export function parseValue(raw, unit = 'count') {
  if (raw == null) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  let s = cleanOcrNumber(raw);
  if (!s || s === '-' || s === '--') return null;

  if (unit === 'duration') {
    const d = parseDuration(s.replace(/[^\d.,:a-z\s]/gi, ''));
    if (d != null) return d;
  }

  s = s.replace(/^(rp|idr|\$|usd)\.?\s*/i, '').replace(/\s*(rp|idr)$/i, '');
  const m = s.match(/(-?\d[\d.,]*)\s*(rb|jt|[kmbt])?\b\s*(%|x)?/i);
  if (!m) return null;
  const suffix = m[2]?.toLowerCase();
  const normalized = normalizeNumber(m[1].replace(/[.,]$/, ''), { hasSuffix: !!suffix, unit });
  let n = parseFloat(normalized);
  if (!Number.isFinite(n)) return null;
  if (suffix) n *= MULT[suffix];
  return Math.round(n * 1e6) / 1e6;
}

/** True bila teks terlihat seperti sebuah nilai metrik (bukan label). */
export function looksNumeric(text) {
  const s = cleanOcrNumber(text);
  return /^(rp\s*)?-?\d[\d.,]*\s*(rb|jt|[kmbt])?\s*(%|x|s|m|h|min)?$/i.test(s.replace(/\s+/g, ' ').trim())
    || /^\d{1,2}:\d{2}(:\d{2})?$/.test(s)
    || /^(\d+\s*(h|m|min|s)\s*)+$/i.test(s);
}
