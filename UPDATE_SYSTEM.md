# How updates work — the full pipeline

ProSeasonAcademy is not on the Play Store. That means members sideload APKs,
and you control the entire delivery chain yourself. Here is how every piece fits
together, from a code change on your laptop to a member seeing "NEW VERSION
AVAILABLE" on their phone.

---

## The pipeline, end to end

```
YOU WRITE CODE
    │
    ├─ git commit && git push
    │
    ▼
GITHUB (your private repo)
    │
    ├─ bump version in app.json (1.3.0 → 1.4.0)
    ├─ git tag v1.4.0 && git push --tags
    │
    ▼
EAS BUILD (Expo's servers — one command)
    │  eas build --platform android --profile production
    │  (~15 min → gives you a download link)
    │
    ▼
YOU DOWNLOAD THE APK from EAS
    │
    ▼
GITHUB RELEASES
    ├─ Go to your repo → Releases
    ├─ The tag push created a draft Release (if you installed the Action)
    ├─ Upload the APK → publish
    │
    │  ⚡ This gives you a permanent direct download URL:
    │     https://github.com/iyiolakayodeoni-arch/ProSeasonAcademyV1.3/releases/download/v1.4.0/ProSeasonAcademy-v1.4.0.apk
    │
    ▼
SUPABASE (two config rows)
    │  update config set value = '1.4.0' where key = 'latest_version';
    │  update config set value = 'https://github.com/...' where key = 'latest_apk_url';
    │
    ▼
EVERY INSTALLED APP
    ├─ Checks config.latest_version on boot
    ├─ Compares with its own version (from app.json)
    ├─ Sees 1.4.0 > 1.3.0 → shows an amber "UPDATE AVAILABLE" banner
    ├─ Member taps it → browser opens → downloads APK → sideloads
    └─ App installs over the old version — nothing is lost
```

---

## The download link — why this, not Google Drive

The link your members get is NOT a Google Drive link. It is a **GitHub Release
download URL**. Here is why that matters:

| Google Drive link | GitHub Release link |
|---|---|
| `drive.google.com/file/d/...` | `github.com/YOUR-REPO/releases/download/v1.4.0/...` |
| Looks like a shared file | Looks like a product |
| Google can scan/remove it | It is your repository, your rules |
| Link can expire or hit quota | Permanent — GitHub never expires release assets |
| Confusing download UI for non-Google users | One tap, APK downloads directly |
| Free up to 15 GB shared with everything | Free, unlimited for public repos; 500 MB file limit |

This is the same kind of link that modded APK sites use — a direct download
from a server you control, hosted on a domain you own (your GitHub). It is
free, it never expires, and it looks like what it is: software, not a shared
folder.

---

## How the app knows there is an update

Three files work together:

### 1. `src/data/updateChecker.ts`
On every app boot (and every time Settings opens), this calls Supabase:

```
config.latest_version   → "1.4.0"
config.latest_apk_url   → "https://github.com/.../ProSeasonAcademy-v1.4.0.apk"
config.latest_update_note → "FIXES THE MATCH SCAN CRASH"
```

It compares `latest_version` with the version baked into `app.json`. If the
live one is newer, it returns `{ available: true, apkUrl: "..." }`.

### 2. `src/screens/tabs/SettingsTab.tsx`
When an update is available, Settings shows an amber banner at the top:

```
┌──────────────────────────────────────────┐
│ [NEW] VERSION 1.4.0 AVAILABLE            │
│       YOU'RE ON 1.3.0. TAP TO DOWNLOAD.  │
└──────────────────────────────────────────┘
```

Tap it → the phone opens the browser → the APK downloads → the member
installs it over the existing app. Progress, vault, journal — all survive.

### 3. `supabase/update-system.sql`
Seeds the three config rows in your database. Run once, then update them
via SQL or the Founder Desk whenever you ship.

---

## Your workflow, step by step

### When you want to ship an update

```bash
# 1. Make your changes, test them, commit
git add .
git commit -m "fix: match scan crash on Android 14"
git push

# 2. Bump the version
#    Edit app.json: "version": "1.4.0", "versionCode": 4
#    Edit package.json: "version": "1.4.0"

# 3. Tag it
git add app.json package.json
git commit -m "chore: bump to 1.4.0"
git tag v1.4.0
git push --tags

# 4. Build the APK (needs EAS CLI + Expo account — free)
eas build --platform android --profile production
#    This runs on Expo's servers (~15 min). You get a download link.

# 5. Download the APK from the EAS link

# 6. Create a GitHub Release
#    Go to your repo → Releases → the tag push created a draft
#    (if you installed .github/workflows/release.yml)
#    Upload the APK, rename it to ProSeasonAcademy-v1.4.0.apk
#    Click Publish

# 7. Tell the apps there is an update
#    Supabase → SQL Editor:
update config set value = '1.4.0' where key = 'latest_version';
update config set value = 'https://github.com/iyiolakayodeoni-arch/ProSeasonAcademyV1.3/releases/download/v1.4.0/ProSeasonAcademy-v1.4.0.apk' where key = 'latest_apk_url';
update config set value = 'FIXES THE MATCH SCAN CRASH ON SOME DEVICES' where key = 'latest_update_note';

#    Done. Every installed app now shows the update banner.
```

### One-time setup (do this once)

```bash
# Install the GitHub Release Action (creates draft releases on tag push)
mkdir -p .github/workflows
cp supabase/release-action.yml .github/workflows/release.yml
git add .github/workflows/release.yml
git commit -m "ci: auto-release on version tags"
git push

# Seed the update config rows in Supabase
# Supabase → SQL Editor → paste supabase/update-system.sql → Run
```

---

## What the member sees

```
They open Settings (or the app boots fresh)

    ┌──────────────────────────────────────────┐
    │ [NEW] VERSION 1.4.0 AVAILABLE            │
    │       FIXES THE MATCH SCAN CRASH.        │
    └──────────────────────────────────────────┘

They tap it
    → Android browser opens
    → APK downloads (~38 MB)
    → They tap the downloaded file
    → "Install from unknown sources" (once, first time)
    → App installs over the old version
    → Everything is exactly where they left it
```

No Play Store. No account. No waiting for Google to approve your update.
You push, you build, you set two config rows — and every member gets the
update the next time they open the app.

---

## Why not Expo Updates (OTA)?

Expo Updates can push JavaScript changes over the air instantly — but only
JavaScript. If you add a native module (like THE EYE MatchWatcher), change
permissions, or update a native dependency, OTA updates cannot deliver it.
You would need a full APK build anyway, and now you have two update paths
to explain and debug.

For a private, sideloaded app with native modules, direct APK distribution
is simpler: one path, one truth, one kind of update that always works.

---

## Quick reference

| What | Where |
|---|---|
| Current version (baked into build) | `app.json` → `expo.version` |
| Latest version (live, drives the update prompt) | Supabase → `config.latest_version` |
| APK download URL | Supabase → `config.latest_apk_url` |
| Update note shown in the banner | Supabase → `config.latest_update_note` |
| GitHub Release (hosts the APK) | Repo → Releases → draft/published |
| Build command | `eas build --platform android --profile production` |
| Tag format | `v1.4.0` (v + semver, must match app.json) |
