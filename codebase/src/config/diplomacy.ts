/**
 * ============================================================================
 *  AETHERION — DIPLOMACY RULESET  (stance bands, actions, war-avoidance)
 * ============================================================================
 *  The single source of truth for how nations feel about one another and what
 *  they can do about it. Baselines are DERIVED from blocs.json (no 280×280
 *  matrix is stored); only deviations from actions/events live in the store.
 *  Pure math is in sim/diplomacy.ts; the store is store/diplomacyStore.ts.
 *
 *  War-avoidance is structural: war needs a CASUS BELLI (not just low opinion),
 *  opinion decays toward baseline over time, and the action set is rich in
 *  pressure short of war (sanctions, embargo, severing ties). See sim/diplomacy.
 */
import { color } from '@/config/tokens';
import blocsJson from './blocs.json';

/* ---- Blocs & pairwise seeds (typed view of blocs.json) ------------------- */

export interface BlocDef {
  name: string;
  kind: string;
  cohesion: number;
  opposes: string[];
  members: string[];
}
export const BLOCS: Record<string, BlocDef> = blocsJson.blocs as Record<string, BlocDef>;
export const RIVALRIES = blocsJson.rivalries as { a: string; b: string; v: number }[];
export const PARTNERSHIPS = blocsJson.partnerships as { a: string; b: string; v: number }[];

/* ---- Stance bands -------------------------------------------------------- */

export type StanceId = 'ALLY' | 'FRIENDLY' | 'CORDIAL' | 'NEUTRAL' | 'COOL' | 'TENSE' | 'HOSTILE';

export interface StanceBand {
  id: StanceId;
  label: string;
  /** Inclusive lower bound on opinion (−100..100). */
  min: number;
  color: string;
}

/** Ordered high → low; `stance()` picks the first whose `min` the opinion meets. */
export const STANCE_BANDS: StanceBand[] = [
  { id: 'ALLY', label: 'Allied', min: 60, color: color.ally },
  { id: 'FRIENDLY', label: 'Friendly', min: 30, color: '#4FB477' },
  { id: 'CORDIAL', label: 'Cordial', min: 10, color: '#7FA98C' },
  { id: 'NEUTRAL', label: 'Neutral', min: -10, color: color.neutralGrey },
  { id: 'COOL', label: 'Cool', min: -30, color: '#9E7A5A' },
  { id: 'TENSE', label: 'Tense', min: -60, color: '#C0662B' },
  { id: 'HOSTILE', label: 'Hostile', min: -100, color: color.enemy },
];

/* ---- Treaties & sanctions ------------------------------------------------ */

export type TreatyType = 'NAP' | 'TRADE' | 'ALLIANCE';
export type SanctionType = 'SANCTIONS' | 'EMBARGO';

export const TREATY_LABEL: Record<TreatyType, string> = {
  NAP: 'Non-Aggression Pact',
  TRADE: 'Trade Agreement',
  ALLIANCE: 'Alliance',
};
export const SANCTION_LABEL: Record<SanctionType, string> = {
  SANCTIONS: 'Sanctions',
  EMBARGO: 'Trade Embargo',
};

/* ---- Action catalog ------------------------------------------------------ */

export type ActionKind = 'positive' | 'negative' | 'aggressive';

export interface ActionRequire {
  minOpinion?: number; // your current opinion of them must be ≥ this
  maxOpinion?: number; // …must be ≤ this
  treaty?: TreatyType; // an existing treaty is required
  noTreaty?: TreatyType; // must NOT already have this treaty
  sanction?: SanctionType; // you must currently impose this
  noSanction?: SanctionType; // you must NOT currently impose this
  severed?: boolean; // ties must be severed
  notSevered?: boolean; // ties must be intact
  casusBelli?: boolean; // a valid casus belli must exist
}

export interface ActionEffect {
  opinionSelf?: number; // change to YOUR opinion of them
  opinionThem?: number; // change to THEIR opinion of you
  addTreaty?: TreatyType;
  removeTreaty?: TreatyType;
  addSanction?: SanctionType;
  removeSanction?: SanctionType;
  sever?: boolean;
  restore?: boolean;
  war?: boolean;
}

export interface ActionDef {
  id: string;
  label: string;
  icon: string;
  kind: ActionKind;
  blurb: string;
  /** Treasury cost as a fraction of your yearly government revenue (0 = free). */
  costFrac: number;
  cooldownDays: number;
  requires?: ActionRequire;
  effect: ActionEffect;
}

export const ACTIONS: ActionDef[] = [
  {
    id: 'improve',
    label: 'Improve Relations',
    icon: '⇧',
    kind: 'positive',
    blurb: 'A steady diplomatic overture — small, repeatable goodwill.',
    costFrac: 0.004,
    cooldownDays: 60,
    requires: { notSevered: true },
    effect: { opinionSelf: 2, opinionThem: 6 },
  },
  {
    id: 'envoy',
    label: 'Send Envoy',
    icon: '✉',
    kind: 'positive',
    blurb: 'A high-level mission — a larger, slower goodwill investment.',
    costFrac: 0.012,
    cooldownDays: 150,
    requires: { notSevered: true },
    effect: { opinionThem: 12 },
  },
  {
    id: 'trade_agreement',
    label: 'Offer Trade Agreement',
    icon: '⚓',
    kind: 'positive',
    blurb: 'Lower tariffs both ways — mutual prosperity and warmer ties.',
    costFrac: 0,
    cooldownDays: 30,
    requires: { minOpinion: 0, noTreaty: 'TRADE', noSanction: 'EMBARGO', notSevered: true },
    effect: { opinionThem: 8, opinionSelf: 4, addTreaty: 'TRADE' },
  },
  {
    id: 'non_aggression',
    label: 'Non-Aggression Pact',
    icon: '🕊',
    kind: 'positive',
    blurb: 'A mutual pledge not to attack — cheap insurance against war.',
    costFrac: 0,
    cooldownDays: 30,
    requires: { minOpinion: -20, noTreaty: 'NAP', notSevered: true },
    effect: { opinionThem: 6, opinionSelf: 4, addTreaty: 'NAP' },
  },
  {
    id: 'alliance',
    label: 'Propose Alliance',
    icon: '🤝',
    kind: 'positive',
    blurb: 'Bind your fates together — mutual defence and deep alignment.',
    costFrac: 0,
    cooldownDays: 30,
    requires: { minOpinion: 40, noTreaty: 'ALLIANCE', notSevered: true },
    effect: { opinionThem: 12, opinionSelf: 8, addTreaty: 'ALLIANCE' },
  },
  {
    id: 'denounce',
    label: 'Denounce',
    icon: '📢',
    kind: 'negative',
    blurb: 'A public condemnation — cheap pressure that sours relations.',
    costFrac: 0,
    cooldownDays: 45,
    requires: { notSevered: true },
    effect: { opinionThem: -12, opinionSelf: -4 },
  },
  {
    id: 'sanctions',
    label: 'Impose Sanctions',
    icon: '⚖',
    kind: 'negative',
    blurb: 'Targeted economic pressure — bites their economy and your ties.',
    costFrac: 0,
    cooldownDays: 60,
    requires: { noSanction: 'SANCTIONS' },
    effect: { opinionThem: -15, opinionSelf: -8, addSanction: 'SANCTIONS' },
  },
  {
    id: 'lift_sanctions',
    label: 'Lift Sanctions',
    icon: '⚖',
    kind: 'positive',
    blurb: 'Ease the pressure as a goodwill gesture.',
    costFrac: 0,
    cooldownDays: 30,
    requires: { sanction: 'SANCTIONS' },
    effect: { opinionThem: 8, removeSanction: 'SANCTIONS' },
  },
  {
    id: 'embargo',
    label: 'Trade Embargo',
    icon: '⛔',
    kind: 'negative',
    blurb: 'Cut off trade entirely — severe pressure, severe blowback.',
    costFrac: 0,
    cooldownDays: 90,
    requires: { noSanction: 'EMBARGO' },
    effect: { opinionThem: -20, opinionSelf: -10, addSanction: 'EMBARGO', removeTreaty: 'TRADE' },
  },
  {
    id: 'lift_embargo',
    label: 'Lift Embargo',
    icon: '⛔',
    kind: 'positive',
    blurb: 'Reopen trade.',
    costFrac: 0,
    cooldownDays: 30,
    requires: { sanction: 'EMBARGO' },
    effect: { opinionThem: 10, removeSanction: 'EMBARGO' },
  },
  {
    id: 'sever_ties',
    label: 'Sever Ties',
    icon: '✂',
    kind: 'negative',
    blurb: 'Recall your embassy and cut formal relations — a deep freeze.',
    costFrac: 0,
    cooldownDays: 60,
    requires: { notSevered: true },
    effect: { opinionThem: -18, opinionSelf: -10, sever: true, removeTreaty: 'ALLIANCE' },
  },
  {
    id: 'rebuild_ties',
    label: 'Rebuild Ties',
    icon: '🔗',
    kind: 'positive',
    blurb: 'Restore formal relations and reopen the embassy.',
    costFrac: 0.006,
    cooldownDays: 60,
    requires: { severed: true },
    effect: { opinionThem: 12, opinionSelf: 6, restore: true },
  },
  {
    id: 'declare_war',
    label: 'Declare War',
    icon: '⚔',
    kind: 'aggressive',
    blurb: 'Open hostilities — permitted only with a legitimate casus belli.',
    costFrac: 0,
    cooldownDays: 0,
    requires: { casusBelli: true },
    effect: { opinionThem: -60, opinionSelf: -40, war: true },
  },
];

export const ACTION_BY_ID = new Map(ACTIONS.map((a) => [a.id, a]));

/* ---- War-avoidance ------------------------------------------------------- */

export const WAR = {
  /** Opinion at/below which raw hostility alone constitutes a casus belli.
   *  Set BELOW every natural baseline (the coldest real-world pair rests around
   *  −80 with modifiers) so day-one war is impossible — a war needs deliberate
   *  escalation (severing, embargoes, denouncements) or an event-granted cause. */
  casusBelliOpinion: -85,
  /** Baseline opinion decays toward its natural value at this rate per game
   *  year, so grudges from actions cool off (war is not a one-way ratchet). */
  decayPerYear: 8,
  /** AI reluctance: even with a casus belli the AI declares war only if it is
   *  this many× stronger AND has no binding treaty — modelled in the scheduler. */
  aiPowerRatioToAttack: 1.8,
} as const;

/** Clamp opinion to the storable range. */
export const OPINION_MIN = -100;
export const OPINION_MAX = 100;
