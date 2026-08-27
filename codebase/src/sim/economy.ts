/**
 * ============================================================================
 *  AETHERION — NATIONAL ECONOMY  (the ledger builder)
 * ============================================================================
 *  Pure, deterministic functions that turn a nation's aggregates (population,
 *  territory, resource output) into a full national account: GDP, a revenue
 *  breakdown, an expenditure breakdown, the running balance, seeded treasury
 *  reserves, sovereign debt, a derived credit rating and its interest rate.
 *
 *  Everything is driven by the constants in `config/economy.ts` — this file
 *  holds only the assembly logic. Player-built development is threaded in via
 *  the optional `mods` (GDP/trade/tax multipliers + real infrastructure upkeep)
 *  so the same builder serves both AI nations (seed) and the live player.
 */
import type { NationLedger, Revenue, Spending, CreditRating } from '@/types';
import {
  MACRO,
  FALLBACK,
  incomeGroup,
  devIndex,
  govCapacity,
  ratingFromScore,
  RATING_INTEREST,
  RATING_ORDER,
  TAX,
  RESOURCE,
  TRADE,
  SPEND,
  DEBT,
  RESERVE,
} from '@/config/economy';

/** Aggregates needed to build a ledger — a subset of the per-nation stats. */
export interface LedgerInput {
  id: string;
  population: number;
  provinceCount: number;
  resourceOutput: number; // baked $/yr from deposits (a relative index)
}

/** Player-development modifiers layered onto the seed economy (default: none).
 *  Multipliers are RELATIVE to the base economy (1 = no change beyond baseline);
 *  `infraUpkeep`, when given, replaces the approximated infrastructure line. */
export interface LedgerMods {
  gdpMult?: number;
  tradeMult?: number;
  taxMult?: number;
  infraUpkeep?: number;
  /** LIVE sovereign debt ($) — replaces the deterministic seed once the
   *  finance layer starts issuing/retiring bonds. Drives debtToGdp → rating
   *  → interest. */
  debt?: number;
  /** IMF austerity conditionality (social/welfare and admin cuts). */
  socialMult?: number;
  adminMult?: number;
  /** Interest due on loans (IMF/bilateral) — added to the debtInterest line
   *  on top of bond interest. Loans are tracked separately from bond debt. */
  extraInterest?: number;
  /** Rating can't fall below this (IMF anchor) / rise above this (default
   *  stigma). Cap wins if both apply. */
  ratingFloor?: CreditRating;
  ratingCap?: CreditRating;
}

/** Deterministic per-nation spread in [-1, 1] from the ISO code (stable across
 *  reloads — no RNG, no province-id dependence). */
function hash11(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) / 0xffffffff) * 2 - 1;
}

/** Effective per-capita GDP for a nation (real macro seed, or the fallback). */
export function perCapitaFor(id: string): number {
  return MACRO[id]?.pc ?? FALLBACK.perCapita;
}

/** Government archetype for a nation (real macro seed, or the fallback). */
export function governmentFor(id: string): string {
  return MACRO[id]?.g ?? FALLBACK.government;
}

/** Rating comparator on the AAA→D scale (true when `a` is riskier than `b`). */
function worseThan(a: CreditRating, b: CreditRating): boolean {
  return RATING_ORDER.indexOf(a) > RATING_ORDER.indexOf(b);
}

/** Build the full national account. Deterministic and side-effect free. */
export function computeLedger(input: LedgerInput, mods: LedgerMods = {}): NationLedger {
  const { id } = input;
  const population = Math.max(0, input.population);
  const pc = perCapitaFor(id);
  const government = governmentFor(id);
  const dev = devIndex(pc);
  const ig = incomeGroup(pc);

  const gdpMult = mods.gdpMult ?? 1;
  const gdp = population * pc * gdpMult;

  // Extractive sector: scale the inflated baked index down to a realistic GVA,
  // capped so a diversified economy is never "all resources".
  const resourceGva = Math.min(input.resourceOutput * RESOURCE.gvaScale, gdp * RESOURCE.maxShare);
  const resourceShare = gdp > 0 ? resourceGva / gdp : 0;

  /* -- Revenue ----------------------------------------------------------- */
  const taxRate = (TAX.base + TAX.devSlope * dev) * govCapacity(government) * (mods.taxMult ?? 1);
  const revenue: Revenue = {
    tax: taxRate * gdp,
    resource: RESOURCE.royalty * resourceGva,
    trade: TRADE.baseShare * gdp * (mods.tradeMult ?? 1),
    total: 0,
  };
  revenue.total = revenue.tax + revenue.resource + revenue.trade;

  /* -- Debt & credit rating (rating from development + debt burden) ------- */
  // Seeded ratio at campaign start; the LIVE figure (bond issuance/buybacks)
  // overrides it via mods.debt once the finance layer owns the number.
  const seededDebt = clamp(DEBT.base + DEBT.devSlope * dev + DEBT.jitter * hash11(id), DEBT.lo, DEBT.hi) * gdp;
  const debt = mods.debt ?? seededDebt;
  const debtToGdp = gdp > 0 ? debt / gdp : 0;
  const debtHealth = clamp(1 - (debtToGdp - 0.3) / 1.0, 0, 1);
  const solvency = 100 * (0.65 * dev + 0.35 * debtHealth);
  let creditRating: CreditRating = ratingFromScore(solvency);
  if (mods.ratingFloor && worseThan(creditRating, mods.ratingFloor)) creditRating = mods.ratingFloor;
  if (mods.ratingCap && worseThan(mods.ratingCap, creditRating)) creditRating = mods.ratingCap;
  const interestRate = RATING_INTEREST[creditRating];

  /* -- Spending ---------------------------------------------------------- */
  // Real upkeep for the player nation; a development-scaled approximation for
  // AI nations we haven't swept province-by-province.
  const infrastructure = mods.infraUpkeep ?? 0.015 * gdp * (0.4 + 0.6 * dev);
  const spending: Spending = {
    admin: (SPEND.adminBase - SPEND.adminDevSlope * dev) * gdp * (mods.adminMult ?? 1),
    military: SPEND.militaryGdpShare * gdp,
    social: (SPEND.socialBase + SPEND.socialDevSlope * dev) * gdp * (mods.socialMult ?? 1),
    infrastructure,
    debtInterest: interestRate * debt + (mods.extraInterest ?? 0),
    total: 0,
  };
  spending.total =
    spending.admin + spending.military + spending.social + spending.infrastructure + spending.debtInterest;

  const balance = revenue.total - spending.total;

  /* -- Starting treasury (spendable reserves) ---------------------------- */
  const months = clamp(
    RESERVE.base + RESERVE.devSlope * dev + RESERVE.resourceBonus * resourceShare,
    0,
    RESERVE.maxMonths,
  );
  const treasury = revenue.total * (months / 12);

  return {
    id,
    population,
    gdp,
    gdpPerCapita: pc,
    incomeGroup: ig,
    development: dev,
    government,
    revenue,
    spending,
    balance,
    treasury,
    debt,
    debtToGdp,
    creditRating,
    interestRate,
    resourceShare,
  };
}

/** Realistic economic output for a single province ($/yr): its share of the
 *  national economy (population × the nation's per-capita) plus its own scaled
 *  extractive output. Used by the GDP overlay and the province panel. */
export function provinceGdp(nationId: string, population: number, resourceOutput: number): number {
  const services = population * perCapitaFor(nationId);
  const extractive = resourceOutput * RESOURCE.gvaScale;
  return services + extractive;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
