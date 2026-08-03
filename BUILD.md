# Building ProSeasonAcademy

**Backend:** Supabase — `https://ymnkphqgjxexsnbgtqvk.supabase.co` — is the **only** live
backend. `server/` is a fallback that nothing contacts (see `server/DEPLOYMENT.md`).

**Distribution:** private / enterprise, inside the Onliversity ecosystem. Builds are
`distribution: "internal"` — sideloaded or handed out by link. **No store, no review, no
Play Console.** Season One is capped at 1,000 seats, enforced in the database.

---

## 0 · One-time setup

You need a free Expo account. This is a build service, **not** a store account.

```bash
npm install
npx eas login
npx eas init      # links the project, writes extra.eas.projectId into app.json
```

`npx eas init` is required once. Everything else below works forever after.

---

## 1 · Build the APK (the one you actually want)

```bash
npx eas build --platform android --profile production
```

Gives you a **signed APK** you can install on any Android phone or host on your own
download page. When it finishes, EAS prints a URL — that link is the distribution.

First run only: EAS offers to generate an upload keystore. **Say yes**, then immediately:

```bash
npx eas credentials
```

…and back the keystore up somewhere safe. Same key must sign every future update, or
phones will refuse to install over the top.

### Other profiles

| Command | Output | Use |
|---|---|---|
| `--profile production` | signed **APK** | ← the normal one; sideload / your own link |
| `--profile preview` | signed APK | testing a change before members get it |
| `--profile development` | dev-client APK | live reload while coding |
| `--profile aab` | **.aab** | only if a store ever becomes relevant |

---

## 1b · Direct gradle build (no EAS, your own PC)

Use this when you want the APK built on your machine instead of on EAS's servers.

```powershell
# ALWAYS run these from the PROJECT ROOT (the folder that contains package.json),
# never from inside the android/ folder.
npx expo prebuild --platform android     # re-syncs android/ and re-injects the
                                         # MatchWatcher native module (fixed Kotlin)
cd android
.\gradlew assembleRelease                # Windows PowerShell
# ./gradlew assembleRelease              # macOS / Linux
```

The APK lands in `android\app\build\outputs\apk\release\`.

**Troubleshooting**

- `ConfigError: The expected package.json path: ...\android\package.json does not exist`
  → you ran the command from **inside** `android/` (Expo then treats `android/` as the
  project root). Run `cd C:\Users\admin\ProSeasonAcademyV1.3` (or wherever the repo is)
  first and repeat the block above. A tell-tale sign: `cd android` fails with
  `Cannot find path '...\android\android'`.
- `Task :app:compileReleaseKotlin FAILED` with errors in `MatchWatcherModule.kt` /
  `MatchWatcherService.kt` (`Unresolved reference 'emit'`, `Conflicting overloads`,
  `Missing '}'`, …) → the `android/` folder still contains the **old** pre-fix
  MatchWatcher files (the fixed ones are only written into `android/` when prebuild or
  the patch script runs). Fix without touching your keystore:

  ```powershell
  node scripts/fix-matchwatcher.cjs    # copies the fixed Kotlin from plugins/withMatchWatcher.js
  cd android
  .\gradlew assembleRelease
  ```

- **Never delete the `android/` folder** unless you have backed up the release keystore
  (`android/app/*.jks`, plus its passwords). Deleting it regenerates a fresh debug
  keystore and drops any manual signing config.

---

## 2 · Where the Supabase keys come from

**They are baked in at build time — this is the part that used to be broken.**

`.env` is gitignored (correct — keys don't belong in Git), but EAS builds by *cloning your
repo*, so a cloud build never sees `.env`. Before this was fixed, every EAS build would
have shipped with **no backend at all**: silently offline, no sign-in, no seats, no rooms,
and nothing on screen to explain why.

Now `eas.json` carries them in a shared `base` profile that every build extends:

```jsonc
"base": {
  "env": {
    "EXPO_PUBLIC_PSA_SUPABASE_URL":      "https://ymnkphqgjxexsnbgtqvk.supabase.co",
    "EXPO_PUBLIC_PSA_SUPABASE_ANON_KEY": "eyJhbGciOi…"
  }
}
```

So there are two sources, and both are needed:

| Where | Used by | In Git? |
|---|---|---|
| `.env` | local `npx expo start` / `expo export` | ❌ gitignored |
| `eas.json` → `base.env` | every `eas build` | ✅ committed |

**The anon key is safe to commit.** It is the public key — Supabase expects it in client
apps, and every table is guarded by Row Level Security. Verified: a stranger holding this
key reads `[]` from `profiles` and `matches`.

🔴 **The `service_role` key must NEVER go in `.env`, `eas.json`, or any app file.** It
bypasses RLS entirely. It belongs only in Supabase → Edge Functions → Secrets. Every build
is checked for it (see §4).

### If you ever rotate the anon key

Update it in **both** places, or local and cloud builds will disagree:
1. `.env`
2. `eas.json` → `build.base.env`

---

## 3 · Versioning

`appVersionSource` is `local`, so `app.json` is the single source of truth. Bump it
yourself before a release members will notice:

```jsonc
"version": "1.3.0",
"android": { "versionCode": 3 },   // must increase every build, or installs fail
"ios":     { "buildNumber": "3" }
```

Android will refuse to install an APK whose `versionCode` is ≤ the installed one.

---

## 4 · Verify a build before you hand it out

Run the same checks I run — a two-minute habit that catches the expensive mistakes:

```bash
npm run typecheck                    # tsc, must be clean
npm test                             # watcher frame tests, 7/7
npx expo export --platform web --clear

B=$(ls dist/_expo/static/js/web/index-*.js)
grep -c 'ymnkphqgjxexsnbgtqvk.supabase.co' $B   # expect 1  ← backend wired
grep -c 'service_role'                    $B    # expect 0  ← MUST be zero
rm -rf dist
```

If the first is `0`, the build has no backend and every member lands offline.
If the second is anything but `0`, **do not distribute it** — rotate that key immediately.

Also worth running once against the live project (needs normal network access):

```bash
node tests/live-backend.test.mjs     # expect: 20 passed · 0 failed
```

---

## 5 · Handing the app to members

1. Build the APK (§1).
2. Take the EAS link, or download the `.apk` and host it wherever your ecosystem lives.
3. Members enable "install from unknown sources" once, then install.
4. First launch: they pick a country, choose an academy name, and **claim one of the 1,000
   Season One seats**. No password, no email, nothing to forget.
5. When seats run out, `ensure-profile` returns `SEASON_FULL` (409) and later members land
   on the waitlist panel — while still training solo offline.

Updates are the same command with a higher `versionCode`; phones install over the top,
and player progress survives because it lives in AsyncStorage keyed per coach.

---

## 6 · Native code (THE EYE)

`npx expo prebuild` regenerates `android/`, which is gitignored — it is generated output,
not source. You only need it if you add the native MatchWatcher module for automatic goal
detection (the 4 required pieces are documented at the top of `src/data/matchWatcher.ts`).

⚠️ `RELEASE_CHECKLIST.md` refers to `android/app/proseason-upload.keystore` from the older
local Gradle builds. **That file is not in this repo.** If it exists only in an old zip,
find it and back it up before you go anywhere near prebuild — or let EAS manage signing
from here on and treat that old key as retired.
