// ─────────────────────────────────────────────────────────────
// TEST-HARNESS AMBIENT — the standalone test compiles run with
// `tsc --ignoreConfig`, which skips the Expo base tsconfig. Expo's
// types normally declare Metro's `require` global (expo/types/
// metro-require.d.ts); without them, modules that use the dynamic
// `require('./cloudSync')` seam (matches.ts) fail with TS2591.
// This restores that one global for the pure-node test compiles.
// ─────────────────────────────────────────────────────────────
declare var require: any;
