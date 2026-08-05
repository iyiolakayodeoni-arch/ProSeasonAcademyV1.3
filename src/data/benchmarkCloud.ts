import * as backend from './backend';
import {
  BenchmarkSnapshot,
  checkpointMetaFor,
  getBenchmarkSnapshots,
  mergeBenchmarkCheckpoints,
  markBenchmarkCheckpointSynced,
} from './benchmarkTracker';

let lastPullFor: string | null = null;
let pulling = false;

function rowToSnapshot(row: backend.CloudBenchmarkRow): BenchmarkSnapshot {
  const meta = checkpointMetaFor(row.checkpoint);
  return {
    id: row.clientId,
    checkpoint: meta.checkpoint,
    cycle: row.cycle,
    month: row.month,
    title: row.title || meta.title,
    label: row.label || meta.label,
    createdAt: row.createdAt,
    matches: row.matches,
    summary: row.summary,
    syncedAt: row.syncedAt,
    cloudId: row.id,
  };
}

export async function pullBenchmarkSnapshotsFromCloud(force = false): Promise<boolean> {
  const me = backend.getMe();
  if (!me) return false;
  if (!force && lastPullFor === me.id) return true;
  if (pulling) return false;
  pulling = true;
  try {
    const rows = await backend.pullBenchmarkCheckpoints();
    if (!rows) return false;
    mergeBenchmarkCheckpoints(rows.map(rowToSnapshot));
    lastPullFor = me.id;
    return true;
  } finally {
    pulling = false;
  }
}

export async function syncBenchmarkSnapshot(snapshot: BenchmarkSnapshot, coachId?: string | null): Promise<boolean> {
  const row = await backend.pushBenchmarkCheckpoint(snapshot, coachId ?? null);
  if (!row) return false;
  markBenchmarkCheckpointSynced(snapshot.id, row.syncedAt, row.id);
  return true;
}

export async function syncUnsyncedBenchmarkSnapshots(coachId?: string | null): Promise<number> {
  const unsynced = getBenchmarkSnapshots().filter((snapshot) => !snapshot.syncedAt);
  let sent = 0;
  for (const snapshot of unsynced) {
    const ok = await syncBenchmarkSnapshot(snapshot, coachId);
    if (ok) sent += 1;
  }
  return sent;
}

export async function removeBenchmarkSnapshotFromCloud(clientId: string): Promise<boolean> {
  return backend.deleteBenchmarkCheckpoint(clientId);
}
