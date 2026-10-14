// State kecil lintas halaman: screenshot yang baru ditempel/diseret sebelum dianalisa,
// dan target live bila admin menambah snapshot ke live yang sudah ada.
const bus = new EventTarget();
let pending = [];
let targetLiveId = null;

export function addPendingImages(files, liveId = null) {
  const imgs = [...files].filter((f) => f && f.type && f.type.startsWith('image/'));
  if (!imgs.length) return 0;
  pending = [...pending, ...imgs].slice(-4);
  if (liveId) targetLiveId = liveId;
  bus.dispatchEvent(new CustomEvent('pending'));
  return imgs.length;
}

export function takePending() {
  const out = { images: pending, liveId: targetLiveId };
  pending = [];
  targetLiveId = null;
  return out;
}

export function hasPending() {
  return pending.length > 0;
}

export function onPending(fn) {
  bus.addEventListener('pending', fn);
  return () => bus.removeEventListener('pending', fn);
}

/** Ambil gambar dari event paste / drop. */
export function imagesFromEvent(e) {
  const dt = e.clipboardData || e.dataTransfer;
  if (!dt) return [];
  const files = [...(dt.files || [])].filter((f) => f.type.startsWith('image/'));
  if (files.length) return files;
  return [...(dt.items || [])].filter((i) => i.kind === 'file' && i.type.startsWith('image/')).map((i) => i.getAsFile()).filter(Boolean);
}
