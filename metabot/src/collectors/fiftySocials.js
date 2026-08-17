// Live public activity for The Fifty.
//
// What this does:
//   · reads official Liquipedia player pages (public wiki)
//   · searches YouTube for each handle (public results page)
//
// What this does NOT do:
//   · log into Instagram or X
//   · hit unofficial Instagram / Twitter APIs
//   · rotate IPs or dodge blocks
//
// Handles themselves live in src/data/fiftySocials.ts and are opened as links.

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchText } from '../util.js';
import { ytSearch } from './youtube.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', '..', '..', 'src', 'data', 'fiftySocialLive.json');

const WATCH = [
  { id: 'vejrgang', handle: 'Vejrgang', wiki: 'Vejrgang' },
  { id: 'tekkz', handle: 'Tekkz', wiki: 'Tekkz' },
  { id: 'manubachoore', handle: 'ManuBachoore', wiki: 'ManuBachoore' },
  { id: 'nicolas99fc', handle: 'nicolas99fc', wiki: 'Nicolas99fc' },
  { id: 'emreyilmaz', handle: 'EmreYilmaz', wiki: 'EmreYilmaz' },
  { id: 'rvplegend', handle: 'RvPLegend', wiki: 'RvPLegend' },
  { id: 'levyfinn', handle: 'levyfinn', wiki: 'Levyfinn' },
  { id: 'bonanno', handle: 'Bonanno', wiki: 'Bonanno' },
  { id: 'nassada', handle: 'Nassada', wiki: 'Nassada' },
  { id: 'hhezers', handle: 'HHezerS', wiki: 'HHezerS' },
  { id: 'levidw', handle: 'Levi de Weerd', wiki: 'LevideWeerd' },
  { id: 'phzin', handle: 'PHzin', wiki: 'PHzin' },
];

function extractWikiSocials(html = '') {
  const found = {};
  const pairs = [
    ['x', /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/([A-Za-z0-9_]+)/i],
    ['instagram', /https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9_.]+)/i],
    ['twitch', /https?:\/\/(?:www\.)?twitch\.tv\/([A-Za-z0-9_]+)/i],
    ['youtube', /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/|user\/)([A-Za-z0-9_\-]+)/i],
  ];
  for (const [key, re] of pairs) {
    const m = re.exec(html);
    if (m) found[key] = m[0].split('?')[0];
  }
  return found;
}

export async function collectFiftySocials() {
  const posts = [];
  const discovered = {};

  for (const p of WATCH) {
    try {
      const html = await fetchText(`https://liquipedia.net/easportsfc/${p.wiki}`);
      const socials = extractWikiSocials(html);
      if (Object.keys(socials).length) discovered[p.id] = socials;
    } catch {
      console.log(`[fifty] liquipedia ${p.handle} unavailable — skipped`);
    }

    try {
      const vids = await ytSearch(`${p.handle} FC 26`, { max: 2 });
      for (const v of vids) {
        posts.push({
          id: `yt-${p.id}-${encodeURIComponent(v.sourceUrl).slice(-12)}`,
          kind: 'SOCIAL',
          handle: p.handle,
          playerId: p.id,
          date: new Date().toISOString().slice(0, 10),
          headline: v.title,
          body: v.summary || `Public YouTube result for ${p.handle}.`,
          source: v.via ? `YouTube · ${v.via}` : 'YouTube',
          sourceUrl: v.sourceUrl,
        });
      }
    } catch {
      console.log(`[fifty] youtube ${p.handle} unavailable — skipped`);
    }
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    note: 'Public YouTube + Liquipedia only. Instagram and X are linked, never scraped.',
    discovered,
    posts,
  };
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`[fifty] wrote ${posts.length} public post(s) → ${OUT}`);
  return payload;
}

if (process.argv[1] && process.argv[1].endsWith('fiftySocials.js')) {
  collectFiftySocials().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
