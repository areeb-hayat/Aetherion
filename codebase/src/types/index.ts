/**
 * ============================================================================
 *  AETHERION — SHARED TYPES  (one home for every cross-module shape)
 * ============================================================================
 *  If a shape is used by more than one module, it lives here. Keeps imports
 *  predictable and makes "what fields does X have?" a single lookup.
 */

/* ---- Geography (matches the ETL output + TDD Ch.02 province model) -------*/

/** Extensible per-nation data (the simulation grows this over phases). */
export interface NationData {
  population: number;
  government: string;
  creditRating: string;
}

/** Extensible per-province data (terrain, demographics, economy, …). */
export interface ProvinceData {
  terrain: string; // GRASSLAND | HILLS | MOUNTAINS | DESERT | RAINFOREST | …
  population: number;
  /** Equal-Earth projected area (∝ real surface area). Present on land provinces
   *  (etl build-map); sea/EEZ cells omit it. Drives area-fair resource spread and
   *  can size development costs by real extent rather than a population proxy. */
  area?: number;
  /** gdp = services baseline + resource output; both $/yr (etl build-resources). */
  economy: { gdp: number; resourceOutput: number };
  /** Deposits: resource id (resourceCatalog.json) → richness 1..5. */
  resources: Record<string, number>;
  /** Strategic value 0..100 (population + resource wealth + anchor cities). */
  value: number;
}

export interface Nation {
  id: string; // ISO-A3 code, e.g. "IND"
  name: string;
  color: string; // muted, flag-derived hex
  flag: string | null; // ISO-2 code → /data/flags/<flag>.png
  data: NationData;
}

export interface Province {
  id: number; // 1..N; 0 is reserved for ocean / none
  name: string;
  nationId: string; // -> Nation.id (empty/null for International Waters)
  color: string; // owning nation color (cached for the sovereignty overlay)
  centroid: [number, number]; // [x, y] in Equal-Earth projection units
  isSea?: boolean; // sea province (EEZ cell or international waters)
  data: ProvinceData;
}

export interface WorldData {
  meta: {
    generated: string;
    source: string;
    nationCount: number;
    provinceCount: number;
    texture: { width: number; height: number };
  };
  nations: Nation[];
  provinces: Province[];
}

export interface TextureManifest {
  width: number;
  height: number;
  provinceCount: number;
  encoding: 'rgb-id';
}

/* ---- Map overlays --------------------------------------------------------*/
export type OverlayId =
  | 'sovereignty'
  | 'diplomatic'
  | 'coalition'
  | 'gdp'
  | 'population'
  | 'industrial'
  | 'military'
  | 'resource'
  | 'tension'
  | 'trade'
  | 'intelligence'
  | 'ideology'
  | 'terrain'
  | 'satellite';

/** Context handed to every overlay color function (extended as systems land). */
export interface OverlayContext {
  nationsById: Map<string, Nation>;
}

export interface OverlayDef {
  id: OverlayId;
  label: string;
  short: string; // 1–3 char toolbar glyph/abbreviation
  hint: string;
  /** Pure: province + context -> hex color. Cached per tick by the renderer. */
  colorFor: (province: Province, ctx: OverlayContext) => string;
  /** True once the overlay is backed by real simulation data (Phase 1: only sovereignty). */
  live: boolean;
}

/* ---- Notifications (subset of TDD Ch.09 for Phase 1) --------------------*/
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type EventCategory =
  | 'MILITARY'
  | 'DIPLOMATIC'
  | 'ECONOMIC'
  | 'DOMESTIC'
  | 'INTELLIGENCE'
  | 'GLOBAL'
  | 'SCIENCE';

export interface GameEvent {
  id: string;
  gameDate: string;
  category: EventCategory;
  severity: Severity;
  headline: string;
  detail?: string;
}

/* ---- National economy (sim/economy.ts, config/economy.ts) ----------------*/
import type { CreditRating, IncomeGroup } from '@/config/economy';
import type { DevSlotId } from '@/config/infrastructure';
export type { CreditRating, IncomeGroup } from '@/config/economy';

/** Government revenue lines, $/yr. */
export interface Revenue {
  tax: number; // income / corporate / consumption
  resource: number; // royalties on extractive output
  trade: number; // tariffs + transit fees
  total: number;
}

/** Government expenditure lines, $/yr. */
export interface Spending {
  admin: number; // bureaucracy — scales with territory + GDP
  military: number; // peacetime defence
  social: number; // welfare — grows with development
  infrastructure: number; // upkeep on built development
  debtInterest: number; // rate × debt
  total: number;
}

/** The full national account for one nation — the fiscal heart of the sim.
 *  Pure output of `computeLedger`; nothing here is mutated in place. */
export interface NationLedger {
  id: string;
  population: number;
  gdp: number; // $/yr, realistic (population × effective per-capita)
  gdpPerCapita: number;
  incomeGroup: IncomeGroup;
  development: number; // 0..1 development index
  government: string;
  revenue: Revenue;
  spending: Spending;
  balance: number; // revenue.total − spending.total ($/yr)
  treasury: number; // starting spendable reserves ($)
  debt: number; // sovereign debt ($)
  debtToGdp: number; // 0..~1.5
  creditRating: CreditRating;
  interestRate: number; // annual, on debt
  resourceShare: number; // 0..1 fraction of GDP that is extractive
}

/* ---- Sovereign finance (config/finance.ts, sim/finance.ts) ----------------*/

/** One sovereign loan on the books — IMF tranche credit or a bilateral line. */
export interface Loan {
  id: string;
  /** 'IMF' or a lender nation code ('CHN', 'SAU', …). */
  lender: string;
  principal: number; // $ originally committed
  outstanding: number; // $ still owed
  rate: number; // annual interest
  startedAt: number; // gameHours
  termYears: number; // repayment horizon after grace
  graceYears: number; // interest-only period
  kind: 'imf' | 'bilateral';
}

/** An active (or completed) IMF stabilisation program. */
export interface ImfProgram {
  startedAt: number; // gameHours
  total: number; // $ committed (quota)
  disbursed: number; // $ released so far
  released: number; // tranche count released
  active: boolean; // false once exited/completed (austerity off)
}

/** How the current deficit/surplus is being financed — drives the HUD tint
 *  and the treasury drift. */
export interface FinancingSummary {
  mode: 'surplus' | 'bonds' | 'reserves';
  /** Whether bond markets are open to us at the current rating/debt. */
  access: boolean;
  /** $/yr the state must raise after revenue (0 when in surplus). */
  needPerYear: number;
  bondIssuancePerYear: number; // new debt taken on at market ($/yr)
  loanServicePerYear: number; // amortization due on loans ($/yr)
  treasuryDriftPerYear: number; // what actually hits the treasury ($/yr)
}

/* ---- Province development (config/infrastructure.ts, sim/infrastructure) --*/

/** Current tier per development slot for one province (0 = unbuilt). */
export type InfraLevels = Record<DevSlotId, number>;

/** Aggregated economic/military effect of a province's development. */
export interface InfraEffects {
  gdpMult: number; // ×1 baseline, raised by infrastructure/industry/SEZ
  tradeMult: number;
  taxMult: number;
  defenseMult: number;
  moveMult: number;
  navalCapacity: number;
  airCapacity: number;
}

/* ---- Simulation clock ----------------------------------------------------*/
export type SimSpeed = 0 | 1 | 2 | 3; // 0 = paused

export interface SimSnapshot {
  gameHours: number; // hours since the campaign epoch
  treasury: number;
}
