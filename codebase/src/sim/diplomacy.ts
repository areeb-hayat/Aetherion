/**
 * ============================================================================
 *  AETHERION — DIPLOMACY LOGIC  (pure math; state lives in diplomacyStore)
 * ============================================================================
 *  Baseline opinion between any two foreign-policy actors is DERIVED on demand
 *  from config/blocs.json (shared blocs, opposing blocs, explicit rivalries and
 *  partnerships), government affinity and proximity — so no 280×280 matrix is
 *  ever stored. The store keeps only sparse DEVIATIONS (from actions/events);
 *  `opinionOf` in the store = baseline + delta + treaty/sanction modifiers.
 *
 *  War-avoidance is structural: `hasCasusBelli` (not opinion alone) gates war,
 *  and the AI helpers weigh relative power before ever choosing it.
 */
import {
  BLOCS,
  RIVALRIES,
  PARTNERSHIPS,
  STANCE_BANDS,
  WAR,
  OPINION_MIN,
  OPINION_MAX,
  type StanceBand,
  type TreatyType,
  type SanctionType,
} from '@/config/diplomacy';
import { governmentFor } from '@/sim/economy';
import { getNationStat } from '@/features/menu/nationStats';

/* ---- pair keys ------------------------------------------------------------ */

/** Canonical undirected pair key ("DEU|FRA" — sorted). */
export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
/** Directed key ("DEU>FRA" — a's ledger about b). */
export const dirKey = (a: string, b: string) => `${a}>${b}`;

/* ---- static lookups built once from the config ---------------------------- */

const blocsOf = new Map<string, string[]>(); // nation → bloc ids (declaration order)
for (const [bid, bloc] of Object.entries(BLOCS)) {
  for (const m of bloc.members) {
    if (!blocsOf.has(m)) blocsOf.set(m, []);
    blocsOf.get(m)!.push(bid);
  }
}

const pairSeed = new Map<string, number>(); // rivalries + partnerships, undirected
for (const r of RIVALRIES) pairSeed.set(pairKey(r.a, r.b), (pairSeed.get(pairKey(r.a, r.b)) ?? 0) + r.v);
for (const p of PARTNERSHIPS) pairSeed.set(pairKey(p.a, p.b), (pairSeed.get(pairKey(p.a, p.b)) ?? 0) + p.v);

/** The first bloc (declaration order) a nation belongs to — the Coalition map's
 *  colour key. Military blocs are declared first in blocs.json so they win. */
export function primaryBlocOf(id: string): string | null {
  return blocsOf.get(id)?.[0] ?? null;
}

export function sharedBlocs(a: string, b: string): string[] {
  const bb = blocsOf.get(b);
  if (!bb) return [];
  return (blocsOf.get(a) ?? []).filter((x) => bb.includes(x));
}

/* ---- government affinity --------------------------------------------------- */

const DEMOCRATIC = new Set([
  'Federal Republic',
  'Parliamentary Republic',
  'Parliamentary Democracy',
  'Constitutional Monarchy',
  'Semi-Presidential Republic',
  'Presidential Republic',
  'Republic',
]);

/** +5 same family, −7 across the democratic/authoritarian divide. */
function governmentAffinity(a: string, b: string): number {
  const da = DEMOCRATIC.has(governmentFor(a));
  const db = DEMOCRATIC.has(governmentFor(b));
  return da === db ? 5 : -7;
}

/* ---- deterministic per-pair jitter (so the world isn't uniform) ------------ */

function jitter(a: string, b: string): number {
  const s = pairKey(a, b);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 13) - 6; // −6..+6
}

/* ---- proximity friction ----------------------------------------------------
 * Neighbours without shared institutions have historical friction. Distance is
 * between population-weighted nation centroids in Equal-Earth units (the whole
 * map is ~5.4 units wide, so 0.35 ≈ a couple thousand km). */
const NEAR = 0.35;

function proximityFriction(a: string, b: string, shared: string[], seeded: boolean): number {
  if (shared.length > 0 || seeded) return 0; // institutions/partnerships trump friction
  const sa = getNationStat(a);
  const sb = getNationStat(b);
  if (!sa?.centroid || !sb?.centroid) return 0;
  const dx = sa.centroid[0] - sb.centroid[0];
  const dy = sa.centroid[1] - sb.centroid[1];
  const d = Math.hypot(dx, dy);
  if (d >= NEAR) return 0;
  return -7 * (1 - d / NEAR);
}

/* ---- baseline opinion ------------------------------------------------------ */

/** The natural resting opinion between two foreign-policy ACTORS (callers must
 *  resolve dependencies via effectiveForeignPolicyNation first). Symmetric —
 *  asymmetry comes from the store's directed deltas. */
export function baselineOpinion(a: string, b: string): number {
  if (a === b) return OPINION_MAX;
  let v = 0;

  const shared = sharedBlocs(a, b);
  let blocBonus = 0;
  for (const bid of shared) blocBonus += BLOCS[bid].cohesion;
  v += Math.min(55, blocBonus);

  // Opposing blocs (NATO ↔ CSTO): mutual suspicion even without a rivalry seed.
  let oppose = 0;
  for (const bidA of blocsOf.get(a) ?? []) {
    for (const opp of BLOCS[bidA].opposes) {
      if ((blocsOf.get(b) ?? []).includes(opp)) oppose -= 28;
    }
  }
  v += Math.max(-40, oppose);

  const seed = pairSeed.get(pairKey(a, b)) ?? 0;
  v += seed;

  v += governmentAffinity(a, b);
  v += proximityFriction(a, b, shared, seed !== 0);
  v += jitter(a, b);

  return clampOpinion(Math.max(-85, Math.min(85, v))); // leave headroom for actions
}

export const clampOpinion = (v: number) => Math.max(OPINION_MIN, Math.min(OPINION_MAX, v));

/* ---- stance ---------------------------------------------------------------- */

export function stance(opinion: number): StanceBand {
  for (const band of STANCE_BANDS) if (opinion >= band.min) return band;
  return STANCE_BANDS[STANCE_BANDS.length - 1];
}

/* ---- relationship modifiers (store state → opinion adjustment) ------------- */

export interface PairMods {
  treaties: TreatyType[];
  /** Sanctions active in EITHER direction between the pair. */
  sanctions: SanctionType[];
  severed: boolean;
  atWar: boolean;
}

const TREATY_OPINION: Record<TreatyType, number> = { ALLIANCE: 20, TRADE: 8, NAP: 5 };
const SANCTION_OPINION: Record<SanctionType, number> = { SANCTIONS: -10, EMBARGO: -18 };

export function modifierOpinion(mods: PairMods): number {
  let v = 0;
  for (const t of mods.treaties) v += TREATY_OPINION[t];
  for (const s of mods.sanctions) v += SANCTION_OPINION[s];
  if (mods.severed) v -= 15;
  if (mods.atWar) v -= 60;
  return v;
}

/* ---- war gating ------------------------------------------------------------ */

/** A casus belli exists on raw hostility only at the extreme floor; richer
 *  causes (broken pacts, insurgency backing, occupation) are recorded as
 *  explicit flags in the store and OR-ed in by the caller. */
export function hostilityCasusBelli(opinion: number): boolean {
  return opinion <= WAR.casusBelliOpinion;
}

/** Rough national power for AI risk-weighing (GDP is the Phase-2 proxy;
 *  military strength joins it when the Hardware Registry lands). */
export function nationalPower(id: string): number {
  return getNationStat(id)?.gdp ?? 0;
}

/** Would a rational AI even consider war? Strongly biased against: needs a big
 *  power edge — economic pain and bloc entanglement are modelled by callers. */
export function aiWouldConsiderWar(aggressor: string, defender: string): boolean {
  const pa = nationalPower(aggressor);
  const pd = nationalPower(defender);
  return pd > 0 && pa / pd >= WAR.aiPowerRatioToAttack;
}
