// Premium Global Web CSS — ProSeason Academy
// A money-is-on-the-line surface: glass, grain, fluid type, motion.
// Exported as a string so Metro needs no CSS loader.

export const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&family=JetBrains+Mono:wght@700;800&family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap');

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
  scroll-padding-top: 84px;
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
  /* device-tier scale set by ResponsiveFrame (1 = phone/tablet/laptop,
     1.08 desktop monitors, 1.35 TVs) */
  zoom: var(--psa-zoom, 1);
}

/* When the frame is enlarged, its CSS box must shrink by the same factor
   so the rendered result lands exactly on the physical viewport — the
   shell's min-height otherwise paints taller than a TV screen. */
html[data-psa-tier='tv'] #root,
html[data-psa-tier='tv'] .psa-web-shell {
  width: calc(100% / 1.35);
  height: calc(100vh / 1.35);
  min-height: calc(100vh / 1.35);
}
html[data-psa-tier='desktop'] #root,
html[data-psa-tier='desktop'] .psa-web-shell {
  width: calc(100% / 1.08);
  height: calc(100vh / 1.08);
  min-height: calc(100vh / 1.08);
}

/* ── Shell ──
   The shell must carry a DEFINITE height (not just min-height): every
   screen scrolls inside its own ScrollView, so the frame is exactly one
   viewport tall and the chains below it (webAppRoot → app root → absolute
   fill → bounded ScrollViews) resolve. With min-height alone, intrinsic
   sizing lets the landing's full content height win and the page clips
   with no scrollbar. */
.psa-web-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 100vh;
  width: 100%;
  overflow: hidden;
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
  /* PWA / notched phones: keep the chrome out of the status-bar area */
  padding-top: env(safe-area-inset-top, 0px);
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
/* TV remotes & touchpads drive focus with arrows — make the ring thicker
   so the current target reads from 3 metres away. */
@media (pointer: coarse) {
  *:focus-visible {
    outline-width: 3px !important;
    outline-offset: 3px !important;
  }
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

/* ── Pointer honesty ── anything pressable must look pressable. */
button,
a,
summary,
[role='button'],
[role='tab'],
[role='link'],
[role='menuitem'],
[onclick] {
  cursor: pointer;
}

input, textarea, select { caret-color: var(--psa-primary); }
input::placeholder, textarea::placeholder {
  transition: opacity 160ms var(--psa-ease-out);
}
input:focus::placeholder, textarea:focus::placeholder { opacity: 0.55; }

/* Dark-theme autofill — the browser's yellow flash makes a dark UI look
   broken in one keystroke. */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
textarea:-webkit-autofill {
  -webkit-box-shadow: 0 0 0 1000px #0f1a13 inset;
  -webkit-text-fill-color: var(--psa-ink);
  caret-color: var(--psa-primary);
  transition: background-color 999999s ease-in-out 0s;
}

/* ── Glass chrome utilities used from components ── */
.psa-tabbar-root {
  padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px)) !important;
}
.psa-modal-backdrop {
  backdrop-filter: blur(9px) saturate(0.9);
  -webkit-backdrop-filter: blur(9px) saturate(0.9);
}

/* ── Sheen sweep (gradient CTAs) — one slow pass, then rest. */
@keyframes psa-sheen {
  0%        { transform: translateX(-130%) skewX(-18deg); }
  55%, 100% { transform: translateX(260%) skewX(-18deg); }
}
.psa-sheen {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 46%;
  pointer-events: none;
  background: linear-gradient(
    100deg,
    transparent 8%,
    rgba(255, 255, 255, 0.34) 50%,
    transparent 92%
  );
  animation: psa-sheen 3.4s var(--psa-ease) 1.1s infinite;
}

/* Live heartbeat dot */
.psa-live-dot { animation: psa-pulse 2.1s ease-in-out infinite; }

/* ════════════════════════════════════════════════════════════════════════
   ONLIVERSITY — ESPORTS MOTION SYSTEM (landing dossier)
   The manifesto layer: aurora drift, rising particles, arena grid,
   hud conic borders, glass cards, hover shimmer. Constant but subtle.
   ════════════════════════════════════════════════════════════════════════ */

/* ── The website's scroll body (web). A plain DOM scroll region with a
   definite flex height — the page scrolls like a website, independent of
   RNW ScrollView flex resolution. ── */
.psa-site-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

/* ── Document-level scroll mode for the marketing page. While the landing
   is mounted, the whole frame unwinds to natural document flow and the
   BODY scrolls (overriding Expo's reset overflow:hidden) — the most
   browser-native scroll there is, immune to flex-height resolution
   quirks — and the nav bar sticks to the top like a real website header.
   Removed again when the member app mounts. ── */
html.psa-page-landing body {
  overflow-y: auto !important;
  overflow-x: hidden !important;
}
html.psa-page-landing #root {
  height: auto;
  min-height: 100vh;
}
html.psa-page-landing .psa-web-shell {
  height: auto;
  min-height: 100vh;
  overflow: visible;
}
html.psa-page-landing .psa-site-scroll {
  overflow: visible;
}
/* The app route mounts inside an absolute "fill" (for the splash
   crossfade). In document scroll mode it must join the flow, otherwise
   the page collapses to zero height. */
html.psa-page-landing .psa-app-fill {
  position: relative !important;
  top: auto !important;
  bottom: auto !important;
  left: auto !important;
  right: auto !important;
  height: auto !important;
}
/* While the splash plays, the document behind it must not move. */
html.psa-splash-lock body {
  overflow: hidden !important;
}

/* The splash must always cover exactly the viewport, even while the
   landing page underneath is thousands of px tall. */
.psa-splash-fill {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  z-index: 9995;
}
html.psa-page-landing .psa-site-nav {
  position: sticky;
  top: 0;
  z-index: 60;
}

/* ── Scroll reveals (blueprint fade-up) ── */
.fade-up {
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.75s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-up.visible {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .psa-site-scroll { scroll-behavior: auto; }
  .fade-up { opacity: 1 !important; transform: none !important; transition: none; }
}

/* ── arena grid floor, slowly drifting ── */
.onl-arena-grid {
  position: absolute;
  inset: 0;
  opacity: 0.5;
  background-image:
    linear-gradient(rgba(57, 255, 106, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(57, 255, 106, 0.05) 1px, transparent 1px);
  background-size: 44px 44px;
  animation: onl-grid 16s linear infinite;
  -webkit-mask-image: radial-gradient(ellipse 90% 70% at 50% 40%, #000 30%, transparent 100%);
  mask-image: radial-gradient(ellipse 90% 70% at 50% 40%, #000 30%, transparent 100%);
}
@keyframes onl-grid {
  from { background-position: 0 0, 0 0; }
  to   { background-position: 0 44px, 44px 0; }
}

/* ── aurora orbs — three slow hearts that never stop ── */
.onl-aurora { position: absolute; border-radius: 9999px; filter: blur(120px); }
.onl-aurora-a {
  top: -8rem; left: -6rem; width: 520px; height: 520px;
  background: radial-gradient(circle, rgba(57, 255, 106, 0.16), transparent 70%);
  animation: onl-aurora-a 22s ease-in-out infinite;
}
.onl-aurora-b {
  top: 33%; right: -8rem; width: 560px; height: 560px;
  background: radial-gradient(circle, rgba(160, 107, 255, 0.13), transparent 70%);
  animation: onl-aurora-b 28s ease-in-out infinite;
}
.onl-aurora-c {
  bottom: -10rem; left: 25%; width: 480px; height: 480px;
  background: radial-gradient(circle, rgba(33, 230, 193, 0.12), transparent 70%);
  animation: onl-aurora-c 18s ease-in-out infinite;
}
@keyframes onl-aurora-a {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%      { transform: translate(12%, 8%) scale(1.15); }
}
@keyframes onl-aurora-b {
  0%, 100% { transform: translate(0, 0) scale(0.95); }
  50%      { transform: translate(-14%, 10%) scale(1.2); }
}
@keyframes onl-aurora-c {
  0%, 100% { transform: translate(0, 0) scale(1.1); }
  50%      { transform: translate(10%, -12%) scale(0.9); }
}

/* ── rising particles ── */
.onl-particle {
  position: absolute;
  bottom: -4%;
  border-radius: 9999px;
  box-shadow: 0 0 8px currentColor;
  opacity: var(--p-op, 0.4);
  animation: onl-rise linear infinite;
}
@keyframes onl-rise {
  0%   { transform: translateY(0) translateX(0); opacity: var(--p-op, 0.4); }
  85%  { opacity: var(--p-op, 0.4); }
  100% { transform: translateY(-108vh) translateX(var(--p-x, 0px)); opacity: 0; }
}

/* ── glass card — the principal surface ── */
.onl-glass {
  background: rgba(20, 36, 26, 0.42);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(57, 255, 106, 0.08);
  border-radius: 20px;
  transition:
    background 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
@media (hover: hover) and (pointer: fine) {
  .onl-glass:hover {
    background: rgba(20, 36, 26, 0.6);
    border-color: rgba(57, 255, 106, 0.16);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(57, 255, 106, 0.04);
    transform: translateY(-3px);
  }
}

/* ── hud conic border — spins alive on hover ── */
@property --onl-hud {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
.onl-hud { position: relative; }
.onl-hud::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: conic-gradient(
    from var(--onl-hud),
    transparent 0deg,
    rgba(57, 255, 106, 0.7) 60deg,
    rgba(33, 230, 193, 0.6) 120deg,
    transparent 180deg,
    rgba(160, 107, 255, 0.5) 280deg,
    transparent 360deg
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.4s ease;
  animation: onl-hud-spin 3s linear infinite;
  pointer-events: none;
}
.onl-hud:hover::before { opacity: 0.9; }
@keyframes onl-hud-spin { to { --onl-hud: 360deg; } }

/* ── CTA hover shimmer sweep ── */
.onl-shimmer { position: relative; overflow: hidden; }
.onl-shimmer::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 60%;
  background: linear-gradient(100deg, transparent 10%, rgba(255, 255, 255, 0.4) 50%, transparent 90%);
  transform: translateX(-120%) skewX(-16deg);
  pointer-events: none;
}
@media (hover: hover) and (pointer: fine) {
  .onl-shimmer:hover::after { animation: onl-sweep 0.9s cubic-bezier(0.16, 1, 0.3, 1); }
}
@keyframes onl-sweep { to { transform: translateX(260%) skewX(-16deg); } }

/* ── neon headline shimmer ── */
.onl-neon {
  background: linear-gradient(100deg, #39ff6a 0%, #bafff0 25%, #21e6c1 50%, #39ff6a 75%, #39ff6a 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: onl-neon 6s linear infinite;
}
@keyframes onl-neon { to { background-position: 200% center; } }

/* ── glow divider ── */
.onl-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(57, 255, 106, 0.14), transparent);
}

@media (prefers-reduced-motion: reduce) {
  .onl-arena-grid, .onl-aurora-a, .onl-aurora-b, .onl-aurora-c,
  .onl-particle, .onl-neon, .onl-hud::before { animation: none !important; }
  .onl-particle { display: none; }
}
`;
export default GLOBAL_CSS;
