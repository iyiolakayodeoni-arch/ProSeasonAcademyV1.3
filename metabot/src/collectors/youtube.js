import { fetchText, extractJsonObjects, agoToMs, cleanOutside } from '../util.js';

// Our own YouTube search — the bot queries youtube.com directly and reads
// the results page. No API key, no third-party service.

const MAX_AGE_MS = 31 * 864e5;

export async function ytSearch(query, { max = 6 } = {}) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const html = await fetchText(url);
  const renderers = extractJsonObjects(html, '"videoRenderer":');
  const items = [];
  for (const r of renderers) {
    try {
      const videoId = r.videoId;
      const title = r.title?.runs?.map((x) => x.text).join('') || r.title?.simpleText || '';
      const channel = r.shortBylineText?.runs?.[0]?.text ?? 'unknown channel';
      const published = r.publishedTimeText?.simpleText ?? '';
      const desc = r.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map((x) => x.text).join('') ?? '';
      if (!videoId || !title) continue;
      const ageMs = agoToMs(published);
      if (ageMs !== null && ageMs > MAX_AGE_MS) continue; // too old for the meta feed
      items.push({
        title: cleanOutside(title),
        summary: cleanOutside(desc),
        sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
        sourceName: `YouTube — FC Mobile search`,
        via: channel,
      });
      if (items.length >= max) break;
    } catch { /* skip malformed blob */ }
  }
  return items;
}
