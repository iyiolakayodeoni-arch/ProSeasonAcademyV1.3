// ─────────────────────────────────────────────────────────────
// withGradleCompat — Expo config plugin.
//
// Makes `npx expo prebuild` (and `eas build`, which prebuilds
// automatically) emit an android/ project that is clean of Gradle 9
// deprecation warnings, so `./gradlew assembleRelease` stops printing:
//
//   [warn] Properties should be assigned using the 'propName = value'
//          syntax ... has been deprecated        (→ fixed here)
//   [warn] Declaring a Usage attribute with a legacy value has been
//          deprecated                            (→ Kotlin 2.2.21)
//   [warn] Declaring dependencies using multi-string notation has been
//          deprecated                            (→ AGP 8.13.2)
//
// See GRADLE9_DEPRECATIONS.md for the full story.
// ─────────────────────────────────────────────────────────────
const {
  withProjectBuildGradle,
  withAppBuildGradle,
  withGradleProperties,
} = require('@expo/config-plugins');
const {
  rewriteDeprecatedPropertyCalls,
  rewriteMavenUrl,
  ensureAgpVersion,
  ensureKotlinVersionInBuildscript,
  ensureGradleProperties,
  KSP_VERSION,
} = require('../scripts/fix-gradle-deprecations.cjs');

function withGradleCompat(config) {
  // android/build.gradle — `maven { url = ... }`, explicit AGP classpath, buildscript.ext.kotlinVersion
  config = withProjectBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    contents = rewriteMavenUrl(contents);
    contents = ensureAgpVersion(contents);
    contents = ensureKotlinVersionInBuildscript(contents);
    cfg.modResults.contents = contents;
    return cfg;
  });

  // android/app/build.gradle — deprecated property-call syntax
  config = withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = rewriteDeprecatedPropertyCalls(
      cfg.modResults.contents
    );
    return cfg;
  });

  // android/gradle.properties — Kotlin versions and KSP overrides
  config = withGradleProperties(config, (cfg) => {
    // Convert existing property list to text, ensure all overrides, and re-parse
    const props = cfg.modResults;
    const existingMap = new Map();
    for (const item of props) {
      if (item.type === 'property') {
        existingMap.set(item.key, item);
      }
    }
    const overrides = [
      ['android.kotlinVersion', '2.2.21'],
      ['kotlinVersion', '2.2.21'],
      ['AsyncStorage_kotlinVersion', '2.2.21'],
      ['AsyncStorage_next_kspVersion', KSP_VERSION],
    ];
    for (const [key, val] of overrides) {
      const existing = existingMap.get(key);
      if (existing) {
        existing.value = val;
      } else {
        props.push({ type: 'property', key, value: val });
      }
    }
    return cfg;
  });

  return config;
}

module.exports = withGradleCompat;
