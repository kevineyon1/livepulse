import { splitDisplay } from '../core/format.js';
import { icon, STATUS_ICON } from './icons.js';
import { STATUS } from '../core/benchmarks.js';

/** Escape teks bebas (judul live, nama host, catatan) sebelum masuk ke HTML. */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Angka gaya dashboard: <span class="num">8<span class="num-d">.42K</span></span> */
export function num(v, unit, extra = '') {
  const { prefix, main, rest } = splitDisplay(v, unit);
  return `<span class="num ${extra}" data-v="${Number.isFinite(v) ? v : ''}" data-unit="${unit}">${prefix ? `<span class="pre">${prefix}</span>` : ''}<span class="num-i">${main}</span><span class="num-d">${rest}</span></span>`;
}

const STATUS_LABEL = { ...Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [k, v.label])), info: 'Info' };
const SEV_LABEL = { critical: 'Kritis', warning: 'Waspada', info: 'Info', good: 'Bagus', ok: 'Cukup' };

export function statusChip(status, label) {
  if (!status) return '';
  return `<span class="chip s-${status}">${icon(STATUS_ICON[status] || 'info')}${esc(label ?? STATUS_LABEL[status] ?? SEV_LABEL[status])}</span>`;
}

export function sevChip(sev) {
  return statusChip(sev, SEV_LABEL[sev]);
}

export function html(strings, ...vals) {
  return strings.reduce((acc, s, i) => acc + s + (i < vals.length ? (Array.isArray(vals[i]) ? vals[i].join('') : vals[i] ?? '') : ''), '');
}

export function download(filename, content, type = 'application/json') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function nowHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
