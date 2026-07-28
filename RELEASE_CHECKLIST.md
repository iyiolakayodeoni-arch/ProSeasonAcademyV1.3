# ProSeasonAcademy — Release Checklist

**Bundle identifier:** `com.onliversity.proseasonacademy` (lowercase everywhere — verified
in `app.json` for both `android.package` and `ios.bundleIdentifier`; no cased variants exist).

**App version:** `1.0.0` (app.json) · Android `versionCode: 1` · iOS `buildNumber: "1"`
(versions auto-increment remotely on production builds, per `eas.json`).

---

## 1. Local testing (no accounts needed)

```bash
cd ProSeasonAcademy
npm install
npm start                 # Metro dev server → open in Expo Go (phone) or simulator
npx tsc --noEmit          # typecheck (currently passing)
```

Native projects are generated on demand (Continuous Native Generation):
```bash
npx expo prebuild         # generates android/ + ios/ from app.json — only if you need them locally
                        # (they inherit com.onliversity.proseasonacademy automatically)
```

## 2. EAS account (free — REQUIRED before any cloud build)

This is the one thing blocking ALL build commands below; it is **not** a store account.

1. Create a free account at https://expo.dev
2. `npx eas login`
3. `npx eas init` → links the project, writes `extra.eas.projectId` into `app.json`
   (it will ask which org/account owns the project — pick yours)

## 3. Preview builds (internal testing — buildable with ONLY an Expo account for Android)

```bash
# Android APK (sideload onto any phone):
npx eas build --platform android --profile preview

# iOS (ad-hoc — needs Apple Developer account, see §5):
npx eas build --platform ios --profile preview
```

- `eas.json` `preview` profile → Android outputs **.apk**, iOS outputs internal-distribution **.ipa**.
- First Android build will offer to let **EAS manage the keystore** — say yes (simplest).
  No Play Console needed to *build*, only to *submit*.
- First iOS device build needs device UDIDs registered (`npx eas device:create`).

## 4. Production builds (store-ready)

```bash
# Android → .aab (App Bundle, what Play Store requires):
npx eas build --platform android --profile production

# iOS → .ipa (App Store build):
npx eas build --platform ios --profile production

# Submit (BLOCKED until store accounts exist):
npx eas submit --platform android
npx eas submit --platform ios
```

## 5. Store accounts — the sequence to unlock `eas submit`

### Apple (iOS) — $99/year
1. Enroll at https://developer.apple.com/programs (Apple ID → developer account → paid enrollment; can take 24–48h)
2. Once enrolled, run `npx eas build --platform ios --profile preview` — EAS will offer to
   create certificates + provisioning profiles automatically. Accept.
3. Create the app in App Store Connect (https://appstoreconnect.apple.com) with bundle ID
   `com.onliversity.proseasonacademy` — must be registered there before submit.
4. `npx eas submit --platform ios` → build lands in TestFlight → internal testing → App Review.

**Blocked until then:** provisioning profiles, TestFlight, any iOS device build, submission.
**NOT blocked:** iOS simulator builds (free, needs a Mac: `eas build --profile development`).

### Google (Android) — $25 one-time
1. Sign up at https://play.google.com/console (pay fee, verify identity — can take days)
2. Create app "ProSeason Academy" in the console with package `com.onliversity.proseasonacademy`
3. First upload of the .aab is usually easiest done manually in the console
   (Downloads > Release > Testing > Internal testing > Create release); afterwards
   `npx eas submit --platform android` works with a Google service-account key.
4. Choose "Let Google manage app signing" (Play App Signing) — recommended, since EAS holds
   the upload key; losing either is recoverable.

**Blocked until then:** Play listing, any store distribution, manual .aab upload.
**NOT blocked:** building .aab/.apk with EAS, sideloading APKs directly onto phones.

## 6. Flagged — action required OUTSIDE the codebase (not done, no code can do these)

- [ ] **Privacy policy URL** — BOTH stores require one before first submission. No way around it.
- [ ] **Store listing copy** — app name, short + full description, keywords, category (sports/gaming/education?)
- [ ] **Store screenshots** — phone (and optionally 7"/10" tablet for Android; iPhone 6.7" + 6.5" for iOS).
      The design PNGs in `/home/user` (HOME_TAB, JOURNEY_TAB, etc.) are a start but stores want
      real device screenshots at exact resolutions.
- [ ] **Feature graphic** (1024×500, Play Store only) + app icon 512×512 for the Play listing
- [ ] **Content rating questionnaires** — both stores (age rating, gambling/loot-box declarations —
      IMPORTANT because FC Mobile content implies gaming; answer truthfully)
- [ ] **Export compliance** (iOS) — standard encryption question: app uses HTTPS only →
      can answer "exempt", but the question must still be answered in App Store Connect
- [ ] **Data safety form** (Android) — what data is collected (email? match stats? device IDs?)
- [ ] **Support/contact email + website URL** for both listings
- [ ] Apple only: review notes + a **demo account** if sign-in is required to see content
- [ ] Decide on the **legal entity name** shown as developer/seller in both stores

## 7. Notes

- EAS-managed credentials can be inspected/exported later via `npx eas credentials`.
- `preview`/`development` builds are internal-only and never touch the stores.
- The old bare-RN project was preserved untouched at `/home/user/ProSeasonAcademy-bare-legacy`
  (it used a different package, `com.proseasonacademy` — do NOT reuse that ID;
  this app is `com.onliversity.proseasonacademy` everywhere).

---

## LOCAL GRADLE RELEASE BUILD (done 2026-07-25 — this is how the shipped binaries were made)

The `android/` folder is a REAL native project (open it straight in Android Studio).

### Rebuild the release APK yourself — pure Gradle, one command
```bash
cd android
printf 'sdk.dir=<your-android-sdk-path>\n' > local.properties   # one line, machine-local
./gradlew assembleRelease     # APK  → app/build/outputs/apk/release/app-release.apk
./gradlew bundleRelease       # AAB  → app/build/outputs/bundle/release/app-release.aab (Play Store)
```
No env vars, no extras — everything the release needs is declared in the project files:
- `android/app/build.gradle` → `signingConfigs.release` + `buildTypes.release` (the release variant)
- `android/gradle.properties` → `MYAPP_UPLOAD_*` (keystore file, alias, passwords — the classic RN pattern)
Needs: JDK 17+ (21 used), Android SDK platform 36 + build-tools 36 + NDK 27.1.12297006 + CMake 3.22.1.

### Release signing — READ THIS
- Upload key: `android/app/proseason-upload.keystore` (alias `proseason-upload`). **Google Play will demand this exact key for every update, forever. Back it up.**
- The key password is in `android/gradle.properties` (normal for a private project). Keep the project zip private — anyone with it can sign as you. A separate backup of the keystore + password also lives in the workspace root beside the zip.

### Sandbox build notes (why gradle.properties looks tuned)
The first build ran in a 2 GB CI box: `workers.max=1`, in-process Kotlin, lint-off for release, and `reactNativeArchitectures=arm64-v8a` (covers every modern phone). Widen ABIs or re-enable lint if you build on a desktop with more RAM.
