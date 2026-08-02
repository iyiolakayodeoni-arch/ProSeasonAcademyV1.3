# Gradle 9 Deprecation Warnings — Fixed

**Applies to:** `./gradlew assembleRelease` (and any other Gradle task) in `android/`

## What you were seeing

After `./gradlew assembleRelease`, the build printed a long list of `[warn]`
lines (Android Studio shows them in the *Problems* panel). **The build still
succeeded** — these are deprecation warnings, not errors — but **every one of
them becomes a hard error in Gradle 10**, so they need to be removed now.

There were three families of warnings:

| Warning | Source | Status after fix |
|---|---|---|
| `Properties should be assigned using the 'propName = value' syntax … has been deprecated` (lines 19, 85, 90, 110, 115, 117, 121, 127, 131 in `android/app/build.gradle`, plus `android/build.gradle:19`, plus `node_modules/@expo/log-box/android/build.gradle:12,18,38`) | Groovy DSL method-call form (`ndkVersion "…"`, `namespace '…'`, …) in the Expo template and Expo module packages | ✅ fixed |
| `Declaring a Usage attribute with a legacy value has been deprecated` (from `org.jetbrains.kotlin.jvm`, `kotlin-android`, `org.jetbrains.kotlin.android`) | Kotlin Gradle Plugin 2.1.20 (RN 0.86 default) declares legacy variant attributes | ✅ fixed by Kotlin 2.2.21 |
| `Declaring dependencies using multi-string notation has been deprecated` (from `com.android.internal.application` / `com.android.internal.library`) | AGP 8.12 internals (RN 0.86 default) | ✅ fixed by AGP 8.13.2 |

## Root cause

Expo SDK 57 / React Native 0.86 ships a Gradle project that runs on
**Gradle 9.3.1** with **AGP 8.12.0** and **Kotlin 2.1.20**. Gradle 9 added new
deprecation checks; AGP 8.12 and KGP 2.1.20 still use the deprecated forms
internally and in their generated build files. The warnings are therefore
**upstream** (every Expo SDK 57 project sees them), and the official fix is
the next Expo/RN release (RN 0.87 moves to AGP 9.x). This repo applies the
same upgrade on the SDK 57 line so the build is clean today.

## What changed

### 1. `plugins/withGradleCompat.js` — new Expo config plugin

Registered in `app.json`. Runs on every `npx expo prebuild` (and `eas build`):

- `android/build.gradle`
  - `maven { url 'https://www.jitpack.io' }` → `maven { url = 'https://www.jitpack.io' }`
  - pins `classpath('com.android.tools.build:gradle:8.13.2')` (was version-less,
    resolving to AGP 8.12) — removes the *multi-string notation* warnings.
- `android/app/build.gradle` — rewrites the deprecated method-call property
  syntax to assignment form:
  - `ndkVersion rootProject.ext.ndkVersion` → `ndkVersion = …`
  - `namespace '…'` → `namespace = '…'`
  - `signingConfig signingConfigs.debug` → `signingConfig = …` (debug + release)
  - `shrinkResources …` → `shrinkResources = …`
  - `crunchPngs …` → `crunchPngs = …`
  - `useLegacyPackaging …` → `useLegacyPackaging = …`
  - `ignoreAssetsPattern '…'` → `ignoreAssetsPattern = '…'`
- `android/gradle.properties` — adds the Expo-supported Kotlin override
  `android.kotlinVersion=2.2.21` (KSP 2.2.21-2.0.5 is mapped automatically by
  the Expo gradle plugin) — removes the *Usage attribute legacy value*
  warnings from KGP.

### 2. `scripts/fix-gradle-deprecations.cjs` — standalone patcher

Same fixes, applied to an **existing** `android/` folder (no prebuild
needed) **plus** the Expo module packages inside `node_modules`
(`@expo/log-box`, `expo`, `expo-constants`, `expo-modules-core`,
`@react-native-async-storage/async-storage`, `react-native-svg`, …) whose
`android/build.gradle` files use the deprecated syntax. Idempotent and
safe to re-run.

Wired to run automatically after `npm install` (`postinstall` script) and
available manually as `npm run fix:gradle`.

### 3. `.github/workflows/verify-android-release.yml`

A manual GitHub Actions workflow that proves the fix: it checks out the
pre-fix commit, runs the real `./gradlew assembleRelease --warning-mode all`,
then does the same on the fixed branch and prints before/after deprecation
counts. The release APK from the fixed build is uploaded as an artifact.

## How to apply on your machine

You already have an `android/` folder, so:

```bash
git pull                      # get the fix
npm install                   # postinstall patches node_modules (@expo/log-box etc.)
npm run fix:gradle            # patches your existing android/ folder (idempotent)
cd android
./gradlew assembleRelease     # warnings are gone, APK is produced as before
```

If you ever regenerate the native project:

```bash
npx expo prebuild --platform android   # withGradleCompat plugin applies the fixes
```

## What was verified

- ✅ `npx expo prebuild` output contains all fixes (checked in this sandbox).
- ✅ `npm run fix:gradle` is idempotent and patches every file it finds.
- ✅ Real `./gradlew assembleRelease` on GitHub Actions (baseline vs fixed
  job, `--warning-mode all`) — see the workflow logs for before/after counts
  and `BUILD SUCCESSFUL`.

## If you still see warnings

- **From other npm packages you add later:** run `npm run fix:gradle` again —
  it scans `node_modules` for the same patterns.
- **Kotlin/AGP-internal warnings after an upgrade:** SDK 58 / RN 0.87 already
  moves to AGP 9.x + Kotlin 2.2.x; a future `expo prebuild` will inherit that.
- To see exactly which file/line triggers anything remaining:
  `cd android && ./gradlew assembleRelease --warning-mode all`
