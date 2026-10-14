// Penyimpanan lokal (IndexedDB) — semua data live tersimpan di browser ini.
// Struktur:
//   lives     : { id, title, host, date (YYYY-MM-DD), startTime (HH:MM), notes, createdAt, updatedAt }
//   snapshots : { id, liveId, capturedAt (ISO), reported: {metricId: number}, engine, image?: Blob }

import { openDB } from 'idb';

const DB_NAME = 'livepulse';
let dbp = null;

function db() {
  if (!dbp) {
    dbp = openDB(DB_NAME, 1, {
      upgrade(d) {
        const lives = d.createObjectStore('lives', { keyPath: 'id' });
        lives.createIndex('date', 'date');
        const snaps = d.createObjectStore('snapshots', { keyPath: 'id' });
        snaps.createIndex('liveId', 'liveId');
      },
    });
  }
  return dbp;
}

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

const ok = (v) => typeof v === 'number' && Number.isFinite(v);

/** Gabungkan snapshot (urut waktu): nilai terbaru menimpa yang lama, nilai kosong tidak menghapus. */
export function finalReported(snapshots) {
  const out = {};
  for (const s of [...snapshots].sort((a, b) => new Date(a.capturedAt) - new Date(b.capturedAt))) {
    for (const [k, v] of Object.entries(s.reported || {})) if (ok(v)) out[k] = v;
  }
  return out;
}

const sortLives = (a, b) => (b.date || '').localeCompare(a.date || '') || (b.startTime || '').localeCompare(a.startTime || '') || b.createdAt - a.createdAt;

export async function listLives() {
  return (await (await db()).getAll('lives')).sort(sortLives);
}

/** Semua live + snapshot-nya + nilai final, terbaru di depan. */
export async function listLivesWithData() {
  const d = await db();
  const [lives, snaps] = await Promise.all([d.getAll('lives'), d.getAll('snapshots')]);
  const byLive = new Map();
  for (const s of snaps) {
    if (!byLive.has(s.liveId)) byLive.set(s.liveId, []);
    byLive.get(s.liveId).push(s);
  }
  return lives.sort(sortLives).map((l) => {
    const ss = (byLive.get(l.id) || []).sort((a, b) => new Date(a.capturedAt) - new Date(b.capturedAt));
    return { ...l, snapshots: ss, reported: finalReported(ss) };
  });
}

export async function getLive(id) {
  return (await db()).get('lives', id);
}

export async function saveLive(live) {
  const now = Date.now();
  const rec = { createdAt: now, ...live, updatedAt: now };
  await (await db()).put('lives', rec);
  return rec;
}

export async function deleteLive(id) {
  const d = await db();
  const tx = d.transaction(['lives', 'snapshots'], 'readwrite');
  const keys = await tx.objectStore('snapshots').index('liveId').getAllKeys(id);
  await Promise.all([...keys.map((k) => tx.objectStore('snapshots').delete(k)), tx.objectStore('lives').delete(id)]);
  await tx.done;
}

export async function listSnapshots(liveId) {
  const all = await (await db()).getAllFromIndex('snapshots', 'liveId', liveId);
  return all.sort((a, b) => new Date(a.capturedAt) - new Date(b.capturedAt));
}

export async function saveSnapshot(snap) {
  const rec = { id: uid(), capturedAt: new Date().toISOString(), ...snap };
  await (await db()).put('snapshots', rec);
  return rec;
}

export async function deleteSnapshot(id) {
  await (await db()).delete('snapshots', id);
}

// ---- Ekspor / impor ----

export async function exportAll() {
  const d = await db();
  const [lives, snaps] = await Promise.all([d.getAll('lives'), d.getAll('snapshots')]);
  return {
    app: 'livepulse',
    version: 1,
    exportedAt: new Date().toISOString(),
    lives,
    snapshots: snaps.map(({ image, ...rest }) => rest),
  };
}

export async function importAll(data) {
  if (!data || data.app !== 'livepulse' || !Array.isArray(data.lives) || !Array.isArray(data.snapshots)) {
    throw new Error('File bukan ekspor LivePulse yang valid.');
  }
  const d = await db();
  const tx = d.transaction(['lives', 'snapshots'], 'readwrite');
  let lives = 0;
  let snaps = 0;
  for (const l of data.lives) {
    if (typeof l?.id !== 'string') continue;
    await tx.objectStore('lives').put({
      id: l.id, title: String(l.title ?? ''), host: String(l.host ?? ''), date: String(l.date ?? ''),
      startTime: String(l.startTime ?? ''), notes: String(l.notes ?? ''), createdAt: +l.createdAt || Date.now(), updatedAt: Date.now(),
    });
    lives++;
  }
  for (const s of data.snapshots) {
    if (typeof s?.id !== 'string' || typeof s.liveId !== 'string') continue;
    const reported = {};
    for (const [k, v] of Object.entries(s.reported || {})) if (ok(v)) reported[k] = v;
    await tx.objectStore('snapshots').put({ id: s.id, liveId: s.liveId, capturedAt: String(s.capturedAt), reported, engine: String(s.engine ?? 'import') });
    snaps++;
  }
  await tx.done;
  return { lives, snaps };
}

export async function clearAll() {
  const d = await db();
  const tx = d.transaction(['lives', 'snapshots'], 'readwrite');
  await Promise.all([tx.objectStore('lives').clear(), tx.objectStore('snapshots').clear()]);
  await tx.done;
}
