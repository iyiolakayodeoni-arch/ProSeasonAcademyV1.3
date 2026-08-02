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
 *      → Rewrites `ndkVersion "x"`, `namespace "y"`, `signingConfig ...`,
 *        `shrinkResources ...`, `crunchPngs ...`, `useLegacyPackaging ...`,
 *        `ignoreAssetsPattern ...`, `canBePublished ...` to the `= value` form.
 *
 *   2. `maven { url '...' }` → `maven { url = '...' }` (same deprecation).
 *
 *   3. Upgrades the Kotlin Gradle Plugin to 2.2.21 (Expo-supported override,
 *      `android.kotlinVersion`) and pins AGP 8.13.2 explicitly — the versions
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
// is deprecated. Assignment form (`propName = value`) is always valid.
const DSL_PROPS = [
  'namespace',
  'canBePublished',
  'ignoreAssetsPattern',
  'useLegacyPackaging',
  'crunchPngs',
  'shrinkResources',
  'ndkVersion',
  'signingConfig',
];

function log(...args) {
  console.log(tag, ...args);
}

/**
 * Rewrite `propName 'value'` / `propName "value"` / `propName expr`
 * (method-call form, deprecated) into `propName = expr` for the known
 * property names above. Only touches lines that are NOT already assigned.
 */
function rewriteDeprecatedPropertyCalls(text) {
  // Matches e.g. `  namespace "expo.modules.foo"` or `    ndkVersion rootProject.ext.ndkVersion`
  // but NOT `  namespace = "expo.modules.foo"` (already assigned) and NOT
  // `  namespace('...')`-style calls with parens (those are method calls and
  // are outside the scope of this deprecation).
  const propNames = DSL_PROPS.join('|');
  const re = new RegExp(
    '^(\\s*)(' + propNames + ')\\s+([^=\\s][^\\r\\n]*)$',
    'gm'
  );
  return text.replace(re, '$1$2 = $3');
}

/**
 * Rewrite `maven { url '...' }` / `maven { url "..." }` → `maven { url = '...' }`.
 * Does not touch `url =` (already correct).
 */
function rewriteMavenUrl(text) {
  return text.replace(
    /(maven\s*\{\s*url\s+)(['"])/g,
    '$1= $2'
  );
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
        if (entry.name === 'android') {
          const bg = path.join(full, 'build.gradle');
          if (fs.existsSync(bg)) candidates.push(bg);
        } else if (entry.name !== 'node_modules') {
          walk(full);
        }
      }
    }
  };
  walk(nm);

  for (const bg of candidates) {
    const rel = path.relative(ROOT, bg).split(path.sep).join('/');
    const text = fs.readFileSync(bg, 'utf8');
    const after = rewriteDeprecatedPropertyCalls(text);
    if (after !== text) {
      const count = (text.match(/^\s*(?:namespace|canBePublished|ignoreAssetsPattern|useLegacyPackaging|crunchPngs|shrinkResources|ndkVersion|signingConfig)\s+[^=]/gm) || []).length;
      patchTextFile(rel, (t) => rewriteDeprecatedPropertyCalls(t), `${count} deprecated property call(s)`);
      changed++;
    }
  }
}

/**
 * Pin the Kotlin Gradle Plugin version via the Expo-supported override and
 * make sure AGP is pinned on the buildscript classpath. These two versions
 * no longer emit the Kotlin/AGP-internal Gradle 9 deprecations.
 */
const AGP_VERSION = '8.13.2';
const KOTLIN_VERSION = '2.2.21';

function patchAndroidFolder() {
  // android/build.gradle — `maven { url ... }` + explicit AGP classpath
  patchTextFile(
    'android/build.gradle',
    (t) => {
      let s = rewriteMavenUrl(t);
      if (s.includes("classpath('com.android.tools.build:gradle')")) {
        s = s.replace(
          "classpath('com.android.tools.build:gradle')",
          `classpath('com.android.tools.build:gradle:${AGP_VERSION}')`
        );
      }
      return s;
    },
    'maven url assignment + AGP version'
  );

  // android/app/build.gradle — deprecated property calls
  patchGradleFile('android/app/build.gradle');

  // android/gradle.properties — Kotlin override (Expo-supported)
  const gp = path.join(ROOT, 'android', 'gradle.properties');
  if (fs.existsSync(gp)) {
    let text = fs.readFileSync(gp, 'utf8');
    if (!/^android\.kotlinVersion\s*=/m.test(text)) {
      text +=
        '\n' +
        '# Kotlin 2.2.x: removes Gradle 9 deprecation warnings emitted by KGP 2.1.x\n' +
        `# (see GRADLE9_DEPRECATIONS.md). Expo supports this override; KSP is mapped automatically.\n` +
        `android.kotlinVersion=${KOTLIN_VERSION}\n`;
      fs.writeFileSync(gp, text, 'utf8');
      log('patched android/gradle.properties (android.kotlinVersion=' + KOTLIN_VERSION + ')');
      changed++;
    }
  }
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
  AGP_VERSION,
  KOTLIN_VERSION,
};
