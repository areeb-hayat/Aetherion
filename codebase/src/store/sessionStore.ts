/**
 * ============================================================================
 *  AETHERION — SESSION / GAME-FLOW STORE  (the front-of-house state machine)
 * ============================================================================
 *  Drives which SCREEN the app shows (main menu → new-game setup → playing),
 *  which nation the player commands, the campaign rules they chose, and a
 *  rolling snapshot of the simulation clock/treasury.
 *
 *  This slice is PERSISTED to localStorage (zustand `persist`). That is what
 *  makes a browser refresh non-destructive: the engine seeds the tick worker
 *  from `sim` on boot and the router lands you straight back in your campaign
 *  (paused), so unsaved progress is never lost. Named "Load Game" save slots
 *  are a separate, later concern — this is the implicit continue.
 *
 *  Transient fields (setup preview state) are excluded from persistence via
 *  `partialize` so they never leak between sessions.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SimSpeed } from '@/types';
import { SIM } from '@/config/gameConfig';
import { startingTreasuryFor } from '@/sim/nationLedger';

export type Screen = 'menu' | 'setup' | 'playing';

/** ONE doctrine (user decision 2026-07-04): broad player oversight with the
 *  busywork automated — no Streamlined/Standard/Grognard split. The remaining
 *  options are flavour toggles, not micromanagement tiers. */
export interface GameOptions {
  fogOfWar: boolean;
  ironman: boolean;
}

export const DEFAULT_OPTIONS: GameOptions = {
  fogOfWar: true,
  ironman: false,
};

export interface PersistedSim {
  gameHours: number;
  treasury: number;
  speed: SimSpeed;
}

const freshSim = (): PersistedSim => ({
  gameHours: 0,
  treasury: SIM.startingTreasury,
  speed: 1,
});

/**
 * Transient, in-memory flag: was the transition INTO 'playing' triggered by a
 * user action (Begin / Continue) this page load, versus restored from storage
 * on a reload? A reload restore has no action, so the engine resumes paused —
 * the player sees their campaign intact before time starts moving again. Robust
 * against persist's hydration timing (unlike inspecting the initial screen).
 */
let userInitiatedPlay = false;
export const consumeUserInitiatedPlay = (): boolean => {
  const v = userInitiatedPlay;
  userInitiatedPlay = false;
  return v;
};

interface SessionState {
  screen: Screen;
  playerNation: string | null;
  options: GameOptions;
  startedISO: string | null; // real-world time the campaign began
  lastPlayedISO: string | null;
  sim: PersistedSim; // rolling autosave of the clock/treasury for resume-on-reload

  /* -- transient (not persisted) ------------------------------------------ */
  setupNationId: string | null; // the nation being reviewed on the setup screen
  setupHoverNationId: string | null; // nation under the cursor (for the setup label)

  /* -- navigation --------------------------------------------------------- */
  goMenu: () => void;
  goSetup: () => void;
  continueCampaign: () => void;
  quitToMenu: () => void;

  /* -- setup screen ------------------------------------------------------- */
  setSetupNation: (id: string | null) => void;
  setSetupHover: (id: string | null) => void;
  setOptions: (patch: Partial<GameOptions>) => void;
  beginCampaign: (nationId: string, options: GameOptions) => void;

  /* -- autosave ----------------------------------------------------------- */
  saveSim: (sim: PersistedSim) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      screen: 'menu',
      playerNation: null,
      options: DEFAULT_OPTIONS,
      startedISO: null,
      lastPlayedISO: null,
      sim: freshSim(),

      setupNationId: null,
      setupHoverNationId: null,

      goMenu: () => set({ screen: 'menu' }),
      goSetup: () => set({ screen: 'setup', setupNationId: null, setupHoverNationId: null }),
      continueCampaign: () =>
        set((s) => {
          if (!s.playerNation) return {};
          userInitiatedPlay = true;
          return { screen: 'playing' };
        }),
      quitToMenu: () => set({ screen: 'menu' }),

      setSetupNation: (id) => set({ setupNationId: id }),
      setSetupHover: (id) => set((s) => (s.setupHoverNationId === id ? s : { setupHoverNationId: id })),
      setOptions: (patch) => set((s) => ({ options: { ...s.options, ...patch } })),

      beginCampaign: (nationId, options) => {
        userInitiatedPlay = true;
        // Seed a realistic per-nation starting treasury (spendable reserves)
        // from the economy model — no two nations begin with the same war chest.
        const treasury = startingTreasuryFor(nationId) ?? SIM.startingTreasury;
        set({
          screen: 'playing',
          playerNation: nationId,
          options,
          startedISO: new Date().toISOString(),
          lastPlayedISO: new Date().toISOString(),
          sim: { gameHours: 0, treasury, speed: 1 },
          setupNationId: null,
          setupHoverNationId: null,
        });
      },

      saveSim: (sim) => set({ sim, lastPlayedISO: new Date().toISOString() }),
    }),
    {
      name: 'aetherion.session.v1',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persisted) => {
        // v1 → v2: the complexity doctrine collapsed into the single mode.
        const s = persisted as { options?: GameOptions & { complexity?: string } };
        if (s?.options && 'complexity' in s.options) delete s.options.complexity;
        return persisted as SessionState;
      },
      // Persist only durable campaign state — never the transient setup preview.
      partialize: (s) => ({
        screen: s.screen,
        playerNation: s.playerNation,
        options: s.options,
        startedISO: s.startedISO,
        lastPlayedISO: s.lastPlayedISO,
        sim: s.sim,
      }),
    },
  ),
);

/** True when a resumable campaign exists (drives the menu's "Continue"). */
export const hasCampaign = (s: Pick<SessionState, 'playerNation' | 'startedISO'>) =>
  !!s.playerNation && !!s.startedISO;
