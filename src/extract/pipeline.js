// Pipeline OCR (dipakai di browser & di tes Node lewat adapter):
//   1. Baca seluruh gambar (PSM 11 / sparse text) → temukan label & area angka.
//   2. Untuk tiap angka buat 2 bacaan tambahan dari glyph yang diisolasi:
//        A. baris berspasi (bagian besar & kecil dibaca terpisah, bagian kecil diperbesar)
//        B. per karakter
//   3. Voting: kandidat yang formatnya cocok dengan dashboard TikTok dan digitnya
//      disepakati bacaan lain yang menang.

import { parseLayout } from './layout-parse.js';
import { rebuildNumeric, repairTikTokFormat } from './symbols.js';
import { splitGlyphs, renderRuns, renderNormalized } from './glyphs.js';
import { parseValue, looksNumeric } from '../core/parse.js';
import { METRIC_BY_ID } from '../core/metrics.js';

const SMALL_WHITELIST = {
  duration: '0123456789hms',
  percent: '0123456789.,%',
  ratio: '0123456789.,',
  count: '0123456789.,KMB',
  currency: '0123456789.,KMB',
};

/** Seberapa cocok teks dengan format yang dipakai dashboard untuk satuan ini (0–3). */
export function plausibility(text, unit) {
  const s = String(text || '').trim();
  if (!s || s.includes('?') || parseValue(s, unit) == null) return 0;
  const dec = s.match(/[.,](\d+)/);
  const suffix = /[KMB]$/.test(s);
  switch (unit) {
    case 'percent':
      if (!s.endsWith('%')) return 1;
      return dec && dec[1].length === 2 ? 3 : 2;
    case 'ratio':
      return dec && dec[1].length === 2 ? 3 : 1;
    case 'duration':
      return /^\d+\s*s$|^\d+m\s*\d{1,2}s$|^\d+h\s*\d{1,2}m$/.test(s) ? 3 : /\d+[smh]/.test(s) ? 2 : 1;
    default:
      if (suffix) return dec && dec[1].length === 2 ? 3 : 2;
      if (/^\d{1,3}(,\d{3})+$/.test(s) || /^\d+$/.test(s)) return 2;
      return dec ? 0 : 1; // angka desimal tanpa K/M → hampir pasti suffix hilang
  }
}

const digitsOf = (s) => String(s).replace(/[^0-9?]/g, '');
function digitsAgree(a, b) {
  const da = digitsOf(a);
  const db = digitsOf(b);
  if (!da || da.length !== db.length) return false;
  for (let i = 0; i < da.length; i++) if (da[i] !== db[i] && da[i] !== '?' && db[i] !== '?') return false;
  return true;
}

/** Pilih bacaan terbaik dari beberapa kandidat. */
export function vote(cands, unit) {
  const valid = cands.filter((c) => c && c.text && plausibility(c.text, unit) > 0);
  if (!valid.length) return null;
  let best = null;
  for (const c of valid) {
    const agree = cands.filter((o) => o && o !== c && o.text && digitsAgree(c.text, o.text)).length;
    const score = plausibility(c.text, unit) + agree * 1.2 + (c.src === 'first' ? 0.3 : 0);
    if (!best || score > best.score) best = { ...c, score, agree };
  }
  return best;
}

function wordsFrom(raw, scale) {
  return raw.map((w) => {
    const text = looksNumeric(w.text) || /^[\d.,]/.test(w.text) ? rebuildNumeric(w) : w.text;
    return { text, conf: w.confidence, x0: w.bbox.x0 / scale, y0: w.bbox.y0 / scale, x1: w.bbox.x1 / scale, y1: w.bbox.y1 / scale };
  });
}

const joinWords = (ws) => ws.filter((w) => w.text && w.text.trim()).sort((a, b) => a.bbox.x0 - b.bbox.x0).map((w) => w.text).join('');

async function isolatedReads({ mask, box, unit, read }) {
  const s = splitGlyphs(mask, box);
  if (!s) return [];
  const top = Math.min(...s.runs.map((r) => r.top));
  const tallRuns = s.runs.filter((r) => r.part === 'tall');
  const smallRuns = s.runs.filter((r) => r.part === 'small');
  const smallTop = smallRuns.length ? Math.min(...smallRuns.map((r) => r.top)) : top;
  const k = smallRuns.length ? Math.min(3, Math.max(1.2, s.tallH / Math.max(1, s.smallH))) : 1;
  const out = [];

  // A. baris berspasi
  const tall = joinWords(await read(renderRuns(mask, tallRuns, { top, bottom: Math.max(s.baseline + 2, ...tallRuns.map((r) => r.bottom)) }), '7', '0123456789,.')).replace(/[.]$/, '');
  if (tall) {
    let small = '';
    if (smallRuns.length) {
      small = joinWords(await read(renderRuns(mask, smallRuns, { top: smallTop, bottom: s.baseline + 2, k }), '7', SMALL_WHITELIST[unit] ?? SMALL_WHITELIST.count)).replace(/^,/, '.');
      if (/^\d/.test(small) && /\d$/.test(tall)) small = '.' + small;
    }
    out.push({ src: 'line', text: repairTikTokFormat(tall + small, unit) });
  }

  // B. per karakter
  let per = '';
  for (const r of s.runs) {
    const w = r.xe - r.xs + 1;
    if (r.punct) {
      per += r.comma ? ',' : '.';
      continue;
    }
    const small = r.part === 'small';
    const img = renderRuns(mask, [r], { top: small ? smallTop : top, bottom: s.baseline + 1, k: small ? k : 1 });
    let ch = joinWords(await read(img, '10', small ? SMALL_WHITELIST[unit].replace(/[.,]/g, '') : '0123456789'));
    if (!ch && w / r.hb < 0.42) ch = '1'; // angka 1 yang ramping sering tidak terbaca sendirian
    per += ch || '?';
  }
  if (/^\d/.test(per)) out.push({ src: 'glyph', text: repairTikTokFormat(per, unit) });

  // C. semua glyph setinggi sama dalam satu baris → dipetakan balik per posisi
  const glyphRuns = s.runs.filter((r) => !r.punct);
  if (glyphRuns.length) {
    const wl = { percent: '0123456789%', duration: '0123456789hms', ratio: '0123456789' }[unit] ?? '0123456789KMB';
    const chars = joinWords(await read(renderNormalized(mask, glyphRuns, s), '7', wl)).replace(/\s/g, '');
    if (chars.length === glyphRuns.length) {
      let text = '';
      let ci = 0;
      for (const r of s.runs) text += r.punct ? (r.comma ? ',' : '.') : chars[ci++];
      out.push({ src: 'norm', text: repairTikTokFormat(text, unit) });
    }
  }
  return out;
}

/** Bila satu bacaan kehilangan akhiran K/M/B tapi bacaan lain punya, buat kandidat gabungan. */
export function transplantSuffix(cands, unit) {
  if (unit !== 'count' && unit !== 'currency') return cands;
  const suffixes = cands.map((c) => c.text.match(/([KMB])$/)?.[1]).filter(Boolean);
  if (!suffixes.length) return cands;
  const suf = suffixes.sort((a, b) => suffixes.filter((x) => x === b).length - suffixes.filter((x) => x === a).length)[0];
  const extra = cands
    .filter((c) => /^\d+[.,]\d{2}$/.test(c.text))
    .map((c) => ({ src: 'merge', text: c.text + suf }));
  return [...cands, ...extra];
}

/**
 * @param {object} p
 * @param {any} p.image  gambar hitam-putih (sudah diperbesar `scale` kali)
 * @param {{data: Uint8Array, width: number, height: number}} p.mask  mask tinta dari gambar yang sama
 * @param {number} p.scale
 * @param {(img: any, opt: {psm: string, whitelist?: string}) => Promise<Array>} p.recognize  → kata Tesseract
 * @param {(rgba: {data: Uint8ClampedArray, width: number, height: number}) => Promise<any>} p.toImage
 * @param {(step: string, info?: object) => void} [p.onProgress]
 */
export async function extractMetrics({ image, mask, scale, recognize, toImage, onProgress = () => {} }) {
  onProgress('read');
  const raw = await recognize(image, { psm: '11' });
  const words = wordsFrom(raw, scale);
  const layout = parseLayout(words);
  onProgress('match', { words: words.length, layout });
  const read = async (rgba, psm, whitelist) => recognize(await toImage(rgba), { psm, whitelist });

  const ids = Object.keys(layout);
  let done = 0;
  for (const id of ids) {
    const item = layout[id];
    const unit = METRIC_BY_ID[id]?.unit ?? 'count';
    if (item.valueBox) {
      const b = item.valueBox;
      const pad = (b.y1 - b.y0) * 0.25;
      const box = { x0: (b.x0 - pad) * scale, y0: (b.y0 - pad) * scale, x1: (b.x1 + pad * 2) * scale, y1: (b.y1 + pad) * scale };
      const cands = [{ src: 'first', text: repairTikTokFormat(item.raw, unit) }];
      try {
        cands.push(...(await isolatedReads({ mask, box, unit, read })));
      } catch (e) {
        console.warn('Baca ulang gagal untuk', id, e);
      }
      const all = transplantSuffix(cands, unit);
      const best = vote(all, unit);
      if (best) {
        item.value = parseValue(best.text, unit);
        item.raw = best.text;
        // keyakinan: format cocok + disepakati bacaan lain
        item.conf = Math.min(0.98, 0.35 + plausibility(best.text, unit) * 0.12 + best.agree * 0.2);
      } else {
        item.value = null;
        item.conf = 0;
      }
      item.candidates = all.map((c) => `${c.src}:${c.text}`);
    }
    done++;
    onProgress('refine', { done, total: ids.length, id, item });
  }
  return { metrics: layout, words };
}
