import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

// ─────────────────────────────────────────────────────────────
// SESSION STORE — what the academy remembers about YOU between
// launches: that you signed in, which coach you locked (that
// lock is PERMANENT — the app never offers a way back), whether
// the Baseline Scan gate was cleared, and how you found us.
//
// Without this the app booted to the sign-in screen every cold
// start and made a returning player re-lock a coach and re-sit
// the 5-match baseline interview. Now the door only opens once.
// ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'psa.session.v1';

export interface SessionState {
  /** the player has been through the front door at least once */
  signedIn: boolean;
  /** PERMANENT once set — the coach lock is the app's core promise */
  coachId: string | null;
  /** coach's fictional backstory screen seen */
  introDone: boolean;
  /** the 30-second week orientation seen (between intro and baseline) */
  orientationDone: boolean;
  /** the Starting Week gate cleared → Today unlocked */
  baselineDone: boolean;
  /** "how did you hear" answer, kept for the founder's own numbers */
  referral: string | null;
  /** first successful entry — drives "days in academy" */
  enteredAt: number | null;
}

const EMPTY: SessionState = {
  signedIn: false,
  coachId: null,
  introDone: false,
  orientationDone: false,
  baselineDone: false,
  referral: null,
  enteredAt: null,
};

let state: SessionState = { ...EMPTY };
let hydrated = false;
let hydrating: Promise<void> | null = null;

const listeners = new Set<() => void>();
const getState = () => state;
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
function emit() {
  listeners.forEach((l) => l());
}
function set(next: Partial<SessionState>) {
  state = { ...state, ...next };
  emit();
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
}

/** read the session off the disk exactly once per app run */
export function hydrateSession(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydrating) return hydrating;
  hydrating = AsyncStorage.getItem(STORAGE_KEY)
    .then((raw: string | null) => {
      if (raw) {
        try {
          const s = JSON.parse(raw) as Partial<SessionState>;
          state = {
            signedIn: s.signedIn === true,
            coachId: typeof s.coachId === 'string' ? s.coachId : null,
            introDone: s.introDone === true,
            orientationDone: s.orientationDone === true,
            baselineDone: s.baselineDone === true,
            referral: typeof s.referral === 'string' ? s.referral : null,
            enteredAt: typeof s.enteredAt === 'number' ? s.enteredAt : null,
          };
        } catch {
          state = { ...EMPTY };
        }
      }
      hydrated = true;
      emit();
    })
    .catch(() => {
      hydrated = true;
      emit();
    });
  return hydrating;
}

export const isSessionHydrated = () => hydrated;
export const getSession = (): SessionState => state;

export function markSignedIn() {
  set({ signedIn: true, enteredAt: state.enteredAt ?? Date.now() });
}

/** the lock. Called once, ever — guarded so it cannot be overwritten. */
export function lockCoach(coachId: string) {
  if (state.coachId) return; // permanent by design
  set({ coachId });
}

export const markIntroDone = () => set({ introDone: true });
export const markOrientationDone = () => set({ orientationDone: true });
export const markBaselineDone = () => set({ baselineDone: true });
export const setReferral = (referral: string | null) => set({ referral });

/** sign out = leave the academy floor, keep the ledger + the lock */
export function endSession() {
  set({ signedIn: false });
}

/** DANGER ZONE — delete account: forget everything, including the coach */
export async function wipeSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  state = { ...EMPTY };
  hydrated = true;
  emit();
}

export function useSession(): SessionState & { hydrated: boolean } {
  const s = useSyncExternalStore(subscribe, getState);
  useEffect(() => {
    void hydrateSession();
  }, []);
  return { ...s, hydrated };
}
