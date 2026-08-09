// Web shim for expo-notifications. Push registration is a no-op in the browser.
export async function getExpoPushTokenAsync(): Promise<{ data: string }> {
  return { data: 'web' };
}
export async function requestPermissionsAsync(): Promise<{ status: 'granted' | 'denied'; granted: boolean }> {
  if (typeof Notification !== 'undefined') {
    try {
      const p = await Notification.requestPermission();
      return { status: p === 'granted' ? 'granted' : 'denied', granted: p === 'granted' };
    } catch { return { status: 'denied', granted: false }; }
  }
  return { status: 'denied', granted: false };
}
export async function getPermissionsAsync(): Promise<{ status: 'granted' | 'denied'; granted: boolean }> {
  if (typeof Notification === 'undefined') return { status: 'denied', granted: false };
  const g = Notification.permission === 'granted';
  return { status: g ? 'granted' : 'denied', granted: g };
}
export async function scheduleNotificationAsync(): Promise<string> {
  return '';
}
export async function setNotificationHandler(): Promise<void> { /* noop */ }
export function addNotificationReceivedListener() { return { remove: () => {} }; }
export function addNotificationResponseReceivedListener() { return { remove: () => {} }; }
export const AndroidImportance = { DEFAULT: 0, MAX: 0, HIGH: 0, LOW: 0, MIN: 0, NONE: 0, UNKNOWN: 0 };
