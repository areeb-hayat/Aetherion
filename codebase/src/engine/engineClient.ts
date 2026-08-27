/**
 * EngineClient — main-thread interface to the tick worker.
 *
 * Hides the transport detail: SharedArrayBuffer when the page is cross-origin
 * isolated, postMessage otherwise. Callers just get snapshots and set speed.
 */
import type { SimSpeed } from '@/types';
import { SAB_BYTES, makeViews, CTRL, STATE, sabSupported, type SabViews } from '@/engine/worldState';
import { SIM } from '@/config/gameConfig';

export interface EngineCallbacks {
  onSnapshot: (gameHours: number, treasury: number) => void;
  onMonth?: (gameHours: number) => void;
}

export interface Engine {
  setSpeed: (s: SimSpeed) => void;
  /** Set the treasury drift rate ($/game-hour) = net annual balance ÷ year. */
  setRate: (netPerHour: number) => void;
  /** Apply a lump-sum treasury change (e.g. a development purchase). */
  adjust: (delta: number) => void;
  dispose: () => void;
  usingSharedMemory: boolean;
}

/** Optional seed so a resumed campaign continues from its saved clock/treasury
 *  instead of restarting the epoch (see sessionStore autosave). */
export interface EngineOptions {
  seed?: { gameHours: number; treasury: number };
  speed?: SimSpeed;
  netPerHour?: number;
}

const SNAPSHOT_THROTTLE_MS = 100; // UI clock updates ~10x/sec, not every frame

export function createEngine(cb: EngineCallbacks, opts: EngineOptions = {}): Engine {
  const seed = opts.seed ?? { gameHours: 0, treasury: SIM.startingTreasury };
  const startSpeed: SimSpeed = opts.speed ?? 1;
  const netPerHour = opts.netPerHour ?? 0;

  const worker = new Worker(new URL('./workers/tick.worker.ts', import.meta.url), {
    type: 'module',
  });

  const useSab = sabSupported();
  let views: SabViews | null = null;
  let raf = 0;
  let lastEmit = 0;

  worker.onmessage = (e: MessageEvent) => {
    const msg = e.data;
    if (msg.type === 'state' && !useSab) {
      cb.onSnapshot(msg.gameHours, msg.treasury);
    } else if (msg.type === 'event') {
      cb.onMonth?.(msg.gameHours);
    }
  };

  if (useSab) {
    const sab = new SharedArrayBuffer(SAB_BYTES);
    views = makeViews(sab);
    views.ctrl[CTRL.speed] = startSpeed;
    views.state[STATE.gameHours] = seed.gameHours;
    views.state[STATE.treasury] = seed.treasury;
    worker.postMessage({ type: 'init', sab, netPerHour });

    // Poll shared memory on a rAF loop, throttled for the UI store.
    const loop = (t: number) => {
      if (t - lastEmit >= SNAPSHOT_THROTTLE_MS) {
        lastEmit = t;
        cb.onSnapshot(views!.state[STATE.gameHours], views!.state[STATE.treasury]);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  } else {
    worker.postMessage({
      type: 'init-nosab',
      speed: startSpeed,
      gameHours: seed.gameHours,
      treasury: seed.treasury,
      netPerHour,
    });
  }

  return {
    usingSharedMemory: useSab,
    setSpeed: (s: SimSpeed) => {
      if (useSab && views) Atomics.store(views.ctrl, CTRL.speed, s);
      else worker.postMessage({ type: 'speed', value: s });
    },
    setRate: (v: number) => worker.postMessage({ type: 'rate', value: v }),
    adjust: (delta: number) => worker.postMessage({ type: 'adjust', delta }),
    dispose: () => {
      cancelAnimationFrame(raf);
      worker.terminate();
    },
  };
}
