# Onliversity — Package Manager

A private, honest app store for the Onliversity ecosystem. Reads a single
catalog manifest, shows update state per app, and installs/updates via the
Android system installer (every install shows the system prompt — silent
install is impossible on standard Android and that's the OS, not us).

**Read `../ONLIVERSITY_PM.md` first** — it covers the hard truths (no Play
Store clone, no silent install, the Android 13+ "Restricted Settings" trap,
integrity, hosting) and the production checklist.

## What's here

```
app.json               own app id com.onliversity.packagemanager, scheme onliversitypm
plugins/withInstaller.js   adds REQUEST_INSTALL_PACKAGES + a FileProvider +
                           injects InstallerModule (contentUriForApk, sha256OfFile,
                           canRequestInstalls, openInstallPermissionSettings,
                           installedVersionCodeOf)
src/manifest.ts        fetch + validate the catalog; versionCode compare
src/installer.ts       download → SHA-256 verify → system install prompt
App.tsx                the store UI + the one-time Restricted Settings walkthrough
```

## Build & run (development build — NOT Expo Go)

```bash
cd onliversity-pm
npm install
# set the catalog URL (defaults to Supabase Storage)
echo "EXPO_PUBLIC_ONLIVERSITY_CATALOG=https://.../onliversity-catalog.json" > .env
npx expo run:android      # compiles the Kotlin installer module on first run
# or: eas build -p android --profile production
```

It needs a real Android device/emulator with the install flow tested —
especially the Restricted Settings unlock on Android 13+.

## The catalog (`onliversity-catalog.json`)

```jsonc
{
  "schema": 1,
  "apps": [{
    "id": "proseasonacademy",
    "name": "ProSeason Academy",
    "package": "com.onliversity.proseasonacademy",
    "version": "1.4.0",
    "versionCode": 4,
    "apkUrl": "https://.../proseasonacademy-1.4.0.apk",
    "sha256": "<hex sha-256 of the signed APK>",
    "sizeBytes": 38210432,
    "releaseNotes": "..."
  }]
}
```

You ship an update by editing this one file — neither app rebuilds to announce
a version. Generate the real `sha256` + `versionCode` in your build script.

## How the other apps reach it

A member app (e.g. ProSeasonAcademy) opens the PM via the deep link
`onliversitypm://update?app=proseasonacademy`. If the PM isn't installed, it
falls back to the direct APK download. PSA already wires this in
`src/data/packageManager.ts`.
