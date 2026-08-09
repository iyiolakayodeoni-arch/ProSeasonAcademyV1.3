// Global web CSS for ProSeason Academy's premier responsive Web App.
// Exported as a plain string so Metro doesn't need a CSS loader plugin.
export const GLOBAL_CSS = `
:root {
  --psa-bg: #070c08;
  --psa-bg-surface: #0c140e;
  --psa-bg-surface2: #121e15;
  --psa-bg-card: rgba(15, 26, 19, 0.88);
  --psa-bg-deep: #040805;
  --psa-ink: #eaf5ec;
  --psa-ink-muted: #8fb89b;
  --psa-primary: #39ff6a;
  --psa-acid: #c6ff3c;
  --psa-accent: #f2c078;
  --psa-warn: #ffb648;
  --psa-loss: #ff4d5e;
  --psa-border: rgba(57, 255, 106, 0.22);
  --psa-border-accent: rgba(242, 192, 120, 0.4);
  --psa-border-subtle: rgba(143, 184, 155, 0.16);
  --psa-glow: 0 0 24px rgba(57, 255, 106, 0.25);
  --psa-glow-accent: 0 0 24px rgba(242, 192, 120, 0.25);
}

*, *::before, *::after {
  box-sizing: border-box;
}

html, body, #root {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
  background-color: var(--psa-bg);
  background-image:
    radial-gradient(1200px 900px at 85% -10%, rgba(57, 255, 106, 0.08), transparent 65%),
    radial-gradient(1000px 800px at -10% 110%, rgba(242, 192, 120, 0.06), transparent 60%),
    radial-gradient(800px 600px at 50% 50%, rgba(10, 25, 16, 0.5), transparent 70%);
  background-attachment: fixed;
  color: var(--psa-ink);
  font-family: 'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  -webkit-tap-highlight-color: transparent;
}

body {
  min-height: 100vh;
  min-height: 100dvh;
  overflow-x: hidden;
}

#root {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  min-height: 100vh;
}

/* Full Web App Layout Containers */
.psa-web-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  background: transparent;
}

.psa-web-container {
  width: 100%;
  max-width: 1380px;
  margin: 0 auto;
  padding: 0 20px;
}

@media (min-width: 768px) {
  .psa-web-container {
    padding: 0 28px;
  }
}

@media (min-width: 1200px) {
  .psa-web-container {
    padding: 0 36px;
  }
}

/* Scrollbar polish */
@media (hover: hover) and (pointer: fine) {
  *::-webkit-scrollbar { width: 8px; height: 8px; }
  *::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); }
  *::-webkit-scrollbar-thumb {
    background: rgba(57, 255, 106, 0.2);
    border-radius: 999px;
  }
  *::-webkit-scrollbar-thumb:hover {
    background: rgba(57, 255, 106, 0.4);
  }
  * {
    scrollbar-width: thin;
    scrollbar-color: rgba(57, 255, 106, 0.2) rgba(0, 0, 0, 0.2);
  }
}

/* Focus styles */
*:focus-visible {
  outline: 2px solid var(--psa-primary) !important;
  outline-offset: 2px !important;
  border-radius: 6px;
}
button:focus-visible,
a:focus-visible,
[role='button']:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 2px solid var(--psa-primary) !important;
  outline-offset: 2px !important;
}

::selection {
  background: rgba(57, 255, 106, 0.35);
  color: #040805;
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
