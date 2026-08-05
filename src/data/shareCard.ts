import {
  BenchmarkDelta,
  BenchmarkSummary,
  benchmarkGap,
  benchmarkIdentity,
  benchmarkProofStamp,
} from './benchmarkTracker';
import { colors } from '../theme';

export interface ShareCardSpec {
  displayName: string;
  checkpointLabel: string;
  summary: BenchmarkSummary;
  focus: string;
  generatedAt?: number;
}

export interface ComparisonPosterSpec {
  displayName: string;
  beforeLabel: string;
  afterLabel: string;
  before: BenchmarkSummary;
  after: BenchmarkSummary;
  delta: BenchmarkDelta;
  generatedAt?: number;
}

const W = 1080;
const H = 1350;

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrap(text: string, max = 34): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 8);
}

function dateLabel(at: number): string {
  return new Date(at).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).toUpperCase();
}

function textBlock(lines: string[], x: number, y: number, size: number, lineHeight: number, color: string, weight = 500): string {
  return lines
    .map((line, index) => `<text x="${x}" y="${y + index * lineHeight}" fill="${color}" font-size="${size}" font-family="Arial, Helvetica, sans-serif" font-weight="${weight}">${esc(line)}</text>`)
    .join('');
}

function signed(value: number, decimals = 1): string {
  const v = Math.abs(value) < 0.05 ? 0 : value;
  return `${v > 0 ? '+' : v < 0 ? '-' : ''}${Math.abs(v).toFixed(decimals)}`;
}

function gapBlock(gaps: ReturnType<typeof benchmarkGap>, x: number, startY: number, width = 394): string {
  return gaps
    .map((gap, index) => {
      const y = startY + index * 56;
      const fill = Math.max(0, Math.min(width, (gap.player / 100) * width));
      return `
        <text x="${x}" y="${y}" fill="${colors.fg}" font-size="18" font-family="Courier New, monospace" letter-spacing="1.8">${esc(gap.label)}</text>
        <text x="${x + width}" y="${y}" text-anchor="end" fill="${colors.primary}" font-size="18" font-family="Courier New, monospace" letter-spacing="1.5">${gap.player}/${gap.benchmark}</text>
        <rect x="${x}" y="${y + 12}" width="${width}" height="10" rx="5" fill="rgba(31,56,38,0.95)" />
        <rect x="${x}" y="${y + 12}" width="${fill}" height="10" rx="5" fill="${colors.primary}" />
        <text x="${x}" y="${y + 38}" fill="rgba(143,184,155,0.74)" font-size="14" font-family="Courier New, monospace" letter-spacing="1">${esc(gap.note)} · GAP ${gap.gap}</text>
      `;
    })
    .join('');
}

export function buildShareCardSvg(spec: ShareCardSpec): string {
  const {
    displayName,
    checkpointLabel,
    summary,
    focus,
    generatedAt = Date.now(),
  } = spec;

  const identity = benchmarkIdentity(summary);
  const proof = benchmarkProofStamp(summary);
  const gaps = benchmarkGap(summary).slice(0, 3);
  const focusLines = wrap(focus.toUpperCase(), 34).slice(0, 4);
  const readLines = wrap(summary.style.read.toUpperCase(), 40).slice(0, 3);
  const wdl = `${summary.wins}-${summary.draws}-${summary.losses}`;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#071009" />
      <stop offset="65%" stop-color="#0f1a13" />
      <stop offset="100%" stop-color="#132217" />
    </linearGradient>
    <radialGradient id="glow" cx="20%" cy="18%" r="70%">
      <stop offset="0%" stop-color="${colors.primary}" stop-opacity="0.22" />
      <stop offset="100%" stop-color="${colors.primary}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="warm" cx="90%" cy="12%" r="45%">
      <stop offset="0%" stop-color="${colors.accent}" stop-opacity="0.18" />
      <stop offset="100%" stop-color="${colors.accent}" stop-opacity="0" />
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)" rx="40" />
  <rect x="28" y="28" width="${W - 56}" height="${H - 56}" rx="36" fill="none" stroke="rgba(57,255,106,0.28)" />
  <circle cx="240" cy="210" r="340" fill="url(#glow)" />
  <circle cx="920" cy="160" r="280" fill="url(#warm)" />

  <text x="74" y="110" fill="${colors.fg}" font-size="34" font-family="Courier New, monospace" letter-spacing="5">PROSEASONACADEMY</text>
  <text x="74" y="154" fill="${colors.primary}" font-size="24" font-family="Courier New, monospace" letter-spacing="4">TRACK RECORD · PLAYER DEVELOPMENT DOSSIER</text>

  <rect x="74" y="192" width="932" height="118" rx="26" fill="rgba(38,30,12,0.35)" stroke="rgba(242,192,120,0.26)" />
  <text x="108" y="232" fill="${colors.accent}" font-size="20" font-family="Courier New, monospace" letter-spacing="2.5">${esc(proof.label)}</text>
  <text x="108" y="268" fill="${colors.fg}" font-size="34" font-family="Arial, Helvetica, sans-serif" font-weight="800">${esc(proof.sublabel)}</text>
  <text x="108" y="292" fill="rgba(143,184,155,0.74)" font-size="18" font-family="Courier New, monospace" letter-spacing="1.4">${esc(proof.evidenceLine)}</text>

  <rect x="74" y="338" width="420" height="208" rx="28" fill="rgba(57,255,106,0.08)" stroke="rgba(57,255,106,0.28)" />
  <text x="106" y="382" fill="${colors.muted}" font-size="22" font-family="Courier New, monospace" letter-spacing="3">PLAYER</text>
  <text x="106" y="438" fill="${colors.fg}" font-size="58" font-family="Arial, Helvetica, sans-serif" font-weight="900">${esc(displayName.toUpperCase())}</text>
  <text x="106" y="474" fill="${colors.accent}" font-size="22" font-family="Courier New, monospace" letter-spacing="2.3">${esc(checkpointLabel.toUpperCase())}</text>
  <text x="106" y="514" fill="${colors.primary}" font-size="34" font-family="Arial, Helvetica, sans-serif" font-weight="900">${esc(identity.archetype)}</text>

  <rect x="530" y="338" width="476" height="208" rx="28" fill="rgba(10,15,10,0.55)" stroke="rgba(57,255,106,0.22)" />
  <text x="562" y="382" fill="${colors.muted}" font-size="22" font-family="Courier New, monospace" letter-spacing="3">IDENTITY READ</text>
  <text x="562" y="430" fill="${colors.accent}" font-size="44" font-family="Arial, Helvetica, sans-serif" font-weight="900">${esc(identity.primaryStyle)}</text>
  <text x="562" y="470" fill="${colors.fg}" font-size="24" font-family="Courier New, monospace" letter-spacing="1.5">SECONDARY · ${esc(identity.secondaryTendency)}</text>
  <text x="562" y="504" fill="${colors.fg}" font-size="24" font-family="Courier New, monospace" letter-spacing="1.5">TEMPERAMENT · ${esc(identity.temperament)}</text>
  ${textBlock(readLines, 562, 536, 19, 24, '#d7e4d9', 500)}

  <rect x="74" y="586" width="932" height="212" rx="32" fill="rgba(10,15,10,0.55)" stroke="rgba(57,255,106,0.22)" />
  <text x="74" y="562" fill="${colors.primary}" font-size="26" font-family="Courier New, monospace" letter-spacing="4">CORE RECEIPTS</text>

  <g>
    <rect x="96" y="620" width="206" height="146" rx="22" fill="rgba(57,255,106,0.07)" stroke="rgba(57,255,106,0.22)" />
    <text x="124" y="660" fill="${colors.muted}" font-size="20" font-family="Courier New, monospace" letter-spacing="3">W·D·L</text>
    <text x="124" y="730" fill="${colors.primary}" font-size="72" font-family="Arial, Helvetica, sans-serif" font-weight="900">${wdl}</text>
  </g>
  <g>
    <rect x="326" y="620" width="206" height="146" rx="22" fill="rgba(57,255,106,0.07)" stroke="rgba(57,255,106,0.22)" />
    <text x="354" y="660" fill="${colors.muted}" font-size="20" font-family="Courier New, monospace" letter-spacing="3">POINTS / MATCH</text>
    <text x="354" y="730" fill="${colors.accent}" font-size="72" font-family="Arial, Helvetica, sans-serif" font-weight="900">${summary.pointsPerMatch.toFixed(1)}</text>
  </g>
  <g>
    <rect x="556" y="620" width="206" height="146" rx="22" fill="rgba(57,255,106,0.07)" stroke="rgba(57,255,106,0.22)" />
    <text x="584" y="660" fill="${colors.muted}" font-size="20" font-family="Courier New, monospace" letter-spacing="3">AVG GF</text>
    <text x="584" y="730" fill="${colors.fg}" font-size="72" font-family="Arial, Helvetica, sans-serif" font-weight="900">${summary.avgGoalsFor.toFixed(1)}</text>
  </g>
  <g>
    <rect x="786" y="620" width="198" height="146" rx="22" fill="rgba(57,255,106,0.07)" stroke="rgba(57,255,106,0.22)" />
    <text x="814" y="660" fill="${colors.muted}" font-size="20" font-family="Courier New, monospace" letter-spacing="3">AVG GA</text>
    <text x="814" y="730" fill="${colors.fg}" font-size="72" font-family="Arial, Helvetica, sans-serif" font-weight="900">${summary.avgGoalsAgainst.toFixed(1)}</text>
  </g>

  <text x="106" y="792" fill="rgba(143,184,155,0.74)" font-size="18" font-family="Courier New, monospace" letter-spacing="1.6">POSSESSION ${summary.avgPossession.toFixed(1)}% · PASS ${summary.avgPassAccuracy.toFixed(1)}% · ON TARGET ${summary.avgShotsOnTarget.toFixed(1)} · TACKLES ${summary.avgTacklesWon.toFixed(1)} · CLEAN SHEETS ${summary.cleanSheets}</text>

  <rect x="74" y="842" width="470" height="382" rx="30" fill="rgba(20,16,8,0.44)" stroke="rgba(242,192,120,0.24)" />
  <text x="106" y="888" fill="${colors.accent}" font-size="24" font-family="Courier New, monospace" letter-spacing="3">BENCHMARK GAP</text>
  <text x="106" y="918" fill="${colors.fg}" font-size="22" font-family="Arial, Helvetica, sans-serif" font-weight="700">HOW FAR THIS PLAYER STILL SITS FROM ELITE REFERENCE</text>
  ${gapBlock(gaps, 106, 962, 406)}

  <rect x="572" y="842" width="434" height="382" rx="30" fill="rgba(57,255,106,0.06)" stroke="rgba(57,255,106,0.22)" />
  <text x="604" y="888" fill="${colors.primary}" font-size="24" font-family="Courier New, monospace" letter-spacing="3">NEXT FOCUS</text>
  ${textBlock(focusLines, 604, 952, 31, 40, colors.fg, 700)}
  <text x="604" y="1120" fill="rgba(143,184,155,0.74)" font-size="18" font-family="Courier New, monospace" letter-spacing="1.2">SHOT ACC ${summary.shotAccuracy.toFixed(1)}% · CONVERSION ${summary.conversionRate.toFixed(1)}%</text>
  <text x="604" y="1152" fill="rgba(143,184,155,0.74)" font-size="18" font-family="Courier New, monospace" letter-spacing="1.2">STYLE CONFIDENCE · ${esc(summary.style.confidence)}</text>

  <text x="74" y="1292" fill="rgba(143,184,155,0.72)" font-size="22" font-family="Courier New, monospace" letter-spacing="2.5">GENERATED ${dateLabel(generatedAt)} · BUILT FROM VERIFIED MATCH STATS SCREENS</text>
</svg>`.trim();
}

export function buildComparisonPosterSvg(spec: ComparisonPosterSpec): string {
  const { displayName, beforeLabel, afterLabel, before, after, delta, generatedAt = Date.now() } = spec;
  const beforeIdentity = benchmarkIdentity(before);
  const afterIdentity = benchmarkIdentity(after);
  const beforeProof = benchmarkProofStamp(before);
  const afterProof = benchmarkProofStamp(after);
  const beforeGaps = benchmarkGap(before).slice(0, 2);
  const afterGaps = benchmarkGap(after).slice(0, 2);
  const focusLines = wrap(after.style.focus.toUpperCase(), 34).slice(0, 4);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="cmp_bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#071009" />
      <stop offset="100%" stop-color="#101b14" />
    </linearGradient>
    <linearGradient id="cmp_panel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(57,255,106,0.08)" />
      <stop offset="100%" stop-color="rgba(57,255,106,0.02)" />
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#cmp_bg)" rx="40" />
  <rect x="28" y="28" width="${W - 56}" height="${H - 56}" rx="36" fill="none" stroke="rgba(57,255,106,0.28)" />

  <text x="74" y="110" fill="${colors.fg}" font-size="34" font-family="Courier New, monospace" letter-spacing="5">PROSEASONACADEMY</text>
  <text x="74" y="154" fill="${colors.accent}" font-size="24" font-family="Courier New, monospace" letter-spacing="4">BEFORE VS AFTER · DEVELOPMENT PROOF</text>
  <text x="74" y="220" fill="${colors.fg}" font-size="62" font-family="Arial, Helvetica, sans-serif" font-weight="900">${esc(displayName.toUpperCase())}</text>

  <rect x="74" y="274" width="440" height="386" rx="30" fill="url(#cmp_panel)" stroke="rgba(57,255,106,0.22)" />
  <text x="108" y="322" fill="${colors.muted}" font-size="24" font-family="Courier New, monospace" letter-spacing="3">BEFORE</text>
  <text x="108" y="356" fill="${colors.accent}" font-size="22" font-family="Courier New, monospace" letter-spacing="2">${esc(beforeLabel.toUpperCase())}</text>
  <text x="108" y="400" fill="${colors.primary}" font-size="20" font-family="Courier New, monospace" letter-spacing="2">${esc(beforeProof.label)}</text>
  <text x="108" y="446" fill="${colors.fg}" font-size="38" font-family="Arial, Helvetica, sans-serif" font-weight="900">${esc(beforeIdentity.archetype)}</text>
  <text x="108" y="492" fill="${colors.fg}" font-size="24" font-family="Courier New, monospace" letter-spacing="1.5">${esc(beforeIdentity.secondaryTendency)}</text>
  <text x="108" y="532" fill="#d6e3d9" font-size="30" font-family="Arial, Helvetica, sans-serif" font-weight="800">${before.pointsPerMatch.toFixed(1)} PPM</text>
  ${gapBlock(beforeGaps, 108, 576, 374)}

  <rect x="566" y="274" width="440" height="386" rx="30" fill="rgba(242,192,120,0.08)" stroke="rgba(242,192,120,0.24)" />
  <text x="600" y="322" fill="${colors.muted}" font-size="24" font-family="Courier New, monospace" letter-spacing="3">AFTER</text>
  <text x="600" y="356" fill="${colors.accent}" font-size="22" font-family="Courier New, monospace" letter-spacing="2">${esc(afterLabel.toUpperCase())}</text>
  <text x="600" y="400" fill="${colors.primary}" font-size="20" font-family="Courier New, monospace" letter-spacing="2">${esc(afterProof.label)}</text>
  <text x="600" y="446" fill="${colors.fg}" font-size="38" font-family="Arial, Helvetica, sans-serif" font-weight="900">${esc(afterIdentity.archetype)}</text>
  <text x="600" y="492" fill="${colors.fg}" font-size="24" font-family="Courier New, monospace" letter-spacing="1.5">${esc(afterIdentity.secondaryTendency)}</text>
  <text x="600" y="532" fill="#d6e3d9" font-size="30" font-family="Arial, Helvetica, sans-serif" font-weight="800">${after.pointsPerMatch.toFixed(1)} PPM</text>
  ${gapBlock(afterGaps, 600, 576, 374)}

  <text x="74" y="710" fill="${colors.primary}" font-size="26" font-family="Courier New, monospace" letter-spacing="4">THE CHANGE</text>
  <rect x="74" y="736" width="932" height="204" rx="30" fill="rgba(10,15,10,0.55)" stroke="rgba(57,255,106,0.22)" />
  <text x="112" y="802" fill="${colors.accent}" font-size="42" font-family="Arial, Helvetica, sans-serif" font-weight="900">PPM ${signed(delta.pointsPerMatch)}</text>
  <text x="112" y="854" fill="${colors.fg}" font-size="30" font-family="Arial, Helvetica, sans-serif" font-weight="800">GOALS FOR ${signed(delta.avgGoalsFor)} · GOALS AGAINST ${signed(delta.avgGoalsAgainst)}</text>
  <text x="112" y="904" fill="${colors.fg}" font-size="30" font-family="Arial, Helvetica, sans-serif" font-weight="800">PASS ${signed(delta.avgPassAccuracy)}% · ON TARGET ${signed(delta.avgShotsOnTarget)} · TACKLES ${signed(delta.avgTacklesWon)}</text>

  <rect x="74" y="980" width="932" height="260" rx="30" fill="rgba(38,30,12,0.42)" stroke="rgba(242,192,120,0.24)" />
  <text x="108" y="1030" fill="${colors.accent}" font-size="24" font-family="Courier New, monospace" letter-spacing="3">AFTER IDENTITY · NEXT FOCUS</text>
  <text x="108" y="1072" fill="${colors.fg}" font-size="28" font-family="Courier New, monospace" letter-spacing="1.6">STYLE · ${esc(afterIdentity.primaryStyle)}</text>
  <text x="108" y="1108" fill="${colors.fg}" font-size="28" font-family="Courier New, monospace" letter-spacing="1.6">TEMPERAMENT · ${esc(afterIdentity.temperament)}</text>
  ${textBlock(focusLines, 108, 1164, 32, 38, colors.fg, 700)}

  <text x="74" y="1292" fill="rgba(143,184,155,0.72)" font-size="22" font-family="Courier New, monospace" letter-spacing="2.5">GENERATED ${dateLabel(generatedAt)} · BUILT FROM SAVED CHECKPOINTS</text>
</svg>`.trim();
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}

export function downloadSvgAsset(svg: string, fileName: string) {
  if (typeof document === 'undefined' || typeof Blob === 'undefined') return false;
  triggerDownload(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), fileName);
  return true;
}

export async function downloadPngAsset(svg: string, fileName: string) {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return false;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    ctx.drawImage(image, 0, 0, W, H);
    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!pngBlob) return false;
    triggerDownload(pngBlob, fileName);
    return true;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const downloadShareCardSvg = downloadSvgAsset;
export const downloadShareCardPng = downloadPngAsset;
