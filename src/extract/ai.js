// Mode AI (opsional): Claude membaca screenshot & menulis analisa naratif.
// API key milik admin disimpan HANYA di browser ini (localStorage) dan dikirim
// langsung ke api.anthropic.com. Gunakan key khusus dengan batas pemakaian.

import { METRICS } from '../core/metrics.js';
import { fmt } from '../core/format.js';

const MODEL = 'claude-opus-5-5';
const MEDIA = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

async function client(apiKey) {
  const mod = await import('@anthropic-ai/sdk');
  const Anthropic = mod.default;
  return { Anthropic, api: new Anthropic({ apiKey, dangerouslyAllowBrowser: true }) };
}

async function toBase64(blob) {
  let b = blob;
  if (!MEDIA.has(b.type)) {
    // konversi format lain (mis. BMP dari clipboard) ke PNG
    const bmp = await createImageBitmap(blob);
    const c = document.createElement('canvas');
    c.width = bmp.width;
    c.height = bmp.height;
    c.getContext('2d').drawImage(bmp, 0, 0);
    b = await new Promise((r) => c.toBlob(r, 'image/png'));
  }
  const buf = new Uint8Array(await b.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { data: btoa(bin), media_type: b.type };
}

function friendlyError(Anthropic, e) {
  if (e instanceof Anthropic.AuthenticationError) return new Error('API key ditolak. Periksa kembali key di Pengaturan.');
  if (e instanceof Anthropic.PermissionDeniedError) return new Error('API key tidak punya izin untuk model ini.');
  if (e instanceof Anthropic.RateLimitError) return new Error('Terlalu banyak permintaan. Coba lagi sebentar lagi.');
  if (e instanceof Anthropic.BadRequestError) return new Error('Permintaan ditolak: ' + e.message);
  if (e instanceof Anthropic.APIConnectionError) return new Error('Tidak bisa terhubung ke Claude. Cek koneksi internet.');
  if (e instanceof Anthropic.APIError) return new Error(`Error dari Claude (${e.status}): ${e.message}`);
  return e;
}

function readJson(response) {
  if (response.stop_reason === 'refusal') throw new Error('Claude menolak permintaan ini.');
  if (response.stop_reason === 'max_tokens') throw new Error('Jawaban AI terpotong. Coba lagi.');
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return JSON.parse(text);
}

const UNIT_HINT = {
  count: 'angka penuh (8.42K → 8420)',
  currency: 'Rupiah penuh (2.36M → 2360000)',
  percent: 'angka persen (18.64% → 18.64)',
  duration: 'detik (1m 5s → 65)',
  ratio: 'angka desimal (11.27)',
};

/** Baca metrik dari satu atau beberapa screenshot. */
export async function extractWithClaude(blobs, apiKey) {
  const { Anthropic, api } = await client(apiKey);
  const props = Object.fromEntries(METRICS.map((m) => [m.id, { anyOf: [{ type: 'number' }, { type: 'null' }] }]));
  const schema = {
    type: 'object',
    properties: {
      metrics: { type: 'object', properties: props, required: METRICS.map((m) => m.id), additionalProperties: false },
      notes: { type: 'string' },
    },
    required: ['metrics', 'notes'],
    additionalProperties: false,
  };
  const legend = METRICS.map((m) => `- ${m.id}: "${m.label}" → ${UNIT_HINT[m.unit]}`).join('\n');
  const images = await Promise.all(blobs.map(toBase64));
  try {
    const response = await api.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema } },
      messages: [{
        role: 'user',
        content: [
          ...images.map((img) => ({ type: 'image', source: { type: 'base64', ...img } })),
          {
            type: 'text',
            text: `Ini screenshot dashboard TikTok Shop LIVE. Salin nilai setiap metrik yang terlihat ke field yang sesuai.\n\n${legend}\n\nAturan:\n- Isi null bila metrik tidak terlihat di gambar. Jangan menebak atau menghitung sendiri.\n- Abaikan angka perbandingan kecil berwarna (▲/▼ persen) di samping nilai utama.\n- Perhatikan bagian desimal yang ditulis lebih kecil (mis. "8" + ".42K" = 8.42K = 8420).\n- notes: catatan singkat bila ada angka yang kurang jelas, atau string kosong.`,
          },
        ],
      }],
    });
    return readJson(response);
  } catch (e) {
    throw friendlyError(Anthropic, e);
  }
}

/** Analisa naratif dari hasil mesin insight + histori. */
export async function coachWithClaude({ apiKey, analysis, live, history }) {
  const { Anthropic, api } = await client(apiKey);
  const kpiLines = analysis.kpis
    .filter((k) => k.value != null)
    .map((k) => `- ${k.label}: ${fmt(k.value, k.unit)} (status ${k.status}; patokan cukup ${fmt(k.warning, k.unit)}, bagus ${fmt(k.good, k.unit)}${k.median != null ? `; median toko ${fmt(k.median, k.unit)}` : ''})`)
    .join('\n');
  const rawLines = Object.entries(analysis.values)
    .map(([id, v]) => `${id}=${Math.round(v * 100) / 100}`)
    .join(', ');
  const ruleLines = analysis.insights.map((i) => `- [${i.severity}] ${i.title}: ${i.detail}`).join('\n');
  const schema = {
    type: 'object',
    properties: {
      ringkasan: { type: 'string' },
      diagnosa: { type: 'array', items: { type: 'object', properties: { judul: { type: 'string' }, penjelasan: { type: 'string' } }, required: ['judul', 'penjelasan'], additionalProperties: false } },
      aksi_sekarang: { type: 'array', items: { type: 'string' } },
      untuk_live_berikutnya: { type: 'array', items: { type: 'string' } },
    },
    required: ['ringkasan', 'diagnosa', 'aksi_sekarang', 'untuk_live_berikutnya'],
    additionalProperties: false,
  };
  try {
    const response = await api.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
      system: 'Kamu konsultan live commerce TikTok Shop Indonesia yang membantu admin & host live. Jawab dalam Bahasa Indonesia yang santai tapi profesional. Fokus pada penyebab paling mungkin dan tindakan konkret yang bisa dilakukan host/admin. Gunakan angka dari data; jangan mengarang angka baru.',
      messages: [{
        role: 'user',
        content: `Live: ${live.title || '(tanpa judul)'} · host ${live.host || '-'} · ${live.date || ''}\nSkor kesehatan: ${analysis.health.score != null ? Math.round(analysis.health.score) : '-'} (${analysis.health.label})\nBottleneck: ${analysis.bottleneck ? analysis.bottleneck.step : '-'}\n\nKPI:\n${kpiLines}\n\nSemua nilai: ${rawLines}\n\nTemuan mesin aturan:\n${ruleLines}\n\nJumlah live pembanding di histori: ${history}\n\nBerikan ringkasan 2-3 kalimat, 2-4 diagnosa (kenapa angka jomplang & hubungan antar metrik), maksimal 3 aksi untuk SEKARANG saat live, dan 3-5 saran untuk live berikutnya.`,
      }],
    });
    return readJson(response);
  } catch (e) {
    throw friendlyError(Anthropic, e);
  }
}
