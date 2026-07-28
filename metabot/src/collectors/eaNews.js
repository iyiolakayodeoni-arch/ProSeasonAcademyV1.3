import { fetchText, cleanOutside } from '../util.js';

// EA's official FC Mobile news hub — read directly from ea.com.

const LISTING = 'https://www.ea.com/games/ea-sports-fc/fc-mobile/news';
const LISTING_ALT = 'https://www.ea.com/en/games/ea-sports-fc/fc-mobile/news';
// gameplay-relevant articles first — promos/offers sink to the bottom
const PRIORITY = /(patch|update|gameplay|deep-dive|guide|roadmap|beta)/i;
const HREF_RE = /href="((?:\/en)?\/games\/ea-sports-fc\/fc-mobile\/news\/[a-z0-9-]+)"/gi;
const VERSION_RE = /fc[\s-]*mobile[\s-]*(\d{2})/i;
const VERSION_CONTEXT = /(update|patch)/i;

// handles both attribute orders: <meta name="x" content="y"> and <meta content="y" name="x">
function metaTag(page, key, maxLen = 500) {
  const a = new RegExp('<meta[^>]+(?:name|property)="' + key + '"[^>]+content="([^"]{8,' + maxLen + '})"', 'i').exec(page);
  if (a) return a[1];
  const b = new RegExp('<meta[^>]+content="([^"]{8,' + maxLen + '})"[^>]+(?:name|property)="' + key + '"', 'i').exec(page);
  return b ? b[1] : null;
}

export async function eaNews({ max = 8 } = {}) {
  let html = '';
  try {
    html = await fetchText(LISTING);
  } catch {
    html = await fetchText(LISTING_ALT);
  }
  const hrefs = new Map(); // path → dedup
  let m;
  while ((m = HREF_RE.exec(html))) {
    const path = m[1].toLowerCase();
    if (!hrefs.has(path)) hrefs.set(path, m[1]);
  }
  const ordered = [...hrefs.values()].sort((a, b) => Number(PRIORITY.test(b)) - Number(PRIORITY.test(a)));

  const items = [];
  for (const path of ordered.slice(0, max)) {
    const slug = path.split('/').pop();
    let title = slug.replace(/-/g, ' ');
    let summary = title;
    try {
      const page = await fetchText(`https://www.ea.com${path}`);
      const t = metaTag(page, 'og:title', 160);
      const tClean = t ? t.split('|')[0].replace(/\s*[-–—]\s*EA.*$/i, '').trim() : '';
      // some articles brand the title ("EA SPORTS FC™ Mobile — X"); strip the brand.
      // whichever of slug vs meta title carries more real words wins — the slug often
      // knows more than an abbreviated og:title (e.g. "...patch-notes").
      const brandless = tClean.replace(/^ea\s+sports\s+fc\W*mobile\W*/i, '').trim();
      const slugTitle = slug.replace(/-/g, ' ');
      const words = (s) => (s.match(/[a-z0-9]+/gi) ?? []).length;
      if (brandless.length >= 6 && words(brandless) >= words(slugTitle)) {
        title = brandless;
      } else if (words(slugTitle) > 0) {
        title = slugTitle;
      }
      const d = metaTag(page, 'og:description', 400) || metaTag(page, 'description', 400);
      if (d) summary = d;
    } catch { /* keep slug-derived title */ }
    items.push({
      title: cleanOutside(title),
      summary: cleanOutside(summary),
      sourceUrl: `https://www.ea.com${path}`,
      sourceName: 'EA SPORTS FC Mobile — official news',
    });
  }
  return items;
}

// figure out the season version from official titles: "FC Mobile 26 Update - Patch Notes" → "FC Mobile 26"
export async function detectPatchFromEa() {
  try {
    // pull a deep list so the patch article is definitely included
    const items = await eaNews({ max: 14 });
    for (const it of items) {
      const hay = `${it.title} ${it.sourceUrl}`;
      const m = VERSION_RE.exec(hay);
      if (m && VERSION_CONTEXT.test(hay)) return `FC Mobile ${m[1]}`;
    }
  } catch { /* fall through */ }
  return 'unknown';
}
