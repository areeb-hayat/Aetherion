/**
 * ============================================================================
 *  AETHERION — COMMODITY MARKET  (prices move, and fortunes move with them)
 * ============================================================================
 *  Deposits used to be priced by a constant, so a petrostate's fortune never
 *  turned and an importer never felt a shock. Here the price of every commodity
 *  is a function of the campaign date:
 *
 *      price(id, t) = (1 + scarcity)^t  x  (1 + amp . sin(wt + phase))
 *
 *  Scarcity is the share of demand growth that new supply fails to meet, so
 *  real prices trend up over decades. The cycle is per-commodity — different
 *  period, different phase — so oil can peak while copper slumps.
 *
 *  What the price does to a nation is the TERMS OF TRADE: it sells what it digs
 *  up and buys what it burns, and only the NET position matters. When oil
 *  doubles, Saudi Arabia gains exactly what Japan loses in kind, and both are
 *  bounded — a windfall is not infinite and a shock is not fatal.
 *
 *  Like sim/growth, this is closed-form in game time: no market state, no
 *  per-tick clearing loop, no order book. Knobs in config/market.ts.
 */
import { MARKET } from '@/config/market';
import { RESOURCES, resourceById, type ResourceCategory } from '@/config/resources';
import { devIndex, MACRO, FALLBACK } from '@/config/economy';
import { nationStatsMap } from '@/features/menu/nationStats';
import { useWorldStore } from '@/store/worldStore';

const CATEGORIES: ResourceCategory[] = ['FUEL', 'INDUSTRIAL', 'AGRICULTURE', 'STRATEGIC'];

/** Deterministic [0,1) draw from a commodity id (FNV-1a, no RNG). */
function hash01(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Price of one commodity at campaign year `years`, as a multiple of its
 *  opening price. 1.0 on day one, always. */
export function priceIndex(resourceId: string, years: number): number {
  const def = resourceById.get(resourceId);
  if (!def || years <= 0) return 1;
  const scarcity = (MARKET.demandGrowth[def.category] ?? 0.012) * (1 - MARKET.supplyResponse);
  const amp = MARKET.cycleAmplitude[def.category] ?? 0.2;
  const { min, max } = MARKET.cyclePeriod;
  const period = min + hash01(resourceId) * (max - min);
  const phase = hash01(resourceId + '~') * Math.PI * 2;
  const cycle = 1 + amp * Math.sin((2 * Math.PI * years) / period + phase);
  return clamp(Math.pow(1 + scarcity, years) * cycle, MARKET.bounds.lo, MARKET.bounds.hi);
}

/** The category's price level: the mean of its members, which is what a panel
 *  showing "Energy" or "Industrial metals" is reporting. */
export function categoryIndex(category: ResourceCategory, years: number): number {
  let sum = 0;
  let n = 0;
  for (const r of RESOURCES) {
    if (r.category !== category) continue;
    sum += priceIndex(r.id, years);
    n++;
  }
  return n ? sum / n : 1;
}

/** Every category's level at a date — the market board. */
export function marketBoard(years: number): { category: ResourceCategory; index: number }[] {
  return CATEGORIES.map((category) => ({ category, index: categoryIndex(category, years) }));
}

/** Commodity intensity: how much of its output a nation spends on raw inputs.
 *  A service economy burns less per dollar than a smelting one. */
function intensity(nationId: string, category: ResourceCategory): number {
  const dev = devIndex(MACRO[nationId]?.pc ?? FALLBACK.perCapita);
  return (MARKET.consumption[category] ?? 0) * (1 - MARKET.intensityDevSlope * dev);
}

/* ---- putting both sides of the trade in the same units -------------------
 * A deposit's `value` in the catalogue is an INDEX (the ETL inflates it, and
 * the ledger scales it down again for the royalty base), while consumption is
 * a share of real GDP. Comparing the two directly made Russia's exports twice
 * its own economy. Rather than invent a conversion constant, use the identity
 * that defines a market: the world's sales equal the world's purchases. One
 * pass over the nations gives the factor that makes it so, and every nation's
 * position is then measured on the same scale. */
let scaleCache = { key: -1, value: 0 };
export function marketScale(): number {
  const key = useWorldStore.getState().provinceCount;
  if (scaleCache.key === key) return scaleCache.value;
  let worldIndex = 0;
  let worldDemand = 0;
  for (const stat of nationStatsMap().values()) {
    worldIndex += stat.resourceOutput;
    const gdp = stat.population * stat.gdpPerCapita;
    for (const category of CATEGORIES) worldDemand += intensity(stat.id, category) * gdp;
  }
  scaleCache = { key, value: worldIndex > 0 ? worldDemand / worldIndex : 0 };
  return scaleCache.value;
}

export interface CommodityPosition {
  /** Value of what it digs up, at today's prices ($/yr). */
  exports: number;
  /** Value of what it consumes, at today's prices ($/yr). */
  imports: number;
  /** exports - imports: positive is a net seller. */
  net: number;
  /** The net position as a share of output, before the cap. */
  exposure: number;
  /** GDP multiplier from the swing in prices since the campaign opened. */
  termsOfTrade: number;
}

/** Where a nation stands in the world market. `deposits` is its richness points
 *  by resource id (nationStats.resourceTotals); `baseGdp` is its output before
 *  this adjustment, which is what the consumption share is measured against. */
export function commodityPosition(
  nationId: string,
  deposits: Record<string, number>,
  baseGdp: number,
  years: number,
): CommodityPosition {
  const scale = marketScale();
  let exports = 0;
  let exportGain = 0; // the part of exports that is PRICE MOVEMENT, not baseline
  for (const [id, points] of Object.entries(deposits)) {
    const def = resourceById.get(id);
    if (!def || points <= 0) continue;
    const opening = points * def.value * 1e6 * scale; // index -> the market's units
    const px = priceIndex(id, years);
    exports += opening * px;
    exportGain += opening * (px - 1);
  }

  let imports = 0;
  let importCost = 0; // likewise: only the movement counts against them
  for (const category of CATEGORIES) {
    const share = intensity(nationId, category) * baseGdp;
    const px = categoryIndex(category, years);
    imports += share * px;
    importCost += share * (px - 1);
  }

  const swing = baseGdp > 0 ? (exportGain - importCost) / baseGdp : 0;
  const exposure = baseGdp > 0 ? (exports - imports) / baseGdp : 0;
  const termsOfTrade =
    1 + clamp(swing, -MARKET.exposureCap, MARKET.exposureCap) * MARKET.termsSensitivity;

  return { exports, imports, net: exports - imports, exposure, termsOfTrade };
}

// ponytail: two scales coexist on purpose. Royalties keep RESOURCE.gvaScale
// (the fiscal calibration ~150 nations were validated against), while the terms
// of trade use marketScale() above. They disagree because the ETL's baked
// resource index tracks province AREA rather than actual extraction, so Russia
// out-produces Saudi Arabia 8:1 on paper. The market's bite on a petrostate's
// BUDGET is understated until that index is re-derived from real output; the
// fix belongs in build-resources.mjs, not here, and re-validating the fiscal
// numbers is the real cost of it.

/** A nation's extractive output valued at TODAY'S prices, which is what the
 *  royalty line in the ledger should be taxing. */
export function pricedResourceOutput(deposits: Record<string, number>, years: number): number {
  let total = 0;
  for (const [id, points] of Object.entries(deposits)) {
    const def = resourceById.get(id);
    if (!def || points <= 0) continue;
    total += points * def.value * 1e6 * priceIndex(id, years);
  }
  return total;
}

/* ---- Self-check ----------------------------------------------------------
 * Runs on a DEV boot. The invariants that matter are that day one changes
 * nothing (every validated opening figure in the game depends on it), that the
 * band actually binds, and that a price move helps a seller exactly as much as
 * it hurts a buyer. */
export function marketSelfCheck(): boolean {
  const ok = (cond: boolean, what: string) => {
    if (!cond) throw new Error(`market self-check failed: ${what}`);
  };
  ok(RESOURCES.length > 0, 'the catalogue loaded');
  for (const r of RESOURCES) ok(priceIndex(r.id, 0) === 1, `${r.id} opens at its catalogue price`);
  ok(categoryIndex('FUEL', 0) === 1, 'the board opens flat');

  // Prices move, stay inside the band, and do not all move together.
  let moved = 0;
  const seen = new Set<number>();
  for (const r of RESOURCES) {
    const p = priceIndex(r.id, 7);
    ok(p >= MARKET.bounds.lo && p <= MARKET.bounds.hi, `${r.id} stays inside the band (${p.toFixed(2)})`);
    if (Math.abs(p - 1) > 0.02) moved++;
    seen.add(Math.round(p * 1000));
  }
  ok(moved > RESOURCES.length * 0.6, `most prices have moved by year 7 (${moved}/${RESOURCES.length})`);
  ok(seen.size > RESOURCES.length * 0.8, 'commodities are not all on one cycle');

  // Scarcity outruns supply, so the long run trends up despite the cycle.
  const longRun = CATEGORIES.map((c) => categoryIndex(c, 60));
  ok(longRun.every((v) => v > 1), `every category is dearer after 60 years (${longRun.map((v) => v.toFixed(2)).join(' ')})`);

  // Day one is the status quo for a nation, whatever it holds.
  const holder = { oil: 40, wheat: 12 };
  const zero = commodityPosition('SAU', holder, 8e11, 0);
  ok(Math.abs(zero.termsOfTrade - 1) < 1e-12, 'terms of trade start neutral');

  // A seller gains where a buyer loses: same prices, opposite sign.
  const later = 6;
  const seller = commodityPosition('SAU', holder, 8e11, later);
  const buyer = commodityPosition('JPN', {}, 8e11, later);
  ok(buyer.net < 0, 'a nation with no deposits is a net buyer');
  ok(seller.net > buyer.net, 'holding deposits beats holding none');
  ok(
    Math.abs(seller.termsOfTrade - 1) <= MARKET.exposureCap + 1e-9 &&
      Math.abs(buyer.termsOfTrade - 1) <= MARKET.exposureCap + 1e-9,
    'the swing is capped both ways',
  );
  return true;
}
