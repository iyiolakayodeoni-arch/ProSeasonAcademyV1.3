// ProSeasonAcademy — design tokens (single source of truth)
// PREMIUM EDITION v2 — glass, elevation, radii, typography scale.

export const colors = {
  bg: '#050a06',
  bgElevated: '#0a130d',
  surface: '#0f1a13',
  surface2: '#132217',
  surfaceGlass: 'rgba(12, 20, 14, 0.72)',
  border: '#1f3826',
  borderSubtle: 'rgba(143,184,155,0.14)',
  borderStrong: 'rgba(57,255,106,0.28)',
  fg: '#eef2ec',
  fgDim: '#d6e2d9',
  muted: '#8fb89b',
  mutedDim: '#6b8a75',
  primary: '#39FF6A',
  primaryDim: '#1f7a3d',
  primaryGlow: 'rgba(57,255,106,0.22)',
  accent: '#f2c078',
  warm: '#ffcf7a',
  loss: '#e0605c',
  gridLine: 'rgba(57,255,106,0.045)',
  steel: '#9fc2cf',
  flash: '#35d7ff',
} as const;

export const monoFont = 'JetBrains Mono, ui-monospace, SFMono-Regular, monospace';

export const displayFont = 'Anton_400Regular';
export const bodyFont = 'Barlow_500Medium';
export const bodyFontItalic = 'Barlow_500Medium_Italic';
export const bodyFontStrong = 'Barlow_600SemiBold';
export const bodyFontBold = 'Barlow_700Bold';
export const bodyFontHeavy = 'Barlow_800ExtraBold';

// ── Radii — one language
export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
} as const;

// ── Elevation — premium shadows (web + native)
export const elevation = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  cardHover: {
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  modal: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 },
    elevation: 24,
  },
} as const;

// Legacy glow aliases
export const glow = {
  held: { shadowColor: colors.primary, shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  live: { shadowColor: colors.primary, shadowOpacity: 0.42, shadowRadius: 20, shadowOffset: { width: 0, height: 0 } },
  climax: { shadowColor: colors.accent, shadowOpacity: 0.5, shadowRadius: 26, shadowOffset: { width: 0, height: 0 } },
} as const;

export const role = {
  ok: colors.primary,
  caution: colors.accent,
  danger: colors.loss,
  info: '#6fd0c9',
  steel: colors.steel,
  flash: colors.flash,
} as const;

export const type = {
  display: { fontFamily: displayFont, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 } as const,
  displayTight: { fontFamily: monoFont, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.6 } as const,
  eyebrow: { fontFamily: monoFont, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2.4 } as const,
} as const;

// ── Motion — premium spring vocabulary
export const motion = {
  dur: {
    micro: 140,
    fast: 180,
    base: 320,
    slow: 520,
    cinematic: 780,
  },
  ease: {
    premium: [0.16, 1, 0.3, 1] as const, // expo out — the "luxury" ease
    spring: { damping: 18, stiffness: 190, mass: 0.9 },
    settle: { damping: 26, stiffness: 150 },
    bouncy: { damping: 14, stiffness: 260, mass: 0.8 },
  },
} as const;

export function gradeColor(v: number): string {
  const c = Math.max(0, Math.min(100, v));
  if (c >= 75) return colors.primary;
  if (c >= 40) return colors.warm;
  return '#6b7d72';
}

export const surfaceAlpha = {
  base: 'rgba(12,20,14,0.94)',
  raised: 'rgba(15,26,19,0.82)',
  inset: 'rgba(10,17,12,0.6)',
  glass: 'rgba(12,20,14,0.72)',
  glassStrong: 'rgba(15,26,19,0.88)',
} as const;

// ── Gradients — premium
export const gradients = {
  primary: ['#39ff6a', '#2be05a'] as const,
  accent: ['#f2c078', '#ffb648'] as const,
  cardEdge: ['rgba(57,255,106,0.5)', 'rgba(242,192,120,0.35)', 'rgba(57,255,106,0.25)'] as const,
  shimmer: ['rgba(15,26,19,0.6)', 'rgba(57,255,106,0.08)', 'rgba(15,26,19,0.6)'] as const,
} as const;
