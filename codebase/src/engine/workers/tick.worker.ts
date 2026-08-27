/**
 * tick.worker — the simulation clock (TDD Ch.10).
 *
 * Phase 1 runs the master clock and a placeholder treasury model entirely off
 * the render thread. It supports two transports:
 *   • SharedArrayBuffer (preferred): writes clock/treasury into shared memory;
 *     reads speed via Atomics. The main thread reads with no messaging.
 *   • postMessage fallback: posts state snapshots when SAB is unavailable.
 *
 * The architecture (worker-owned simulation, decoupled tiers) is what scales to
 * the full 200-nation engine in later phases without touching the renderer.
 */
import { SIM } from '@/config/gameConfig';
import { makeViews, CTRL, STATE, type SabViews } from '@/engine/worldState';

let views: SabViews | null = null;
let useSab = false;

// Local mirror used by the postMessage transport (and as the source of truth
// for derived events like month rollover).
let speed = 1;
let gameHours = 0;
let treasury: number = SIM.startingTreasury;
let lastMonthIndex = -1;
/** The player nation's net fiscal balance prorated to $/game-hour (revenue −
 *  expenditure ÷ hours per year). Set by the economy store via the engine; the
 *  treasury drifts by this each tick so earnings are the REAL national balance,
 *  not a flat placeholder. Lump-sum spends (building development) arrive as an
 *  `adjust` and are applied to the treasury directly. */
let netPerHour = 0;

function currentSpeed(): number {
  if (useSab && views) return Atomics.load(views.ctrl, CTRL.speed);
  return speed;
}

function step() {
  const s = currentSpeed();
  if (s > 0) {
    const dh = SIM.hoursPerSecond[s as 0 | 1 | 2 | 3] * (SIM.stepMs / 1000);
    gameHours += dh;
    treasury += netPerHour * dh;

    if (useSab && views) {
      views.state[STATE.gameHours] = gameHours;
      views.state[STATE.treasury] = treasury;
    } else {
      (self as DedicatedWorkerGlobalScope).postMessage({
        type: 'state',
        gameHours,
        treasury,
      });
    }

    // Fire a lightweight event on each new in-game month (demonstrates the
    // worker → notification pipeline end-to-end).
    const monthIndex = Math.floor(gameHours / (24 * 30));
    if (monthIndex !== lastMonthIndex) {
      lastMonthIndex = monthIndex;
      if (monthIndex > 0) {
        (self as DedicatedWorkerGlobalScope).postMessage({
          type: 'event',
          gameHours,
        });
      }
    }
  }
}

/** Persist the treasury to shared memory (or post it) outside the tick — used
 *  when a lump-sum spend lands while the clock is paused. */
function commitTreasury() {
  if (useSab && views) {
    views.state[STATE.treasury] = treasury;
  } else {
    (self as DedicatedWorkerGlobalScope).postMessage({ type: 'state', gameHours, treasury });
  }
}

self.onmessage = (e: MessageEvent) => {
  const msg = e.data;
  switch (msg.type) {
    case 'init': {
      // SharedArrayBuffer transport.
      views = makeViews(msg.sab as SharedArrayBuffer);
      useSab = true;
      gameHours = views.state[STATE.gameHours] || 0;
      treasury = views.state[STATE.treasury] || SIM.startingTreasury;
      netPerHour = msg.netPerHour ?? 0;
      views.state[STATE.treasury] = treasury;
      // Anchor the month counter to the resumed clock so seeding a mid-campaign
      // save doesn't immediately fire a "new month" event.
      lastMonthIndex = Math.floor(gameHours / (24 * 30));
      Atomics.store(views.ctrl, CTRL.running, 1);
      setInterval(step, SIM.stepMs);
      break;
    }
    case 'init-nosab': {
      useSab = false;
      speed = msg.speed ?? 1;
      gameHours = msg.gameHours ?? 0;
      treasury = msg.treasury ?? SIM.startingTreasury;
      netPerHour = msg.netPerHour ?? 0;
      lastMonthIndex = Math.floor(gameHours / (24 * 30));
      setInterval(step, SIM.stepMs);
      break;
    }
    case 'speed': {
      speed = msg.value;
      break;
    }
    case 'rate': {
      // New net balance (revenue − expenditure) prorated to $/game-hour.
      netPerHour = msg.value ?? 0;
      break;
    }
    case 'adjust': {
      // Lump-sum treasury change (e.g. a development purchase). Applied and
      // committed immediately so it lands even while the clock is paused.
      treasury += msg.delta ?? 0;
      commitTreasury();
      break;
    }
  }
};
