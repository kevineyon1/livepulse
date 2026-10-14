// Format angka mengikuti gaya dashboard TikTok LIVE (8.42K, 2.36M, 18.64%, 21s)
// supaya admin langsung "nyambung" dengan apa yang mereka lihat di dashboard.

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export function compact(v, digits = 2) {
  const a = Math.abs(v);
  if (a >= 1e9) return trim((v / 1e9).toFixed(digits)) + 'B';
  if (a >= 1e6) return trim((v / 1e6).toFixed(digits)) + 'M';
  if (a >= 1e3) return trim((v / 1e3).toFixed(digits)) + 'K';
  if (Number.isInteger(v)) return String(v);
  return trim(v.toFixed(digits));
}

function trim(s) {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

export function full(v) {
  return Math.round(v).toLocaleString('en-US');
}

export function duration(sec) {
  const s = Math.round(sec);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
  return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`;
}

/**
 * @param {number|null|undefined} v
 * @param {string} unit count|currency|percent|duration|ratio|hours
 * @param {{full?: boolean}} [opt]
 */
export function fmt(v, unit = 'count', opt = {}) {
  if (!isNum(v)) return '—';
  switch (unit) {
    case 'currency':
      return 'Rp' + (opt.full ? full(v) : compact(v));
    case 'percent':
      return (Math.abs(v) >= 100 ? v.toFixed(1) : v.toFixed(2)) + '%';
    case 'duration':
      return duration(v);
    case 'ratio':
      return v.toFixed(2);
    case 'hours':
      return v.toFixed(1) + ' jam';
    default:
      return opt.full ? full(v) : compact(v);
  }
}

/**
 * Pecah angka jadi bagian besar & kecil, meniru tipografi dashboard
 * (angka utama tebal besar, desimal + satuan lebih kecil): "8" + ".42K".
 */
export function splitDisplay(v, unit = 'count') {
  if (!isNum(v)) return { prefix: '', main: '—', rest: '' };
  const text = fmt(v, unit);
  if (unit === 'duration') {
    const m = text.match(/^(\d+)(.*)$/);
    return { prefix: '', main: m[1], rest: m[2] };
  }
  const prefix = unit === 'currency' ? 'Rp' : '';
  const body = prefix ? text.slice(prefix.length) : text;
  const m = body.match(/^(-?[\d,]+)(.*)$/);
  return m ? { prefix, main: m[1], rest: m[2] } : { prefix, main: body, rest: '' };
}

export function signedPct(p, digits = 0) {
  if (!isNum(p)) return '—';
  const s = (p * 100).toFixed(digits);
  return (p > 0 ? '+' : '') + s + '%';
}

export function dateLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function timeLabel(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}
