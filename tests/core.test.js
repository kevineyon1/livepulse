import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseValue } from '../src/core/parse.js';
import { fmt, splitDisplay } from '../src/core/format.js';
import { derive } from '../src/core/derive.js';
import { analyze, momentumOf } from '../src/core/insights.js';

// Angka sintetis bergaya dashboard TikTok LIVE (bukan data toko sungguhan).
const SAMPLE = {
  gmv: 12480350, itemsSold: 7, currentViewers: 5, views: 8420, gmvPerHour: 2360000,
  avgViewDuration: 21, ttrPreview: 2.86, ttr: 3.92, liveCtr: 18.64, orderRateSku: 0.08,
  views1min: 412, adsCost: 1080000, roi: 11.27, aov: 2080000, estGmv: 11900000, orders: 6,
};

test('parseValue: format dashboard', () => {
  assert.equal(parseValue('8.42K'), 8420);
  assert.equal(parseValue('8,42K'), 8420);
  assert.equal(parseValue('2.36M', 'currency'), 2360000);
  assert.equal(parseValue('12,480,350', 'currency'), 12480350);
  assert.equal(parseValue('12.480.350', 'currency'), 12480350);
  assert.equal(parseValue('Rp1.08M', 'currency'), 1080000);
  assert.equal(parseValue('18.64%', 'percent'), 18.64);
  assert.equal(parseValue('0.27%', 'percent'), 0.27);
  assert.equal(parseValue('11.27', 'ratio'), 11.27);
  assert.equal(parseValue('412'), 412);
  assert.equal(parseValue('21s', 'duration'), 21);
  assert.equal(parseValue('1m 5s', 'duration'), 65);
  assert.equal(parseValue('01:05', 'duration'), 65);
  assert.equal(parseValue('1,2 jt', 'currency'), 1200000);
  assert.equal(parseValue('3O0'), 300);
  assert.equal(parseValue('—'), null);
  assert.equal(parseValue(''), null);
});

test('format & split display', () => {
  assert.equal(fmt(8420), '8.42K');
  assert.equal(fmt(12480350, 'currency'), 'Rp12.48M');
  assert.equal(fmt(21, 'duration'), '21s');
  assert.equal(fmt(65, 'duration'), '1m 05s');
  assert.deepEqual(splitDisplay(8420), { prefix: '', main: '8', rest: '.42K' });
  assert.deepEqual(splitDisplay(18.64, 'percent'), { prefix: '', main: '18', rest: '.64%' });
  assert.deepEqual(splitDisplay(2360000, 'currency'), { prefix: 'Rp', main: '2', rest: '.36M' });
});

test('derive: hitung balik dari rasio', () => {
  const { values, source } = derive(SAMPLE);
  assert.equal(Math.round(values.impressions), Math.round(8420 / 0.0392));
  assert.equal(source.impressions, 'derived');
  assert.equal(Math.round(values.productClicks), Math.round(8420 * 0.1864));
  assert.ok(Math.abs(values.ctor - (6 / (8420 * 0.1864)) * 100) < 1e-9);
  assert.ok(Math.abs(values.retention1m - (412 / 8420) * 100) < 1e-9);
  assert.equal(source.roi, 'reported');
  assert.ok(values.durationHours > 5 && values.durationHours < 6);
});

test('analyze: menemukan kebocoran klik → order', () => {
  const r = analyze({ reported: SAMPLE });
  assert.equal(r.bottleneck.kpi, 'ctor');
  const ids = r.insights.map((i) => i.id);
  for (const id of ['conversion', 'retention', 'traffic-ttr', 'ads-scale', 'coverage']) assert.ok(ids.includes(id), id);
  assert.equal(r.insights[0].severity, 'critical');
  assert.equal(r.actionsNow.length, 3);
  assert.ok(r.health.score > 0 && r.health.score < 100);
});

test('analyze: perbandingan histori', () => {
  const history = [1, 2, 3, 4].map((k) => ({ reported: { ...SAMPLE, views: 9000 + k * 100, gmvPerHour: 5000000, orders: 20 } }));
  const r = analyze({ reported: SAMPLE, history });
  const down = r.insights.find((i) => i.id === 'vs-history-down');
  assert.ok(down, 'harus ada insight turun vs histori');
  assert.match(down.why, /Omzet per jam/);
});

test('saran memakai bahasa lapangan & langsung jadi tindakan', () => {
  const r = analyze({ reported: SAMPLE });
  const conv = r.insights.find((i) => i.id === 'conversion');
  // nilai & patokan memakai basis yang sama supaya mudah dibandingkan
  assert.match(conv.why, /3,8 dari 1\.000 klik \(normalnya minimal 60 dari 1\.000\)/);
  for (const i of r.insights) {
    assert.doesNotMatch(`${i.title} ${i.why}`, /\b(CTOR|CTR|TTR|GPM|AOV)\b/, `istilah teknis bocor di "${i.title}"`);
    for (const a of i.actions) {
      assert.ok(['Host', 'Admin', 'Owner'].includes(a.who), a.text);
      assert.ok(a.tag && a.text.length > 20);
    }
  }
  assert.ok(r.actionsNow.every((a) => a.who && a.tag && a.text));
  assert.equal(r.bottleneck.headline, 'Banyak yang klik, sedikit yang beli');
  assert.match(r.summary, /perbaiki penawaran & cara closing/);
});

test('momentum dalam satu live', () => {
  const base = Date.parse('2026-10-14T19:00:00Z');
  const at = (min) => new Date(base + min * 60000).toISOString();
  const m = momentumOf([
    { capturedAt: at(0), reported: { gmv: 0 } },
    { capturedAt: at(60), reported: { gmv: 2000000 } },
    { capturedAt: at(120), reported: { gmv: 2600000 } },
  ]);
  assert.equal(m.minutes, 60);
  assert.ok(Math.abs(m.gmvChange - -0.7) < 1e-9);
});
