// Regenerates the app's raster icons from the Floodlight Crest
// (src/components/LogoMark.tsx — same geometry, static version).
// Run: node scripts/make-icons.cjs   (requires devDep `sharp`)
const sharp = require('sharp');
const path = require('path');

const GREEN = '#39FF6A';
const GOLD = '#f2c078';
const INK = '#eef2ec';
const BG = '#0a0f0a';

// crest geometry — viewBox 0 0 100 100 (kept in sync with LogoMark.tsx)
const SHIELD = 'M 30 16 H 70 L 76 21 V 52 L 50 84 L 24 52 V 21 Z';
const TRAIL = 'M 33 63 C 36 57, 42 55, 45 50 C 49 44, 56 43, 60 38 C 62 36, 64 35, 65 34';

function crestSvg({ mono = false } = {}) {
  const g = mono ? '#ffffff' : GREEN;
  const gold = mono ? '#ffffff' : GOLD;
  const ink = mono ? '#ffffff' : INK;
  const fill = mono ? 'none' : 'rgba(57,255,106,0.06)';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 100 100">
  <path d="${SHIELD}" stroke="${g}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="${fill}" opacity="0.22"/>
  <path d="${SHIELD}" stroke="${g}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" fill="${fill}" opacity="0.5"/>
  <path d="${SHIELD}" stroke="${g}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" fill="${fill}"/>
  <path d="M 50 36 L 50 28.5" stroke="${gold}" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M 38 30 L 62 27" stroke="${gold}" stroke-width="1.8" stroke-linecap="round"/>
  <circle cx="41" cy="29.5" r="1.9" fill="${gold}"/>
  <circle cx="50" cy="28.6" r="1.9" fill="${gold}"/>
  <circle cx="59" cy="27.7" r="1.9" fill="${gold}"/>
  <path d="M 40 33 L 36.5 39.5" stroke="${gold}" stroke-width="1" stroke-linecap="round" opacity="0.55"/>
  <path d="M 60 31 L 63.5 37.5" stroke="${gold}" stroke-width="1" stroke-linecap="round" opacity="0.55"/>
  <circle cx="33" cy="66" r="3.4" stroke="${ink}" stroke-width="1.6" fill="none"/>
  <circle cx="33" cy="66" r="1" fill="${ink}"/>
  <path d="${TRAIL}" stroke="${ink}" stroke-width="2.4" stroke-linecap="round" fill="none" opacity="0.95"/>
  <circle cx="47" cy="50" r="1.7" fill="${ink}"/>
  <circle cx="58" cy="41.5" r="1.7" fill="${ink}"/>
  <circle cx="64.5" cy="34" r="2.1" fill="${gold}"/>
</svg>`;
}

// scales the crest into a centered square with `padFrac` padding on each side
async function render(file, opts) {
  const { size = 1024, padFrac = 0.18, mono = false, bg = null } = opts;
  const inner = Math.round(size * (1 - padFrac * 2));
  const crest = await sharp(Buffer.from(crestSvg({ mono })))
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  let base;
  if (bg) {
    base = sharp({ create: { width: size, height: size, channels: 4, background: bg } });
  } else {
    base = sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  }
  await base.composite([{ input: crest, gravity: 'centre' }]).png().toFile(file);
  console.log('wrote', file);
}

(async () => {
  const A = (p) => path.join(__dirname, '..', 'assets', p);
  // launcher icon — crest on the academy's night green
  await render(A('icon.png'), { size: 1024, padFrac: 0.17, bg: BG });
  // adaptive foreground — transparent breathing room for the mask circle
  await render(A('android-icon-foreground.png'), { size: 1024, padFrac: 0.24 });
  // adaptive monochrome — single-color, still the full crest story
  await render(A('android-icon-monochrome.png'), { size: 1024, padFrac: 0.22, mono: true });
  // favicon
  await render(A('favicon.png'), { size: 64, padFrac: 0.1, bg: BG });
  // splash-icon (used by tooling/app stores, kept current too)
  await render(A('splash-icon.png'), { size: 512, padFrac: 0.14, bg: BG });
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
