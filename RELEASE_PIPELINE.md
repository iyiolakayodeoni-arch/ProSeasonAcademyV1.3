# Onliversity — Release Pipeline

> How a change goes from your keyboard to every member's phone. Two lanes:
> a **full APK release** (CI/CD → the Package Manager) and, for code-only
> fixes, a **JS OTA update** (instant, no install). Read both — they serve
> different changes.

---

## The picture

```
 you push to git (main) or tag v1.4.0
        │
        ▼
 GitHub Actions:  release-onliversity.yml
   ├── eas build --local  →  app-release.apk
   └── scripts/publish-onliversity.mjs
          ├── sha256 + size
          ├── upload APK → Supabase Storage (bucket "onliversity")
          ├── upsert onliversity-catalog.json   ◄── the PM reads this
          └── bump config.latest_version/_apk_url/_note  ◄── PSA banner reads this
        │
        ▼
 every phone:
   • Onliversity PM shows  "ProSeason Academy — UPDATE 1.4.0"
   • ProSeasonAcademy's UpdateBanner shows  "UPDATE 1.4.0 IS OUT"
        │
        ▼
 member taps UPDATE → APK downloads → SHA-256 verified → Android install prompt → tap INSTALL
```

That is "push to git → live in the store." The one thing it can't be is *silent*:
Android makes every install a user tap. That is the OS, not us.

---

## Lane 1 — full APK release (new features, native changes, new permissions)

Triggered by `.github/workflows/release-onliversity.yml` on push to `main`, a
`v*` tag, or a manual run.

**One-time setup (do this once):**
1. **EAS project.** `eas init` in the PSA repo → note the `EAS_PROJECT_ID`
   (also lands in `.easignore`/eas config). Add it + an `EXPO_TOKEN`
   (expo.ai → Account → Access Tokens) as repo secrets.
2. **Signing key.** Either let EAS manage it (`eas credentials`) or upload your
   own keystore. Use ONE key and keep it forever — a rotation means every member
   reinstalls. Treat it like the `service_role` key.
3. **Supabase Storage.** Create a **public** bucket named `onliversity`. Upload
   `onliversity-pm/catalog.example.json` as `onliversity-catalog.json`. Add
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as repo secrets (CI-only —
   never in the client).
4. **Bump the version** in `app.json` (`expo.version` + `android.versionCode`)
   before you ship — the workflow reads them and they drive the update check.

Then: push to `main` (or tag `v1.4.0`). The workflow builds, publishes, and (on
a tag) attaches the APK to the GitHub Release. Members see it within their next
PM/PSA launch.

**What I verified vs. didn't:**
- ✅ `scripts/publish-onliversity.mjs` is valid Node (`node --check`), no deps,
  and the logic is sound (sha256, Storage upsert, catalog upsert, config bump).
- ⚠️ The workflow + `eas build --local` needs the one-time EAS/credential setup
  above and **must be test-run** before you trust it. Mobile CI/CD credentials
  are fiddly; budget one focused session to get the first green run.

---

## Lane 2 — JS OTA update (quick fixes, no install, feels most "Play Store")

For changes that are **pure JavaScript / JSX / assets** — no new permission, no
new native module, no bump to `versionCode` — you don't need an APK at all.
**Expo Updates** pushes a new JS bundle; the app pulls it on next launch and
applies it instantly. No download, no install prompt. This is the closest thing
to a silent Play-Store update that exists on Android.

```bash
# one-time: wire expo-updates into PSA (channel + runtime version), then:
eas update --branch production --message "fix: journal streak off-by-one"
```

**Rules (honest):**
- It can change any screen, any logic, any copy, any SVG. It **cannot** change
  native code — a new permission, a new config plugin, a new native module
  (like the PM's installer) REQUIRES Lane 1 (a real APK).
- Bump Expo's `runtimeVersion` policy whenever native deps change; otherwise OTA
  bundles crash on mismatched native code.
- Not wired yet in this repo — say the word and I'll add `expo-updates` to PSA
  with a `production` channel and a one-command publish.

**Mental model:** Lane 2 for 90% of day-to-day fixes (instant, invisible). Lane 1
for anything native or versioned (visible update through the PM).

---

## What ships where (the manifest of manifests)

| File | Lives in | Who reads it | You edit it when |
|---|---|---|---|
| `app.json` (version/versionCode) | PSA repo | the CI workflow | before any Lane-1 release |
| `onliversity-catalog.json` | Supabase Storage | the PM + the publish script | auto, by the script |
| `config.latest_version/_apk_url/_note` | Supabase `config` table | PSA's UpdateBanner | auto, by the script |
| the signed APK | Supabase Storage + GitHub Release | the PM downloads it | auto, by the script |

You touch `app.json` (bump version) and push. Everything else is automatic.

---

## Honest limits, again

- **No silent install.** Every update is a member tap on Android's prompt.
  Lane 2 (OTA) is the only way to update without a tap, and only for JS.
- **Restricted Settings (Android 13+).** The PM itself must be unlocked once
  (see `ONLIVERSITY_PM.md`). Without that, the UPDATE button does nothing on
  real devices — test it.
- **Integrity is enforced.** The PM refuses an APK whose SHA-256 doesn't match
  the catalog, so a tampered host or hijacked URL can't push malware. Keep the
  `service_role` key in CI only.
