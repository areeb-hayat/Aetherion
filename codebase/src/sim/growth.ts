/**
 * ============================================================================
 *  AETHERION — ECONOMIC GROWTH  (the world's economies over time)
 * ============================================================================
 *  Until now every nation's per-capita output was a constant: play for thirty
 *  game-years and Germany was still exactly as rich as on day one. This module
 *  puts the world economy in motion.
 *
 *  A nation's path is CLOSED-FORM in game time — no per-nation state, no
 *  280-nation loop each tick. Given only its ISO code and the elapsed years we
 *  can name its output at any date:
 *
 *      pc(t) = pc(0) · exp( ∫₀ᵗ rate(τ) dτ ) · scar
 *
 *  where rate(τ) = trend + cycle(τ). The trend comes from convergence (poor
 *  economies grow faster), governance and a deterministic per-nation spread;
 *  the cycle is a sine whose amplitude, period and phase are hashed from the
 *  code, so booms and slumps are staggered across the world. The integral has
 *  an exact closed form, so a nation's 2071 GDP costs the same as its 2027 one.
 *
 *  `scar` is the only path-dependent part (war, sanctions, insurgency) and the
 *  only thing anyone has to store — see economyStore's growth slice.
 *
 *  All knobs live in `config/economy.ts` GROWTH. Deterministic: same code +
 *  same date = same number, on every machine, across reloads.
 */
import { GROWTH, MACRO, FALLBACK, devIndex, govCapacity, YEAR_HOURS } from '@/config/economy';

/** Elapsed campaign years from the master clock. */
export function yearsElapsed(gameHours: number): number {
  return Math.max(0, gameHours) / YEAR_HOURS;
}

/** Deterministic [0,1) draw from a nation code + a salt (FNV-1a, no RNG). */
function hash01(id: string, salt: string): number {
  let h = 2166136261;
  const s = id + '#' + salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/** The nation's starting development (from its seed per-capita), 0..1. */
function seedDev(id: string): number {
  return devIndex(MACRO[id]?.pc ?? FALLBACK.perCapita);
}

/** Long-run trend growth rate for a nation (per year, real). */
export function trendRate(id: string): number {
  const dev = seedDev(id);
  const gov = govCapacity(MACRO[id]?.g ?? FALLBACK.government);
  const base = GROWTH.floor + GROWTH.convergence * (1 - dev);
  const institutional = 1 + GROWTH.govSlope * (gov - 1);
  const spread = (hash01(id, 'trend') * 2 - 1) * GROWTH.jitter;
  return Math.max(0, base * institutional + spread);
}

/** The nation's cycle as two sine components (amplitude/yr, period in years,
 *  phase). Two, not one, so the sequence never repeats exactly. */
function cycle(id: string): { amp: number; w: number; phase: number }[] {
  const dev = seedDev(id);
  const { min, max } = GROWTH.cyclePeriod;
  const amp = GROWTH.cycleBase + GROWTH.cycleDevSlope * (1 - dev);
  const period = min + hash01(id, 'period') * (max - min);
  const tau = 2 * Math.PI;
  return [
    { amp, w: tau / period, phase: hash01(id, 'phase') * tau },
    {
      amp: amp * GROWTH.harmonic.amp,
      w: tau / (period * GROWTH.harmonic.periodRatio),
      phase: hash01(id, 'phase2') * tau,
    },
  ];
}

/** How far the cycle can carry output from the pure trend path, in log terms.
 *  It is 2·amp/ω — BOUNDED, and independent of how long the campaign runs: a
 *  cycle is a wobble the economy is somewhere inside, never a second trend. */
export function cycleBound(id: string): number {
  return cycle(id).reduce((sum, c) => sum + (2 * c.amp) / c.w, 0);
}

/** Instantaneous growth rate at campaign year `years` (trend + cycle). */
export function growthRate(id: string, years: number): number {
  return cycle(id).reduce((rate, c) => rate + c.amp * Math.sin(c.w * years + c.phase), trendRate(id));
}

/** Cumulative output multiplier at year `years` — exp of the exact integral of
 *  `growthRate`, so it is continuous, closed-form and reload-stable. */
export function growthFactor(id: string, years: number, scar = 1): number {
  if (years <= 0) return scar;
  const integral = cycle(id).reduce(
    (acc, c) => acc + (c.amp / c.w) * (Math.cos(c.phase) - Math.cos(c.w * years + c.phase)),
    trendRate(id) * years,
  );
  return Math.exp(integral) * scar;
}

/** Annual drag on output from the strain a state is under. Counts, not shares:
 *  one war hurts, three wars ruin. Capped — collapse is bounded. */
export function strainDrag(strain: { wars: number; sanctions: number; insurgencies: number }): number {
  const { war, sanction, insurgency, max } = GROWTH.drag;
  const raw = war * strain.wars + sanction * strain.sanctions + insurgency * strain.insurgencies;
  return Math.min(max, raw);
}

/** Advance the scar over `days` of game time: strain compounds damage, calm
 *  compounds recovery toward whole (1). Bounded below by GROWTH.scarFloor. */
export function advanceScar(scar: number, drag: number, days: number): number {
  const yearFrac = days / (YEAR_HOURS / 24);
  const next = drag > 0 ? scar * (1 - drag * yearFrac) : scar + (1 - scar) * GROWTH.recovery * yearFrac;
  return Math.max(GROWTH.scarFloor, Math.min(1, next));
}

/* ---- Self-check ----------------------------------------------------------
 * Runs once on a DEV boot (main.tsx) and on demand via window.__growthCheck().
 * Asserts the invariants that make the model trustworthy rather than merely
 * plausible: day one changes nothing, growth compounds, the poor converge on
 * the rich, the cycle averages out to the trend, and strain is recoverable. */
export function growthSelfCheck(): boolean {
  const ok = (cond: boolean, what: string) => {
    if (!cond) throw new Error(`growth self-check failed: ${what}`);
  };
  // Day one is the status quo — a fresh campaign matches the pre-game dossier.
  ok(growthFactor('DEU', 0) === 1, 'factor at t=0 is 1');
  // Output compounds upward over a decade for a typical economy.
  ok(growthFactor('DEU', 10) > 1.1, 'Germany grows over a decade');
  // Convergence: a low-income economy outgrows a high-income one.
  ok(growthFactor('BGD', 20) > growthFactor('DEU', 20), 'Bangladesh converges on Germany');
  // The cycle is a wobble around the trend, not a second trend: its distance
  // from the trend path is bounded, and a ten-fold longer campaign does not
  // widen it. (It does NOT vanish — a nation can sit permanently a few percent
  // above or below trend depending on where its cycle stood at t=0.)
  const bound = cycleBound('USA') + 1e-9;
  const off = (y: number) => Math.abs(Math.log(growthFactor('USA', y)) - trendRate('USA') * y);
  ok(off(40) <= bound, `cycle stays within its bound at 40y (${off(40).toFixed(4)} <= ${bound.toFixed(4)})`);
  ok(off(400) <= bound, `cycle does not accumulate over 400y (${off(400).toFixed(4)} <= ${bound.toFixed(4)})`);
  // Nobody is on the same cycle as everyone else.
  ok(growthRate('USA', 3) !== growthRate('CHN', 3), 'cycles are staggered');
  // A war-torn decade scars down to the floor, and peace rebuilds — the
  // rebound is fast but a generation long, and never overshoots whole.
  let s = 1;
  for (let d = 0; d < 3600; d++) s = advanceScar(s, strainDrag({ wars: 1, sanctions: 1, insurgencies: 4 }), 1);
  ok(s < 0.9 && s >= GROWTH.scarFloor, `a decade of war scars (${s.toFixed(3)})`);
  for (let d = 0; d < 3600 * 3; d++) s = advanceScar(s, 0, 1);
  ok(s > 0.95 && s <= 1, `thirty years of peace rebuilds (${s.toFixed(3)})`);
  return true;
}
