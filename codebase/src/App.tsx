/** Root layout: the globe is always mounted as the living backdrop; overlays
 *  (main menu → new-game setup → in-game HUD) are swapped by the session screen.
 *  The tick engine runs only while playing and is seeded from the persisted
 *  autosave, so a browser refresh drops you back into your campaign (paused). */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FlatMap } from '@/map/FlatMap';
import { TopBar } from '@/features/hud/TopBar';
import { StatecraftPanel } from '@/features/hud/StatecraftPanel';
import { OperationsTray } from '@/features/hud/OperationsTray';
import { EventLogPanel } from '@/features/hud/EventLogPanel';
import { DistrictDetailPanel } from '@/features/district/DistrictDetailPanel';
import { OverlaySelector } from '@/features/overlays/OverlaySelector';
import { MapControls } from '@/features/hud/MapControls';
import { MapTooltip } from '@/features/tooltip/MapTooltip';
import { NotificationLayer } from '@/features/notifications/NotificationLayer';
import { CustomCursor } from '@/features/cursor/CustomCursor';
import { MapFrame } from '@/features/frame/MapFrame';
import { CityLabels } from '@/features/map/CityLabels';
import { MainMenu } from '@/features/menu/MainMenu';
import { NewGameSetup } from '@/features/menu/NewGameSetup';
import { startEngine, stopEngine, setSimSpeed } from '@/engine/engineSingleton';
import { useUIStore } from '@/store/uiStore';
import { useSimStore } from '@/store/simStore';
import { useWorldStore } from '@/store/worldStore';
import { useEconomyStore } from '@/store/economyStore';
import { useSessionStore, consumeUserInitiatedPlay } from '@/store/sessionStore';
import { KEYS } from '@/config/keybindings';

/** Bottom-left system cluster: quit to menu + the event-log toggle. Quitting
 *  flushes the autosave (via stopEngine), so the campaign is resumable. */
function SystemButtons() {
  const quit = useSessionStore((s) => s.quitToMenu);
  const logOpen = useUIStore((s) => s.eventLogOpen);
  const toggleLog = useUIStore((s) => s.toggleEventLog);
  const btn =
    'rounded-sm border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider backdrop-blur-md transition-colors';
  return (
    <div data-hud className="pointer-events-auto absolute bottom-3 left-3 flex gap-1.5">
      <button
        onClick={quit}
        title="Return to main menu (campaign is autosaved)"
        className={`${btn} border-steel/60 bg-navy/80 text-slate hover:border-gold/60 hover:text-gold-light`}
      >
        ☰ Menu
      </button>
      <button
        onClick={toggleLog}
        title="Campaign event log (L)"
        className={`${btn} ${
          logOpen
            ? 'border-gold/60 bg-gold/15 text-gold-light'
            : 'border-steel/60 bg-navy/80 text-slate hover:border-gold/60 hover:text-gold-light'
        }`}
      >
        ▤ Log
      </button>
    </div>
  );
}

export default function App() {
  const screen = useSessionStore((s) => s.screen);
  const playerNation = useSessionStore((s) => s.playerNation);
  const worldLoaded = useWorldStore((s) => s.loaded);
  const [hudVisible, setHudVisible] = useState(true);

  // Engine lifecycle: start only while playing. A user-initiated start (Begin /
  // Continue) runs at speed 1; a reload restore (no user action) resumes paused.
  useEffect(() => {
    if (screen === 'playing' && playerNation) {
      startEngine({ paused: !consumeUserInitiatedPlay() });
    } else {
      stopEngine();
    }
  }, [screen, playerNation]);
  useEffect(() => () => stopEngine(), []);

  // Compute the player's live ledger once the world data is in — it seeds the
  // treasury drift rate (net balance/hour) and every economic HUD readout.
  useEffect(() => {
    if (screen === 'playing' && playerNation && worldLoaded) {
      useEconomyStore.getState().recompute();
    }
  }, [screen, playerNation, worldLoaded]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useSessionStore.getState();
      if (s.screen === 'setup' && e.code === 'Escape') {
        s.goMenu();
        return;
      }
      if (s.screen !== 'playing') return;
      switch (e.code) {
        case KEYS.togglePanels:
          setHudVisible((v) => !v);
          break;
        case KEYS.toggleEventLog:
          useUIStore.getState().toggleEventLog();
          break;
        case KEYS.deselect:
          useUIStore.getState().select(null);
          break;
        case KEYS.pause: {
          e.preventDefault();
          const sp = useSimStore.getState().speed;
          setSimSpeed(sp === 0 ? 1 : 0);
          break;
        }
        case KEYS.speed1:
          setSimSpeed(1);
          break;
        case KEYS.speed2:
          setSimSpeed(2);
          break;
        case KEYS.speed3:
          setSimSpeed(3);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const playing = screen === 'playing';

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-app text-off-white">
      <FlatMap />
      <CityLabels />
      <MapFrame />

      {/* In-game HUD */}
      <AnimatePresence>
        {playing && hudVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute inset-0"
          >
            <SystemButtons />
            {/* top center */}
            <div className="absolute left-1/2 top-3 -translate-x-1/2">
              <TopBar />
            </div>
            {/* left rail: statecraft dashboard + everything in flight */}
            <div className="absolute bottom-14 left-3 top-16 flex flex-col items-start gap-2">
              <StatecraftPanel />
              <OperationsTray />
            </div>
            {/* right */}
            <div className="absolute right-3 top-16">
              <DistrictDetailPanel />
            </div>
            {/* bottom left: rolling campaign history (toggle: L) */}
            <div className="absolute bottom-12 left-3">
              <EventLogPanel />
            </div>
            {/* bottom center */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
              <OverlaySelector />
            </div>
            {/* bottom right: zoom controls + keyboard hints */}
            <div className="absolute bottom-3 right-3">
              <MapControls />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Front-of-house screens */}
      <AnimatePresence>{screen === 'menu' && <MainMenu key="menu" />}</AnimatePresence>
      <AnimatePresence>{screen === 'setup' && <NewGameSetup key="setup" />}</AnimatePresence>

      {playing && (
        <>
          <MapTooltip />
          <NotificationLayer />
        </>
      )}
      <CustomCursor />
    </div>
  );
}
