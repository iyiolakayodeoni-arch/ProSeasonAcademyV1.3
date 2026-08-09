// Ambient type shims for expo-* native modules that we alias via Metro to
// our own web shims at bundle time. tsc doesn't see Metro's resolver, so
// declare them as any-typed modules here to satisfy the compiler.
declare module 'expo-audio';
declare module 'expo-notifications';
declare module 'expo-image-picker';
declare module 'expo-file-system';
declare module 'expo-system-ui';
declare module 'expo-keep-awake';
