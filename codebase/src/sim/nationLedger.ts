/**
 * Convenience bridge: build a nation's ledger from its cached aggregate stats.
 * Kept separate from the economy math (which is pure) and from the stores (so
 * both the session boot and the economy store can call it without an import
 * cycle). Returns null before the world data has loaded.
 */
import type { NationLedger } from '@/types';
import { computeLedger, type LedgerMods } from './economy';
import { getNationStat } from '@/features/menu/nationStats';

export function nationLedger(id: string, mods?: LedgerMods): NationLedger | null {
  const s = getNationStat(id);
  if (!s) return null;
  return computeLedger(
    { id, population: s.population, provinceCount: s.provinceCount, resourceOutput: s.resourceOutput },
    mods,
  );
}

/** Realistic starting treasury (spendable reserves) for a fresh campaign. */
export function startingTreasuryFor(id: string): number | null {
  return nationLedger(id)?.treasury ?? null;
}
