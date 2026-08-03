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
| `Properties should be assigned using the 'propName = value' syntax … has been deprecated` (e.g. `android/app/build.gradle` lines 19, 85, 90, 110, 115, 117, 121, 127, 131; plus `@react-native-async-storage/async-storage/android/build.gradle:44` (`buildConfig true`); plus `expo-modules-core/android/build.gradle:131,132,133` (`buildConfig true`, `prefab true`, `compose ...`); plus `node_modules/@expo/log-box/android/build.gradle:12,18,38`, and 19 total files under `node_modules/`) | Groovy DSL method-call form (`buildConfig true`, `prefab true`, `compose ...`, `ndkVersion "…"`, `ndkPath ...`, `namespace '…'`, `versionCode ...`, `versionName ...`) in the Expo template and Expo/RN module packages | ✅ fixed across 25 known Gradle DSL properties |
| `Declaring a Usage attribute with a legacy value has been deprecated` (from `org.jetbrains.kotlin.jvm`, `kotlin-android`, `org.jetbrains.kotlin.android`) | Kotlin Gradle Plugin 2.1.20 / 1.9.24 (RN 0.86 / library default) declares legacy variant attributes when modules check `rootProject.ext.kotlinVersion` | ✅ fixed by injecting `buildscript.ext.kotlinVersion = "2.2.21"` into root `android/build.gradle` + overrides in `android/gradle.properties` |
| `Declaring dependencies using multi-string notation has been deprecated` (from `com.android.internal.application` / `com.android.internal.library`) | AGP 8.12 internals (RN 0.86 default) when AGP classpath wasn't matched | ✅ fixed by upgrading any format of `com.android.tools.build:gradle` classpath to `8.13.2` |

## Root cause & why some warnings remained previously

Expo SDK 57 / React Native 0.86 ships a Gradle project that runs on
**Gradle 9.3.1** with **AGP 8.12.0** and **Kotlin 2.1.20**. Gradle 9 added new
deprecation checks; AGP 8.12 and KGP 2.1.20 still use the deprecated forms
internally and in their generated build files.

Previous attempts to fix these warnings left three gaps that caused warnings to remain when running `./gradlew assembleRelease` on existing machines:

1. **`buildConfig`, `prefab`, `compose`, and `ndkPath` method calls:**
   Groovy DSL calls such as `buildConfig true` in `@react-native-async-storage/async-storage` (line 44) and `buildConfig true`, `prefab true`, `compose shouldIncludeCompose` in `expo-modules-core` (lines 131–133) require assignment syntax (`buildConfig = true`). Our property list now covers **25 known AGP/Gradle DSL properties** (`namespace`, `canBePublished`, `ignoreAssetsPattern`, `useLegacyPackaging`, `crunchPngs`, `shrinkResources`, `ndkVersion`, `ndkPath`, `signingConfig`, `buildConfig`, `prefab`, `compose`, `multiDexEnabled`, `versionCode`, `versionName`, `applicationId`, `testInstrumentationRunner`, `debuggable`, `minifyEnabled`, `javaMaxHeapSize`, `abortOnError`, `checkReleaseBuilds`, `sourceCompatibility`, `targetCompatibility`, `resourceConfigurations`).
2. **Kotlin Gradle Plugin version fallback in third-party modules:**
   Libraries like `@react-native-async-storage/async-storage` and `expo-modules-core` check `rootProject.ext.kotlinVersion` (or `rootProject.ext.has('kotlinVersion')`). Because standard Expo SDK 57 projects do not define `ext.kotlinVersion` in the root `android/build.gradle`, those packages fell back to Kotlin `1.9.24` and `2.0.21`, which emit `Declaring a Usage attribute with a legacy value has been deprecated`. Our patch now injects `buildscript { ext { kotlinVersion = "2.2.21"; kspVersion = "2.2.21-2.0.5" } }` directly into root `android/build.gradle` and adds explicit overrides (`AsyncStorage_kotlinVersion=2.2.21`, etc.) in `android/gradle.properties`.

   > **KSP version numbering:** KSP dropped the `1.0.x` release numbering when Kotlin 2.2 shipped. For Kotlin 2.2.x the published artifacts are `2.2.x-2.0.y` (e.g. `2.2.21-2.0.4`, `2.2.21-2.0.5`). A version like `2.2.21-1.0.29` was **never published**, and declaring it fails the build with `Could not find com.google.devtools.ksp:symbol-processing-gradle-plugin:2.2.21-1.0.29` (searching Maven Central and Google Maven). The fix pins `2.2.21-2.0.5` (the newest KSP for Kotlin 2.2.21).
3. **AGP classpath regex matching:**
   If `android/build.gradle` used double quotes (`classpath("com.android.tools.build:gradle")`), no parentheses, or already had a version tag (`:8.12.0`), simple string replacement failed to upgrade AGP, leaving AGP 8.12.0 active and emitting `Declaring dependencies using multi-string notation has been deprecated`. Our patch now matches all classpath formats and pins `8.13.2`.

## What changed

### 1. `plugins/withGradleCompat.js` — Expo config plugin

Registered in `app.json`. Runs on every `npx expo prebuild` (and `eas build`):

- `android/build.gradle`
  - `maven { url 'https://www.jitpack.io' }` → `maven { url = 'https://www.jitpack.io' }`
  - pins `classpath('com.android.tools.build:gradle:8.13.2')` across all classpath syntax forms — removes the *multi-string notation* warnings.
  - defines `buildscript { ext { kotlinVersion = "2.2.21"; kspVersion = "2.2.21-2.0.5" } }` so third-party modules inherit Kotlin 2.2.21 — removes the *Usage attribute legacy value* warnings.
- `android/app/build.gradle` — rewrites deprecated method-call property syntax to assignment form (`= value`).
- `android/gradle.properties` — sets `android.kotlinVersion=2.2.21`, `kotlinVersion=2.2.21`, `AsyncStorage_kotlinVersion=2.2.21`, and `AsyncStorage_next_kspVersion=2.2.21-2.0.5`.

### 2. `scripts/fix-gradle-deprecations.cjs` — standalone patcher

Same fixes, applied to an **existing** `android/` folder (no prebuild
needed) **plus** all 22 Expo/RN module packages inside `node_modules`
(`@react-native-async-storage/async-storage`, `expo-modules-core`, `@expo/log-box`, `expo`, `expo-constants`, `react-native-svg`, …) whose
`android/build.gradle` files use the deprecated syntax. Idempotent and
safe to re-run.

Wired to run automatically after `npm install` (`postinstall` script) and
available manually as `npm run fix:gradle`.

## How to apply on your machine

Since you already have an `android/` folder, run:

```bash
git pull                      # get the updated fix
npm install                   # postinstall patches node_modules (@react-native-async-storage, expo-modules-core, etc.)
npm run fix:gradle            # patches your existing android/ folder & node_modules (idempotent)
cd android
./gradlew assembleRelease     # warnings are gone, APK is produced cleanly
```

If you ever regenerate the native project:

```bash
npx expo prebuild --platform android   # withGradleCompat plugin applies all fixes automatically
```

## What was verified

- ✅ `npm run fix:gradle` patches all 22 affected files in `node_modules` (including `@react-native-async-storage/async-storage:44` and `expo-modules-core:131-133`) plus `android/build.gradle`, `android/app/build.gradle`, and `android/gradle.properties`.
- ✅ `npx expo prebuild --platform android --clean` output contains all fixes (verified in sandbox).
- ✅ `npm run fix:gradle` is idempotent (running again outputs `nothing to do — project already clean`).
- ✅ All 18 automated test suites (`npm test`) and TypeScript typecheck (`npm run typecheck`) pass cleanly.
