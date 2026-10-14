// Dari daftar kata OCR (dengan posisi) → nilai metrik.
// Cara kerja: cari LABEL metrik yang dikenal (fuzzy), lalu ambil ANGKA yang berada
// tepat di bawah label (layout grid dashboard) atau di kanannya (badge header).
// Fungsi murni tanpa DOM supaya bisa dites di Node.

import { METRICS } from '../core/metrics.js';
import { parseValue, looksNumeric } from '../core/parse.js';

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

function levenshtein(a, b) {
  if (a === b) return 0;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

function similarity(a, b) {
  if (!a || !b) return 0;
  if (Math.min(a.length, b.length) <= 4) return a === b ? 1 : 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

const LABELS = METRICS.flatMap((m) => {
  const variants = new Set([m.label, ...(m.aliases || [])].map(norm));
  return [...variants].filter(Boolean).map((key) => ({ id: m.id, key, unit: m.unit, header: !!m.header }));
});

const h = (b) => b.y1 - b.y0;
const cy = (b) => (b.y0 + b.y1) / 2;

/** Kelompokkan kata menjadi baris visual. */
function toLines(words) {
  const sorted = [...words].sort((a, b) => cy(a) - cy(b));
  const lines = [];
  for (const w of sorted) {
    const line = lines.find((l) => Math.abs(cy(l.box) - cy(w)) < Math.max(h(l.box), h(w)) * 0.45);
    if (line) {
      line.words.push(w);
      line.box = { x0: Math.min(line.box.x0, w.x0), y0: Math.min(line.box.y0, w.y0), x1: Math.max(line.box.x1, w.x1), y1: Math.max(line.box.y1, w.y1) };
    } else {
      lines.push({ words: [w], box: { x0: w.x0, y0: w.y0, x1: w.x1, y1: w.y1 } });
    }
  }
  for (const l of lines) l.words.sort((a, b) => a.x0 - b.x0);
  return lines;
}

function union(ws) {
  return { x0: Math.min(...ws.map((w) => w.x0)), y0: Math.min(...ws.map((w) => w.y0)), x1: Math.max(...ws.map((w) => w.x1)), y1: Math.max(...ws.map((w) => w.y1)) };
}

/** Semua kandidat (label → rentang kata) dengan skor kemiripan. */
function labelCandidates(lines) {
  const cands = [];
  for (const line of lines) {
    const ws = line.words;
    for (let i = 0; i < ws.length; i++) {
      if (looksNumeric(ws[i].text) && !/^\d$/.test(ws[i].text.replace(/[^0-9]/g, ''))) continue;
      let text = '';
      for (let j = i; j < ws.length && j < i + 8; j++) {
        if (j > i) {
          const gap = ws[j].x0 - ws[j - 1].x1;
          if (gap > Math.max(h(ws[j - 1]), h(ws[j])) * 1.6) break;
        }
        text += norm(ws[j].text);
        if (!text) continue;
        for (const L of LABELS) {
          if (text.length > L.key.length + 4) continue;
          const sim = similarity(text, L.key);
          if (sim >= 0.84) cands.push({ ...L, sim, from: i, to: j, line, box: union(ws.slice(i, j + 1)) });
        }
      }
    }
  }
  return cands;
}

/** Gabungkan potongan angka: "8" + ".42K" → "8.42K"; tambah titik desimal bila hilang karena font kecil. */
export function joinValue(frags) {
  let out = frags[0].text;
  const H = h(frags[0]);
  for (const f of frags.slice(1)) {
    let t = f.text;
    if (h(f) < H * 0.85 && /^\d/.test(t) && !/[.,:]$/.test(out) && /\d$/.test(out)) t = '.' + t;
    out += t;
  }
  return out;
}

function takeContiguous(lineWords, seedIdx) {
  const words = [lineWords[seedIdx]];
  for (let k = seedIdx + 1; k < lineWords.length; k++) {
    const prev = words[words.length - 1];
    const gap = lineWords[k].x0 - prev.x1;
    if (gap > Math.max(h(words[0]), h(lineWords[k])) * 0.6) break;
    words.push(lineWords[k]);
  }
  return words;
}

function findValue(label, lines, used) {
  const lh = h(label.box);
  const isUsable = (w) => !used.has(w) && (looksNumeric(w.text) || /^(rp)?[\d.,]/i.test(w.text));

  // a) Di kanan, satu baris (badge header: "Attributed items sold 9")
  const sameLine = label.line.words;
  const rightIdx = sameLine.findIndex((w) => w.x0 > label.box.x1 - 1 && w.x0 - label.box.x1 < lh * 2.6 && isUsable(w));
  const right = rightIdx >= 0 ? takeContiguous(sameLine, rightIdx) : null;

  // b) Di bawah (layout grid & angka GMV besar)
  let below = null;
  const candidates = lines
    .filter((l) => l !== label.line && l.box.y0 >= label.box.y1 - lh * 0.3 && l.box.y0 <= label.box.y1 + lh * 3.6)
    .sort((a, b) => a.box.y0 - b.box.y0);
  for (const l of candidates) {
    const idx = l.words.findIndex((w) => isUsable(w) && w.x1 > label.box.x0 - lh * 0.8 && w.x0 < Math.max(label.box.x1, label.box.x0 + lh * 5));
    if (idx >= 0) {
      // mundur ke kiri bila potongan angka sebelumnya menempel
      let start = idx;
      while (start > 0 && l.words[start].x0 - l.words[start - 1].x1 < h(l.words[start]) * 0.6 && isUsable(l.words[start - 1])) start--;
      below = takeContiguous(l.words, start);
      break;
    }
  }

  const pick = label.header && right ? right : below || right;
  if (!pick) return null;
  const raw = joinValue(pick);
  const value = parseValue(raw, label.unit);
  if (value == null) return null;
  return {
    value, raw,
    conf: pick.reduce((a, w) => a + (w.conf ?? 80), 0) / pick.length / 100,
    valueBox: union(pick),
    words: pick,
  };
}

/**
 * @param {Array<{text: string, conf?: number, x0: number, y0: number, x1: number, y1: number}>} words
 * @returns {Record<string, {value: number, raw: string, conf: number, labelBox: object, valueBox: object}>}
 */
export function parseLayout(words) {
  const clean = words.filter((w) => w.text && w.text.trim() && w.x1 > w.x0 && w.y1 > w.y0);
  const lines = toLines(clean);
  const cands = labelCandidates(lines)
    .sort((a, b) => b.sim - a.sim || b.key.length - a.key.length);

  const used = new Set();
  const labels = [];
  const taken = new Set();
  for (const c of cands) {
    if (taken.has(c.id)) continue;
    const span = c.line.words.slice(c.from, c.to + 1);
    if (span.some((w) => used.has(w))) continue;
    span.forEach((w) => used.add(w));
    taken.add(c.id);
    labels.push(c);
  }

  const out = {};
  // label yang lebih atas dulu, supaya angka besar header tidak "dicuri" label di bawahnya
  labels.sort((a, b) => a.box.y0 - b.box.y0 || a.box.x0 - b.box.x0);
  for (const L of labels) {
    const found = findValue(L, lines, used);
    if (!found) {
      out[L.id] = { value: null, raw: '', conf: 0, labelBox: L.box, valueBox: null };
      continue;
    }
    found.words.forEach((w) => used.add(w));
    out[L.id] = { value: found.value, raw: found.raw, conf: found.conf, labelBox: L.box, valueBox: found.valueBox };
  }
  return out;
}
