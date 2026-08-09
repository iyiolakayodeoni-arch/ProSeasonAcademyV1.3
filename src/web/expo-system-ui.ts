// Web shim for expo-system-ui. Applies background color to <body> so browser
// chrome doesn't flash white during load.
let applied = false;
export async function setBackgroundColorAsync(color: string): Promise<void> {
  if (typeof document === 'undefined') return;
  try {
    document.body.style.backgroundColor = color || '#0a0f0a';
  } catch { /* noop */ }
  applied = true;
}
export async function getBackgroundColorAsync(): Promise<string | null> {
  return typeof document !== 'undefined' ? document.body.style.backgroundColor || '#0a0f0a' : '#0a0f0a';
}
