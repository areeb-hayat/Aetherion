/**
 * One engine instance for the app. Bridges worker snapshots into the sim store
 * and worker events into the notification store. UI calls `setSimSpeed`.
 *
 * It also owns the campaign AUTOSAVE: every snapshot is mirrored into the
 * persisted sessionStore on a throttle, and flushed immediately when the tab is
 * hidden or closed. That is what lets a browser refresh resume the campaign at
 * the exact clock/treasury it left off — the engine is (re)started seeded from
 * `sessionStore.sim`.
 */
import type { SimSpeed } from '@/types';
import { createEngine, type Engine } from './engineClient';
import { useSimStore } from '@/store/simStore';
import { useSessionStore } from '@/store/sessionStore';
import { useNotificationStore } from '@/store/notificationStore';
import { initAiScheduler, aiTick } from '@/sim/aiScheduler';
import { gameDate } from '@/lib/format';

let engine: Engine | null = null;

/** Latest snapshot mirrored from the worker (source for the hide-flush). */
let latest = { gameHours: 0, treasury: 0 };
let lastAutosave = 0;
const AUTOSAVE_MS = 2000;

function flushSave() {
  useSessionStore.getState().saveSim({
    gameHours: latest.gameHours,
    treasury: latest.treasury,
    speed: useSimStore.getState().speed,
  });
}

const onVisibility = () => {
  if (document.visibilityState === 'hidden') flushSave();
};
const onPageHide = () => flushSave();

export interface StartOptions {
  /** Resume paused (used on reload restore so time doesn't run before the player
   *  is oriented); fresh campaigns start at speed 1. */
  paused?: boolean;
}

export function startEngine(opts: StartOptions = {}): Engine {
  if (engine) return engine;

  const { sim } = useSessionStore.getState();
  const seed = { gameHours: sim.gameHours, treasury: sim.treasury };
  const startSpeed: SimSpeed = opts.paused ? 0 : 1;
  latest = { ...seed };

  // Seed the UI immediately so the HUD shows the resumed values on first paint.
  useSimStore.getState().setSnapshot(seed.gameHours, seed.treasury);
  useSimStore.getState().setSpeed(startSpeed);
  initAiScheduler(seed.gameHours);

  engine = createEngine(
    {
      onSnapshot: (gameHours, treasury) => {
        latest = { gameHours, treasury };
        useSimStore.getState().setSnapshot(gameHours, treasury);
        // Advance the budgeted world sim (unrest, insurgencies, opinion decay).
        aiTick(gameHours);
        const now = performance.now();
        if (now - lastAutosave >= AUTOSAVE_MS) {
          lastAutosave = now;
          flushSave();
        }
      },
      onMonth: (gameHours) =>
        useNotificationStore.getState().push({
          id: crypto.randomUUID(),
          gameDate: gameDate(gameHours),
          category: 'ECONOMIC',
          severity: 'INFO',
          headline: 'Monthly treasury report filed',
          detail: 'Revenue accrued from tax, tariffs and transit fees.',
        }),
    },
    { seed, speed: startSpeed, netPerHour: pendingRate },
  );

  window.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);
  return engine;
}

export function setSimSpeed(s: SimSpeed) {
  useSimStore.getState().setSpeed(s);
  engine?.setSpeed(s);
  flushSave(); // persist the new speed (and current clock) right away
}

/** Latest treasury drift rate, retained so a (re)start seeds the worker with it
 *  even if recompute ran before the engine existed. */
let pendingRate = 0;

/** Set the treasury drift ($/game-hour) from the player's live net balance. */
export function setNetPerHour(netPerHour: number) {
  pendingRate = netPerHour;
  engine?.setRate(netPerHour);
}

/** Spend (or refund, if negative) treasury as a lump sum — building development,
 *  later buying units/tech. Optimistically mirrors into the UI store so the HUD
 *  updates instantly; the worker's authoritative value syncs on the next poll. */
export function spendTreasury(amount: number) {
  engine?.adjust(-amount);
  const sim = useSimStore.getState();
  const next = sim.treasury - amount;
  sim.setSnapshot(sim.gameHours, next);
  latest = { gameHours: sim.gameHours, treasury: next };
}

export function stopEngine() {
  if (!engine) return;
  flushSave(); // capture the final clock before tearing down
  window.removeEventListener('visibilitychange', onVisibility);
  window.removeEventListener('pagehide', onPageHide);
  engine.dispose();
  engine = null;
}
