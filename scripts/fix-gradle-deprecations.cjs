#!/usr/bin/env node
/**
 * fix-gradle-deprecations.cjs
 *
 * Removes the Gradle 9 deprecation warnings that `./gradlew assembleRelease`
 * prints for this project (they become hard errors in Gradle 10):
 *
 *   1. "Properties should be assigned using the 'propName = value' syntax."
 *      Setting a property via the Gradle-generated 'propName value' or
 *      'propName(value)' syntax in Groovy DSL has been deprecated.
 *      → Rewrites property calls (`buildConfig true`, `prefab true`, `compose ...`,
 *        `ndkVersion "x"`, `ndkPath "..."`, `namespace "y"`, `signingConfig ...`,
 *        `shrinkResources ...`, `crunchPngs ...`, `useLegacyPackaging ...`,
 *        `ignoreAssetsPattern ...`, `canBePublished ...`, `versionCode ...`,
 *        `versionName ...`, `abortOnError ...`, `testInstrumentationRunner ...`, etc.)
 *        to the `= value` form across android/ and node_modules/.
 *
 *   2. `maven { url '...' }` → `maven { url = '...' }` (same deprecation).
 *
 *   3. Upgrades the Kotlin Gradle Plugin to 2.2.21 (via rootProject.ext.kotlinVersion
 *      in `android/build.gradle` and properties in `android/gradle.properties`,
 *      including explicit overrides for @react-native-async-storage/async-storage)
 *      and pins AGP 8.13.2 explicitly across any classpath format — the versions
 *      that no longer emit the Kotlin/AGP-internal deprecations
 *      ("Declaring a Usage attribute with a legacy value",
 *      "Declaring dependencies using multi-string notation").
 *
 * The script is idempotent and never throws: it patches whatever it finds
 * (an existing `android/` folder, node_modules package build files) and
 * reports what it changed. It is wired to run automatically after
 * `npm install` (see `postinstall` in package.json).
 *
 * Usage:
 *   node scripts/fix-gradle-deprecations.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const tag = '[fix-gradle-deprecations]';

// Property names whose Gradle-generated Groovy accessor (`propName value`)
// is deprecated in Gradle 9. Assignment form (`propName = value`) is always valid.
const DSL_PROPS = [
  'namespace',
  'canBePublished',
  'ignoreAssetsPattern',
  'useLegacyPackaging',
  'crunchPngs',
  'shrinkResources',
  'ndkVersion',
  'ndkPath',
  'signingConfig',
  'buildConfig',
  'prefab',
  'compose',
  'multiDexEnabled',
  'versionCode',
  'versionName',
  'applicationId',
  'testInstrumentationRunner',
  'debuggable',
  'minifyEnabled',
  'javaMaxHeapSize',
  'abortOnError',
  'checkReleaseBuilds',
  'sourceCompatibility',
  'targetCompatibility',
  'resourceConfigurations',
];

const AGP_VERSION = '8.13.2';
const KOTLIN_VERSION = '2.2.21';
// KSP dropped the 1.0.x release numbering when Kotlin 2.2 shipped: for Kotlin
// 2.2.x the published artifacts are `2.2.x-2.0.y` (e.g. `2.2.21-2.0.4` and
// `2.2.21-2.0.5`). `2.2.21-1.0.29` was never published, so declaring it fails
// with "Could not find com.google.devtools.ksp:symbol-processing-gradle-plugin".
const KSP_VERSION = '2.2.21-2.0.5';

function log(...args) {
  console.log(tag, ...args);
}

/**
 * Rewrite `propName 'value'` / `propName "value"` / `propName expr`
 * (method-call form, deprecated) into `propName = expr` for the known
 * property names above. Only touches lines that are NOT already assigned.
 */
function rewriteDeprecatedPropertyCalls(text) {
  // Matches e.g. `  buildConfig true` or `    ndkVersion rootProject.ext.ndkVersion`
  // but NOT `  buildConfig = true` (already assigned) and NOT
  // `  namespace('...')`-style calls with parens (those are method calls and
  // are outside the scope of this deprecation).
  const propNames = DSL_PROPS.join('|');
  const re = new RegExp(
    '^(\\s*)(' + propNames + ')\\s+([^=\\s][^\\r\\n]*)$',
    'gm'
  );
  return text.replace(re, (match, indent, prop, value) => {
    // Never turn a nested configuration block into an assignment:
    //   `compose {`  must NOT become  `compose = {`
    // (`compose`, `signingConfig`, `prefab` etc. can legitimately open a block).
    if (value.trimStart().startsWith('{')) return match;
    return `${indent}${prop} = ${value}`;
  });
}

/**
 * Rewrite the deprecated `url <value>` method-call form inside `maven { ... }`
 * blocks into the assignment form `url = <value>`.
 *
 * Handles both layouts that occur in the wild:
 *
 *   maven { url 'https://www.jitpack.io' }          // single line
 *
 *   maven {                                          // multi-line, often with
 *       // a comment line in between                 // an intervening comment
 *       url "${project.ext.resolveModulePath("react-native")}/android"
 *   }
 *
 * The multi-line layout is what `@react-native-async-storage/async-storage`
 * (android/build.gradle:98) and `react-native-svg` (…:134) use, and it is the
 * exact line the Gradle 9 warning points at. An earlier version of this
 * function only matched the single-line layout, so those two warnings survived
 * every `npm run fix:gradle` run.
 *
 * Only `url` lines that are genuinely inside a `maven {` block are rewritten,
 * so an unrelated `url` property elsewhere is left alone. Lines already using
 * `url =` are untouched (idempotent).
 */
function rewriteMavenUrl(text) {
  const lines = text.split('\n');
  // Depth of nested braces measured from the `maven {` that opened the block;
  // null means "not currently inside a maven block".
  let depth = null;

  const countBraces = (line) => {
    // Strip line comments and string literals so braces inside them don't skew
    // the depth count (e.g. `url "${...}/android"` contains `{` and `}`).
    const cleaned = line
      .replace(/\/\/.*$/, '')
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''");
    let delta = 0;
    for (const ch of cleaned) {
      if (ch === '{') delta++;
      else if (ch === '}') delta--;
    }
    return delta;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (depth === null) {
      if (/(^|[^\w.])maven\s*\{/.test(line)) {
        depth = countBraces(line);
        // Single-line form: `maven { url '...' }` — rewrite in place.
        lines[i] = line.replace(/(\burl\s+)(?!=)(?=['"$])/, '$1= ');
        if (depth <= 0) depth = null;
      }
      continue;
    }

    // Inside a maven block: rewrite a bare `url <value>` line.
    lines[i] = line.replace(/^(\s*url\s+)(?!=)(?=['"$])/, '$1= ');
    depth += countBraces(lines[i]);
    if (depth <= 0) depth = null;
  }

  return lines.join('\n');
}

/**
 * Replace any AGP classpath declaration in root android/build.gradle with explicit AGP_VERSION.
 * Supports classpath("com.android.tools.build:gradle"), classpath '...', existing version numbers, etc.
 */
function ensureAgpVersion(text) {
  const re = /classpath\s*\(\s*['"]com\.android\.tools\.build:gradle(?::[0-9.]+)?['"]\s*\)|classpath\s+['"]com\.android\.tools\.build:gradle(?::[0-9.]+)?['"]/g;
  return text.replace(re, `classpath('com.android.tools.build:gradle:${AGP_VERSION}')`);
}

/**
 * Ensure kotlinVersion and kspVersion are defined inside buildscript.ext of android/build.gradle
 * so that packages checking rootProject.ext.kotlinVersion (e.g. @react-native-async-storage/async-storage,
 * expo-modules-core) use KOTLIN_VERSION instead of falling back to legacy versions (1.9.24 / 2.0.21 / 2.1.20)
 * that emit "Declaring a Usage attribute with a legacy value has been deprecated".
 */
function ensureKotlinVersionInBuildscript(text) {
  // Always re-check kspVersion too: an already-patched file may have
  // kotlinVersion = 2.2.21 but a stale/invalid kspVersion (e.g. the
  // never-published "2.2.21-1.0.29"), which must still be corrected.
  const hasKotlinVersion = /kotlinVersion\s*=\s*['"][0-9.]+['"]/.test(text) ||
    /kotlinVersion\s*=\s*[0-9.]+/.test(text);
  const hasKspVersion = /kspVersion\s*=\s*['"][0-9.-]+['"]/.test(text);

  if (hasKotlinVersion) {
    let s = text
      .replace(/kotlinVersion\s*=\s*['"][0-9.]+['"]/g, `kotlinVersion = "${KOTLIN_VERSION}"`)
      .replace(/kotlinVersion\s*=\s*[0-9.]+/g, `kotlinVersion = "${KOTLIN_VERSION}"`);
    if (hasKspVersion) {
      s = s.replace(
        /kspVersion\s*=\s*['"][0-9.-]+['"]/g,
        `kspVersion = "${KSP_VERSION}"`
      );
    } else {
      // kotlinVersion present but kspVersion missing — insert it right after.
      s = s.replace(
        /(kotlinVersion\s*=\s*"[^"]*")/,
        `$1\n    kspVersion = "${KSP_VERSION}"`
      );
    }
    return s;
  }
  // Prefer extending the buildscript's existing `ext { ... }` block rather than
  // emitting a second one. Two ext blocks are legal Groovy and behave
  // identically, but a single merged block keeps the generated file readable.
  const extInBuildscript = /(buildscript\s*\{[\s\S]*?\n(\s*)ext\s*\{)/.exec(text);
  if (extInBuildscript) {
    const indent = extInBuildscript[2] + '    ';
    return text.replace(
      extInBuildscript[1],
      `${extInBuildscript[1]}\n${indent}kotlinVersion = "${KOTLIN_VERSION}"\n${indent}kspVersion = "${KSP_VERSION}"`
    );
  }
  if (/buildscript\s*\{/.test(text)) {
    return text.replace(
      /buildscript\s*\{/,
      `buildscript {\n  ext {\n    kotlinVersion = "${KOTLIN_VERSION}"\n    kspVersion = "${KSP_VERSION}"\n  }`
    );
  }
  return text;
}

/**
 * Ensure android/gradle.properties has Kotlin version overrides for Expo and rootProject/libraries
 * so that no module falls back to older KGP/KSP versions.
 */
function ensureGradleProperties(text) {
  let updated = text;
  const propsToAdd = [
    ['android.kotlinVersion', KOTLIN_VERSION],
    ['kotlinVersion', KOTLIN_VERSION],
    ['AsyncStorage_kotlinVersion', KOTLIN_VERSION],
    ['AsyncStorage_next_kspVersion', KSP_VERSION],
  ];
  for (const [key, val] of propsToAdd) {
    const re = new RegExp(`^${key}\\s*=.*$`, 'm');
    if (re.test(updated)) {
      updated = updated.replace(re, `${key}=${val}`);
    } else {
      if (!updated.endsWith('\n') && updated.length > 0) updated += '\n';
      updated += `${key}=${val}\n`;
    }
  }
  return updated;
}

function patchTextFile(relPath, transform, what) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) {
    return false;
  }
  try {
    const original = fs.readFileSync(abs, 'utf8');
    const updated = transform(original);
    if (updated === original) {
      return false;
    }
    fs.writeFileSync(abs, updated, 'utf8');
    log(`patched ${relPath} (${what})`);
    return true;
  } catch (err) {
    log(`WARN: could not patch ${relPath}: ${err.message}`);
    return false;
  }
}

let changed = 0;

function patchGradleFile(relPath) {
  const ok = patchTextFile(
    relPath,
    (t) => rewriteDeprecatedPropertyCalls(t),
    'propName = value syntax'
  );
  if (ok) changed++;
}

/**
 * Patch every android build.gradle under node_modules that still uses the
 * deprecated Groovy method-call form for the known DSL properties
 * (Expo modules, RN community modules, etc.).
 */
function patchNodeModules() {
  const nm = path.join(ROOT, 'node_modules');
  if (!fs.existsSync(nm)) {
    return;
  }
  const candidates = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === '.cache' || entry.name === '.bin') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Recurse everywhere (including nested node_modules, where hoisting
        // can place a second copy of a native module).
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.gradle')) {
        // Every *.gradle file counts, not just `android/build.gradle`:
        // Expo ships shared script plugins such as
        // `expo-modules-core/android/ExpoModulesCorePlugin.gradle` (which has
        // a deprecated `abortOnError false` on line 73) that are applied into
        // every Expo module's build and emit warnings of their own.
        candidates.push(full);
      }
    }
  };
  walk(nm);

  const propRegex = new RegExp('^\\s*(?:' + DSL_PROPS.join('|') + ')\\s+[^=]', 'gm');
  // `maven { url ... }` also needs fixing inside node_modules — previously this
  // ran only against the app's own android/ folder, which is why
  // @react-native-async-storage/async-storage:98 kept warning.
  const transform = (t) => rewriteMavenUrl(rewriteDeprecatedPropertyCalls(t));

  for (const bg of candidates) {
    const rel = path.relative(ROOT, bg).split(path.sep).join('/');
    let text;
    try {
      text = fs.readFileSync(bg, 'utf8');
    } catch {
      continue;
    }
    const after = transform(text);
    if (after !== text) {
      const propCount = (text.match(propRegex) || []).length;
      const urlCount =
        (text.match(/^\s*url\s+(?!=)['"$]/gm) || []).length +
        (text.match(/maven\s*\{\s*url\s+(?!=)['"$]/g) || []).length;
      const parts = [];
      if (propCount) parts.push(`${propCount} deprecated property call(s)`);
      if (urlCount) parts.push(`${urlCount} maven url assignment(s)`);
      patchTextFile(rel, transform, parts.join(', ') || 'deprecated syntax');
      changed++;
    }
  }
}

function patchAndroidFolder() {
  // android/build.gradle — `maven { url ... }`, explicit AGP classpath, and buildscript.ext.kotlinVersion
  const okProject = patchTextFile(
    'android/build.gradle',
    (t) => {
      let s = rewriteMavenUrl(t);
      s = ensureAgpVersion(s);
      s = ensureKotlinVersionInBuildscript(s);
      return s;
    },
    'maven url assignment, AGP version, buildscript.ext.kotlinVersion'
  );
  if (okProject) changed++;

  // android/app/build.gradle — deprecated property calls
  const okApp = patchTextFile(
    'android/app/build.gradle',
    (t) => rewriteDeprecatedPropertyCalls(t),
    'propName = value syntax'
  );
  if (okApp) changed++;

  // android/gradle.properties — Kotlin and KSP override properties
  const okProps = patchTextFile(
    'android/gradle.properties',
    (t) => ensureGradleProperties(t),
    `Kotlin and KSP override properties (${KOTLIN_VERSION})`
  );
  if (okProps) changed++;
}

function main() {
  log('scanning for Gradle 9 deprecations...');
  patchAndroidFolder();
  patchNodeModules();
  if (changed === 0) {
    log('nothing to do — project already clean.');
  } else {
    log(`done — ${changed} file(s) patched.`);
  }
}

if (require.main === module) {
  main();
}

// Shared with plugins/withGradleCompat.js (runs during `expo prebuild`).
module.exports = {
  rewriteDeprecatedPropertyCalls,
  rewriteMavenUrl,
  ensureAgpVersion,
  ensureKotlinVersionInBuildscript,
  ensureGradleProperties,
  AGP_VERSION,
  KOTLIN_VERSION,
  KSP_VERSION,
  DSL_PROPS,
};
