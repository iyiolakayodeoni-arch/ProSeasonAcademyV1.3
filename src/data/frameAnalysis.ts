// ─────────────────────────────────────────────────────────────
// FRAME ANALYSIS — pure, dependency-free, fully unit-testable.
//
// This is the brain of the Match Watcher. It receives low-res
// grayscale frames captured from the screen while a match plays
// and counts goals WITHOUT any OCR, cloud service, or paid AI:
//
//   The scorebug (top-left in FC 26/27 Console / screen capture, but the ROIs are
//   configurable) is a tiny strip of pixels. When a goal lands,
//   one digit box changes. We diff each digit box against a
//   reference snapshot; when the change is big and SUSTAINED
//   across several frames (to survive camera pans, replays and
//   brightness flicker), we count a goal on that side.
//
// Everything here is plain TypeScript operating on GrayFrame
// buffers, so it runs identically on-device and under `node`
// in tests with synthetic frames.
// ─────────────────────────────────────────────────────────────

export interface GrayFrame {
  w: number;
  h: number;
  data: Uint8Array; // 1 byte/pixel luminance, row-major, length = w*h
}

/** region of interest in fractional screen coordinates (0..1) */
export interface Roi {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WatcherEvent {
  type: 'goal-left' | 'goal-right';
  at: number; // ms timestamp supplied by the caller
  scoreL: number;
  scoreR: number;
}

export interface ScoreTrackerOpts {
  roiLeft?: Roi;   // left score digit box
  roiRight?: Roi;  // right score digit box
  changeThreshold?: number; // fraction of ROI pixels that must differ (default 0.28)
  pixelThreshold?: number;  // per-pixel luminance delta to count as "changed" (default 48)
  confirmTicks?: number;    // consecutive changed frames required to count a goal (default 3)
  settleTicks?: number;     // stable frames required before adopting a new reference (default 4)
  cooldownMs?: number;      // min time between counted goals (default 20000)
  adaptRate?: number;       // 0..1 slow drift blend rate when ROI is stable (default 0.08)
}

// Default ROIs: FC 26/27-style scorebug, left digit + right digit.
// These are fractional so they survive resolution changes; the coach
// can recalibrate later without touching this file's logic.
export const DEFAULT_ROI_LEFT: Roi = { x: 0.028, y: 0.022, w: 0.036, h: 0.052 };
export const DEFAULT_ROI_RIGHT: Roi = { x: 0.104, y: 0.022, w: 0.036, h: 0.052 };

function roiBounds(frame: GrayFrame, roi: Roi) {
  const x0 = Math.max(0, Math.floor(roi.x * frame.w));
  const y0 = Math.max(0, Math.floor(roi.y * frame.h));
  const x1 = Math.min(frame.w, Math.ceil((roi.x + roi.w) * frame.w));
  const y1 = Math.min(frame.h, Math.ceil((roi.y + roi.h) * frame.h));
  return { x0, y0, x1, y1 };
}

/** extract a region as a flat number array (row-major) */
export function sampleRegion(frame: GrayFrame, roi: Roi): number[] {
  const { x0, y0, x1, y1 } = roiBounds(frame, roi);
  const out: number[] = [];
  for (let y = y0; y < y1; y++) {
    const row = y * frame.w;
    for (let x = x0; x < x1; x++) out.push(frame.data[row + x]);
  }
  return out;
}

/** fraction of positions whose luminance differs by more than `px` */
export function changedFraction(a: ArrayLike<number>, b: ArrayLike<number>, px: number): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let diff = 0;
  for (let i = 0; i < n; i++) {
    if (Math.abs(a[i] - b[i]) > px) diff++;
  }
  return diff / n;
}

interface SideState {
  ref: number[] | null;      // adopted reference snapshot
  prev: number[] | null;     // last frame's snapshot (for settle detection)
  pending: number[] | null;  // candidate new reference while change is sustained
  changedStreak: number;     // consecutive frames with big diff vs ref
  stableStreak: number;      // consecutive frames with small diff vs prev
}

export class ScoreTracker {
  private roiL: Roi;
  private roiR: Roi;
  private changePx: number;
  private changeFrac: number;
  private confirmTicks: number;
  private settleTicks: number;
  private cooldownMs: number;
  private adaptRate: number;
  private L: SideState = this.blank();
  private R: SideState = this.blank();
  // the FC scorebug goal-flash can perturb BOTH digit boxes at once,
  // so the cooldown is global (a real brace can't land < 20s apart
  // anyway — kickoff + replay alone takes longer)
  private lastGoalAt = 0;
  public scoreL = 0;
  public scoreR = 0;

  constructor(opts: ScoreTrackerOpts = {}) {
    this.roiL = opts.roiLeft ?? DEFAULT_ROI_LEFT;
    this.roiR = opts.roiRight ?? DEFAULT_ROI_RIGHT;
    this.changePx = opts.pixelThreshold ?? 48;
    this.changeFrac = opts.changeThreshold ?? 0.28;
    this.confirmTicks = opts.confirmTicks ?? 3;
    this.settleTicks = opts.settleTicks ?? 4;
    this.cooldownMs = opts.cooldownMs ?? 20000;
    this.adaptRate = opts.adaptRate ?? 0.08;
  }

  private blank(): SideState {
    return { ref: null, prev: null, pending: null, changedStreak: 0, stableStreak: 0 };
  }

  reset() {
    this.L = this.blank();
    this.R = this.blank();
    this.lastGoalAt = 0;
    this.scoreL = 0;
    this.scoreR = 0;
  }

  /** feed one frame; returns goal events detected on THIS frame */
  ingest(frame: GrayFrame, now: number): WatcherEvent[] {
    const events: WatcherEvent[] = [];
    const left = this.trackSide(this.L, sampleRegion(frame, this.roiL), now);
    const right = this.trackSide(this.R, sampleRegion(frame, this.roiR), now);
    if (left) {
      this.scoreL++;
      events.push({ type: 'goal-left', at: now, scoreL: this.scoreL, scoreR: this.scoreR });
    }
    if (right) {
      this.scoreR++;
      events.push({ type: 'goal-right', at: now, scoreL: this.scoreL, scoreR: this.scoreR });
    }
    return events;
  }

  /** core per-side state machine; returns true exactly once per goal */
  private trackSide(s: SideState, snap: number[], now: number): boolean {
    if (!s.ref) {
      s.ref = snap.slice();
      s.prev = snap.slice();
      return false;
    }

    const diffVsRef = changedFraction(snap, s.ref, this.changePx);
    const diffVsPrev = s.prev ? changedFraction(snap, s.prev, this.changePx) : 0;

    if (diffVsRef >= this.changeFrac) {
      // something big changed (digit flipped / flash / replay overlay)
      s.changedStreak++;
      s.stableStreak = 0;
      if (!s.pending) s.pending = snap.slice();

      const cooledDown = now - this.lastGoalAt >= this.cooldownMs;
      if (s.changedStreak >= this.confirmTicks && cooledDown) {
        // sustained change = new digit. Count it and adopt.
        s.ref = snap.slice();
        s.pending = null;
        s.changedStreak = 0;
        this.lastGoalAt = now;
        s.prev = snap.slice();
        return true;
      }
      // inside the cooldown: hold the streak. If the box is still
      // changed once the cooldown expires it will fire then (a real
      // goal); a mere celebration flash will have reverted by then
      // and reset itself in the stable branch below.
    } else {
      s.changedStreak = 0;
      if (diffVsPrev < 0.05) {
        // frame-to-frame stable: slowly blend the reference toward the
        // current pixels so lighting drift never trips the detector,
        // and adopt a pending post-goal snapshot once it settles.
        s.stableStreak++;
        if (s.pending && s.stableStreak >= this.settleTicks) {
          s.ref = this.blend(s.ref, s.pending, 0.6);
          s.pending = null;
        } else if (this.adaptRate > 0) {
          s.ref = this.blend(s.ref, snap, this.adaptRate);
        }
      } else {
        s.stableStreak = 0;
      }
    }

    s.prev = snap.slice();
    return false;
  }

  private blend(oldRef: number[], snap: number[], rate: number): number[] {
    const n = Math.min(oldRef.length, snap.length);
    const out = new Array<number>(n);
    for (let i = 0; i < n; i++) out[i] = oldRef[i] * (1 - rate) + snap[i] * rate;
    return out;
  }
}
