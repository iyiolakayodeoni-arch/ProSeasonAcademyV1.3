// Regression tests for scripts/fix-gradle-deprecations.cjs
//
// These lock in the three gaps that let Gradle 9 warnings survive every
// `npm run fix:gradle` run and kept showing up in `./gradlew assembleRelease`:
//
//   1. `maven { url "..." }` written across MULTIPLE lines (the layout used by
//      @react-native-async-storage/async-storage android/build.gradle:98 —
//      the exact line the reported warning pointed at — and react-native-svg:134).
//      The old regex only matched the single-line `maven { url '...' }` form.
//   2. Shared Expo script plugins such as
//      expo-modules-core/android/ExpoModulesCorePlugin.gradle (`abortOnError false`)
//      were never scanned, because discovery only looked at `android/build.gradle`.
//   3. `rewriteMavenUrl` was never applied to node_modules at all — only to the
//      app's own android/ folder.
//
// Run: npm test
const assert = require('node:assert/strict');
const {
  rewriteMavenUrl,
  rewriteDeprecatedPropertyCalls,
  ensureAgpVersion,
  ensureKotlinVersionInBuildscript,
  KSP_VERSION,
} = require('../scripts/fix-gradle-deprecations.cjs');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}\n        ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('gradle deprecation fixer');

// ── 1. the exact reported warning: async-storage android/build.gradle:98 ──
test('rewrites multi-line maven url (async-storage:98 layout)', () => {
  const input = [
    'repositories {',
    '    maven {',
    '        // All of React Native is installed from npm',
    '        url "${project.ext.resolveModulePath("react-native")}/android"',
    '    }',
    '    google()',
    '}',
  ].join('\n');
  const out = rewriteMavenUrl(input);
  assert.match(out, /url = "\$\{project\.ext\.resolveModulePath\("react-native"\)\}\/android"/);
});

test('rewrites multi-line maven url (react-native-svg:134 layout)', () => {
  const input = 'repositories {\n    maven {\n        url "$rootDir/../node_modules/react-native/android"\n    }\n}';
  assert.match(rewriteMavenUrl(input), /url = "\$rootDir/);
});

test('rewrites single-line maven url', () => {
  assert.equal(
    rewriteMavenUrl("maven { url 'https://www.jitpack.io' }"),
    "maven { url = 'https://www.jitpack.io' }"
  );
});

test('maven url rewrite is idempotent', () => {
  const once = rewriteMavenUrl('maven {\n    url "a/b"\n}');
  assert.equal(rewriteMavenUrl(once), once);
  assert.ok(!once.includes('url = = '));
});

test('leaves a url outside any maven block alone', () => {
  const input = 'somethingElse {\n    url "https://example.com"\n}';
  assert.equal(rewriteMavenUrl(input), input);
});

test('handles several maven blocks in one file', () => {
  const input = [
    'maven {',
    '    url "first/path"',
    '}',
    'google()',
    'maven {',
    '    url "second/path"',
    '}',
  ].join('\n');
  const out = rewriteMavenUrl(input);
  assert.match(out, /url = "first\/path"/);
  assert.match(out, /url = "second\/path"/);
});

test('braces inside an interpolated string do not break block tracking', () => {
  // `${...}` contains braces; if they were counted the block would close early
  // and a following url line would be missed.
  const input = [
    'maven {',
    '    url "${foo.bar("x")}/android"',
    '}',
    'maven {',
    '    url "plain/path"',
    '}',
  ].join('\n');
  const out = rewriteMavenUrl(input);
  assert.match(out, /url = "\$\{foo\.bar\("x"\)\}\/android"/);
  assert.match(out, /url = "plain\/path"/);
});

// ── 2. property call rewriting ──
test('rewrites buildConfig / prefab / abortOnError to assignment form', () => {
  assert.equal(rewriteDeprecatedPropertyCalls('    buildConfig true'), '    buildConfig = true');
  assert.equal(rewriteDeprecatedPropertyCalls('    prefab true'), '    prefab = true');
  assert.equal(rewriteDeprecatedPropertyCalls('      abortOnError false'), '      abortOnError = false');
  assert.equal(
    rewriteDeprecatedPropertyCalls('    namespace "com.horcrux.svg"'),
    '    namespace = "com.horcrux.svg"'
  );
});

test('does NOT convert a config block into an assignment', () => {
  // `compose { ... }` / `signingConfig { ... }` open blocks — turning these
  // into `compose = {` would produce a broken build file.
  for (const line of ['    compose {', '    signingConfig {', '    prefab {']) {
    assert.equal(rewriteDeprecatedPropertyCalls(line), line);
  }
});

test('property rewriting is idempotent', () => {
  const once = rewriteDeprecatedPropertyCalls('    buildConfig true');
  assert.equal(rewriteDeprecatedPropertyCalls(once), once);
});

test('leaves already-assigned properties untouched', () => {
  const input = '    buildConfig = true';
  assert.equal(rewriteDeprecatedPropertyCalls(input), input);
});

// ── 3. version pinning ──
test('pins AGP across every classpath syntax form', () => {
  const forms = [
    "classpath('com.android.tools.build:gradle')",
    'classpath("com.android.tools.build:gradle:8.12.0")',
    "classpath 'com.android.tools.build:gradle:8.12.0'",
    'classpath "com.android.tools.build:gradle"',
  ];
  for (const f of forms) {
    assert.match(ensureAgpVersion(f), /com\.android\.tools\.build:gradle:8\.13\.2/, `form: ${f}`);
  }
});

test('injects kotlinVersion and a valid kspVersion into buildscript', () => {
  const out = ensureKotlinVersionInBuildscript('buildscript {\n  repositories {}\n}');
  assert.match(out, /kotlinVersion = "2\.2\.21"/);
  assert.match(out, new RegExp(`kspVersion = "${KSP_VERSION.replace(/\./g, '\\.')}"`));
});

test('corrects a stale never-published KSP version', () => {
  // 2.2.21-1.0.29 was never published to Maven Central and hard-fails the build.
  const out = ensureKotlinVersionInBuildscript(
    'buildscript {\n  ext {\n    kotlinVersion = "2.2.21"\n    kspVersion = "2.2.21-1.0.29"\n  }\n}'
  );
  assert.ok(!out.includes('2.2.21-1.0.29'), 'stale KSP version should be replaced');
  assert.match(out, new RegExp(KSP_VERSION.replace(/\./g, '\\.')));
});

console.log(`\n${passed} passed${process.exitCode ? ' — WITH FAILURES' : ''}`);
