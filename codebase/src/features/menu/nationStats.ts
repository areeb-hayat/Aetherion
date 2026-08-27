/**
 * Per-nation aggregate statistics for the New Game dossier.
 *
 * The world has ~280 nations across ~56k provinces. Rather than re-scan on every
 * hover, we sweep all provinces ONCE and cache a full nation→stats map, keyed on
 * the loaded province count so it rebuilds only if the world data changes.
 */
import type { Province } from '@/types';
import { useWorldStore } from '@/store/worldStore';
import { resourceById } from '@/config/resources';
import { perCapitaFor, governmentFor } from '@/sim/economy';

export type PowerTier =
  | 'Superpower'
  | 'Great Power'
  | 'Major Power'
  | 'Regional Power'
  | 'Minor Power'
  | 'Micronation';

export interface NationStat {
  id: string;
  provinceCount: number; // land provinces only
  population: number; // authoritative nation figure
  provincePopulation: number; // summed from provinces (sanity / density)
  gdp: number; // $/yr, realistic (population × real per-capita)
  gdpPerCapita: number; // $/yr per person
  government: string; // real macro archetype (not the baked placeholder)
  resourceOutput: number; // $/yr from deposits
  strategicValue: number; // summed province strategic value
  capital: string | null;
  topResources: { id: string; total: number }[]; // dominant deposits, richest first
  terrainMix: { terrain: string; count: number }[]; // most common biomes first
  tier: PowerTier;
  /** Population-weighted Equal-Earth centroid — proximity for diplomacy. */
  centroid: [number, number] | null;
}

function classify(gdp: number, population: number): PowerTier {
  if (gdp >= 3e12 && population >= 1.5e8) return 'Superpower';
  if (gdp >= 1.2e12) return 'Great Power';
  if (gdp >= 3e11) return 'Major Power';
  if (gdp >= 4e10) return 'Regional Power';
  if (gdp >= 3e9) return 'Minor Power';
  return 'Micronation';
}

let cache: Map<string, NationStat> | null = null;
let cacheKey = -1;

function build(): Map<string, NationStat> {
  const world = useWorldStore.getState();
  const nations = world.nations;
  const provinces = world.provinces;
  const cities = world.cities;

  // Accumulators keyed by nation id.
  interface Acc {
    provinceCount: number;
    provincePopulation: number;
    gdp: number;
    resourceOutput: number;
    strategicValue: number;
    resources: Map<string, number>;
    terrain: Map<string, number>;
    cx: number; // pop-weighted centroid accumulators (Equal-Earth)
    cy: number;
    cw: number;
  }
  const acc = new Map<string, Acc>();
  const ensure = (id: string): Acc => {
    let a = acc.get(id);
    if (!a) {
      a = {
        provinceCount: 0,
        provincePopulation: 0,
        gdp: 0,
        resourceOutput: 0,
        strategicValue: 0,
        resources: new Map(),
        terrain: new Map(),
        cx: 0,
        cy: 0,
        cw: 0,
      };
      acc.set(id, a);
    }
    return a;
  };

  provinces.forEach((p: Province) => {
    if (!p.nationId || p.isSea) return; // skip ocean / EEZ cells for land stats
    const a = ensure(p.nationId);
    a.provinceCount++;
    a.provincePopulation += p.data.population || 0;
    a.gdp += p.data.economy?.gdp || 0;
    a.resourceOutput += p.data.economy?.resourceOutput || 0;
    a.strategicValue += p.data.value || 0;
    const w = Math.max(1, p.data.population || 1);
    a.cx += p.centroid[0] * w;
    a.cy += p.centroid[1] * w;
    a.cw += w;
    a.terrain.set(p.data.terrain, (a.terrain.get(p.data.terrain) || 0) + 1);
    for (const [rid, size] of Object.entries(p.data.resources || {})) {
      a.resources.set(rid, (a.resources.get(rid) || 0) + size);
    }
  });

  // Capital lookup: prefer the flagged capital whose province belongs to the
  // nation; fall back to the nation's largest city.
  const capitalByNation = new Map<string, { name: string; pop: number; cap: boolean }>();
  for (const c of cities) {
    if (!c.province) continue;
    const prov = provinces.get(c.province);
    const nid = prov?.nationId;
    if (!nid) continue;
    const cur = capitalByNation.get(nid);
    const better =
      !cur ||
      (!!c.cap && !cur.cap) || // a flagged capital always beats a non-capital
      (!!c.cap === !!cur.cap && c.pop > cur.pop);
    if (better) capitalByNation.set(nid, { name: c.name, pop: c.pop, cap: !!c.cap });
  }

  const out = new Map<string, NationStat>();
  nations.forEach((nation, id) => {
    const a = acc.get(id);
    const population = nation.data.population || a?.provincePopulation || 0;
    // Realistic GDP = population × the nation's real per-capita output (the
    // baked pop×$4000 figure is discarded in favour of the economy model).
    const perCapita = perCapitaFor(id);
    const gdp = population * perCapita;
    const topResources = a
      ? [...a.resources.entries()]
          .sort((x, y) => y[1] - x[1])
          .slice(0, 6)
          .map(([rid, total]) => ({ id: rid, total }))
      : [];
    const terrainMix = a
      ? [...a.terrain.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4).map(([terrain, count]) => ({ terrain, count }))
      : [];
    out.set(id, {
      id,
      provinceCount: a?.provinceCount || 0,
      population,
      provincePopulation: a?.provincePopulation || 0,
      gdp,
      gdpPerCapita: perCapita,
      government: governmentFor(id),
      resourceOutput: a?.resourceOutput || 0,
      strategicValue: Math.round(a?.strategicValue || 0),
      capital: capitalByNation.get(id)?.name ?? null,
      topResources,
      terrainMix,
      tier: classify(gdp, population),
      centroid: a && a.cw > 0 ? [a.cx / a.cw, a.cy / a.cw] : null,
    });
  });
  return out;
}

/** Cached per-nation stats (rebuilds only when the world data changes). */
export function nationStatsMap(): Map<string, NationStat> {
  const count = useWorldStore.getState().provinceCount;
  if (!cache || cacheKey !== count) {
    cache = build();
    cacheKey = count;
  }
  return cache;
}

export function getNationStat(id: string | null | undefined): NationStat | undefined {
  if (!id) return undefined;
  return nationStatsMap().get(id);
}

/** Human-readable deposit name for a resource id. */
export const resourceName = (id: string) => resourceById.get(id)?.name ?? id;
