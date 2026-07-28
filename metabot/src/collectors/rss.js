import { fetchText, cleanOutside } from '../util.js';

// Generic RSS/Atom reader for FC Mobile news blogs that publish feeds.
// Any feed that 404s/403s is skipped with a log — sources are editable in config.

export async function rssCollect(feeds, { maxPerFeed = 4 } = {}) {
  const items = [];
  for (const feed of feeds) {
    let xml = null;
    for (const url of feed.urls) {
      try {
        const text = await fetchText(url);
        if (/<(rss|feed|rdf:RDF)/.test(text.slice(0, 400))) {
          xml = text;
          break;
        }
      } catch { /* try next candidate url */ }
    }
    if (!xml) {
      console.log(`[fetch] feed "${feed.name}" unavailable — skipped`);
      continue;
    }
    const blocks = [...xml.matchAll(/<(item|entry)>([\s\S]*?)<\/\1>/g)].slice(0, maxPerFeed);
    for (const b of blocks) {
      const body = b[2];
      const title = (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(body)?.[1] ?? '').trim();
      const link =
        /<link[^>]*>([^<]+)<\/link>/i.exec(body)?.[1]?.trim() ||
        /<link[^>]*href="([^"]+)"/i.exec(body)?.[1]?.trim() ||
        '';
      const desc = (/<(description|summary|content)[^>]*>([\s\S]*?)<\/\1>/i.exec(body)?.[2] ?? '').trim();
      if (!title || !link) continue;
      items.push({
        title: cleanOutside(title),
        summary: cleanOutside(desc.slice(0, 500)),
        sourceUrl: link,
        sourceName: `${feed.name} (RSS)`,
      });
    }
  }
  return items;
}
