// ProSeasonAcademy — design tokens (single source of truth)
//
// EXPANDED for the visual design system (v1). The original `colors` object
// and `monoFont` are untouched — everything already in the app keeps working.
// New layers: semantic roles, motion tokens, glow/elevation presets, and a
// `grade` scale that maps an honest 0..100 receipt value to a colour so a
// readout's colour is *earned*, never painted on. (Principle P1.)

export const colors = {
  bg: '#0a0f0a',
  surface: '#0f1a13',
  surface2: '#132217', // one step lighter — layered cards on top of `surface`
  border: '#1f3826',
  fg: '#eef2ec',
  muted: '#8fb89b',
  primary: '#39FF6A',
  primaryDim: '#1f7a3d',
  accent: '#f2c078',
  warm: '#ffcf7a',
  loss: '#e0605c',
  gridLine: 'rgba(57,255,106,0.045)',
  // ── Console-instrument support — INSPIRED BY, never copied from, FC 26.
  // The nod to the current console game's world comes through TREATMENT
  // (gradient-edged cards, a live transition flash, condensed display type,
  // ranked-ladder structure) — not by adopting its teal/steel palette. So the
  // brand's neon-green + gold stay the hero; steel is used only as a whisper
  // on fine hairlines/gradient edges, and flash is a one-beat live cue.
  steel: '#9fc2cf', // a cool neutral — fine hairlines + one gradient-edge stop
  flash: '#35d7ff', // neon live/transition flash — a moment, never a wash
} as const;

export const monoFont = 'monospace';

// ── Semantic roles. Named for meaning, not hex, so a future re-skin is one
//    edit. They point at the palette above so the whole app stays coherent.
export const role = {
  ok: colors.primary, // evidence met / verified / live
  caution: colors.accent, // the Standard, locked, honest-but-thin
  danger: colors.loss, // missed objective, lapsed, broken thread
  info: '#6fd0c9', // a quiet teal for neutral data (used sparingly)
  // Console-instrument support (inspired, not copied — see colors above):
  steel: colors.steel, // fine hairline / gradient-edge stop
  flash: colors.flash, // the live transition flash
} as const;

// ── TYPE — a shared display-header treatment, grounded in current console
//    football-UI typography (condensed, heavy, uppercase display headers +
//    a quieter data face; docs/FC26_UI_RESEARCH.md §4). Use on major section
//    titles/eyebrows so headers carry the "athletic instrument panel" weight
//    without touching the brand's monospace data readouts.
export const type = {
  display: {
    fontFamily: monoFont,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 3,
  } as const,
  displayTight: {
    fontFamily: monoFont,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
  } as const,
  eyebrow: {
    fontFamily: monoFont,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2.4,
  } as const,
} as const;

// ── Motion. One vocabulary, used by every animated component so the whole
//    product breathes on the same tempo (Principle P5 — quiet, instrument-like).
export const motion = {
  dur: {
    fast: 180, // taps, flips, a check landing
    base: 320, // a card entering, a ring starting to fill
    slow: 620, // a reveal resolving, a sheen crossing
  },
  ease: {
    // a gentle, slightly-overshooting spring is the product's "voice"
    spring: { damping: 18, stiffness: 190, mass: 0.9 },
    settle: { damping: 26, stiffness: 150 },
  },
} as const;

// ── Glow / elevation presets. Replaces the ad-hoc inline shadows scattered
//    across screens with three honest steps: held / live / climax.
export const glow = {
  held: {
    shadowColor: colors.primary,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  live: {
    shadowColor: colors.primary,
    shadowOpacity: 0.42,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  climax: {
    shadowColor: colors.accent,
    shadowOpacity: 0.5,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 0 },
  },
} as const;

// ── The honest grade scale. Give it a 0..100 value (a win %, a composure
//    average, an honesty weight, a fill ratio) and it returns the colour the
//    readout should wear. Aligned to the philosophy: thin/early evidence is
//    SHOWN, never SHAMED — so the low band is a quiet neutral ("not much
//    evidence yet"), amber means "honest but incomplete / getting close",
//    green means "the evidence holds". Red (role.danger) is reserved for
//    explicit failure (a failed scan, a broken thread, caught evasion) and is
//    applied by those surfaces directly — never by this automatic scale.
export function gradeColor(v: number): string {
  const c = Math.max(0, Math.min(100, v));
  if (c >= 75) return colors.primary; // the evidence holds
  if (c >= 40) return colors.warm; // honest but incomplete — getting close
  return '#6b7d72'; // a quiet slate — "thin / not yet", never shaming
}

// ── Surfaces, as opacities, so layered cards read as depth on the one bg.
export const surfaceAlpha = {
  base: 'rgba(12,20,14,0.94)',
  raised: 'rgba(15,26,19,0.82)',
  inset: 'rgba(10,17,12,0.6)',
} as const;
