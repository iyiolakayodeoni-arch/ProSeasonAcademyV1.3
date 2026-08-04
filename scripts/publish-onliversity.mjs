#!/usr/bin/env node
// Onliversity — publish a built APK to the Package Manager catalog.
//
// Run AFTER an APK is built (locally or in CI). It:
//   1. computes the APK's SHA-256 + size,
//   2. uploads the APK to Supabase Storage (public bucket "onliversity"),
//   3. upserts the app's entry in onliversity-catalog.json (the PM reads it),
//   4. bumps the Supabase `config` rows (latest_version / latest_apk_url /
//      latest_update_note) so ProSeasonAcademy's existing UpdateBanner fires.
//
// One file edited → the PM and every installed app see the new version. This
// is the "push to git → live in the store" step (the build itself runs in CI).
//
// Env:
//   APK_PATH                path to the built .apk
//   APP_ID                  e.g. proseasonacademy
//   APP_NAME                e.g. "ProSeason Academy"
//   APP_PACKAGE             e.g. com.onliversity.proseasonacademy
//   VERSION                 e.g. 1.4.0  (also written to config.latest_version)
//   VERSION_CODE            integer, monotonic
//   NOTES                   one-line release note (optional)
//   SUPABASE_URL            project URL
//   SUPABASE_SERVICE_ROLE_KEY  CI secret — NEVER in the client app
//   ONLIVERSITY_BUCKET      default "onliversity"
//
// No third-party deps: node:fs, node:crypto, global fetch (Node 18+).

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';

const {
  APK_PATH, APP_ID, APP_NAME, APP_PACKAGE, VERSION, VERSION_CODE, NOTES,
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
  ONLIVERSITY_BUCKET = 'onliversity',
} = process.env;

const required = ['APK_PATH', 'APP_ID', 'APP_NAME', 'APP_PACKAGE', 'VERSION', 'VERSION_CODE', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[publish] missing env: ${missing.join(', ')}`);
  process.exit(1);
}

const BUCKET = ONLIVERSITY_BUCKET;
const OBJECT = `${APP_ID}/${APP_ID}-${VERSION}.apk`;
const PUBLIC_APK_URL = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${OBJECT}`;
const CATALOG_OBJECT = 'onliversity-catalog.json';
const CATALOG_PUBLIC = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${CATALOG_OBJECT}`;
const authHeaders = { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` };

function sha256(file) {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256');
    const s = createReadStream(file);
    s.on('data', (d) => h.update(d));
    s.on('end', () => resolve(h.digest('hex')));
    s.on('error', reject);
  });
}

async function uploadApk() {
  const st = await stat(APK_PATH);
  const sizeBytes = st.size;
  const sha = await sha256(APK_PATH);
  const buf = await (await import('node:fs/promises')).readFile(APK_PATH);
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${OBJECT}`, {
    method: 'POST',
    headers: { ...authHeaders, 'x-upsert': 'true', 'Content-Type': 'application/vnd.android.package-archive' },
    body: buf,
  });
  if (!r.ok) throw new Error(`APK upload failed: ${r.status} ${await r.text()}`);
  return { sha, sizeBytes };
}

async function readCatalog() {
  const r = await fetch(CATALOG_PUBLIC, { cache: 'no-store' });
  if (!r.ok) return { schema: 1, generatedAt: new Date().toISOString(), apps: [] };
  try {
    const j = await r.json();
    return j && Array.isArray(j.apps) ? j : { schema: 1, generatedAt: new Date().toISOString(), apps: [] };
  } catch {
    return { schema: 1, generatedAt: new Date().toISOString(), apps: [] };
  }
}

async function writeCatalog(catalog) {
  catalog.generatedAt = new Date().toISOString();
  const body = JSON.stringify(catalog, null, 2);
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${CATALOG_OBJECT}`, {
    method: 'POST',
    headers: { ...authHeaders, 'x-upsert': 'true', 'Content-Type': 'application/json' },
    body,
  });
  if (!r.ok) throw new Error(`catalog write failed: ${r.status} ${await r.text()}`);
}

async function bumpConfig(key, value) {
  // config is key/value; upsert on conflict(key)
  const r = await fetch(`${SUPABASE_URL}/rest/v1/config?on_conflict=key`, {
    method: 'POST',
    headers: {
      ...authHeaders, apikey: SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ key, value }),
  });
  if (!r.ok) console.warn(`[publish] config upsert ${key} non-ok: ${r.status}`);
}

const { sha, sizeBytes } = await uploadApk();

const catalog = await readCatalog();
const others = catalog.apps.filter((a) => a.id !== APP_ID);
const entry = {
  id: APP_ID,
  name: APP_NAME,
  package: APP_PACKAGE,
  version: VERSION,
  versionCode: Number(VERSION_CODE),
  apkUrl: PUBLIC_APK_URL,
  sha256: sha,
  sizeBytes,
  status: 'live',
  releaseNotes: NOTES || catalog.apps.find((a) => a.id === APP_ID)?.releaseNotes || '',
  releasedAt: new Date().toISOString(),
  tagline: catalog.apps.find((a) => a.id === APP_ID)?.tagline,
  description: catalog.apps.find((a) => a.id === APP_ID)?.description,
};
catalog.apps = [...others, entry];
await writeCatalog(catalog);

// bump PSA's existing update-check rows so the in-app banner fires too
if (APP_ID === 'proseasonacademy') {
  await bumpConfig('latest_version', VERSION);
  await bumpConfig('latest_apk_url', PUBLIC_APK_URL);
  if (NOTES) await bumpConfig('latest_update_note', NOTES);
}

console.log(`[publish] ${APP_ID} ${VERSION} (v${VERSION_CODE}) live.`);
console.log(`  apk:   ${PUBLIC_APK_URL}`);
console.log(`  sha256: ${sha}`);
console.log(`  size:  ${(sizeBytes / 1048576).toFixed(1)} MB`);
console.log(`  catalog: ${CATALOG_PUBLIC}`);
