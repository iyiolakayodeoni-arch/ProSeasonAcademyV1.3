// THE JOB: fetch → dedupe → rewrite → store(pending_review) → notify.
// Run manually:        node src/run.js
// Demo (no API key):   LLM_PROVIDER=manual METABOT_DEMO_DATE=2026-07-24 node src/run.js
// Scheduled: see metabot/README.md (GitHub Actions cron example included).
import { BUCKETS, BOT_KINDS, DISCORD_WEBHOOK_URL } from './config.js';
import { makeLlm } from './llm.js';
import { splitNewVsSeen } from './dedupe.js';
import { loadStore, saveStore, addPosts, sweepStaleness } from './store.js';

const demoDate = process.env.METABOT_DEMO_DATE;
const llm = makeLlm({ demoDate });
const today = new Date().toISOString().slice(0, 10);

console.log(`\n═══ PROSEASON METABOT — ${today} (provider: ${llm.provider}) ═══\n`);

const store = loadStore();

// 0 · what patch is the game on right now? (staleness + fresh query context)
const currentPatch = await llm.detectCurrentPatch();
console.log(`[fetch] current game version detected: ${currentPatch}`);
store.meta.currentPatch = currentPatch;

// 1 · FETCH — every bucket, live web search server-side
const allFindings = [];
for (const bucket of BUCKETS) {
  const queries = bucket.makeQueries({ currentPatch });
  let found = [];
  try {
    found = await llm.searchBucket(bucket.id, queries);
  } catch (e) {
    console.log(`[fetch] bucket "${bucket.id}" failed: ${String(e).slice(0, 160)}`);
    continue;
  }
  const usable = (found ?? []).filter((f) => f && BOT_KINDS.includes(f.kind) && f.sourceUrl);
  // bucket echoes the whole raw set back as one batch; tag origin bucket
  usable.forEach((f) => (f.bucket = bucket.id));
  allFindings.push(...usable);
  console.log(`[fetch] bucket "${bucket.id}" → ${usable.length} usable finding(s)`);
  // manual demo provider returns the whole raw batch in one read —
  // loop every bucket only for the real anthropic provider
  if (llm.provider === 'manual') break;
}

// 2 · DEDUPE — against everything we've ever stored (+ inside this batch)
const { fresh, skipped } = splitNewVsSeen(allFindings, store.seenFingerprints);
console.log(`[dedupe] ${allFindings.length} finding(s) → ${fresh.length} new, ${skipped.length} skipped`);
for (const s of skipped) console.log(`         · skipped "${s.finding.topicKey}" (${s.reason})`);

// 3 · REWRITE — each new finding becomes a ProSeasonAcademy-voice draft
const drafts = [];
for (const { finding, fingerprint } of fresh) {
  const rewrite = await llm.rewriteFinding(finding);
  if (!rewrite || !rewrite.headline || !rewrite.body) {
    console.log(`[rewrite] · dropped "${finding.topicKey}" (no usable rewrite)`);
    continue;
  }
  drafts.push({
    id: `mb-${today}-${String(drafts.length + 1).padStart(3, '0')}`,
    origin: 'metabot', // never blended with hand-authored coach content
    kind: finding.kind,
    headline: rewrite.headline,
    body: rewrite.body,
    cta: rewrite.cta ?? 'READ MORE ›',
    patchVersion: finding.patchVersion ?? currentPatch,
    discoveredAt: today,
    sourceUrl: finding.sourceUrl,
    sourceName: finding.sourceName ?? 'unknown source',
    status: 'pending_review', // human gate — nothing auto-publishes
    lifecycle: 'fresh',
    fingerprint,
  });
  console.log(`[rewrite] ✓ "${finding.topicKey}" → draft ready`);
}

// 4 · STORE — pending review, then run the staleness sweep over everything
addPosts(store, drafts);
const staleNotes = sweepStaleness(store, { currentPatch });
store.meta.lastRunAt = new Date().toISOString();
saveStore(store);
console.log(`[store] ${drafts.length} draft(s) parked as pending_review`);
if (staleNotes.length) console.log(`[store] staleness sweep: ${staleNotes.length} change(s): ${staleNotes.join(' | ')}`);

// 5 · NOTIFY — optional Discord/Slack-style ping so a human comes to review
const pendingCount = store.posts.filter((p) => p.status === 'pending_review').length;
if (DISCORD_WEBHOOK_URL && drafts.length) {
  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: `🤖 ProSeason MetaBot: **${drafts.length} new draft(s)** waiting for review (${pendingCount} pending total). Run \`npm run pending\` in metabot/ to review.`,
      }),
    });
    console.log('[notify] Discord webhook pinged');
  } catch (e) {
    console.log(`[notify] webhook failed: ${String(e).slice(0, 120)}`);
  }
}

console.log(`\n[pending] ${pendingCount} draft(s) awaiting human approval → npm run pending\n`);
console.log('═══ RUN COMPLETE ═══\n');
