/**
 * ============================================================================
 *  AETHERION — PROVINCE DEVELOPMENT  (infrastructure derivation + effects)
 * ============================================================================
 *  Turns a province's static data into its STARTING development (base tiers),
 *  merges in the player's built tiers, aggregates the economic/military effect
 *  of a slot loadout, and prices the next tier + annual upkeep. All rules come
 *  from `config/infrastructure.ts`; this file is the pure logic that reads them.
 */
import type { Province, InfraLevels, InfraEffects } from '@/types';
import {
  DEV_SLOTS,
  DEV_SLOT_ORDER,
  DEV_BASE,
  DEV_TIME,
  COASTAL_HINT,
  type DevSlotId,
} from '@/config/infrastructure';
import { sortedDeposits } from '@/config/resources';
import { devIndex, priceLevel } from '@/config/economy';
import { perCapitaFor } from '@/sim/economy';

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** $/yr a province earns from FUEL + INDUSTRIAL deposits (industry feedstock). */
export function industrialOutput(p: Province): number {
  let v = 0;
  for (const { def, size } of sortedDeposits(p)) {
    if (def.category === 'INDUSTRIAL' || def.category === 'FUEL') v += size * def.value * 1e6;
  }
  return v;
}

const ZERO_LEVELS: InfraLevels = {
  infrastructure: 0,
  industry: 0,
  fortification: 0,
  port: 0,
  airfield: 0,
  special: 0,
};

/** The development a province already has at the campaign start. Infrastructure
 *  and industry reflect how urban/developed/resource-rich it is; fortifications
 *  seed strategically valuable provinces; the rest start empty (player-built).
 *  `development` is the owning nation's 0..1 development index. */
export function baseInfra(p: Province, development: number): InfraLevels {
  const pop = p.data.population || 0;

  const infraFromPop = Math.log10(Math.max(1, pop / DEV_BASE.infraPopPer));
  const infrastructure = Math.round(
    clamp(infraFromPop + development * DEV_BASE.infraDevWeight, 0, DEV_BASE.infraMax),
  );

  const industry = Math.round(
    clamp(
      industrialOutput(p) / DEV_BASE.industryOutputPer +
        Math.max(0, Math.log10(Math.max(1, pop / 1_000_000))) * DEV_BASE.industryPopWeight * 0.5,
      0,
      DEV_BASE.industryMax,
    ),
  );

  const fortification = (p.data.value ?? 0) >= 70 ? DEV_BASE.capitalFortTier : 0;

  return { ...ZERO_LEVELS, infrastructure, industry, fortification };
}

/** Current levels = base + player-built deltas, clamped to each slot's max. */
export function mergeLevels(base: InfraLevels, built?: Partial<InfraLevels>): InfraLevels {
  const out = { ...base } as InfraLevels;
  if (built) {
    for (const id of DEV_SLOT_ORDER) {
      const add = built[id] ?? 0;
      out[id] = Math.min(DEV_SLOTS[id].maxTier, out[id] + add);
    }
  }
  return out;
}

/** Aggregate the economic + military effect of a province's slot loadout. */
export function infraEffects(levels: InfraLevels): InfraEffects {
  const eff: InfraEffects = {
    gdpMult: 1,
    tradeMult: 1,
    taxMult: 1,
    defenseMult: 1,
    moveMult: 1,
    navalCapacity: 0,
    airCapacity: 0,
  };
  for (const id of DEV_SLOT_ORDER) {
    const lvl = levels[id];
    if (!lvl) continue;
    const e = DEV_SLOTS[id].effect;
    if (e.gdpPerTier) eff.gdpMult += e.gdpPerTier * lvl;
    if (e.tradePerTier) eff.tradeMult += e.tradePerTier * lvl;
    if (e.taxPerTier) eff.taxMult += e.taxPerTier * lvl;
    if (e.defensePerTier) eff.defenseMult += e.defensePerTier * lvl;
    if (e.movePerTier) eff.moveMult += e.movePerTier * lvl;
    if (e.navalPerTier) eff.navalCapacity += e.navalPerTier * lvl;
    if (e.airPerTier) eff.airCapacity += e.airPerTier * lvl;
  }
  return eff;
}

/** How much a bigger, more populous province costs to develop (×0.5 .. ×3.5). */
export function sizeFactor(p: Province): number {
  return clamp(0.5 + 0.5 * Math.log10(Math.max(1, (p.data.population || 0) / 200_000)), 0.5, 3.5);
}

/** Local price conditions: the owner's price level (labour/land are cheap in
 *  poor economies — baseCost is priced at rich-world rates) times a premium
 *  for strategically valuable provinces (capital land, contested corridors). */
export function localCostFactor(p: Province): number {
  const price = priceLevel(devIndex(perCapitaFor(p.nationId ?? '')));
  const valueFactor = 0.75 + 0.5 * ((p.data.value ?? 0) / 100);
  return price * valueFactor;
}

/** Cost of raising `slotId` from `currentTier` to the next tier in this province. */
export function buildCost(p: Province, slotId: DevSlotId, currentTier: number): number {
  const def = DEV_SLOTS[slotId];
  return def.baseCost * Math.pow(def.costGrowth, currentTier) * sizeFactor(p) * localCostFactor(p);
}

/** GAME-DAYS to raise `slotId` from `currentTier` to the next tier here.
 *  Higher tiers take longer; bigger provinces mean bigger projects. */
export function buildTimeDays(p: Province, slotId: DevSlotId, currentTier: number): number {
  const def = DEV_SLOTS[slotId];
  const scale = 1 - DEV_TIME.sizeWeight + DEV_TIME.sizeWeight * sizeFactor(p);
  return Math.round(def.buildDays * Math.pow(def.buildDaysGrowth, currentTier) * scale);
}

/** Total annual upkeep of a province's built development ($/yr). Priced at
 *  the same local conditions as construction (staff wages track price level). */
export function upkeepCost(p: Province, levels: InfraLevels): number {
  const sf = sizeFactor(p) * localCostFactor(p);
  let total = 0;
  for (const id of DEV_SLOT_ORDER) {
    const def = DEV_SLOTS[id];
    let cumulativeCost = 0;
    for (let t = 0; t < levels[id]; t++) cumulativeCost += def.baseCost * Math.pow(def.costGrowth, t) * sf;
    total += cumulativeCost * def.upkeepFrac;
  }
  return total;
}

/** Heuristic coast test (until sea adjacency is wired into the ETL): terrain
 *  that hugs water, or a province carrying a fisheries deposit. Gates ports. */
export function isCoastal(p: Province): boolean {
  const t = p.data.terrain;
  if (t === 'MANGROVE' || t === 'WETLAND' || t === 'SWAMP') return true;
  const res = p.data.resources || {};
  return COASTAL_HINT.resources.some((r) => (res[r] ?? 0) > 0);
}

/** Can this slot be built here right now? (Coastal gate + max-tier gate.) */
export function canBuild(p: Province, slotId: DevSlotId, currentTier: number): boolean {
  const def = DEV_SLOTS[slotId];
  if (currentTier >= def.maxTier) return false;
  if (def.coastalOnly && !isCoastal(p)) return false;
  return true;
}
