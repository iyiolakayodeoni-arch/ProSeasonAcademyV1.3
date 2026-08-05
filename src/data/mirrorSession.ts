import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addMatch, setMatchComposure } from './matches';
import { getThread, settleCarried, swearLesson, ThreadVerdict } from './lessonThread';
import * as backend from './backend';
import { armWatcher, finishWatcher } from './matchWatcher';
import { isValidReflection } from './honestyGuard';

// ─────────────────────────────────────────────────────────────
// THE MIRROR SESSION — the structured match-development session.
//
// MIRROR DIRECTION §6: "The machine records the evidence. The
// player does the seeing." The session walks a fixed order so the
// player's thinking is captured BEFORE the score, the video or a
// convenient memory rewrites it:
//
//   THREAD CHECK → INTENTION → ARMED → LIVE → HALF-TIME →
//   SECOND HALF → FULL-TIME → DIVISION → REVIEW → COMPARE → LESSON
//
// The player answers first, in their own words, at every step.
// The app NEVER writes the player's psychology, never chooses
// their key moments before they try, never writes their lesson.
// It preserves the sequence (intention / live feeling / memory /
// reviewed evidence) and places the versions beside one another
// so the player can see the inconsistencies for themselves.
//
// Automation boundaries (§7): the app may arm screen capture,
// timestamp, store locally and preserve receipts. It must NOT
// draw psychological conclusions or generate lessons.
// ─────────────────────────────────────────────────────────────

export type MirrorPhase =
  | 'idle'
  | 'thread-check' // the carried lesson must be answered: held or broke
  | 'intention'    // pre-match answers, before the score changes the emotions
  | 'armed'        // consent + capture armed, waiting for the match
  | 'live'         // first half running
  | 'half-time'    // half-time checkpoint
  | 'second-half'  // second half running
  | 'score'        // full time reached — log the score to the vault
  | 'full-time'    // score logged, memory captured BEFORE the recording
  | 'division'     // player divides the match into key moments themselves
  | 'review'       // per-moment answers, in the player's own words
  | 'compare'      // the versions beside one another: which is closest to the evidence?
  | 'lesson'       // the one line the player is willing to carry forward
  | 'done';

// ── the question banks (universal, from the product direction) ──

export interface IntentionAnswers {
  practice: string;   // What are you trying to practise today?
  pressure: string;   // What do you usually do when the match becomes difficult?
  avoid: string;      // What behaviour are you trying to avoid?
  useful: string;     // What would make this match useful even if you lose?
  attention: string;  // What will you pay attention to?
  composure: number;  // starting composure 1..5
}

export const INTENTION_QUESTIONS: { key: keyof IntentionAnswers; label: string; hint?: string }[] = [
  { key: 'practice', label: 'WHAT ARE YOU TRYING TO PRACTISE TODAY?', hint: 'one thing. the stage objective or your thread.' },
  { key: 'pressure', label: 'WHAT DO YOU USUALLY DO WHEN THE MATCH BECOMES DIFFICULT?', hint: 'be honest — the standard does not feel the loss and then forget it.' },
  { key: 'avoid', label: 'WHAT BEHAVIOUR ARE YOU TRYING TO AVOID?', hint: 'the one you have written in the journal before.' },
  { key: 'useful', label: 'WHAT WOULD MAKE THIS MATCH USEFUL EVEN IF YOU LOSE?', hint: 'there has to be an answer. write it before the score.' },
  { key: 'attention', label: 'WHAT WILL YOU PAY ATTENTION TO?', hint: 'you cannot watch everything. pick the one thing.' },
];

export interface HalfTimeAnswers {
  refusing: string;  // What is the match asking you to do that you are refusing to do?
  rushing: string;   // Where are you rushing?
  danger: string;    // What has caused the biggest danger so far?
  afterLoss: string; // What do you do immediately after losing the ball?
  following: string; // Are you following your pre-match intention?
  emotion: string;   // What is your emotional state right now?
  secondHalf: string;// What will you deliberately try in the second half?
  composure: number; // half-time composure 1..5
}

export const HALF_TIME_QUESTIONS: { key: keyof HalfTimeAnswers; label: string; hint?: string }[] = [
  { key: 'refusing', label: 'WHAT IS THE MATCH ASKING YOU TO DO THAT YOU ARE CURRENTLY REFUSING TO DO?', hint: 'the match is telling you something. what?' },
  { key: 'rushing', label: 'WHERE ARE YOU RUSHING?', hint: 'point at the minutes, the situations, the touches.' },
  { key: 'danger', label: 'WHAT HAS CAUSED THE BIGGEST DANGER SO FAR?', hint: 'theirs — and yours.' },
  { key: 'afterLoss', label: 'WHAT DO YOU DO IMMEDIATELY AFTER LOSING THE BALL?', hint: 'chase the ball or chase the shape? be exact.' },
  { key: 'following', label: 'ARE YOU FOLLOWING YOUR PRE-MATCH INTENTION?', hint: 'read your own intention above. is that the player in the match?' },
  { key: 'emotion', label: 'WHAT IS YOUR EMOTIONAL STATE RIGHT NOW?', hint: 'name it. the real one.' },
  { key: 'secondHalf', label: 'WHAT WILL YOU DELIBERATELY TRY IN THE SECOND HALF?', hint: 'one thing. small enough to actually do.' },
];

export interface FullTimeAnswers {
  decided: string;    // What do you think decided the match?
  change: string;     // What is the first decision you would change?
  didWell: string;    // What did you do well?
  repeated: string;   // What did you repeat even though it was not working?
  emotions: string;   // Where did your emotions affect your play?
  followed: string;   // Did you follow your intention?
  believe: string;    // What do you currently believe about your performance?
  composure: number;  // final composure 1..5
}

export const FULL_TIME_QUESTIONS: { key: keyof FullTimeAnswers; label: string; hint?: string }[] = [
  { key: 'decided', label: 'WHAT DO YOU THINK DECIDED THE MATCH?', hint: 'your answer before the recording has a vote. so does the recording.' },
  { key: 'change', label: 'WHAT IS THE FIRST DECISION YOU WOULD CHANGE?', hint: 'the first one. not the tenth.' },
  { key: 'didWell', label: 'WHAT DID YOU DO WELL?', hint: 'write it down. receipts are for the good too.' },
  { key: 'repeated', label: 'WHAT DID YOU REPEAT EVEN THOUGH IT WAS NOT WORKING?', hint: 'the pattern you write is the pattern he fixes.' },
  { key: 'emotions', label: 'WHERE DID YOUR EMOTIONS AFFECT YOUR PLAY?', hint: 'the minute it started, not the moment it exploded.' },
  { key: 'followed', label: 'DID YOU FOLLOW YOUR INTENTION?', hint: 'compare with the pre-match card above before you answer.' },
  { key: 'believe', label: 'WHAT DO YOU CURRENTLY BELIEVE ABOUT YOUR PERFORMANCE?', hint: 'this is the memory version. the review comes next.' },
];

/** the review asks per player-chosen key moment (MIRROR DIRECTION §6.7) */
export interface MomentAnswers {
  happened: string;    // What happened?
  trying: string;      // What were you trying to do?
  did: string;         // What did you actually do?
  noticed: string;     // What did you notice before the decision?
  missed: string;      // What did you fail to notice?
  feeling: string;     // What were you feeling?
  differently: string; // What would you do differently?
  evidence: string;    // What evidence supports your answer?
}

export const MOMENT_QUESTIONS: { key: keyof MomentAnswers; label: string }[] = [
  { key: 'happened', label: 'WHAT HAPPENED?' },
  { key: 'trying', label: 'WHAT WERE YOU TRYING TO DO?' },
  { key: 'did', label: 'WHAT DID YOU ACTUALLY DO?' },
  { key: 'noticed', label: 'WHAT DID YOU NOTICE BEFORE THE DECISION?' },
  { key: 'missed', label: 'WHAT DID YOU FAIL TO NOTICE?' },
  { key: 'feeling', label: 'WHAT WERE YOU FEELING?' },
  { key: 'differently', label: 'WHAT WOULD YOU DO DIFFERENTLY?' },
  { key: 'evidence', label: 'WHAT EVIDENCE SUPPORTS YOUR ANSWER?' },
];

export const MOMENT_MIN_ANSWER = 8;

export interface MirrorMoment {
  id: string;
  label: string;         // the player's own name for the moment
  startMin: number;      // player-led timeline division
  endMin: number;
  answers: Partial<MomentAnswers>;
}

export function momentComplete(m: MirrorMoment): boolean {
  return MOMENT_QUESTIONS.every((q) => isValidReflection(m.answers[q.key] ?? '', { minLength: MOMENT_MIN_ANSWER, minWords: 2 }));
}

/** the versions beside one another (MIRROR DIRECTION §6.8) */
export type VersionKey = 'before' | 'half' | 'full' | 'review';

export interface MirrorReceipt {
  sessionId: string;
  stageN: number;
  startedAt: number;
  endedAt: number;
  matchId: string | null;
  gf: number;
  ga: number;
  moments: number;        // key moments the player reviewed
  lesson: string;         // the sworn lesson
  lessonId: string | null;
  closestVersion: VersionKey | null;
  threadVerdict: ThreadVerdict | null;
  recordingPath: string | null; // local MP4 (never uploaded by default)
}

export interface MirrorSessionState {
  phase: MirrorPhase;
  stageN: number;
  startedAt: number | null;
  // thread check — the carried lesson must be answered first
  threadChecked: boolean;
  threadVerdict: ThreadVerdict | null;
  threadNote: string;
  // intention (before the score)
  intention: IntentionAnswers | null;
  // match
  gf: number;
  ga: number;
  half: HalfTimeAnswers | null;
  full: FullTimeAnswers | null;
  matchId: string | null;
  // division + review
  moments: MirrorMoment[];
  // comparison
  closestVersion: VersionKey | null;
  // the lesson
  lesson: string;
  lessonId: string | null;
  endedAt: number | null;
  /** local recording path for this session (null in manual mode) */
  recordingPath: string | null;
  // the record
  receipts: MirrorReceipt[];
}

const KEY_BASE = 'psa.mirror.v1';
let coachKey = 'unset';
const storageKey = () => {
  const me = backend.getMe();
  return me?.id ? `${KEY_BASE}.${me.id}.${coachKey}` : `${KEY_BASE}.${coachKey}`;
};

const EMPTY: MirrorSessionState = {
  phase: 'idle',
  stageN: 1,
  startedAt: null,
  threadChecked: false,
  threadVerdict: null,
  threadNote: '',
  intention: null,
  gf: 0,
  ga: 0,
  half: null,
  full: null,
  matchId: null,
  moments: [],
  closestVersion: null,
  lesson: '',
  lessonId: null,
  endedAt: null,
  recordingPath: null,
  receipts: [],
};

let state: MirrorSessionState = { ...EMPTY, moments: [], receipts: [] };
let hydrated = false;

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
function set(next: Partial<MirrorSessionState>) {
  state = { ...state, ...next };
  emit();
  void AsyncStorage.setItem(storageKey(), JSON.stringify(state)).catch(() => {});
}

function revive(raw: string): MirrorSessionState | null {
  try {
    const s = JSON.parse(raw) as Partial<MirrorSessionState>;
    if (!s || typeof s !== 'object') return null;
    return {
      phase: (s.phase as MirrorPhase) ?? 'idle',
      stageN: typeof s.stageN === 'number' ? s.stageN : 1,
      startedAt: typeof s.startedAt === 'number' ? s.startedAt : null,
      threadChecked: s.threadChecked === true,
      threadVerdict: s.threadVerdict === 'held' || s.threadVerdict === 'broke' ? s.threadVerdict : null,
      threadNote: typeof s.threadNote === 'string' ? s.threadNote : '',
      intention: s.intention && typeof s.intention === 'object' ? (s.intention as IntentionAnswers) : null,
      gf: typeof s.gf === 'number' ? s.gf : 0,
      ga: typeof s.ga === 'number' ? s.ga : 0,
      half: s.half && typeof s.half === 'object' ? (s.half as HalfTimeAnswers) : null,
      full: s.full && typeof s.full === 'object' ? (s.full as FullTimeAnswers) : null,
      matchId: typeof s.matchId === 'string' ? s.matchId : null,
      moments: Array.isArray(s.moments) ? (s.moments as MirrorMoment[]) : [],
      closestVersion: s.closestVersion === 'before' || s.closestVersion === 'half' || s.closestVersion === 'full' || s.closestVersion === 'review' ? s.closestVersion : null,
      lesson: typeof s.lesson === 'string' ? s.lesson : '',
      lessonId: typeof s.lessonId === 'string' ? s.lessonId : null,
      endedAt: typeof s.endedAt === 'number' ? s.endedAt : null,
      recordingPath: typeof s.recordingPath === 'string' ? s.recordingPath : null,
      receipts: Array.isArray(s.receipts) ? (s.receipts as MirrorReceipt[]) : [],
    };
  } catch {
    return null;
  }
}

/** bind the session store to the locked coach + pull its state off the disk */
export async function hydrateMirror(coachId: string): Promise<void> {
  const next = coachId || 'unset';
  if (hydrated && next === coachKey) return;
  coachKey = next;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(storageKey());
    state = raw ? revive(raw) ?? { ...EMPTY, moments: [], receipts: [] } : { ...EMPTY, moments: [], receipts: [] };
  } catch {
    state = { ...EMPTY, moments: [], receipts: [] };
  }
  emit();
}

let seq = 1;
function newId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}`;
}

// ── lifecycle ────────────────────────────────────────────────

/**
 * Begin a Mirror Session for a stage. If the player is carrying a
 * Thread lesson, the first step is answering for it — HELD or
 * BROKE — because a lesson must never be created and immediately
 * forgotten (§6.9).
 */
export function startMirrorSession(stageN: number): void {
  const thread = getThread();
  const carried = thread.entries.find((e) => e.status === 'carried');
  if (carried) {
    set({
      phase: 'thread-check',
      stageN,
      startedAt: Date.now(),
      threadChecked: false,
      threadVerdict: null,
      threadNote: '',
      intention: null,
      gf: 0,
      ga: 0,
      half: null,
      full: null,
      matchId: null,
      moments: [],
      closestVersion: null,
      lesson: '',
      lessonId: null,
      endedAt: null,
      recordingPath: null,
    });
  } else {
    set({
      phase: 'intention',
      stageN,
      startedAt: Date.now(),
      threadChecked: true,
      threadVerdict: null,
      threadNote: '',
      intention: null,
      gf: 0,
      ga: 0,
      half: null,
      full: null,
      matchId: null,
      moments: [],
      closestVersion: null,
      lesson: '',
      lessonId: null,
      endedAt: null,
      recordingPath: null,
    });
  }
}

/** the carried lesson is answered: it held or it broke, in the player's words */
export function answerCarriedLesson(verdict: ThreadVerdict, note: string): void {
  const thread = getThread();
  const carried = thread.entries.find((e) => e.status === 'carried');
  if (carried) settleCarried(carried.id, verdict, note);
  set({ threadChecked: true, threadVerdict: verdict, threadNote: note, phase: 'intention' });
}

export function saveIntention(a: IntentionAnswers): void {
  set({ intention: a });
}

/** ARM THE MIRROR — official MediaProjection consent must be shown by the
 *  OS; recording must never start silently. Fails soft: on devices without
 *  the native watcher the session proceeds in manual mode. */
export async function armMirrorSession(): Promise<boolean> {
  set({ phase: 'armed' });
  const armed = await armWatcher().catch(() => false);
  return armed;
}

/** the match has started — the watcher may detect it; the player confirms it */
export function beginMatch(): void {
  set({ phase: 'live' });
}

export function atHalfTime(): void {
  set({ phase: 'half-time' });
}

export function saveHalfTime(a: HalfTimeAnswers): void {
  set({ half: a, phase: 'second-half' });
}

/** the match has gone to full time — the score is logged next */
export function openScorePhase(): void {
  set({ phase: 'score' });
}

/** full time — the score is logged to the REAL vault first (the receipt),
 *  then the player's memory is captured BEFORE the recording is reviewed. */
export function atFullTime(gf: number, ga: number): string {
  const intention = state.intention;
  const note = `MIRROR SESSION — ${intention?.practice ?? 'focus'}`.slice(0, 60);
  const entry = addMatch(
    {
      gf,
      ga,
      mode: 'RANKED',
      oppStyle: 'HARD TO TELL',
      passAcc: null,
      noSprint: false,
      mechanicsUsed: 0,
      ledAt75: gf > ga ? false : null,
      decisive: null,
      composure: null, // set from the full-time reflection below
      note,
    },
    'scan',
  );
  void finishWatcher().then((sess) => {
    if (sess?.recordingPath) set({ recordingPath: sess.recordingPath });
  }).catch(() => {});
  set({ gf, ga, matchId: entry.id, phase: 'full-time' });
  return entry.id;
}

export function saveFullTime(a: FullTimeAnswers): void {
  // the reflection's final composure is attached to the vault receipt
  if (state.matchId) setMatchComposure(state.matchId, a.composure);
  set({ full: a, phase: 'division' });
}

// ── division + review ────────────────────────────────────────

/** the player divides the match themselves — the app must not do it first (§6.6) */
export function addMoment(label: string, startMin: number, endMin: number): MirrorMoment {
  const m: MirrorMoment = {
    id: newId('MM'),
    label: label.trim().slice(0, 60),
    startMin: Math.max(0, Math.min(45, startMin)),
    endMin: Math.max(startMin, Math.min(45, endMin)),
    answers: {},
  };
  set({ moments: [...state.moments, m] });
  return m;
}

export function removeMoment(id: string): void {
  set({ moments: state.moments.filter((m) => m.id !== id) });
}

export function answerMoment(id: string, key: keyof MomentAnswers, text: string): void {
  set({
    moments: state.moments.map((m) =>
      m.id === id ? { ...m, answers: { ...m.answers, [key]: text } } : m,
    ),
  });
}

export function allMomentsComplete(): boolean {
  return state.moments.length > 0 && state.moments.every(momentComplete);
}

// ── comparison (§6.8) ────────────────────────────────────────

/** the four versions, placed beside one another. The app preserves them;
 *  the player decides which is closest to the evidence. */
export function buildVersions(): { key: VersionKey; label: string; text: string }[] {
  const i = state.intention;
  const h = state.half;
  const f = state.full;
  const reviewed = state.moments
    .map((m) => m.answers.differently)
    .find((d) => d && isValidReflection(d, { minLength: MOMENT_MIN_ANSWER, minWords: 2 }));
  return [
    { key: 'before', label: 'BEFORE THE MATCH', text: i ? i.pressure || i.attention || '—' : '—' },
    { key: 'half', label: 'HALF-TIME', text: h ? h.emotion || h.following || '—' : '—' },
    { key: 'full', label: 'AFTER FULL-TIME', text: f ? f.believe || f.decided || '—' : '—' },
    { key: 'review', label: 'AFTER REVIEW', text: reviewed || '—' },
  ];
}

export function setClosestVersion(key: VersionKey): void {
  set({ closestVersion: key });
}

/** the player's division is done — move into per-moment review */
export function openReviewPhase(): void {
  set({ phase: 'review' });
}

/** the review is done — put the versions beside one another */
export function openComparePhase(): void {
  set({ phase: 'compare' });
}

/** the comparison is done — move into the lesson */
export function openLessonPhase(): void {
  set({ phase: 'lesson' });
}

// ── the lesson ───────────────────────────────────────────────

/**
 * The one line the player is willing to carry into the next match.
 * The app never writes it. It becomes THE THREAD (lessonThread.ts),
 * and the next Mirror Session asks how it held or broke.
 */
export function finishMirrorLesson(lesson: string): MirrorReceipt {
  const text = lesson.trim().slice(0, 140);
  const entry = text ? swearLesson({ stageN: state.stageN, lesson: text, matchId: state.matchId }) : null;
  const receipt: MirrorReceipt = {
    sessionId: newId('MS'),
    stageN: state.stageN,
    startedAt: state.startedAt ?? Date.now(),
    endedAt: Date.now(),
    matchId: state.matchId,
    gf: state.gf,
    ga: state.ga,
    moments: state.moments.length,
    lesson: text,
    lessonId: entry?.id ?? null,
    closestVersion: state.closestVersion,
    threadVerdict: state.threadVerdict,
    recordingPath: state.recordingPath,
  };
  set({
    phase: 'done',
    lesson: text,
    lessonId: receipt.lessonId,
    endedAt: receipt.endedAt,
    receipts: [receipt, ...state.receipts].slice(0, 100),
  });
  return receipt;
}

/** leave the session without swearing a lesson — the match receipt stays.
 *  Any running capture is stopped so a recording is never left dangling. */
export function abandonMirrorSession(): void {
  void finishWatcher().then((sess) => {
    if (sess?.recordingPath) set({ recordingPath: sess.recordingPath });
  }).catch(() => {});
  if (state.phase !== 'done' && state.phase !== 'idle') {
    const receipt: MirrorReceipt = {
      sessionId: newId('MS'),
      stageN: state.stageN,
      startedAt: state.startedAt ?? Date.now(),
      endedAt: Date.now(),
      matchId: state.matchId,
      gf: state.gf,
      ga: state.ga,
      moments: state.moments.length,
      lesson: state.lesson,
      lessonId: state.lessonId,
      closestVersion: state.closestVersion,
      threadVerdict: state.threadVerdict,
      recordingPath: state.recordingPath,
    };
    set({ phase: 'idle', receipts: [receipt, ...state.receipts].slice(0, 100) });
  } else {
    set({ phase: 'idle' });
  }
}

// ── the hook ─────────────────────────────────────────────────

export interface MirrorView extends MirrorSessionState {
  versions: { key: VersionKey; label: string; text: string }[];
  sessionsCompleted: number;
  lessonsSworn: number;
  momentsReviewed: number;
}

export function useMirrorSession(): MirrorView {
  const s = useSyncExternalStore(subscribe, getState);
  return {
    ...s,
    versions: buildVersions(),
    sessionsCompleted: s.receipts.length,
    lessonsSworn: s.receipts.filter((r) => r.lessonId).length,
    momentsReviewed: s.receipts.reduce((sum, r) => sum + r.moments, 0),
  };
}

/** imperative read for non-React code */
export function getMirrorSession(): MirrorSessionState {
  return state;
}

/** convenience for screens that mount before hydration finishes */
export function useMirrorReady(coachId: string): void {
  useEffect(() => {
    void hydrateMirror(coachId);
  }, [coachId]);
}

/** DANGER ZONE — delete account unwinds the mirror record too */
export async function wipeMirror(): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey());
  } catch {
    /* ignore */
  }
  state = { ...EMPTY, moments: [], receipts: [] };
  hydrated = false;
  emit();
}
