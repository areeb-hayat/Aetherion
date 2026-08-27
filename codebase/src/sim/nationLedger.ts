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

/** The nation valued at TODAY'S date in the running campaign. */
export function nationLedger(id: string, mods?: LedgerMods): NationLedger | null {
  return openingLedger(id, { ...mods, gdpMult: (mods?.gdpMult ?? 1) * growthMultiplier(id) });
}

/** Realistic starting treasury (spendable reserves) for a fresh campaign. */
export function startingTreasuryFor(id: string): number | null {
  return openingLedger(id)?.treasury ?? null;
}
