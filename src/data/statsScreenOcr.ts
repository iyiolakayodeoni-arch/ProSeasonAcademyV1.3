import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { PSA_OCR_URL } from '../config';
import { BenchmarkDraftMatch } from './benchmarkTracker';

export type OcrField = Exclude<keyof BenchmarkDraftMatch, 'id' | 'screenshotName' | 'screenshotUri'>;
export type OcrSide = 'left' | 'right';
export type OcrPairKey = Exclude<OcrField, 'gf' | 'ga'> | 'score';

export interface OcrPair {
  left: number;
  right: number;
}

export interface StatsScreenOcrResult {
  fields: Partial<Record<OcrField, number>>;
  paired: Partial<Record<OcrPairKey, OcrPair>>;
  rawText: string;
  hitCount: number;
  suggestedSide: OcrSide | 'unknown';
  variantLabel?: string;
}

const NL = String.fromCharCode(10);

const SCORE_PATTERNS = [
  /(?:full\s*time|result|score)?\s*(\d{1,2})\s*[-:–]\s*(\d{1,2})/i,
  /(?:you|home)\s*(\d{1,2})\s*[-:–]\s*(\d{1,2})\s*(?:them|away|opp)/i,
];

const SIDE_HINTS: Array<{ side: OcrSide; pattern: RegExp }> = [
  { side: 'left', pattern: /you\s*(?:vs)?\s*\d{1,2}\s*[-:–]\s*\d{1,2}\s*(?:them|opp|away)/i },
  { side: 'left', pattern: /home\s*\d{1,2}\s*[-:–]\s*\d{1,2}\s*(?:away|opp)/i },
  { side: 'right', pattern: /(?:them|opp|away)\s*\d{1,2}\s*[-:–]\s*\d{1,2}\s*you/i },
  { side: 'right', pattern: /away\s*\d{1,2}\s*[-:–]\s*\d{1,2}\s*home/i },
];

const FIELD_PATTERNS: Record<OcrField, RegExp[]> = {
  gf: [],
  ga: [],
  possession: [
    /(?:possession|poss)[^\n\d]{0,18}(\d{1,3})%?/i,
    /(\d{1,3})%?[^\n\d]{0,18}(?:possession|poss)/i,
  ],
  shots: [
    /(?:^|\n)\s*shots[^\n\d]{0,18}(\d{1,2})/im,
    /(\d{1,2})[^\n\d]{0,18}shots/im,
  ],
  shotsOnTarget: [
    /(?:shots\s*on\s*target|shots\s*on\s*goal|shot\s*on\s*goal|on\s*target|on\s*goal|shots\s*target)[^\n\d]{0,18}(\d{1,2})/i,
    /(\d{1,2})[^\n\d]{0,18}(?:shots\s*on\s*target|shots\s*on\s*goal|shot\s*on\s*goal|on\s*target|on\s*goal|shots\s*target)/i,
  ],
  passAccuracy: [
    /(?:pass\s*accuracy|passing\s*accuracy|pass\s*acc|passing\s*acc|passing\s*%|pass\s*%|pass\s*completion)[^\n\d%]{0,18}(\d{1,3})%?/i,
    /(\d{1,3})%?[^\n\d%]{0,18}(?:pass\s*accuracy|passing\s*accuracy|pass\s*acc|passing\s*acc|passing\s*%|pass\s*%|pass\s*completion)/i,
  ],
  tacklesWon: [
    /(?:tackles\s*won|tackle\s*won|tackles\s*successful|tackles)[^\n\d]{0,18}(\d{1,2})/i,
    /(\d{1,2})[^\n\d]{0,18}(?:tackles\s*won|tackle\s*won|tackles\s*successful|tackles)/i,
  ],
  saves: [
    /(?:keeper\s*saves|goalkeeper\s*saves|save|saves)[^\n\d]{0,18}(\d{1,2})/i,
    /(\d{1,2})[^\n\d]{0,18}(?:keeper\s*saves|goalkeeper\s*saves|save|saves)/i,
  ],
};

const PAIR_PATTERNS: Record<OcrPairKey, RegExp[]> = {
  score: [
    /(?:full\s*time|result|score)?[^\n\d]{0,12}(\d{1,2})\s*[-:–]\s*(\d{1,2})/i,
  ],
  possession: [
    /(?:possession|poss)[^\n\d]{0,18}(\d{1,3})%?\s+(\d{1,3})%?/i,
  ],
  shots: [
    /(?:^|\n)\s*shots[^\n\d]{0,18}(\d{1,2})\s+(\d{1,2})/im,
  ],
  shotsOnTarget: [
    /(?:shots\s*on\s*target|shots\s*on\s*goal|shot\s*on\s*goal|on\s*target|on\s*goal|shots\s*target)[^\n\d]{0,18}(\d{1,2})\s+(\d{1,2})/i,
  ],
  passAccuracy: [
    /(?:pass\s*accuracy|passing\s*accuracy|pass\s*acc|passing\s*acc|passing\s*%|pass\s*%|pass\s*completion)[^\n\d]{0,18}(\d{1,3})%?\s+(\d{1,3})%?/i,
  ],
  tacklesWon: [
    /(?:tackles\s*won|tackle\s*won|tackles\s*successful|tackles)[^\n\d]{0,18}(\d{1,2})\s+(\d{1,2})/i,
  ],
  saves: [
    /(?:keeper\s*saves|goalkeeper\s*saves|save|saves)[^\n\d]{0,18}(\d{1,2})\s+(\d{1,2})/i,
  ],
};

function cleanText(raw: string): string {
  return raw
    .replace(/[|]/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—]/g, '-')
    .replace(/\r/g, NL)
    .replace(/([0-9])[oO](?=[0-9%]|\b)/g, (_m, d: string) => `${d}0`)
    .replace(/([0-9])[Il](?=[0-9%]|\b)/g, (_m, d: string) => `${d}1`)
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{2,}/g, NL)
    .trim();
}

function clampForField(key: OcrField, value: number): number {
  switch (key) {
    case 'gf':
    case 'ga':
      return Math.max(0, Math.min(20, Math.round(value)));
    case 'possession':
    case 'passAccuracy':
      return Math.max(0, Math.min(100, Math.round(value)));
    case 'saves':
      return Math.max(0, Math.min(20, Math.round(value)));
    default:
      return Math.max(0, Math.min(50, Math.round(value)));
  }
}

function findField(text: string, key: OcrField): number | null {
  for (const pattern of FIELD_PATTERNS[key]) {
    const match = text.match(pattern);
    if (match) return clampForField(key, Number(match[1]));
  }
  return null;
}

function parseScore(text: string): Partial<Record<'gf' | 'ga', number>> {
  for (const pattern of SCORE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return {
        gf: clampForField('gf', Number(match[1])),
        ga: clampForField('ga', Number(match[2])),
      };
    }
  }
  return {};
}

function parsePair(text: string, key: OcrPairKey): OcrPair | null {
  for (const pattern of PAIR_PATTERNS[key]) {
    const match = text.match(pattern);
    if (match) {
      const leftKey = key === 'score' ? 'gf' : key;
      const rightKey = key === 'score' ? 'ga' : key;
      return {
        left: clampForField(leftKey as OcrField, Number(match[1])),
        right: clampForField(rightKey as OcrField, Number(match[2])),
      };
    }
  }
  return null;
}

function detectSuggestedSide(text: string): OcrSide | 'unknown' {
  for (const hint of SIDE_HINTS) {
    if (hint.pattern.test(text)) return hint.side;
  }
  return 'unknown';
}

function countPairs(paired: Partial<Record<OcrPairKey, OcrPair>>): number {
  return Object.keys(paired).length;
}

function scoreResult(result: StatsScreenOcrResult): number {
  const base = result.hitCount;
  const pairs = countPairs(result.paired) * 1.25;
  const keyBonus = [result.fields.passAccuracy, result.fields.possession, result.fields.shotsOnTarget].filter((v) => typeof v === 'number').length * 0.5;
  const sideBonus = result.suggestedSide !== 'unknown' ? 0.35 : 0;
  return base + pairs + keyBonus + sideBonus;
}

export function mergeOcrResults(results: StatsScreenOcrResult[]): StatsScreenOcrResult {
  if (!results.length) return { fields: {}, paired: {}, rawText: '', hitCount: 0, suggestedSide: 'unknown' };
  const ranked = [...results].sort((a, b) => scoreResult(b) - scoreResult(a));
  const best = ranked[0];
  const fields: Partial<Record<OcrField, number>> = { ...best.fields };
  const paired: Partial<Record<OcrPairKey, OcrPair>> = { ...best.paired };

  for (const result of ranked.slice(1)) {
    for (const [key, value] of Object.entries(result.fields) as Array<[OcrField, number]>) {
      if (fields[key] == null) fields[key] = value;
    }
    for (const [key, value] of Object.entries(result.paired) as Array<[OcrPairKey, OcrPair]>) {
      if (!paired[key]) paired[key] = value;
    }
  }

  const hitCount = Object.values(fields).filter((value) => typeof value === 'number' && Number.isFinite(value)).length;
  return {
    fields,
    paired,
    rawText: ranked.map((r) => `[${r.variantLabel ?? 'pass'}]\n${r.rawText}`).join(`\n\n${'-'.repeat(12)}\n\n`),
    hitCount,
    suggestedSide: ranked.find((r) => r.suggestedSide !== 'unknown')?.suggestedSide ?? best.suggestedSide,
    variantLabel: best.variantLabel,
  };
}

async function loadImage(uri: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = uri;
  });
}

async function buildCanvasVariant(uri: string, label: string, options: { grayscale?: boolean; threshold?: number; crop?: number; scale?: number }) {
  const img = await loadImage(uri);
  const crop = options.crop ?? 0;
  const sx = img.width * crop;
  const sy = img.height * crop;
  const sw = img.width - sx * 2;
  const sh = img.height - sy * 2;
  const scale = options.scale ?? 1.8;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return { label, uri };
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  if (options.grayscale || options.threshold != null) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      const value = options.threshold != null ? (gray >= options.threshold ? 255 : 0) : gray;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  return { label, uri: canvas.toDataURL('image/png') };
}

async function preprocessImageVariants(imageUri: string): Promise<Array<{ label: string; uri: string }>> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return [{ label: 'ORIGINAL', uri: imageUri }];
  }
  const variants = await Promise.all([
    Promise.resolve({ label: 'ORIGINAL', uri: imageUri }),
    buildCanvasVariant(imageUri, 'GRAYSCALE X2', { grayscale: true, scale: 2 }),
    buildCanvasVariant(imageUri, 'HIGH CONTRAST X2', { grayscale: true, threshold: 150, scale: 2 }),
    buildCanvasVariant(imageUri, 'CROPPED CONTRAST X2', { grayscale: true, threshold: 155, crop: 0.04, scale: 2.2 }),
  ]);
  return variants;
}

let workerPromise: Promise<any> | null = null;
async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      return await createWorker('eng');
    })();
  }
  return await workerPromise;
}

async function runWorkerPass(worker: any, imageUri: string, label: string): Promise<StatsScreenOcrResult> {
  const result = await worker.recognize(imageUri);
  return parseStatsFromOcrText(result.data.text ?? '', label);
}

export function fieldsForOcrSide(result: StatsScreenOcrResult, side: OcrSide): Partial<Record<OcrField, number>> {
  const next: Partial<Record<OcrField, number>> = { ...result.fields };
  const score = result.paired.score;
  if (score) {
    next.gf = side === 'left' ? score.left : score.right;
    next.ga = side === 'left' ? score.right : score.left;
  }
  for (const key of Object.keys(result.paired) as OcrPairKey[]) {
    if (key === 'score') continue;
    const pair = result.paired[key];
    if (!pair) continue;
    next[key as OcrField] = side === 'left' ? pair.left : pair.right;
  }
  return next;
}

export function parseStatsFromOcrText(raw: string, variantLabel?: string): StatsScreenOcrResult {
  const text = cleanText(raw);
  const paired: Partial<Record<OcrPairKey, OcrPair>> = {};
  const scorePair = parsePair(text, 'score');
  if (scorePair) paired.score = scorePair;

  for (const key of Object.keys(PAIR_PATTERNS) as OcrPairKey[]) {
    if (key === 'score') continue;
    const pair = parsePair(text, key);
    if (pair) paired[key] = pair;
  }

  const fields: Partial<Record<OcrField, number>> = {
    ...parseScore(text),
  };

  for (const key of Object.keys(FIELD_PATTERNS) as OcrField[]) {
    if (key === 'gf' || key === 'ga') continue;
    const pairedValue = paired[key as Exclude<OcrField, 'gf' | 'ga'>];
    if (pairedValue) {
      fields[key] = pairedValue.left;
      continue;
    }
    const value = findField(text, key);
    if (value != null) fields[key] = value;
  }

  const hitCount = Object.values(fields).filter((value) => typeof value === 'number' && Number.isFinite(value)).length;
  return {
    fields,
    paired,
    rawText: text,
    hitCount,
    suggestedSide: detectSuggestedSide(text),
    variantLabel,
  };
}

export async function scanStatsScreenshot(imageUri: string): Promise<StatsScreenOcrResult> {
  if (Platform.OS !== 'web') {
    return await scanStatsScreenshotViaServer(imageUri);
  }
  const worker = await getWorker();
  const variants = await preprocessImageVariants(imageUri);
  const passes: StatsScreenOcrResult[] = [];
  for (const variant of variants) {
    try {
      passes.push(await runWorkerPass(worker, variant.uri, variant.label));
    } catch {
      // one failed pass should not kill the batch — the other image treatments may still read.
    }
  }
  return mergeOcrResults(passes);
}

async function readImageAsBase64(imageUri: string): Promise<string> {
  if (imageUri.startsWith('data:')) return imageUri.slice(imageUri.indexOf(',') + 1);
  return await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
}

async function scanStatsScreenshotViaServer(imageUri: string): Promise<StatsScreenOcrResult> {
  if (!PSA_OCR_URL) {
    throw new Error('NATIVE OCR SERVER IS NOT CONFIGURED YET. ADD EXPO_PUBLIC_PSA_OCR_URL TO ENABLE DIRECT MOBILE OCR.');
  }
  const imageBase64 = await readImageAsBase64(imageUri);
  const response = await fetch(PSA_OCR_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ imageBase64 }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) {
    throw new Error(String(body?.error ?? 'SERVER OCR FAILED'));
  }
  const passes = Array.isArray(body.passes)
    ? body.passes.map((pass: any) => parseStatsFromOcrText(String(pass?.text ?? ''), String(pass?.label ?? 'SERVER PASS')))
    : [];
  if (!passes.length) {
    throw new Error('SERVER OCR RETURNED NO READABLE PASSES.');
  }
  return mergeOcrResults(passes);
}

export function parseStatsFromPastedText(text: string): StatsScreenOcrResult {
  return parseStatsFromOcrText(text, 'PASTED TEXT');
}
