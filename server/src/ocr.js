const sharp = require('sharp');
const { createWorker, PSM } = require('tesseract.js');

let workerPromise = null;
async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng');
      try {
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
          preserve_interword_spaces: '1',
        });
      } catch {
        // older versions may ignore some parameters; OCR should still run.
      }
      return worker;
    })();
  }
  return workerPromise;
}

function decodeBase64Image(input) {
  const raw = String(input || '').trim();
  const base64 = raw.startsWith('data:') ? raw.slice(raw.indexOf(',') + 1) : raw;
  return Buffer.from(base64, 'base64');
}

function cropBox(meta, ratio = 0.04) {
  const left = Math.max(0, Math.round((meta.width || 0) * ratio));
  const top = Math.max(0, Math.round((meta.height || 0) * ratio));
  const width = Math.max(1, (meta.width || 1) - left * 2);
  const height = Math.max(1, (meta.height || 1) - top * 2);
  return { left, top, width, height };
}

async function makeVariant(buffer, label, recipe) {
  const out = await recipe(sharp(buffer, { failOn: 'none' }).rotate()).png().toBuffer();
  return { label, buffer: out };
}

async function buildVariants(buffer) {
  const meta = await sharp(buffer, { failOn: 'none' }).metadata();
  const crop = cropBox(meta);
  return await Promise.all([
    makeVariant(buffer, 'ORIGINAL', (img) => img.resize({ width: 1600, withoutEnlargement: false })),
    makeVariant(buffer, 'GRAYSCALE X2', (img) => img.resize({ width: 1800, withoutEnlargement: false }).grayscale().normalize()),
    makeVariant(buffer, 'HIGH CONTRAST X2', (img) => img.resize({ width: 1800, withoutEnlargement: false }).grayscale().normalize().threshold(150)),
    makeVariant(buffer, 'CROPPED CONTRAST X2', (img) => img.extract(crop).resize({ width: 1900, withoutEnlargement: false }).grayscale().normalize().threshold(155)),
  ]);
}

async function recognizeVariant(worker, variant) {
  const out = await worker.recognize(variant.buffer);
  return { label: variant.label, text: String(out?.data?.text || '') };
}

async function ocrStatsScreen(base64Image) {
  const input = decodeBase64Image(base64Image);
  const worker = await getWorker();
  const variants = await buildVariants(input);
  const passes = [];
  for (const variant of variants) {
    try {
      passes.push(await recognizeVariant(worker, variant));
    } catch {
      // one bad pass should not kill the whole OCR attempt
    }
  }
  return { passes };
}

module.exports = { ocrStatsScreen };
