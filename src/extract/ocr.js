// OCR gratis di browser (Tesseract.js). Tidak ada gambar yang dikirim ke server mana pun.
import { prepareImage } from './preprocess.js';
import { maskFromRGBA } from './glyphs.js';
import { extractMetrics } from './pipeline.js';

let workerPromise = null;
let loadListener = null;

async function getWorker() {
  if (!workerPromise) {
    const { createWorker } = await import('tesseract.js');
    workerPromise = createWorker('eng', 1, {
      logger: (m) => loadListener?.(m),
    }).catch((e) => {
      workerPromise = null;
      throw e;
    });
  }
  return workerPromise;
}

/** Mulai unduh mesin OCR di latar belakang supaya analisa pertama terasa cepat. */
export function warmUpOcr() {
  getWorker().catch(() => {});
}

function flatWords(data) {
  const out = [];
  for (const b of data.blocks || []) for (const p of b.paragraphs) for (const l of p.lines) for (const w of l.words) out.push(w);
  return out;
}

function toCanvas(rgba) {
  const c = document.createElement('canvas');
  c.width = rgba.width;
  c.height = rgba.height;
  c.getContext('2d').putImageData(new ImageData(rgba.data, rgba.width, rgba.height), 0, 0);
  return c;
}

/**
 * @param {Blob} blob screenshot
 * @param {(step: string, info?: object) => void} onProgress
 * @returns {Promise<{metrics: Record<string, any>, width: number, height: number}>}
 */
export async function readScreenshot(blob, onProgress = () => {}) {
  onProgress('prepare');
  const prepared = await prepareImage(blob);
  const { canvas, scale } = prepared;
  const img = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  const mask = maskFromRGBA(img.data, canvas.width, canvas.height);

  loadListener = (m) => {
    if (m.status && /load|initializ/i.test(m.status)) onProgress('engine', { status: m.status, progress: m.progress });
  };
  const worker = await getWorker();
  loadListener = null;

  const recognize = async (image, { psm, whitelist }) => {
    await worker.setParameters({ tessedit_pageseg_mode: psm, tessedit_char_whitelist: whitelist || '' });
    const { data } = await worker.recognize(image, {}, { blocks: true });
    return flatWords(data);
  };
  const result = await extractMetrics({ image: canvas, mask, scale, recognize, toImage: async (r) => toCanvas(r), onProgress });
  return { metrics: result.metrics, width: prepared.width, height: prepared.height };
}
