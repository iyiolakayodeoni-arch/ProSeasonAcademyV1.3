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
  AGP_VERSION,
  KOTLIN_VERSION,
} = require('../scripts/fix-gradle-deprecations.cjs');

function withGradleCompat(config) {
  // android/build.gradle — `maven { url = ... }` + explicit AGP classpath
  config = withProjectBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    contents = rewriteMavenUrl(contents);
    if (contents.includes("classpath('com.android.tools.build:gradle')")) {
      contents = contents.replace(
        "classpath('com.android.tools.build:gradle')",
        `classpath('com.android.tools.build:gradle:${AGP_VERSION}')`
      );
    }
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

  // android/gradle.properties — Kotlin override (Expo-supported)
  config = withGradleProperties(config, (cfg) => {
    const props = cfg.modResults;
    const existing = props.find((p) => p.key === 'android.kotlinVersion');
    if (existing) {
      existing.value = KOTLIN_VERSION;
    } else {
      props.push({
        type: 'comment',
        value:
          ' Kotlin 2.2.x: removes Gradle 9 deprecation warnings emitted by KGP 2.1.x (see GRADLE9_DEPRECATIONS.md)',
      });
      props.push({ type: 'property', key: 'android.kotlinVersion', value: KOTLIN_VERSION });
    }
    return cfg;
  });

  return config;
}

module.exports = withGradleCompat;
