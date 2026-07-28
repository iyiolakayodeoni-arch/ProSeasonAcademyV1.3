import crypto from 'node:crypto';

// Same topic + same patch = same post, even if a different site reports it.
// That stops the kickoff-nerf being re-posted every single run.
export function fingerprint(f) {
  const base = `${(f.kind || '').toLowerCase()}|${(f.topicKey || '').toLowerCase()}|${(f.patchVersion || '').toLowerCase()}`;
  return crypto.createHash('sha1').update(base).digest('hex').slice(0, 16);
}

export function splitNewVsSeen(findings, seenFingerprints) {
  const seen = new Set(seenFingerprints);
  const fresh = [];
  const skipped = [];
  const batchLocal = new Set();
  for (const f of findings) {
    const fp = fingerprint(f);
    if (seen.has(fp) || batchLocal.has(fp)) {
      skipped.push({ finding: f, fingerprint: fp, reason: seen.has(fp) ? 'already-stored' : 'duplicate-in-batch' });
    } else {
      batchLocal.add(fp);
      fresh.push({ finding: f, fingerprint: fp });
    }
  }
  return { fresh, skipped };
}
