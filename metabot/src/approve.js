// Human-in-the-loop review surface (v1): a simple CLI.
//   node src/approve.js pending          → list drafts waiting for review
//   node src/approve.js approve <id>     → publish to the live feed
//   node src/approve.js reject <id>      → kill it
//   node src/approve.js history          → everything we've decided
import { loadStore, saveStore } from './store.js';

const [, , cmd, id] = process.argv;
const store = loadStore();

function showPost(p) {
  console.log(`\n  ${p.id}   [${p.kind}] ${p.status}/${p.lifecycle}`);
  console.log(`  headline : ${p.headline}`);
  console.log(`  body     : ${p.body}`);
  console.log(`  cta      : ${p.cta}`);
  console.log(`  patch    : ${p.patchVersion}   found: ${p.discoveredAt}`);
  console.log(`  source   : ${p.sourceName} — ${p.sourceUrl}`);
}

if (cmd === 'pending') {
  const pending = store.posts.filter((p) => p.status === 'pending_review');
  if (!pending.length) console.log('\nNothing waiting. Run the bot first: npm run run\n');
  console.log(`\n${pending.length} draft(s) waiting for review:`);
  pending.forEach(showPost);
  console.log(`\nDecide:  npm run approve -- <id>   |   npm run reject -- <id>\n`);
} else if (cmd === 'approve' || cmd === 'reject') {
  const post = store.posts.find((p) => p.id === id);
  if (!post) {
    console.log(`\nNo post with id "${id}". Check with: npm run pending\n`);
    process.exit(1);
  }
  post.status = cmd === 'approve' ? 'approved' : 'rejected';
  post.reviewedAt = new Date().toISOString();
  saveStore(store);
  console.log(`\n✓ ${post.id} marked ${post.status.toUpperCase()} — "${post.headline}"`);
  console.log('Next: npm run export  (rebuilds the file the app reads)\n');
} else if (cmd === 'history') {
  const decided = store.posts.filter((p) => p.status !== 'pending_review');
  console.log(`\n${decided.length} reviewed post(s):`);
  decided.forEach((p) => console.log(`  ${p.id}  ${p.status.padEnd(9)} [${p.kind}] ${p.headline}`));
  console.log('');
} else {
  console.log('\nUsage: node src/approve.js pending|approve <id>|reject <id>|history\n');
  process.exit(1);
}
