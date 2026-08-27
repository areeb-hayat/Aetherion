/**
 * Convenience bridge: build a nation's ledger from its cached aggregate stats.
 * Kept separate from the economy math (which is pure) and from the stores (so
 * both the session boot and the economy store can call it without an import
 * cycle). Returns null before the world data has loaded.
 *
 * Every ledger built here is dated: the nation's output is carried forward
 * from the campaign start by `sim/growth`, so an AI nation queried in game-year
 * twelve reports a twelve-years-grown economy, not its opening figure.
 */
import type { NationLedger } from '@/types';
import { computeLedger, type LedgerMods } from './economy';
import { growthFactor, yearsElapsed } from './growth';
import { commodityPosition, pricedResourceOutput } from './market';
import { getNationStat } from '@/features/menu/nationStats';
import { useSimStore } from '@/store/simStore';

/** Cumulative growth multiplier for a nation at the current campaign date. */
export function growthMultiplier(id: string, scar = 1): number {
  return growthFactor(id, yearsElapsed(useSimStore.getState().gameHours), scar);
}

/** The nation valued at CAMPAIGN START — no growth applied. Quitting to the
 *  menu suspends a campaign rather than ending it, so its clock is still
 *  standing in the sim store; the New Game dossier and the starting treasury
 *  must both read year zero regardless of what that clock says. */
export function openingLedger(id: string, mods?: LedgerMods): NationLedger | null {
  const s = getNationStat(id);
  if (!s) return null;
  return computeLedger(
    { id, population: s.population, provinceCount: s.provinceCount, resourceOutput: s.resourceOutput },
    mods,
  );
}

/** Where a nation stands in the commodity market today: what it sells, what it
 *  burns, and the swing in its output that the gap between them causes. */
export function marketPosition(id: string) {
  const s = getNationStat(id);
  if (!s) return null;
  const years = yearsElapsed(useSimStore.getState().gameHours);
  const baseGdp = s.population * s.gdpPerCapita * growthMultiplier(id);
  return { years, ...commodityPosition(id, s.resourceTotals, baseGdp, years) };
}

/** The nation valued at TODAY'S date in the running campaign: carried along its
 *  growth path, its deposits marked to the market, and its output swung by the
 *  terms of trade. */
export function nationLedger(id: string, mods?: LedgerMods): NationLedger | null {
  const s = getNationStat(id);
  if (!s) return null;
  const years = yearsElapsed(useSimStore.getState().gameHours);
  const grown = growthMultiplier(id);
  const pos = commodityPosition(id, s.resourceTotals, s.population * s.gdpPerCapita * grown, years);
  return computeLedger(
    {
      id,
      population: s.population,
      provinceCount: s.provinceCount,
      // Royalties are levied on what the ground is worth TODAY, not in 2026.
      resourceOutput: pricedResourceOutput(s.resourceTotals, years),
    },
    { ...mods, gdpMult: (mods?.gdpMult ?? 1) * grown * pos.termsOfTrade },
  );
}

/** Realistic starting treasury (spendable reserves) for a fresh campaign. */
export function startingTreasuryFor(id: string): number | null {
  return openingLedger(id)?.treasury ?? null;
}
