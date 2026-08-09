// Global web CSS for ProSeason Academy's premium responsive shell.
// Exported as a plain string so Metro doesn't need a CSS loader plugin.
// It is authored here as if it were a normal .css file for readability,
// then injected into <head> once by ResponsiveFrame.
export const GLOBAL_CSS = `
:root {
  --psa-bg: #0a0f0a;
  --psa-bg-deep: #05080a;
  --psa-ink: #e9f4e6;
  --psa-acid: #c6ff3c;
  --psa-accent: #6df7b4;
  --psa-warn: #ffb648;
  --psa-blood: #ff4d5e;
  --psa-rail: rgba(255, 255, 255, 0.04);
  --psa-rail-hover: rgba(255, 255, 255, 0.08);
  --psa-ring: rgba(109, 247, 180, 0.55);
  --psa-frame-halo: 0 0 0 1px rgba(198, 255, 60, 0.08),
    0 30px 80px -20px rgba(0, 0, 0, 0.8),
    0 0 120px -40px rgba(109, 247, 180, 0.25);
}

html, body, #root {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
  background:
    radial-gradient(1200px 800px at 80% -10%, rgba(198, 255, 60, 0.08), transparent 60%),
    radial-gradient(900px 700px at -10% 110%, rgba(109, 247, 180, 0.07), transparent 60%),
    var(--psa-bg-deep);
  color: var(--psa-ink);
  font-family: 'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
}
body {
  min-height: 100vh;
  min-height: 100dvh;
  overflow-x: hidden;
}
#root {
  display: flex;
  align-items: stretch;
  justify-content: center;
}

.psa-stage {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  overflow: hidden;
  background:
    radial-gradient(1200px 800px at 80% -10%, rgba(198, 255, 60, 0.08), transparent 60%),
    radial-gradient(900px 700px at -10% 110%, rgba(109, 247, 180, 0.07), transparent 60%),
    var(--psa-bg-deep);
}
.psa-frame {
  position: relative;
  display: flex;
  align-items: stretch;
  justify-content: center;
  box-shadow: var(--psa-frame-halo);
  border-radius: 44px;
  overflow: hidden;
  background: var(--psa-bg);
}
.psa-frame::before {
  content: '';
  position: absolute;
  top: 10px;
  left: 50%;
  width: 88px;
  height: 6px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  z-index: 5;
  pointer-events: none;
}

.psa-stage.psa-stage--handset { padding: 0; }
.psa-stage.psa-stage--handset .psa-frame {
  border-radius: 0;
  box-shadow: none;
  width: 100% !important;
  max-width: 100% !important;
  height: 100dvh !important;
}
.psa-stage.psa-stage--handset .psa-frame::before { display: none; }

.psa-stage.psa-stage--tablet .psa-frame { border-radius: 32px; }
.psa-stage.psa-stage--tablet .psa-frame::before { display: none; }

.psa-stage.psa-stage--tv { padding: 40px; }
.psa-stage.psa-stage--tv .psa-frame { border-radius: 36px; }
.psa-stage.psa-stage--tv .psa-frame::before { display: none; }

.psa-rail {
  position: fixed;
  left: max(env(safe-area-inset-left), 24px);
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 10px;
  background: var(--psa-rail);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 22px;
  z-index: 20;
}
.psa-rail-blip {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  transition: all 200ms ease;
  cursor: pointer;
  border: none;
  padding: 0;
  outline: none;
}
.psa-rail-blip:hover { background: var(--psa-acid); transform: scale(1.2); }
.psa-rail-blip:focus-visible { box-shadow: 0 0 0 3px var(--psa-ring); }
.psa-rail-blip[data-active='true'] {
  background: var(--psa-acid);
  box-shadow: 0 0 12px rgba(198, 255, 60, 0.6);
}

@media (hover: hover) and (pointer: fine) {
  *::-webkit-scrollbar { width: 10px; height: 10px; }
  *::-webkit-scrollbar-track { background: transparent; }
  *::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 999px;
    border: 2px solid transparent;
    background-clip: padding-box;
  }
  *::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.22); background-clip: padding-box; }
  * { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.18) transparent; }
}

*:focus-visible {
  outline: 2px solid var(--psa-ring) !important;
  outline-offset: 2px !important;
  border-radius: 8px;
}
button:focus-visible,
a:focus-visible,
[role='button']:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 2px solid var(--psa-ring) !important;
  outline-offset: 3px !important;
}

@media (min-width: 2400px), (pointer: coarse) and (min-width: 1400px) {
  html { font-size: 20px; }
}

::selection {
  background: rgba(198, 255, 60, 0.35);
  color: #0a0f0a;
}

.psa-stage, .psa-frame, .psa-rail {
  -webkit-user-select: none;
  user-select: none;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}

.psa-sr-only {
  position: absolute !important;
  width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
`;
export default GLOBAL_CSS;
