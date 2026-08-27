/**
 * ============================================================================
 *  AETHERION — RESOURCE CATALOGUE  (typed access to resourceCatalog.json)
 * ============================================================================
 *  The catalogue JSON is the single source of truth shared with the ETL
 *  generator (scripts/etl/build-resources.mjs): ids, names, categories,
 *  per-point yearly value, and the spawn rules the generator uses. Colours
 *  live in tokens.ts (mapViz.resources). Provinces carry deposits as
 *  `data.resources: { [resourceId]: richness 1..5 }`.
 */
import catalogJson from './resourceCatalog.json';
import { mapViz } from '@/config/tokens';
import type { Province } from '@/types';

export type ResourceCategory = 'FUEL' | 'AGRICULTURE' | 'INDUSTRIAL' | 'STRATEGIC';

export interface ResourceDef {
  id: string;
  name: string;
  category: ResourceCategory;
  /** $M per richness point per year (economy calc + dominance ranking). */
  value: number;
}

export const RESOURCES: ResourceDef[] = catalogJson.resources.map((r) => ({
  id: r.id,
  name: r.name,
  category: r.category as ResourceCategory,
  value: r.value,
}));

export const resourceById = new Map(RESOURCES.map((r) => [r.id, r]));

export const resourceColor = (id: string): string =>
  mapViz.resources.palette[id] ?? mapViz.resources.category[resourceById.get(id)?.category ?? ''] ?? mapViz.resources.none;

/** A province's deposits sorted most-valuable first (richness × unit value). */
export function sortedDeposits(p: Province): Array<{ def: ResourceDef; size: number }> {
  const res = p.data.resources;
  if (!res) return [];
  const out: Array<{ def: ResourceDef; size: number }> = [];
  for (const [id, size] of Object.entries(res)) {
    const def = resourceById.get(id);
    if (def && size > 0) out.push({ def, size });
  }
  return out.sort((a, b) => b.size * b.def.value - a.size * a.def.value);
}

/** The deposit that defines the province on the Resource overlay, or null. */
export function dominantResource(p: Province): ResourceDef | null {
  return sortedDeposits(p)[0]?.def ?? null;
}
