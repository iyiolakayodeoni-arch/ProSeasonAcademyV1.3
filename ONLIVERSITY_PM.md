# Onliversity Package Manager — the private app store

> Design + honest constraints for a *separate* companion app that distributes
> and updates every Onliversity app (ProSeasonAcademy now, future courses
> later). Read the "hard truths" section before you build — two of them will
> silently break the whole thing if ignored.

---

## 0. The question I was asked, answered straight

> *"Can't I clone the Play Store and apply that principle?"*

**No.** Two reasons, both load-bearing:

1. **Legal.** The Play Store is Google's proprietary software and brand. You
   cannot clone it or name it that. Forget that path.
2. **Technical — the one that actually matters.** The thing that makes the Play
   Store *feel* automatic is **silent background install**, and that power comes
   from OS privileges Google keeps for itself. **No third-party app can silently
   install another app on a normal Android device.** Every install from your
   store will always show the system "Install unknown app" prompt and require a
   tap. You can match the Play Store's *shape* (browse → tap → install) but not
   its silent behaviour.

What you **can** build is a **private OTA updater / sideload store** — the same
model as F-Droid, Obtainium, AltStore, Aptoide and enterprise MDM stores. That
is the right architecture for Onliversity (many courses, one trusted installer).

---

## 1. Hard truths that will break this if ignored

### 1a. No silent updates — ever
Every update shows the Android system install dialog; the user taps **Install**.
You can make it *one tap*, not zero. "Just like the Play Store" is aspirational;
the honest pitch to members is *"update in one tap from the Onliversity app."*

### 1b. Android 13+ "Restricted Settings" — the killer gotcha
Google added a **Restricted Settings** lock that blocks **sideloaded** apps from
being granted sensitive permissions — *including* the "install unknown apps"
permission — by default. Because the Package Manager is itself sideloaded, **out
of the box its install button will do nothing.** The user must manually go to
the PM's app-info screen → menu → **"Allow restricted settings"** the first
time. **The PM's first-run experience MUST walk the user through this**, or
installs fail silently and you get a flood of "the update button doesn't work"
tickets (which, ironically, land in the Desk triage you just built). This is the
single most under-documented trap in private APK distribution.

### 1c. `file://` is illegal since Android 7
To hand a downloaded APK to the system installer you must pass a `content://`
URI from a **FileProvider**, not a `file://` path. The PM needs a config plugin
that registers a FileProvider for its downloads directory. (Handled in the
scaffold's `plugins/withInstaller.js`.)

### 1d. The PM must be a **development build**, not Expo Go
Installing arbitrary APKs needs the `REQUEST_INSTALL_PACKAGES` permission and a
native FileProvider — neither exists in Expo Go. This matches how
ProSeasonAcademy already ships (it needs a dev build for the Match Watcher), so
the toolchain is already in place (`npx expo run:android` / EAS).

---

## 2. The architecture

```
┌───────────────────────────────┐        ┌──────────────────────────────┐
│  ProSeasonAcademy (app)       │        │  Onliversity PM (separate)   │
│  ─────────────────────        │        │  ──────────────────────      │
│  on boot: checkForUpdate()    │        │  reads the SAME manifest     │
│  → "Update 1.4 available"     │ deep-  │  lists every Onliversity app │
│  button: OPEN IN ONLIVERSITY ›│─links ›│  per app: installed / outdated│
│  fallback: direct APK link    │        │  download → verify SHA-256   │
│  (if the PM isn't installed)  │        │  → system install prompt     │
└───────────────────────────────┘        └──────────────────────────────┘
                  │                                     │
                  └──────────────┬──────────────────────┘
                                 ▼
                   ┌──────────────────────────────┐
                   │  THE MANIFEST (static JSON)  │
                   │  onliversity-catalog.json    │
                   │  ─ apps[] each with:         │
                   │    id, name, version,        │
                   │    versionCode, apkUrl,      │
                   │    sha256, minAndroid,       │
                   │    releaseNotes, signedBy    │
                   └──────────────────────────────┘
                                 │
              hosted on Supabase Storage OR GitHub Releases
              (you bump one JSON file to ship an update — no
               rebuild of either app to announce a new version)
```

**Why a manifest, not two apps hardcoding each other:** you push an update by
editing one JSON file (version, URL, checksum, notes). Both apps read it. You
never rebuild just to announce a build.

**Deep-link between the apps:** the PM registers the custom scheme
`onliversitypm://`. PSA's "Update available" button opens
`onliversitypm://update?app=proseasonacademy&version=1.4.0`; if the PM isn't
installed, it falls back to the direct APK download (the existing
`latest_apk_url` path).

---

## 3. The manifest format (`onliversity-catalog.json`)

```jsonc
{
  "schema": 1,
  "generatedAt": "2026-08-04T12:00:00Z",
  "apps": [
    {
      "id": "proseasonacademy",
      "name": "ProSeason Academy",
      "package": "com.onliversity.proseasonacademy",
      "version": "1.4.0",
      "versionCode": 4,
      "apkUrl": "https://.../proseasonacademy-1.4.0.apk",
      "sha256": "ab12...(the signed APK's checksum)",
      "sizeBytes": 38210432,
      "minAndroid": 30,
      "releaseNotes": "Mirror Session timeline marks, single-coach reveal.",
      "releasedAt": "2026-08-04T12:00:00Z"
    }
  ]
}
```

**Integrity rule (non-negotiable):** the PM downloads the APK, recomputes
SHA-256, and only offers the install prompt if it matches the manifest. That
defends against a tampered CDN or a hijacked manifest URL. Sign your APKs with
one stable key; `signedBy` is the fingerprint you (and the PM) trust.

---

## 4. What got built in this pass (and what's still on you)

**Built (scaffolded, self-consistent, ready to `eas build`):**
- `onliversity-pm/` — a separate Expo app: its own package
  (`com.onliversity.packagemanager`), scheme (`onliversitypm`), the
  `REQUEST_INSTALL_PACKAGES` permission + a FileProvider config plugin, a
  manifest reader with version-compare + SHA-256 verify, a store UI (catalog →
  per-app update state → download progress → install button), and a first-run
  "Allow restricted settings" walkthrough.
- PSA side: `src/data/packageManager.ts` — the deep-link helper (`openInPackageManager`
  with fallback to direct APK), so PSA's existing update check can now route
  through the PM.

**Still on you (honest production checklist):**
1. **Sign the PM once, with one key you keep forever.** A signing-key rotation
   later means a full reinstall for every member. Treat it like the
   `service_role` key — never in the repo.
2. **Host the manifest + APKs.** Supabase Storage (you already use Supabase) or
   GitHub Releases. Put the manifest URL in config; both apps read it.
3. **Generate real `sha256` + `versionCode`** per release and write them into the
   manifest. Automate this in your build script (`scripts/`).
4. **Test the install flow on a real Android 13/14 phone**, *especially* the
   restricted-settings unlock. This is the one thing that looks fine in code and
   fails on real devices.
5. **Decide the trusted-update scope.** The PM installing *any* Onliversity APK
   is fine; the PM installing *arbitrary* APKs is a malware vector. Keep the
   manifest to apps you signed.
6. **Naming/brand.** "Onliversity Package Manager" is a working name — the
   package id, scheme, and display name are all one-line edits in `app.json`.

---

## 5. Why a separate PM app (not just self-update inside PSA)

PSA can already self-update (it links to the APK — `updateChecker.ts`). For
**one** app, in-app self-update is simpler and you arguably don't need a PM.

The PM earns its keep the moment there are **two** Onliversity apps — which is
your stated roadmap ("the template every future course is built from"). One
trusted installer, one manifest, one update bell for the whole ecosystem, one
restricted-settings unlock instead of one per app. That's the Play-Store-shaped
goal, done honestly within Android's rules.
