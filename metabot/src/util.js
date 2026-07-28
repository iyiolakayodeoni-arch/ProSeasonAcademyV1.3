// shared helpers for the direct collectors
export const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

export async function fetchText(url, { timeoutMs = 15000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

const HTML_ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#x27;': "'", '&apos;': "'" };

export function decodeEntities(s = '') {
  return s.replace(/&(?:amp|lt|gt|quot|apos|#39|#x27);/g, (m) => HTML_ENTITIES[m] ?? m);
}

export function stripHtml(s = '') {
  return decodeEntities(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' '));
}

export function stripEmoji(s = '') {
  return s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu, '').replace(/[™®©]/g, '');
}

export function stripHandles(s = '') {
  return s.replace(/@[A-Za-z0-9_.]+/g, '').replace(/#\w+/g, '').replace(/https?:\/\/\S+/g, '');
}

export function squash(s = '') {
  return s.replace(/\s+/g, ' ').trim();
}

/** full pipeline for any outside text before it becomes ours */
export function cleanOutside(s = '') {
  return squash(stripEmoji(stripHandles(stripHtml(s))));
}

/** balance-parse JSON objects that start after a marker, e.g. "videoRenderer":{...} */
export function extractJsonObjects(text, marker) {
  const out = [];
  let i = 0;
  while ((i = text.indexOf(marker, i)) !== -1) {
    const start = text.indexOf('{', i + marker.length);
    if (start === -1) break;
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let j = start; j < text.length; j++) {
      const c = text[j];
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          try { out.push(JSON.parse(text.slice(start, j + 1))); } catch { /* partial blob — skip */ }
          i = j + 1;
          break;
        }
      }
    }
    if (out.length > 200) break;
  }
  return out;
}

/** "3 hours ago" / "2 weeks ago" → approx ms age (null when unparseable) */
export function agoToMs(text = '') {
  const m = /(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i.exec(text);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const mult = { second: 1e3, minute: 6e4, hour: 36e5, day: 864e5, week: 6048e5, month: 2592e6, year: 31536e6 }[unit];
  return mult ? n * mult : null;
}
