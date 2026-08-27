/**
 * ============================================================================
 *  AETHERION — MAP OVERLAY REGISTRY  (the 14 map views, TDD Ch.06)
 * ============================================================================
 *  Each overlay is ONE entry: a label, a toolbar glyph, and a pure function
 *  that maps a province to a color. The renderer iterates this list to build
 *  the toolbar and to recolor the globe. To add/retune a view, edit ONLY here.
 *
 *  Live views (real data): sovereignty, terrain, resource, gdp, population,
 *  industrial — the latter four backed by the ETL's per-province deposits +
 *  economy (build-resources.mjs). The rest are registered and switchable with
 *  deterministic placeholder ramps so the whole toolbar is wired end-to-end;
 *  they light up as their systems land in later phases (`live: false`).
 */
import type { OverlayDef, OverlayId, Province } from '@/types';
import { rgbToHex, heat, hslToRgb, hexToRgb } from '@/lib/color';
import { color, mapViz } from '@/config/tokens';
import { dominantResource, resourceColor } from '@/config/resources';
import { provinceGdp } from '@/sim/economy';
import { industrialOutput } from '@/sim/infrastructure';
import { useDiplomacyStore, playerActor } from '@/store/diplomacyStore';
import { effectiveForeignPolicyNation } from '@/sim/sovereignty';
import { primaryBlocOf } from '@/sim/diplomacy';

const cold = hexToRgb(color.navy);
const gold = hexToRgb(color.gold);
const ally = hexToRgb(color.ally);
const enemy = hexToRgb(color.enemy);

/* -- diplomatic alignment: their view of YOU, memoized per nation ----------
 * colorFor runs for ~56k provinces on every overlay recompute; opinions are
 * per-NATION, so one cache keyed on (store rev, player) collapses that to ~200
 * opinion evaluations. */
let dipKey = '';
const dipCache = new Map<string, string>();
function diplomaticColor(nationId: string): string {
  if (!nationId) return color.neutralGrey;
  const store = useDiplomacyStore.getState();
  const actor = playerActor();
  const key = `${store.rev}:${actor ?? ''}`;
  if (key !== dipKey) {
    dipKey = key;
    dipCache.clear();
  }
  let c = dipCache.get(nationId);
  if (!c) {
    const eff = effectiveForeignPolicyNation(nationId);
    if (!actor) c = color.neutralGrey;
    else if (eff === actor) c = color.gold; // you and yours
    else c = rgbToHex(heat((store.opinionOf(eff, actor) + 100) / 200, enemy, ally));
    dipCache.set(nationId, c);
  }
  return c;
}

/** Coalition map: colour by primary bloc (military blocs win — see blocs.json). */
const blocCache = new Map<string, string>();
function coalitionColor(nationId: string): string {
  if (!nationId) return mapViz.diplomacy.nonAligned;
  let c = blocCache.get(nationId);
  if (!c) {
    const bloc = primaryBlocOf(effectiveForeignPolicyNation(nationId));
    c = (bloc && mapViz.diplomacy.blocs[bloc]) || mapViz.diplomacy.nonAligned;
    blocCache.set(nationId, c);
  }
  return c;
}

/** Stable 0..1 pseudo-value per province for placeholder ramps. */
const pseudo = (p: Province) => ((p.id * 2654435761) % 1000) / 1000;

/** Log-normalize a $ or headcount figure onto 0..1 between two decade marks —
 *  economic data spans 6+ orders of magnitude, linear ramps would be all-cold. */
const logRamp = (v: number, lo: number, hi: number) =>
  v > 0 ? Math.max(0, Math.min(1, (Math.log10(v) - lo) / (hi - lo))) : 0;

/** Realistic province output ($/yr) for the GDP heat map. */
// ponytail: opening-year output — the ramp spans four decades of $, so a
// campaign's growth moves a province's colour by a few percent of one step.
// Pass sim/growth's multiplier here if the ramp is ever narrowed to a band.
const gdpOf = (p: Province) => provinceGdp(p.nationId, p.data.population, p.data.economy.resourceOutput);

const defs: Record<OverlayId, OverlayDef> = {
  sovereignty: {
    id: 'sovereignty',
    label: 'Sovereignty',
    short: 'SOV',
    hint: 'Nation ownership',
    live: true,
    colorFor: (p) => p.color,
  },
  diplomatic: {
    id: 'diplomatic',
    label: 'Diplomatic Alignment',
    short: 'DIP',
    hint: 'How each nation regards you (ally ↔ hostile)',
    live: true,
    colorFor: (p) => diplomaticColor(p.nationId),
  },
  coalition: {
    id: 'coalition',
    label: 'Coalition Map',
    short: 'COA',
    hint: 'Bloc membership (NATO, EU, CSTO…)',
    live: true,
    colorFor: (p) => coalitionColor(p.nationId),
  },
  gdp: {
    id: 'gdp',
    label: 'GDP / Economic Output',
    short: 'GDP',
    hint: 'Yearly economic output (services + resources)',
    live: true,
    colorFor: (p) => rgbToHex(heat(logRamp(gdpOf(p), 7.5, 11.5), cold, gold)),
  },
  population: {
    id: 'population',
    label: 'Population Density',
    short: 'POP',
    hint: 'People per province',
    live: true,
    colorFor: (p) => rgbToHex(heat(logRamp(p.data.population, 3, 7.3), cold, enemy)),
  },
  industrial: {
    id: 'industrial',
    label: 'Industrial Capacity',
    short: 'IND',
    hint: 'Fuel + industrial mineral output',
    live: true,
    colorFor: (p) => rgbToHex(heat(logRamp(industrialOutput(p), 8, 10), cold, hexToRgb(mapViz.resources.palette.copper))),
  },
  military: {
    id: 'military',
    label: 'Military Strength',
    short: 'MIL',
    hint: 'Force presence',
    live: false,
    colorFor: (p) => rgbToHex(heat(pseudo(p), hexToRgb(color.steel), enemy)),
  },
  resource: {
    id: 'resource',
    label: 'Resource Map',
    short: 'RES',
    hint: 'Dominant deposit per province',
    live: true,
    colorFor: (p) => {
      const d = dominantResource(p);
      return d ? resourceColor(d.id) : mapViz.resources.none;
    },
  },
  tension: {
    id: 'tension',
    label: 'Tension / Flashpoint',
    short: 'TEN',
    hint: 'Border friction',
    live: false,
    colorFor: (p) => rgbToHex(heat(pseudo(p), hexToRgb(color.gold), enemy)),
  },
  trade: {
    id: 'trade',
    label: 'Trade Routes',
    short: 'TRD',
    hint: 'Trade flow volume',
    live: false,
    colorFor: (p) => rgbToHex(heat(pseudo(p), cold, hexToRgb(color.codeBlue))),
  },
  intelligence: {
    id: 'intelligence',
    label: 'Intelligence Coverage',
    short: 'INT',
    hint: 'SIGINT/GEOINT/HUMINT',
    live: false,
    colorFor: (p) => rgbToHex(heat(pseudo(p), hexToRgb(color.ink), hexToRgb(color.codeBlue))),
  },
  ideology: {
    id: 'ideology',
    label: 'Ideology',
    short: 'IDE',
    hint: 'Dominant POP ideology',
    live: false,
    colorFor: (p) => rgbToHex(hslToRgb(pseudo(p) * 320, 0.5, 0.52)),
  },
  terrain: {
    id: 'terrain',
    label: 'Climate & Terrain',
    short: 'TER',
    hint: 'Terrain types (elevation + latitude derived)',
    live: true, // backed by the ETL's per-province terrain classification
    colorFor: (p) => mapViz.terrain.palette[p.data.terrain] ?? color.neutralGrey,
  },
  satellite: {
    id: 'satellite',
    label: 'Satellite Coverage',
    short: 'SAT',
    hint: 'Orbital footprints',
    live: false,
    colorFor: (p) => rgbToHex(heat(pseudo(p), hexToRgb(color.ink), hexToRgb(color.teal))),
  },
};

/** Toolbar order (TDD Ch.06 numbering). */
export const OVERLAY_ORDER: OverlayId[] = [
  'sovereignty', 'diplomatic', 'coalition', 'gdp', 'population', 'industrial',
  'military', 'resource', 'tension', 'trade', 'intelligence', 'ideology',
  'terrain', 'satellite',
];

export const OVERLAYS = defs;
export const overlayList = OVERLAY_ORDER.map((id) => defs[id]);
export const getOverlay = (id: OverlayId) => defs[id];
