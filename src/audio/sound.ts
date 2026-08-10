// Audio is intentionally disabled.
//
// Keep the small sound-effect API as a no-op so interaction handlers can stay
// focused on their UI behavior. Audio can be reintroduced behind this module
// later without requiring changes throughout the application.

export type SfxName =
  | 'tap'
  | 'tab'
  | 'toggle'
  | 'pop'
  | 'whoosh'
  | 'whistle'
  | 'success'
  | 'fail'
  | 'like';

/** Audio is disabled; retained as a compatibility no-op for UI handlers. */
export function sfx(_name: SfxName): void {
  // Intentionally silent.
}
