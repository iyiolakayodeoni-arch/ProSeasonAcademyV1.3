// Web-safe replacement for expo-file-system. Returns a no-op documentDirectory
// (used by statsScreenOcr.ts to build a temp path for uploaded images) and
// rejects writes gracefully. This keeps the web bundle loading even if code
// paths that reference FileSystem execute; the OCR/upload features naturally
// fall back to client-side tesseract.js or manual entry on web.

const tempDir = '/psa-tmp/';
export const documentDirectory =
  typeof window !== 'undefined' && window.location
    ? `${window.location.origin}${tempDir}`
    : tempDir;
export const cacheDirectory = documentDirectory;
export const bundleDirectory = '/';

export async function readAsStringAsync(_uri: string): Promise<string> {
  throw new Error('readAsStringAsync: not available on web');
}
export async function writeAsStringAsync(_uri: string, _contents: string): Promise<void> {
  /* no-op */
}
export async function deleteAsync(_uri: string | string[], _options?: unknown): Promise<void> {
  /* no-op */
}
export async function getInfoAsync(_uri: string): Promise<{ exists: boolean }> {
  return { exists: false };
}
export async function makeDirectoryAsync(_uri: string, _options?: unknown): Promise<void> {
  /* no-op */
}
export async function copyAsync(_options: unknown): Promise<void> {
  /* no-op */
}
export async function readDirectoryAsync(_uri: string): Promise<string[]> {
  return [];
}
export const FileSystemSessionType = { BACKGROUND: 0, FOREGROUND: 0 };
