/**
 * ============================================================================
 *  AETHERION — AI SCHEDULER  (time-sliced world simulation, main-thread side)
 * ============================================================================
 *  The architecture that keeps a 280-nation world cheap in a browser:
 *
 *    • DEPENDENCIES RUN NO AI — their foreign policy is their sovereign's
 *      (sim/sovereignty.effectiveForeignPolicyNation), so ~48 polities cost 0.
 *    • TIME-SLICING — work is budgeted per game-day and spread round-robin:
 *      a rotating window of provinces is scanned for unrest each day (plus the
 *      player's own, always), never the whole 49k-province world at once.
 *    • EVENT-DRIVEN RELATIONS — opinions are only touched when acted upon;
 *      the daily pass just DECAYS stored deltas toward baseline (grudges cool),
 *      which is O(sparse deltas), not O(N²).
 *    • LOD hooks — `thinkBudget` reserves the slot where full per-nation
 *      decision AI (great powers first) plugs in with the military system.
 *
 *  Driven by engineSingleton on worker snapshots; all game-time based, so real
 *  time and sim speed don't change outcomes.
 */
import { useWorldStore } from '@/store/worldStore';
import { useSessionStore } from '@/store/sessionStore';
import { usePoliticsStore } from '@/store/politicsStore';
import { useDiplomacyStore } from '@/store/diplomacyStore';
import { useEconomyStore } from '@/store/economyStore';
import { isInsurgencyLevel } from '@/sim/unrest';
import { WAR } from '@/config/diplomacy';

/** Per-game-day work budgets. */
const BUDGET = {
  globalUnrestScan: 400, // rotating window over all land provinces
  playerUnrestScan: 800, // cap on the player's own provinces per day
} as const;

let lastHours = -1;
let dayAccum = 0;
let cursor = 0; // rotating index into the land-province list
let landIds: number[] = [];
let landIdsKey = -1;
let playerIds: number[] = [];
let playerKey = '';

/** Dev-visible counters (window.__aiSched) proving the budget holds. */
const stats = { days: 0, scanned: 0, insurgencies: 0, decayed: 0, lastBatchMs: 0 };
if (import.meta.env.DEV) (window as unknown as { __aiSched: typeof stats }).__aiSched = stats;

function landProvinceIds(): number[] {
  const world = useWorldStore.getState();
  if (landIdsKey !== world.provinceCount) {
    landIds = [];
    world.provinces.forEach((p) => {
      if (!p.isSea && p.nationId && (p.data.population || 0) > 0) landIds.push(p.id);
    });
    landIdsKey = world.provinceCount;
    cursor = 0;
  }
  return landIds;
}

function playerProvinceIds(): number[] {
  const pid = useSessionStore.getState().playerNation ?? '';
  const world = useWorldStore.getState();
  const key = `${pid}:${world.provinceCount}`;
  if (playerKey !== key) {
    playerIds = [];
    if (pid) {
      world.provinces.forEach((p) => {
        if (!p.isSea && p.nationId === pid && (p.data.population || 0) > 0) playerIds.push(p.id);
      });
    }
    playerKey = key;
  }
  return playerIds;
}

/** Scan a set of province ids for insurgency triggers. */
function scanUnrest(ids: number[], from: number, count: number): number {
  const world = useWorldStore.getState();
  const politics = usePoliticsStore.getState();
  const n = ids.length;
  if (n === 0) return 0;
  let scanned = 0;
  for (let i = 0; i < Math.min(count, n); i++) {
    const p = world.provinces.get(ids[(from + i) % n]);
    if (!p) continue;
    scanned++;
    const u = politics.unrestOf(p);
    if (isInsurgencyLevel(u) && !politics.breakaways[p.id]) {
      politics.triggerInsurgency(p.id, u);
      stats.insurgencies++;
    }
  }
  return scanned;
}

/** One game-day of budgeted world work. */
function dailyPass() {
  const t0 = performance.now();
  stats.days++;

  // 1. Player's provinces — always fresh (capped), so the player's own unrest
  //    is responsive even in a huge nation.
  const pids = playerProvinceIds();
  stats.scanned += scanUnrest(pids, 0, Math.min(BUDGET.playerUnrestScan, pids.length));

  // 2. Rotating window over the whole world (the long tail of nations).
  const ids = landProvinceIds();
  stats.scanned += scanUnrest(ids, cursor, BUDGET.globalUnrestScan);
  cursor = ids.length > 0 ? (cursor + BUDGET.globalUnrestScan) % ids.length : 0;

  // 3. Grudges cool: decay ALL stored opinion deltas toward baseline. The map
  //    is sparse (only pairs someone acted on), so this stays trivially cheap.
  const deltas = useDiplomacyStore.getState().deltas;
  const keys = Object.keys(deltas);
  if (keys.length) {
    useDiplomacyStore.getState().decayBatch(keys, WAR.decayPerYear / 360);
    stats.decayed = keys.length;
  }

  // 4. (LOD slot) — per-nation decision AI plugs in here with the military
  //    system: great powers + the player's counterparties think weekly, the
  //    long tail drifts. Deliberately empty in this phase.

  stats.lastBatchMs = performance.now() - t0;
}

/** Reset internal clocks (fresh campaign or engine restart). */
export function initAiScheduler(gameHours: number) {
  lastHours = gameHours;
  dayAccum = 0;
}

/** Advance the world sim; called by the engine on every worker snapshot. Cheap
 *  when no game-hour has elapsed (paused / between ticks). */
export function aiTick(gameHours: number) {
  if (lastHours < 0) {
    lastHours = gameHours;
    return;
  }
  const dt = gameHours - lastHours;
  if (dt < 1) return; // less than a game-hour: nothing to do
  lastHours = gameHours;

  // Continuous processes (police decay, insurgency growth, war progress,
  // operations resolving, construction delivering + effect ramps filling,
  // sovereign finance accruing: bond issuance, loan amortization, IMF tranches).
  usePoliticsStore.getState().tickPolitics(gameHours, dt);
  useEconomyStore.getState().tickEconomy(gameHours);

  // Budgeted daily pass (catch up at most 3 days per call after a long stall).
  dayAccum += dt;
  if (dayAccum >= 24) {
    const days = Math.min(3, Math.floor(dayAccum / 24));
    dayAccum -= Math.floor(dayAccum / 24) * 24;
    for (let i = 0; i < days; i++) dailyPass();
  }
}
