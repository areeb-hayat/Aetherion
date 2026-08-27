/**
 * ============================================================================
 *  AETHERION — PROVINCE UNREST  (pure model; state lives in politicsStore)
 * ============================================================================
 *  Unrest 0..100 is DERIVED per province from structural pressures, minus the
 *  sparse relief the player has bought (policing, granted autonomy, built
 *  infrastructure). The model follows relative deprivation, not wealth:
 *
 *    underdevelopment  (1 − devIndex) — poor states simmer, rich ones don't
 *    tax strain        heavy extraction WITHOUT services (discounted by dev)
 *    governance        weak/repressive archetypes carry a legitimacy penalty
 *    dependency        administered territories resent distance (tier bias)
 *    hotspots          ~10% of provinces carry latent separatist identity
 *    war/occupation    weariness joins when the military system lands
 *
 *  At/above the config threshold a province tips into a separatist INSURGENCY
 *  and becomes a breakaway de-facto region (politicsStore.triggerInsurgency).
 *  Tunables: config/autonomy.ts POLITICS.unrest. Design goal is OVERSIGHT, not
 *  micromanagement: a few provinces simmer, the player has a few real levers.
 */
import type { Province, InfraLevels } from '@/types';
import { POLITICS, AUTONOMY } from '@/config/autonomy';
import { autonomyTier } from '@/sim/sovereignty';
import { baseInfra, mergeLevels } from '@/sim/infrastructure';

const U = POLITICS.unrest;

/** Everything unrest needs to know beyond the province itself. */
export interface UnrestContext {
  /** Owning nation's 0..1 development index (ledger.development). */
  nationDev: number;
  /** Owning nation's revenue/GDP share (ledger tax burden), ~0.10..0.34. */
  taxShare: number;
  /** Owning nation's government archetype (governance grievance). */
  government?: string;
  /** Current levels for the province (base derived here if omitted). */
  levels?: InfraLevels;
  /** Sparse relief from politicsStore (policing, granted autonomy). */
  policeRelief?: number;
  autonomyGranted?: boolean;
  /** Reintegration residue: positive = grievance (raises unrest), negative =
   *  goodwill (calms). Decays toward 0 in politicsStore. */
  resentment?: number;
  /** Whether the owner is at war (war weariness). */
  atWar?: boolean;
  /** Progress (0..1) of each construction project underway HERE — a visible
   *  promise of investment; hope ramps as cranes rise. */
  activeProjectProgress?: number[];
  /** ECONOMIC tiers the player has COMPLETED here (infrastructure, industry,
   *  port, special) — delivered investment keeps calming the province. */
  builtEconTiers?: number;
  /** Nationwide fiscal pressures: IMF structural adjustment / empty coffers. */
  austerity?: boolean;
  fiscalCrisis?: boolean;
  /** Hours on the campaign clock — drives the slow seasonal drift. */
  gameHours: number;
}

/** Deterministic per-province, per-season noise: a slow ±6 drift so unrest
 *  breathes over months instead of being a static number. */
function seasonalDrift(provinceId: number, gameHours: number): number {
  const season = Math.floor(gameHours / (24 * 90)); // quarterly
  let h = (provinceId * 2654435761) ^ (season * 40503);
  h = Math.imul(h ^ (h >>> 13), 16777619);
  return (((h >>> 0) % 1300) / 100) - 6; // −6 .. +7
}

/** Latent separatist identity — a stable per-province hotspot bonus for about
 *  `hotspotShare` of provinces (the ethnic/identity proxy). */
function hotspot(provinceId: number): number {
  let h = Math.imul(provinceId ^ 0x9e3779b9, 2654435761);
  h = Math.imul(h ^ (h >>> 15), 16777619) >>> 0;
  if (h % 1000 >= U.hotspotShare * 1000) return 0;
  return ((h >>> 10) % (U.hotspotMax * 10)) / 10;
}

/** Unrest 0..100 for a populated land province. Sea/empty provinces return 0. */
export function provinceUnrest(p: Province, ctx: UnrestContext): number {
  if (p.isSea || !p.nationId || (p.data.population || 0) <= 0) return 0;

  let u = 8; // ambient grievance

  // Underdevelopment: the strongest structural driver.
  u += (1 - Math.max(0, Math.min(1, ctx.nationDev))) * U.underdevWeight;

  // Tax strain, discounted by development (taxes with services are consented).
  const strain = Math.max(0, Math.min(1, (ctx.taxShare - 0.14) / 0.2));
  u += strain * U.taxWeight * (1 - ctx.nationDev * 0.8);

  // Governance grievance (weak or repressive archetypes).
  if (ctx.government) u += U.govUnrest[ctx.government] ?? 0;

  // War weariness (owner at war).
  if (ctx.atWar) u += U.warWearinessWeight;

  // Dependencies simmer by tier (an administered territory resents distance).
  u += AUTONOMY[autonomyTier(p.nationId)].unrestBias * 30;

  // Latent separatist identity + slow seasonal breathing.
  u += hotspot(p.id);
  u += seasonalDrift(p.id, ctx.gameHours);

  // Reintegration residue (resentment seethes; goodwill calms). Decays.
  u += ctx.resentment ?? 0;

  // Fiscal climate: austerity cuts and visibly empty coffers radiate anger.
  if (ctx.austerity) u += U.austerityUnrest;
  if (ctx.fiscalCrisis) u += U.fiscalCrisisUnrest;

  // Relief: built infrastructure, policing (temporary), autonomy (permanent).
  const levels = ctx.levels ?? mergeLevels(baseInfra(p, ctx.nationDev));
  u -= Math.min(U.infraReliefMax, levels.infrastructure * U.infraReliefPerTier);
  u -= ctx.policeRelief ?? 0;
  if (ctx.autonomyGranted) u -= U.autonomyRelief;

  // Investment hope: works underway are a promise people can see...
  if (ctx.activeProjectProgress?.length) {
    let hope = 0;
    for (const t of ctx.activeProjectProgress) {
      hope += U.investmentHopeBase + U.investmentHopeRamp * Math.max(0, Math.min(1, t));
    }
    u -= Math.min(U.investmentHopeMax, hope);
  }
  // ...and delivered economic development is the durable answer.
  if (ctx.builtEconTiers) u -= Math.min(U.devReliefMax, ctx.builtEconTiers * U.devReliefPerTier);

  return Math.max(0, Math.min(100, Math.round(u)));
}

export const isInsurgencyLevel = (unrest: number) => unrest >= U.insurgencyThreshold;
export const isPacifiable = (unrest: number) => unrest < U.pacifyThreshold;

/** Colour ramp key for the unrest bar (calm → simmering → critical). */
export function unrestBand(unrest: number): 'calm' | 'uneasy' | 'volatile' | 'critical' {
  if (unrest >= U.insurgencyThreshold) return 'critical';
  if (unrest >= 55) return 'volatile';
  if (unrest >= 30) return 'uneasy';
  return 'calm';
}
