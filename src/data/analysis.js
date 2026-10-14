// Menjalankan mesin insight untuk satu live dengan konteks histori & snapshot.
import { analyze } from '../core/insights.js';

const key = (l) => `${l.date || ''} ${l.startTime || ''} ${String(l.createdAt || 0).padStart(15, '0')}`;

/** Live-live sebelum `live` (urut lama → baru) yang punya data. */
export function historyBefore(live, allLives) {
  const k = key(live);
  return allLives
    .filter((l) => l.id !== live.id && Object.keys(l.reported || {}).length && key(l) < k)
    .sort((a, b) => (key(a) < key(b) ? -1 : 1));
}

export function analyzeLive(live, allLives, settings) {
  const history = historyBefore(live, allLives).map((l) => ({ reported: l.reported }));
  let snapshots = live.snapshots || [];
  // Bila jam mulai diketahui, titik awal (GMV 0) membuat momentum bisa dihitung dari 2 snapshot.
  if (live.date && live.startTime && snapshots.length) {
    const start = new Date(`${live.date}T${live.startTime}:00`);
    if (!Number.isNaN(+start) && start < new Date(snapshots[0].capturedAt)) {
      snapshots = [{ capturedAt: start.toISOString(), reported: { gmv: 0 } }, ...snapshots];
    }
  }
  return analyze({ reported: live.reported, history, snapshots, settings, kpiOverrides: settings.kpiOverrides });
}
