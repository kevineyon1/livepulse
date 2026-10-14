import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLayout } from '../src/extract/layout-parse.js';
import { rebuildNumeric, repairTikTokFormat } from '../src/extract/symbols.js';
import { splitGlyphs } from '../src/extract/glyphs.js';
import { plausibility, vote, transplantSuffix } from '../src/extract/pipeline.js';

// Kata OCR sintetis meniru tata letak dashboard (label di atas, angka di bawah).
const w = (text, x0, y0, x1, y1, conf = 90) => ({ text, x0, y0, x1, y1, conf });

test('parseLayout: label → angka di bawahnya & badge di kanan', () => {
  const words = [
    w('Attributed', 600, 40, 690, 58), w('GMV', 695, 40, 735, 58), w('(Rp)', 740, 40, 780, 58),
    w('12,480,350', 500, 70, 940, 150),
    w('Attributed', 430, 180, 520, 200), w('items', 525, 180, 570, 200), w('sold', 575, 180, 610, 200), w('7', 630, 176, 650, 204),
    w('Views', 66, 260, 112, 278), w('8.42K', 66, 290, 135, 320),
    w('GMV', 400, 260, 440, 278), w('per', 445, 260, 470, 278), w('hour', 475, 260, 515, 278), w('2.36M', 400, 290, 470, 320),
    w('Product', 66, 360, 130, 378), w('impressions', 135, 360, 230, 378), w('12.40K', 66, 390, 150, 420),
    w('Impressions', 400, 360, 495, 378), w('214.80K', 400, 390, 500, 420),
    w('LIVE', 700, 360, 740, 378), w('CTR', 745, 360, 780, 378), w('18.64%', 700, 390, 790, 420),
  ];
  const r = parseLayout(words);
  assert.equal(r.gmv.value, 12480350);
  assert.equal(r.itemsSold.value, 7);
  assert.equal(r.views.value, 8420);
  assert.equal(r.gmvPerHour.value, 2360000);
  assert.equal(r.productImpressions.value, 12400);
  assert.equal(r.impressions.value, 214800);
  assert.equal(r.liveCtr.value, 18.64);
  assert.equal(r.ctr, undefined, '"CTR" di dalam "LIVE CTR" tidak boleh terbaca sebagai metrik CTR');
});

test('rebuildNumeric: titik desimal dari tinggi simbol', () => {
  const sym = (text, h) => ({ text, bbox: { y0: 100 - h, y1: 100 } });
  assert.equal(rebuildNumeric({ text: '842K', symbols: [sym('8', 56), sym('4', 34), sym('2', 34), sym('K', 33)] }), '8.42K');
  assert.equal(rebuildNumeric({ text: '286%', symbols: [sym('2', 55), sym('8', 35), sym('6', 35), sym('%', 34)] }), '2.86%');
  assert.equal(rebuildNumeric({ text: '412', symbols: [sym('4', 55), sym('1', 55), sym('2', 55)] }), '412');
  assert.equal(rebuildNumeric({ text: '1.0m', symbols: [] }), '1.0M');
});

test('repairTikTokFormat', () => {
  assert.equal(repairTikTokFormat('027%', 'percent'), '0.27%');
  assert.equal(repairTikTokFormat('286%', 'percent'), '2.86%');
  assert.equal(repairTikTokFormat('100%', 'percent'), '100%');
  assert.equal(repairTikTokFormat('236M', 'currency'), '2.36M');
  assert.equal(repairTikTokFormat('1127', 'ratio'), '11.27');
  assert.equal(repairTikTokFormat('412', 'count'), '412');
});

test('voting memilih bacaan yang formatnya cocok & disepakati', () => {
  assert.equal(plausibility('8.42', 'count'), 0);
  assert.equal(plausibility('8.42K', 'count'), 3);
  const views = transplantSuffix([{ src: 'first', text: '8.42' }, { src: 'line', text: '8.2K' }], 'count');
  assert.equal(vote(views, 'count').text, '8.42K');
  const ads = [{ src: 'first', text: '1.0M' }, { src: 'line', text: '1.08M' }, { src: 'glyph', text: '1.08?' }, { src: 'norm', text: '1.08M' }];
  assert.equal(vote(ads, 'currency').text, '1.08M');
  const ord = [{ src: 'first', text: '0.26%' }, { src: 'line', text: '0.27%' }, { src: 'glyph', text: '0???' }, { src: 'norm', text: '0.27%' }];
  assert.equal(vote(ord, 'percent').text, '0.27%');
});

test('splitGlyphs memisahkan bagian besar & kecil', () => {
  // mask sintetis: digit besar (tinggi 40) lalu titik kecil & dua digit kecil (tinggi 24)
  const W = 120;
  const H = 60;
  const data = new Uint8Array(W * H);
  const rect = (x0, y0, x1, y1) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) data[y * W + x] = 1;
  };
  rect(5, 10, 30, 50); // digit besar
  rect(36, 46, 40, 50); // "." kecil di garis dasar
  rect(44, 26, 58, 50); // digit kecil
  rect(62, 26, 76, 50); // digit kecil
  const s = splitGlyphs({ data, width: W, height: H }, { x0: 0, y0: 0, x1: W, y1: H });
  assert.equal(s.runs.filter((r) => r.part === 'tall').length, 1);
  assert.equal(s.runs.filter((r) => r.part === 'small').length, 3);
  assert.equal(s.runs.filter((r) => r.punct).length, 1);
  assert.ok(s.smallH < s.tallH * 0.8);
});
