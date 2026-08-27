/**
 * ============================================================================
 *  AETHERION — ECONOMIC RULESET  (the single source of truth for the economy)
 * ============================================================================
 *  Every knob that shapes national finance lives here: how per-capita output
 *  maps to a development level, how governments extract revenue, how the state
 *  spends, how debt seeds and credit ratings are assigned, and how much cash a
 *  nation starts with. The composite ledger is assembled in `sim/economy.ts`
 *  from these constants — retune realism by editing THIS file only.
 *
 *  Grounding: GDD Ch.14 (Macroeconomic Engine) + Ch.15 (Sovereign Finance).
 *  All figures are $/year unless noted. Real macro seeds (per-capita GDP +
 *  government archetype per nation) live in `nationEconomy.json`.
 */
import macro from './nationEconomy.json';

/* ---- Real-world macro seeds ---------------------------------------------- */

export interface MacroSeed {
  pc: number; // approximate nominal GDP per capita, USD
  g?: string; // government archetype
}

export const MACRO: Record<string, MacroSeed> = macro.nations as Record<string, MacroSeed>;

/** Nations absent from the table fall back to this modest lower-upper-middle
 *  profile, nudged by their resource output per capita in sim/economy.ts. */
export const FALLBACK = {
  perCapita: 4200,
  government: 'Republic',
} as const;

/* ---- Income group (World Bank thresholds, derived from per-capita) -------- */

export type IncomeGroup = 'H' | 'UM' | 'LM' | 'L';

export const INCOME_THRESHOLDS = { H: 12536, UM: 4046, LM: 1036 } as const;

export function incomeGroup(pc: number): IncomeGroup {
  if (pc >= INCOME_THRESHOLDS.H) return 'H';
  if (pc >= INCOME_THRESHOLDS.UM) return 'UM';
  if (pc >= INCOME_THRESHOLDS.LM) return 'LM';
  return 'L';
}

export const INCOME_LABEL: Record<IncomeGroup, string> = {
  H: 'High Income',
  UM: 'Upper-Middle Income',
  LM: 'Lower-Middle Income',
  L: 'Low Income',
};

/** A 0..1 development index from per-capita GDP on a log scale (pc $700 → 0,
 *  pc $90k → 1). Drives tax capacity, welfare spending, and reserves. */
export const DEV = { floor: 700, ceil: 90_000 } as const;
export function devIndex(pc: number): number {
  const t = (Math.log10(Math.max(1, pc)) - Math.log10(DEV.floor)) / (Math.log10(DEV.ceil) - Math.log10(DEV.floor));
  return Math.max(0, Math.min(1, t));
}

/* ---- Government archetypes: how effectively the state extracts revenue ---- */

/** Multiplier on the base tax take. Consolidated democracies and strong
 *  one-party states collect efficiently; petro-monarchies lean on royalties
 *  (low income tax); transitional/authoritarian states leak to corruption. */
export const GOV_TAX_CAPACITY: Record<string, number> = {
  'Federal Republic': 1.0,
  'Parliamentary Republic': 1.06,
  'Parliamentary Democracy': 1.06,
  'Constitutional Monarchy': 1.05,
  'Semi-Presidential Republic': 1.0,
  'Presidential Republic': 0.95,
  Republic: 0.95,
  'One-Party State': 1.0,
  Authoritarian: 0.85,
  'Absolute Monarchy': 0.8,
  Theocracy: 0.85,
  Transitional: 0.68,
  'Hybrid Regime': 0.9,
};
export const govCapacity = (g: string) => GOV_TAX_CAPACITY[g] ?? 0.9;

/* ---- Revenue: what the treasury takes in --------------------------------- */

export const TAX = {
  /** Revenue as a share of GDP = base + devSlope·dev, then × govCapacity.
   *  Poor states ≈ 12%, developed ≈ 32% of GDP. */
  base: 0.12,
  devSlope: 0.2,
} as const;

export const RESOURCE = {
  /** Baked resourceOutput in world.json is a relative index inflated ~1e6×;
   *  scale it down to a realistic extractive-sector GVA. */
  gvaScale: 0.02,
  /** Extraction can't exceed this share of a diversified economy's GDP. */
  maxShare: 0.55,
  /** State royalty/rent share of resource GVA, on top of ordinary tax. */
  royalty: 0.28,
} as const;

export const TRADE = {
  /** Baseline tariff/transit revenue as a share of GDP (ports amplify it). */
  baseShare: 0.012,
  /** A TRADE treaty boosts trade revenue by up to this fraction, weighted by
   *  the partner's economic size relative to ours (a US deal moves Pakistan's
   *  needle far more than a Bhutan deal). Total boost capped below. */
  treatyBoost: 0.3,
  treatyBoostCap: 1.5, // trade revenue can at most reach 1+cap = 2.5× baseline
  /** Being sanctioned/embargoed/severed cuts trade, again partner-weighted. */
  sanctionsHit: 0.1,
  embargoHit: 0.25,
  severedHit: 0.05,
  /** Sanctioning someone ELSE also costs the sanctioner a little trade. */
  selfSanctionHit: 0.03,
  /** Trade revenue can't fall below 1-cap of baseline (smuggling persists). */
  reductionCap: 0.6,
} as const;

/* ---- Growth: how national economies move over a campaign ----------------- */

/** The world is not frozen. Every nation's per-capita output moves along a
 *  trend set by its own starting position (poor economies converge upward
 *  faster than rich ones — the standard growth result), modulated by a
 *  business cycle whose period differs per nation so the world does not boom
 *  and slump in lockstep. Strain (war, sanctions, insurgency) drags the path
 *  down and leaves a scar that heals slowly once the strain lifts. */
export const GROWTH = {
  /** Trend real growth = floor + convergence·(1 − dev). A developed economy
   *  trends ~1.4%/yr; a low-income one catches up faster. */
  floor: 0.012,
  convergence: 0.035,
  /** Institutional quality modulates the trend: rate ×= 1 + govSlope·(capacity
   *  − 1), reading the same archetype table the tax take uses as state
   *  effectiveness. At 1.0 the penalty is severe by design — convergence is
   *  CONDITIONAL on institutions, which is why failed states do not quietly
   *  compound their way to prosperity while nobody is looking at them. */
  govSlope: 1.0,
  /** Deterministic per-nation spread on the trend (±), stable across reloads. */
  jitter: 0.008,
  /** Business cycle around the trend. Less-developed economies swing wider
   *  (commodity prices, capital flight); the period varies per nation. */
  cycleBase: 0.012,
  cycleDevSlope: 0.03,
  cyclePeriod: { min: 5, max: 11 }, // years, per nation
  /** A single sine is a metronome — thirty years in, a player can set their
   *  watch by the recession. A second harmonic on an incommensurate period
   *  makes the sequence aperiodic: booms and slumps still come, but never on
   *  schedule. Ratio deliberately irrational-ish so the two never re-align. */
  harmonic: { amp: 0.45, periodRatio: 0.41 },
  /** Annual drag while the state is under strain — compounded daily onto the
   *  scar. War is ruinous, sanctions bite, each held province bleeds a little. */
  drag: { war: 0.09, sanction: 0.035, insurgency: 0.006, max: 0.25 },
  /** Share of the shortfall recovered per year once the strain lifts — the
   *  post-war rebound, which is real and fast (a wrecked economy rebuilding
   *  grows quicker than a whole one). Half the gap closes in ~6 years; still
   *  slower than a ruinous decade takes to open it. */
  recovery: 0.12,
  /** However ruinous the decade, the economy keeps this share of its trend
   *  path: a state in collapse still has an economy. */
  scarFloor: 0.55,
} as const;

/* ---- Local price level (construction & upkeep cost deflator) -------------- */

export const PRICE = {
  /** Cost level as a fraction of rich-world prices: floor + slope·dev.
   *  Labour and land are cheap in poor economies — a road in Pakistan does not
   *  cost what it costs in Switzerland. */
  floor: 0.35,
  slope: 0.65,
} as const;

/** 0.35..1 price deflator from a 0..1 development index. */
export function priceLevel(dev: number): number {
  return PRICE.floor + PRICE.slope * Math.max(0, Math.min(1, dev));
}

/* ---- Expenditure: what the state pays out -------------------------------- */

export const SPEND = {
  /** Administration as a share of GDP: base − devSlope·dev. Poor states run
   *  RELATIVELY costlier bureaucracies (corruption, thin tax bases); developed
   *  ones are leaner per dollar. Never tied to raw province count — admin
   *  district counts in map data are a cartographic artifact, not a cost. */
  adminBase: 0.045,
  adminDevSlope: 0.01,
  /** Defence: peacetime share of GDP (wartime multipliers come later). */
  militaryGdpShare: 0.022,
  /** Social/welfare: the largest line, and it GROWS with development —
   *  rich states run big welfare systems. base + devSlope·dev of GDP. */
  socialBase: 0.055,
  socialDevSlope: 0.2,
} as const;

/* ---- Debt, credit ratings & interest (GDD Ch.15) ------------------------- */

export type CreditRating = 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC' | 'CC' | 'D';

export const DEBT = {
  /** Seed debt/GDP = base + devSlope·dev + deterministic jitter; developed
   *  economies carry more debt (deeper credit markets). Clamped to [lo,hi]. */
  base: 0.35,
  devSlope: 0.45,
  jitter: 0.28, // ± deterministic per-nation spread
  lo: 0.08,
  hi: 1.6,
} as const;

/** Interest rate charged on sovereign debt, by rating (GDD Ch.15.1). Junk
 *  tiers reflect real EMBI-style spreads, not loan-shark rates — a B credit
 *  pays ~9%, and even distressed issuers rarely price far past the low teens
 *  (beyond that they simply lose market access, which the finance layer
 *  models separately). */
export const RATING_INTEREST: Record<CreditRating, number> = {
  AAA: 0.015,
  AA: 0.02,
  A: 0.03,
  BBB: 0.045,
  BB: 0.065,
  B: 0.09,
  CCC: 0.14,
  CC: 0.2,
  D: 0.28,
};

export const RATING_ORDER: CreditRating[] = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'D'];

/** Map a solvency score (higher = safer) to a letter grade. Score combines
 *  development (ability to service) and debt burden (see sim/economy.ts). */
export function ratingFromScore(score: number): CreditRating {
  if (score >= 88) return 'AAA';
  if (score >= 78) return 'AA';
  if (score >= 66) return 'A';
  if (score >= 54) return 'BBB';
  if (score >= 42) return 'BB';
  if (score >= 30) return 'B';
  if (score >= 20) return 'CCC';
  if (score >= 12) return 'CC';
  return 'D';
}

/* ---- Starting treasury (spendable reserves / war chest) ------------------ */

export const RESERVE = {
  /** Reserves held as months of annual revenue = base + devSlope·dev +
   *  resourceBonus·resourceShare. Developed & resource-exporting states sit on
   *  bigger cash piles. */
  base: 2.5,
  devSlope: 4.0,
  resourceBonus: 5.0,
  maxMonths: 11,
} as const;

/** A game-year is this many hours of the campaign clock (used to prorate the
 *  annual net balance into the per-tick treasury drift). 360-day economic year
 *  keeps months even (matches the 30-day month rollover in the tick worker). */
export const YEAR_HOURS = 360 * 24;
