// Regenerates the app's raster icons from the Mirror Journal mark
// (assets/logo-mirror-journal.png — the same artwork LogoMark.tsx renders
// in-app), so the launcher icon, adaptive icons, favicon and splash-icon are
// all unified on one identity.
// Run: node scripts/make-icons.cjs   (requires devDep `sharp`)

const sharp = require('sharp');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'assets', 'logo-mirror-journal.png');
// the mark's own canvas — compositing on the same colour makes the launcher
// icon seamless (no visible inset square)
const BG = '#031f18';

// scales the mark into a centered square with `padFrac` padding on each side
async function render(file, { size = 1024, padFrac = 0.18, mono = false, bg = null } = {}) {
  const inner = Math.round(size * (1 - padFrac * 2));
  let art = sharp(SOURCE).resize(inner, inner, { fit: 'cover' });
  if (mono) {
    // single-color white rendition: map luminance → alpha so the mirror glow
    // and highlights survive as white while the dark canvas drops out
    const { data, info } = await art.grayscale().raw().toBuffer({ resolveWithObject: true });
    const alpha = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i++) {
      const v = Math.round(data[i] * 2.0 - 45);
      alpha[i] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
    art = sharp(Buffer.concat([Buffer.alloc(inner * inner * 3, 255), alpha]), {
      raw: { width: inner, height: inner, channels: 4 },
    });
  }
  let base;
  if (bg) {
    base = sharp({ create: { width: size, height: size, channels: 4, background: bg } });
  } else {
    base = sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  }
  await base.composite([{ input: await art.png().toBuffer(), gravity: 'centre' }]).png().toFile(file);
  console.log('wrote', file);
}

(async () => {
  const A = (p) => path.join(__dirname, '..', 'assets', p);
  // launcher icon — Mirror Journal mark on its night-green canvas
  await render(A('icon.png'), { size: 1024, padFrac: 0.17, bg: BG });
  // adaptive foreground — transparent breathing room for the mask circle
  await render(A('android-icon-foreground.png'), { size: 1024, padFrac: 0.24 });
  // adaptive monochrome — single-color, the mark's glow structure
  await render(A('android-icon-monochrome.png'), { size: 1024, padFrac: 0.22, mono: true });
  // favicon
  await render(A('favicon.png'), { size: 64, padFrac: 0.1, bg: BG });
  // splash-icon (used by tooling/app stores, kept current too)
  await render(A('splash-icon.png'), { size: 512, padFrac: 0.14, bg: BG });
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
