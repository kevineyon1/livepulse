// Angka dalam bahasa sehari-hari untuk saran yang dibaca host & admin:
// "3 dari 100 orang", "Rp16,8 jt", "23 detik" — bukan "TTR 3.17%".

const ok = (v) => typeof v === 'number' && Number.isFinite(v);
const id = (v, digits = 0) => v.toLocaleString('id-ID', { maximumFractionDigits: digits, minimumFractionDigits: 0 });

/** Basis yang enak dibaca: angka < 1% memakai "dari 1.000". */
export const baseFor = (pct) => (ok(pct) && pct < 1 ? 1000 : 100);

/** Persen → "3 dari 100" (atau "5 dari 1.000" untuk angka kecil). Basis bisa dipaksa agar dua angka sebanding. */
export function perHundred(pct, base = baseFor(pct)) {
  if (!ok(pct)) return '—';
  const n = (pct / 100) * base;
  const shown = n >= 10 ? id(Math.round(n)) : id(Math.max(Math.round(n * 10) / 10, 0.1), 1);
  return `${shown} dari ${base === 1000 ? '1.000' : '100'}`;
}

/** Huruf pertama kapital. */
export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
/** Huruf pertama kecil (tanpa merusak singkatan seperti "Rp1"). */
export const lowerFirst = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/** Rupiah ringkas gaya Indonesia: Rp850 rb, Rp16,75 jt, Rp1,2 miliar. */
export function rupiah(v) {
  if (!ok(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e9) return `Rp${id(v / 1e9, 2)} miliar`;
  if (a >= 1e6) return `Rp${id(v / 1e6, 2)} jt`;
  if (a >= 1e3) return `Rp${id(Math.round(v / 1e3))} rb`;
  return `Rp${id(Math.round(v))}`;
}

/** Bilangan bulat dengan titik ribuan: 1.590 */
export function angka(v) {
  return ok(v) ? id(Math.round(v)) : '—';
}

export function durasi(sec) {
  if (!ok(sec)) return '—';
  const s = Math.round(sec);
  if (s < 60) return `${s} detik`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m} menit ${r} detik` : `${m} menit`;
}

/** ROI → "Rp18,4" (hasil per Rp1 iklan). */
export function perRupiah(roi) {
  return ok(roi) ? `Rp${id(roi, 1)}` : '—';
}

/** Persentase perubahan: "turun 94%" / "naik 57%". */
export function change(delta) {
  if (!ok(delta)) return '';
  const p = Math.round(Math.abs(delta) * 100);
  return delta < 0 ? `turun ${p}%` : `naik ${p}%`;
}

/** Nilai KPI dalam bahasa sederhana sesuai satuannya. */
export function plainValue(v, unit) {
  switch (unit) {
    case 'percent':
      return `${id(v, v < 10 ? 2 : 1)}%`;
    case 'duration':
      return durasi(v);
    case 'currency':
      return rupiah(v);
    case 'ratio':
      return id(v, 1);
    default:
      return angka(v);
  }
}
