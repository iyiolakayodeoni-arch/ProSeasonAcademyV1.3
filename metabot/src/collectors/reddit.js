import { fetchText, cleanOutside } from '../util.js';

// r/FUTMobile's public JSON — no account, no key.
// NOTE: Reddit rate-limits datacenter IPs hard; from a normal/home network this
// collector works as-is. When blocked it throws a clear error and the bucket
// simply continues with the other collectors (logged, never fatal).

const SUB = 'FUTMobile';
const MAX_AGE_MS = 31 * 864e5;

export async function redditSearch(query, { max = 5 } = {}) {
  const endpoints = [
    `https://www.reddit.com/r/${SUB}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new&limit=${max * 2}`,
    `https://www.reddit.com/r/${SUB}/new.json?limit=${max * 3}`,
  ];
  let data = null;
  let lastErr = '';
  for (const url of endpoints) {
    try {
      const text = await fetchText(url);
      if (text.trimStart().startsWith('{')) {
        data = JSON.parse(text);
        break;
      }
      lastErr = 'html wall instead of json';
    } catch (e) {
      lastErr = String(e).slice(0, 120);
    }
  }
  if (!data) throw new Error(`reddit unavailable from this network (${lastErr})`);

  const now = Date.now();
  return (data?.data?.children ?? [])
    .map((c) => c.data)
    .filter((p) => p && p.title && now - p.created_utc * 1000 < MAX_AGE_MS)
    .filter((p) => p.score == null || p.score >= 2)
    .slice(0, max)
    .map((p) => ({
      title: cleanOutside(p.title),
      summary: cleanOutside((p.selftext || '').slice(0, 500)),
      sourceUrl: `https://www.reddit.com${p.permalink}`,
      sourceName: 'r/FUTMobile community thread',
      via: `${p.score} upvotes · ${p.num_comments} comments`,
    }));
}
