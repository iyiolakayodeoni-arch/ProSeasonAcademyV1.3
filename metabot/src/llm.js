// LLM provider seam.
//   - 'anthropic' (production): real Anthropic Messages API calls, server-side,
//     with the web_search tool doing genuine live searching.
//   - 'manual' (demo/testing): reads pre-drafted JSON snapshots so the
//     pipeline's structure can be exercised end-to-end without an API key.
import fs from 'node:fs';
import path from 'node:path';
import { ANTHROPIC_API_KEY, ANTHROPIC_MODEL, LLM_PROVIDER, SNAPSHOT_DIR } from './config.js';
import { makeDirect } from './direct.js';

const API_URL = 'https://api.anthropic.com/v1/messages';

async function anthropicSearch({ prompt, maxSearchUses = 4 }) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Export it first, or run the demo with LLM_PROVIDER=manual.',
    );
  }
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      // server-side web search — the phone never does this
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: maxSearchUses }],
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  const data = await res.json();
  const text = (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
  return text;
}

async function anthropicJson(prompt, maxSearchUses = 4) {
  const text = await anthropicSearch({ prompt, maxSearchUses });
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('LLM returned no JSON array:\n' + text.slice(0, 400));
  return JSON.parse(text.slice(start, end + 1));
}

function readSnapshot(name) {
  const file = path.join(SNAPSHOT_DIR, name);
  if (!fs.existsSync(file)) throw new Error(`missing demo snapshot: ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function makeLlm({ demoDate } = {}) {
  // DEFAULT: the self-contained bot — no third-party services at all
  if (LLM_PROVIDER === 'direct') return makeDirect();

  if (LLM_PROVIDER === 'manual') {
    // demo path — snapshots produced from real searches performed by an agent;
    // clearly separated from production reads.
    const raw = readSnapshot(`${demoDate}.raw.json`);
    const rewrites = readSnapshot(`${demoDate}.rewrites.json`);
    return {
      provider: 'manual',
      async detectCurrentPatch() {
        return raw.currentPatch;
      },
      async searchBucket(_bucketId, _queries) {
        return raw.findings;
      },
      async rewriteFinding(finding) {
        const hit = rewrites.find((r) => r.topicKey === finding.topicKey);
        if (!hit) return null; // no rewrite drafted → treat as dropped
        return hit;
      },
    };
  }

  return {
    provider: 'anthropic',
    async detectCurrentPatch() {
      const rows = await anthropicJson(
        `What is the latest EA SPORTS FC Console season/update version (e.g. "FC 26/27 Console", or a specific patch like "Title Update 5")? ` +
          `Search the web. Reply with ONLY a JSON array like: [{"currentPatch":"FC 26/27 Console"}]`,
        2,
      );
      return rows?.[0]?.currentPatch ?? 'unknown';
    },
    async searchBucket(bucketId, queries) {
      return anthropicJson(
        `You are a research bot for an EA SPORTS FC 26/27 Console coaching app. Search the web RIGHT NOW for fresh, specific FC Console findings for the "${bucketId}" bucket. Today is ${new Date().toISOString().slice(0, 10)}.\n` +
          `Run these searches (and reasonable variations):\n- ${queries.join('\n- ')}\n\n` +
          `Return ONLY a JSON array of genuinely new/current findings, each:\n` +
          `[{"topicKey":"short-kebab-id", "kind":"EXPLOIT|SKILL_MOVE|TRICK_OF_THE_WEEK|PATCH_NOTE|META_SHIFT", "patchVersion":"...", "summary":"2-4 factual sentences in your own words", "whyItMatters":"1 sentence", "sourceUrl":"...", "sourceName":"..."}]\n` +
          `Rules: only real sourced findings with a working sourceUrl; nothing older than ~30 days unless it's the current official patch notes; quality over quantity (0 is a valid answer).`,
      );
    },
    async rewriteFinding(finding) {
      const rows = await anthropicJson(
        `Rewrite this EA SPORTS FC 26/27 Console finding as a ProSeasonAcademy feed post.\n\n` +
          `FINDING: ${JSON.stringify(finding, null, 2)}\n\n` +
          `VOICE + SAFETY RULES (all mandatory):\n` +
          `- Paraphrase, never copy: no sentence may closely mirror the source's wording or structure. Full rewrite, our own voice.\n` +
          `- Never quote patch notes verbatim beyond a short factual reference (e.g. "the new patch changed X") — summarize the EFFECT, not the source text.\n` +
          `- Source attribution lives in the sourceUrl/sourceName fields only — do NOT name or quote the author/handle in the post body. Community finds are "the community's found...", never a real handle.\n` +
          `- Absolutely no real player names, creator handles, or pro gamer identities in the post.\n` +
          `- headLine: punchy, short, ALL CAPS, max ~60 chars.\n` +
          `- body: lowercase, conversational, elder-brother coach energy, max ~320 chars, no emojis, no hashtags.\n` +
          `- cta: short action line ending in " ›".\n\n` +
          `Return ONLY a JSON array with one object: [{"topicKey":"${finding.topicKey}","headline":"...","body":"...","cta":"..."}]`,
        0,
      );
      return rows?.[0] ?? null;
    },
  };
}
