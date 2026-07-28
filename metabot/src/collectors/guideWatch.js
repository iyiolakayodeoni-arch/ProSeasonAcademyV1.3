import { fetchText, cleanOutside } from '../util.js';

// Watches FC Mobile guide sites' listing pages for fresh/updated guides.

export async function guideWatch({ max = 5 } = {}) {
  const targets = [
    {
      url: 'https://fcmobileguide.com/tutorials/',
      name: 'FCMobileGuide — tutorials',
      keyRe: /skill|formation|meta|h2h|head to head|tactic|guide/i,
    },
  ];
  const items = [];
  for (const t of targets) {
    let html;
    try {
      html = await fetchText(t.url);
    } catch (e) {
      console.log(`[fetch] guide site "${t.name}" unavailable — skipped`);
      continue;
    }
    const re = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]{4,140}?)<\/a>/gi;
    let m;
    let count = 0;
    while ((m = re.exec(html)) && count < max) {
      const [_, href, rawText] = m;
      const text = cleanOutside(rawText);
      if (text.length < 12 || !t.keyRe.test(text)) continue;
      items.push({
        title: text,
        summary: text,
        sourceUrl: href.startsWith('http') ? href : `https://fcmobileguide.com${href}`,
        sourceName: t.name,
      });
      count++;
    }
  }
  return items;
}
