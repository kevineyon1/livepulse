// Pengaturan per browser (localStorage). Dibungkus try/catch karena storage bisa diblokir.
import { DEFAULT_SETTINGS } from '../core/benchmarks.js';

const KEY = 'livepulse.settings.v1';

const DEFAULTS = {
  ...DEFAULT_SETTINGS,
  engine: 'ocr', // 'ocr' | 'ai'
  apiKey: '',
  studio: '',
  hosts: [],
  kpiOverrides: {},
};

let cache = null;

export function getSettings() {
  if (cache) return cache;
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch {
    saved = {};
  }
  cache = { ...DEFAULTS, ...saved, kpiOverrides: { ...(saved.kpiOverrides || {}) } };
  return cache;
}

export function saveSettings(patch) {
  cache = { ...getSettings(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* storage penuh / diblokir: tetap pakai nilai di memori */
  }
  window.dispatchEvent(new CustomEvent('settings-changed'));
  return cache;
}

export function rememberHost(name) {
  const n = String(name || '').trim();
  if (!n) return;
  const s = getSettings();
  if (!s.hosts.includes(n)) saveSettings({ hosts: [...s.hosts, n].slice(-30) });
}
