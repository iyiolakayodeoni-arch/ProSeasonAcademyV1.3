// ─────────────────────────────────────────────────────────────
// PRICE LIST — the founder's one editable file. products.json
// (next to this file) is re-read the moment it changes on disk:
// edit prices/links → save → every phone sees it. No restart,
// no redeploy, no code to touch. If the file is ever missing or
// broken, the safe defaults below keep the till standing.
// ─────────────────────────────────────────────────────────────
const fs = require('node:fs');
const path = require('node:path');

const PRODUCTS_PATH = process.env.PSA_PRODUCTS || path.join(__dirname, '..', 'products.json');

// safe shelf — used until the founder's products.json exists (and
// as an automatic fallback if it is ever malformed)
const DEFAULTS = {
  africa: [
    { code: 'NG-STARTER', title: 'STARTER PACK', credits: 100, price: '₦500', payLink: 'ASK-IN-HALL' },
    { code: 'NG-REGULAR', title: 'REGULAR PACK', credits: 300, price: '₦1,200', payLink: 'ASK-IN-HALL' },
    { code: 'NG-GRINDER', title: 'GRINDER PACK', credits: 750, price: '₦2,500', payLink: 'ASK-IN-HALL' },
    { code: 'NG-PATRON', title: 'PATRON PACK', credits: 1700, price: '₦5,000', payLink: 'ASK-IN-HALL' },
  ],
  world: [
    { code: 'PRO-MONTHLY', title: 'PRO MONTHLY', plan: 'pro', price: '$4.99 / MONTH', payLink: 'ASK-IN-HALL' },
  ],
};

/** keep only well-formed entries; wrong shapes never reach a phone */
function clean(list, kind) {
  if (!Array.isArray(list)) return null;
  const out = [];
  for (const p of list) {
    if (!p || typeof p.code !== 'string' || typeof p.title !== 'string' || typeof p.price !== 'string') continue;
    const entry = {
      code: p.code.slice(0, 24),
      title: p.title.slice(0, 40),
      price: p.price.slice(0, 24),
      payLink: typeof p.payLink === 'string' ? p.payLink.slice(0, 300) : 'ASK-IN-HALL',
    };
    if (kind === 'africa') {
      const credits = Math.round(Number(p.credits));
      if (!Number.isFinite(credits) || credits <= 0) continue;
      entry.credits = credits;
    } else {
      entry.plan = p.plan === 'pro' ? 'pro' : 'free';
    }
    out.push(entry);
  }
  return out.length ? out : null;
}

let cache = { mtime: -1, data: DEFAULTS };

/** current catalog; hot-reloads when products.json changes on disk */
function catalog() {
  let mtime = -1;
  try {
    mtime = fs.statSync(PRODUCTS_PATH).mtimeMs;
  } catch {
    cache = { mtime: -1, data: DEFAULTS }; // file gone → back to the safe shelf
    return cache.data;
  }
  if (mtime !== cache.mtime) {
    try {
      const raw = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf8'));
      const africa = clean(raw.africa, 'africa') || DEFAULTS.africa;
      const world = clean(raw.world, 'world') || DEFAULTS.world;
      cache = { mtime, data: { africa, world } };
    } catch {
      // malformed file: keep serving the last good catalog (or defaults)
      if (cache.mtime === -1) cache = { mtime, data: DEFAULTS };
      else cache.mtime = mtime;
    }
  }
  return cache.data;
}

module.exports = { catalog, PRODUCTS_PATH };
