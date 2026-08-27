import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted fonts (no external CDN — works offline in the desktop build).
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
// Display serif (wordmark, panel titles) + cartographic serif (map labels).
import '@fontsource/cinzel/500.css';
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/500.css';
import '@fontsource/eb-garamond/600.css';
import '@fontsource/eb-garamond/500-italic.css';

import './index.css';
import App from './App';
import { injectCssVariables } from '@/config/cssVars';

injectCssVariables();

// DEV-only console handles (same convention as window.__globe): lets tooling
// and debugging sessions drive the stores headlessly.
if (import.meta.env.DEV) {
  // The growth model is the one piece of the economy that compounds silently
  // over decades, so it proves its own invariants on every dev boot rather
  // than waiting for someone to notice a nation quietly became a superpower.
  import('@/sim/growth').then(({ growthSelfCheck }) => {
    (window as unknown as { __growthCheck: () => boolean }).__growthCheck = growthSelfCheck;
    growthSelfCheck();
    console.info('[growth] self-check OK');
  });

  Promise.all([
    import('@/store/sessionStore'),
    import('@/store/diplomacyStore'),
    import('@/store/politicsStore'),
    import('@/store/economyStore'),
    import('@/store/simStore'),
    import('@/store/uiStore'),
    import('@/store/worldStore'),
    import('@/sim/diplomacy'),
    import('@/sim/sovereignty'),
  ]).then(([session, diplo, politics, economy, sim, ui, world, dsim, sov]) => {
    (window as unknown as { __stores: unknown }).__stores = {
      session: session.useSessionStore,
      diplomacy: diplo.useDiplomacyStore,
      politics: politics.usePoliticsStore,
      economy: economy.useEconomyStore,
      simClock: sim.useSimStore,
      ui: ui.useUIStore,
      world: world.useWorldStore,
      sim: { ...dsim, ...sov },
    };
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
