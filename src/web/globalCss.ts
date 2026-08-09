// Premium Global Web CSS — ProSeason Academy
// A money-is-on-the-line surface: glass, grain, fluid type, motion.
// Exported as a string so Metro needs no CSS loader.

export const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&family=JetBrains+Mono:wght@700;800&display=swap');

:root {
  --psa-bg: #050a06;
  --psa-bg-elevated: #0a130d;
  --psa-bg-surface: #0c140e;
  --psa-bg-surface-2: #101d14;
  --psa-bg-card: rgba(15, 26, 19, 0.88);
  --psa-bg-glass: rgba(12, 20, 14, 0.72);
  --psa-bg-deep: #040805;
  --psa-ink: #eef2ec;
  --psa-ink-muted: #8fb89b;
  --psa-ink-dim: #6b8a75;
  --psa-primary: #39ff6a;
  --psa-primary-strong: #2be05a;
  --psa-primary-glow: rgba(57, 255, 106, 0.22);
  --psa-acid: #c6ff3c;
  --psa-accent: #f2c078;
  --psa-accent-soft: rgba(242, 192, 120, 0.14);
  --psa-warn: #ffb648;
  --psa-loss: #ff4d5e;
  --psa-border: rgba(57, 255, 106, 0.16);
  --psa-border-strong: rgba(57, 255, 106, 0.28);
  --psa-border-subtle: rgba(143, 184, 155, 0.14);
  --psa-border-accent: rgba(242, 192, 120, 0.32);
  --psa-glow: 0 0 24px rgba(57, 255, 106, 0.22);
  --psa-glow-soft: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(57,255,106,0.10);
  --psa-radius-lg: 20px;
  --psa-radius-md: 16px;
  --psa-radius-sm: 12px;
  --psa-blur: 16px;
  --psa-header-h: 64px;
  --psa-max-w: 1380px;
  --psa-ease: cubic-bezier(0.16, 1, 0.3, 1);
  --psa-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
}

*, *::before, *::after { box-sizing: border-box; }

html {
  scroll-behavior: smooth;
  -webkit-text-size-adjust: 100%;
  scrollbar-gutter: stable;
}

html, body, #root {
  width: 100%;
  margin: 0;
  padding: 0;
  background-color: var(--psa-bg);
  color: var(--psa-ink);
  font-family: 'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  -webkit-tap-highlight-color: transparent;
}

body {
  min-height: 100vh;
  min-height: 100dvh;
  overflow-x: hidden;
  background:
    radial-gradient(1200px 800px at 85% -12%, rgba(57, 255, 106, 0.09), transparent 62%),
    radial-gradient(900px 700px at -8% 108%, rgba(242, 192, 120, 0.07), transparent 60%),
    radial-gradient(700px 500px at 50% 0%, rgba(57, 255, 106, 0.04), transparent 70%),
    linear-gradient(180deg, #050a06 0%, #070c08 100%);
  background-attachment: fixed;
  position: relative;
}

/* Subtle film grain — premium texture without cost */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  mix-blend-mode: soft-light;
}

#root {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-height: 100vh;
  isolation: isolate;
}

/* ── Shell ── */
.psa-web-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  background: transparent;
}

.psa-web-container {
  width: 100%;
  max-width: var(--psa-max-w);
  margin: 0 auto;
  padding: 0 16px;
}

@media (min-width: 768px) {
  .psa-web-container { padding: 0 28px; }
}
@media (min-width: 1200px) {
  .psa-web-container { padding: 0 36px; }
}

/* ── Premium header (sticky glass) ── */
.psa-web-header-root {
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(16px) saturate(1.2);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
}

/* ── Cards: glass morphism base ── */
.psa-glass {
  background: var(--psa-bg-glass);
  backdrop-filter: blur(var(--psa-blur)) saturate(1.15);
  -webkit-backdrop-filter: blur(var(--psa-blur)) saturate(1.15);
  border: 1px solid var(--psa-border-subtle);
  box-shadow: var(--psa-glow-soft);
}

/* ── Hover lift — desktop only ── */
@media (hover: hover) and (pointer: fine) {
  .psa-hover-lift {
    transition: transform 280ms var(--psa-ease), box-shadow 280ms var(--psa-ease), border-color 280ms var(--psa-ease), background 280ms var(--psa-ease);
  }
  .psa-hover-lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(57,255,106,0.18), 0 0 24px rgba(57,255,106,0.12);
    border-color: rgba(57,255,106,0.22) !important;
  }
  .psa-hover-lift:active { transform: translateY(0px) scale(0.99); }
}

/* ── Shimmer skeleton ── */
@keyframes psa-shimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
.psa-shimmer {
  background: linear-gradient(90deg, rgba(15,26,19,0.6) 25%, rgba(57,255,106,0.08) 37%, rgba(15,26,19,0.6) 63%);
  background-size: 800px 100%;
  animation: psa-shimmer 1.6s infinite linear;
}

/* ── Entrance — premium stagger ── */
@keyframes psa-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes psa-in-scale {
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.psa-enter { animation: psa-in 520ms var(--psa-ease) both; }
.psa-enter-scale { animation: psa-in-scale 560ms var(--psa-ease) both; }

/* ── Pulse dot ── */
@keyframes psa-pulse {
  0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(57,255,106,0.5); }
  50% { opacity: 0.9; transform: scale(0.96); box-shadow: 0 0 0 6px rgba(57,255,106,0); }
}
.psa-pulse-dot { animation: psa-pulse 1.8s ease-in-out infinite; }

/* ── Scrollbar — premium thin ── */
@media (hover: hover) and (pointer: fine) {
  *::-webkit-scrollbar { width: 8px; height: 8px; }
  *::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-radius: 999px; }
  *::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, rgba(57,255,106,0.32), rgba(57,255,106,0.18));
    border-radius: 999px;
    border: 1px solid rgba(57,255,106,0.15);
  }
  *::-webkit-scrollbar-thumb:hover { background: rgba(57,255,106,0.45); }
  * { scrollbar-width: thin; scrollbar-color: rgba(57,255,106,0.28) rgba(0,0,0,0.2); }
}

/* ── Focus — accessible + premium ── */
*:focus-visible {
  outline: 2px solid var(--psa-primary) !important;
  outline-offset: 2px !important;
  border-radius: 6px;
}

/* ── Selection ── */
::selection { background: rgba(57, 255, 106, 0.32); color: #040805; }

/* ── Reduce motion ── */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
  body::before { display: none; }
}

/* ── Utility ── */
.psa-sr-only {
  position: absolute !important;
  width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}

/* ── Premium gradient border helper ── */
.psa-gradient-border {
  position: relative;
}
.psa-gradient-border::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, rgba(57,255,106,0.5), rgba(242,192,120,0.35), rgba(57,255,106,0.25));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
  pointer-events: none;
  opacity: 0.9;
}

/* ── Premium CTA shimmer sweep ── */
@keyframes psa-sweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
.psa-cta-sweep {
  position: relative;
  overflow: hidden;
}
.psa-cta-sweep::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%);
  transform: translateX(-100%);
  animation: psa-sweep 3.2s ease-in-out infinite;
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .psa-cta-sweep::after { display: none; }
}
`;
export default GLOBAL_CSS;
