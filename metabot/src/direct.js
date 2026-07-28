// THE SELF-CONTAINED PROVIDER — zero third-party services.
// Our bot searches YouTube itself, reads EA's official news hub, RSS feeds,
// guide sites, and Reddit (network permitting), classifies what it finds,
// and composes drafts from its own templates. No API keys anywhere.
import { ytSearch } from './collectors/youtube.js';
import { eaNews, detectPatchFromEa } from './collectors/eaNews.js';
import { redditSearch } from './collectors/reddit.js';
import { rssCollect } from './collectors/rss.js';
import { guideWatch } from './collectors/guideWatch.js';
import { classify, violatesIdentityGuard, topicKeyFrom } from './understand.js';
import { composeDraft } from './compose.js';
import { RSS_FEEDS } from './config.js';

function toFindings(rawItems, context) {
  const out = [];
  for (const it of rawItems) {
    const joint = `${it.title} ${it.summary}`;
    if (violatesIdentityGuard(joint)) {
      console.log(`[guard] dropped item naming a real pro/handle — kept out of the app voice`);
      continue;
    }
    const kind = classify(joint);
    if (!kind) continue; // not meta-relevant — silence is correct
    out.push({
      topicKey: topicKeyFrom(it.title),
      kind,
      patchVersion: context.patch,
      summary: it.summary || it.title,
      title: it.title,
      sourceUrl: it.sourceUrl,
      sourceName: it.sourceName,
    });
  }
  return out;
}

async function safeCollect(label, fn) {
  try {
    return await fn();
  } catch (e) {
    console.log(`[fetch] ${label} unavailable (${String(e).slice(0, 110)}) — skipped`);
    return [];
  }
}

export function makeDirect() {
  // patch is detected once per run and attached to every finding
  let cachedPatch = null;
  const patch = async () => (cachedPatch ??= await detectPatchFromEa());

  const perBucket = {
    'official-patch': async () => toFindings(await safeCollect('ea news hub', () => eaNews()), { patch: await patch() }),
    'community-disco': async (queries) => {
      const redditStuff = await Promise.all(
        queries.map((q) => safeCollect('reddit (r/FUTMobile)', () => redditSearch(q))),
      );
      const ytStuff = await safeCollect('youtube search', () => ytSearch('FC Mobile glitch exploit what works H2H', { max: 5 }));
      return toFindings([...redditStuff.flat(), ...ytStuff], { patch: await patch() });
    },
    'meta-now': async (queries) => {
      const yt = (
        await Promise.all(queries.map((q) => safeCollect('youtube search', () => ytSearch(q, { max: 4 }))))
      ).flat();
      const rss = await safeCollect('rss blogs', () => rssCollect(RSS_FEEDS));
      const guides = await safeCollect('guide sites', () => guideWatch());
      return toFindings([...yt, ...rss, ...guides], { patch: await patch() });
    },
    mechanics: async (queries) => {
      const yt = (
        await Promise.all(queries.map((q) => safeCollect('youtube search', () => ytSearch(q, { max: 4 }))))
      ).flat();
      return toFindings(yt, { patch: await patch() });
    },
  };

  return {
    provider: 'direct',
    async detectCurrentPatch() {
      return patch();
    },
    async searchBucket(bucketId, queries) {
      const fn = perBucket[bucketId];
      return fn ? fn(queries) : [];
    },
    async rewriteFinding(finding) {
      return composeDraft(finding);
    },
  };
}
