/**
 * ============================================================================
 *  AETHERION — DEVELOPMENT & INFRASTRUCTURE CATALOG  (single source of truth)
 * ============================================================================
 *  The six province development slots from GDD Ch.23.1. Each slot is a tiered
 *  improvement the player builds up over the campaign; tiers cost treasury and
 *  levy annual upkeep, and their EFFECTS feed the economy now (and the military
 *  / logistics / trade systems as those come online). Base levels for a fresh
 *  campaign are DERIVED from each province's data in `sim/infrastructure.ts`
 *  using the weights at the bottom of this file.
 *
 *  To add a slot, retune a cost, or change what a tier does: edit ONLY here.
 */

export type DevSlotId =
  | 'infrastructure'
  | 'industry'
  | 'fortification'
  | 'port'
  | 'airfield'
  | 'special';

export type DevCategory = 'economic' | 'military' | 'special';

/** What one tier of a slot does. Coefficients are PER TIER (linear in level):
 *  the aggregate effect of level L is coefficient × L. Economic fields are read
 *  by sim/economy.ts today; the military/logistics fields are hooks the war and
 *  movement systems will consume in later phases. */
export interface DevEffect {
  /** Multiplier added to province economic output per tier (throughput). */
  gdpPerTier?: number;
  /** Multiplier added to trade / tariff throughput per tier. */
  tradePerTier?: number;
  /** Extra tax efficiency per tier (special economic zones). */
  taxPerTier?: number;
  /** Defensive entrenchment multiplier per tier (military). */
  defensePerTier?: number;
  /** Army transit-speed bonus per tier (logistics). */
  movePerTier?: number;
  /** Naval throughput / basing capacity per tier (military). */
  navalPerTier?: number;
  /** Air staging capacity per tier (military). */
  airPerTier?: number;
}

export interface DevSlotDef {
  id: DevSlotId;
  name: string;
  short: string; // 3-char glyph for compact readouts
  category: DevCategory;
  description: string;
  maxTier: number;
  coastalOnly?: boolean;
  /** Cost of the FIRST tier at a reference province (scaled by size in sim). */
  baseCost: number; // $
  /** Each successive tier multiplies the previous tier's cost by this. */
  costGrowth: number;
  /** Annual upkeep per built tier, as a fraction of that tier's build cost. */
  upkeepFrac: number;
  /** GAME-DAYS to build the first tier (scaled by size + tier in sim). */
  buildDays: number;
  /** Each successive tier multiplies the previous tier's build time by this. */
  buildDaysGrowth: number;
  effect: DevEffect;
}

/** Construction pacing shared by every slot. Development is a PROJECT: it is
 *  funded up-front, takes buildDays of game time, and once complete its
 *  economic effect phases in over rampDays (a new rail line doesn't move the
 *  GDP needle the day the ribbon is cut). */
export const DEV_TIME = {
  /** Completed tiers phase their economic effect in over this many game-days. */
  rampDays: 90,
  /** Build-time size scaling: days × (1 − w + w × sizeFactor(province)). */
  sizeWeight: 0.3,
} as const;

export const DEV_SLOTS: Record<DevSlotId, DevSlotDef> = {
  infrastructure: {
    id: 'infrastructure',
    name: 'Infrastructure',
    short: 'INF',
    category: 'economic',
    description: 'Rail, highways and power grids. Raises economic throughput, trade flow and army transit speed.',
    maxTier: 5,
    baseCost: 1.2e9,
    costGrowth: 1.85,
    upkeepFrac: 0.05,
    buildDays: 150,
    buildDaysGrowth: 1.3,
    effect: { gdpPerTier: 0.06, tradePerTier: 0.08, movePerTier: 0.1 },
  },
  industry: {
    id: 'industry',
    name: 'Industry',
    short: 'IND',
    category: 'economic',
    description: 'Factories and processing plants. Converts raw resources into value and anchors the defence-industrial base.',
    maxTier: 5,
    baseCost: 1.6e9,
    costGrowth: 1.9,
    upkeepFrac: 0.06,
    buildDays: 180,
    buildDaysGrowth: 1.3,
    effect: { gdpPerTier: 0.08, tradePerTier: 0.03 },
  },
  fortification: {
    id: 'fortification',
    name: 'Fortifications',
    short: 'FORT',
    category: 'military',
    description: 'Permanent defensive works. A standing entrenchment multiplier that degrades only when the province is taken.',
    maxTier: 5,
    baseCost: 0.9e9,
    costGrowth: 1.7,
    upkeepFrac: 0.04,
    buildDays: 120,
    buildDaysGrowth: 1.25,
    effect: { defensePerTier: 0.25 },
  },
  port: {
    id: 'port',
    name: 'Port',
    short: 'PORT',
    category: 'economic',
    coastalOnly: true,
    description: 'Deepwater harbour. Expands maritime trade throughput and provides naval basing capacity.',
    maxTier: 5,
    baseCost: 1.4e9,
    costGrowth: 1.8,
    upkeepFrac: 0.05,
    buildDays: 240,
    buildDaysGrowth: 1.25,
    effect: { tradePerTier: 0.12, navalPerTier: 1, gdpPerTier: 0.02 },
  },
  airfield: {
    id: 'airfield',
    name: 'Airfield',
    short: 'AIR',
    category: 'military',
    description: 'Air staging complex. Expands air-wing capacity and cuts scramble time for regional coverage.',
    maxTier: 5,
    baseCost: 1.1e9,
    costGrowth: 1.75,
    upkeepFrac: 0.05,
    buildDays: 140,
    buildDaysGrowth: 1.25,
    effect: { airPerTier: 1, movePerTier: 0.02 },
  },
  special: {
    id: 'special',
    name: 'Special Economic Zone',
    short: 'SEZ',
    category: 'special',
    description: 'SEZ, high-tech hub or agricultural collective. A concentrated productivity and tax multiplier that attracts specific POP classes.',
    maxTier: 3,
    baseCost: 3.0e9,
    costGrowth: 2.1,
    upkeepFrac: 0.03,
    buildDays: 300,
    buildDaysGrowth: 1.35,
    effect: { gdpPerTier: 0.12, taxPerTier: 0.05, tradePerTier: 0.05 },
  },
};

export const DEV_SLOT_ORDER: DevSlotId[] = [
  'infrastructure',
  'industry',
  'special',
  'port',
  'fortification',
  'airfield',
];

export const devSlotList = DEV_SLOT_ORDER.map((id) => DEV_SLOTS[id]);

/* ---- Base-level derivation (a fresh campaign's starting development) ------ */

/** Weights that turn province data into starting tiers. Infrastructure and
 *  industry reflect how developed/urban/resource-rich a province already is;
 *  fortification seeds the capital; port/airfield/special start empty and are
 *  built by the player. All results are clamped to the slot's maxTier. */
export const DEV_BASE = {
  /** Population (people) that maps to +1 infrastructure tier, log-scaled. */
  infraPopPer: 400_000,
  infraDevWeight: 3.2, // national development index contribution (0..1 → tiers)
  infraMax: 5,
  /** Industrial output ($/yr from fuel+industrial deposits) per +1 industry tier. */
  industryOutputPer: 1.2e9,
  industryPopWeight: 1.0,
  industryMax: 5,
  /** The capital province starts fortified to this tier. */
  capitalFortTier: 1,
} as const;

/** A coastal province is required to build a port. Until adjacency is wired,
 *  this heuristic flags provinces that plausibly touch water. */
export const COASTAL_HINT = {
  /** Presence of these deposits implies a coast (fisheries / offshore energy). */
  resources: ['fish'] as const,
};
