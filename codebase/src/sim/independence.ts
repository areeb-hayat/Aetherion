/**
 * ============================================================================
 *  AETHERION — INDEPENDENCE LOGIC  (pure; state lives in politicsStore)
 * ============================================================================
 *  Two roads out of dependency (config: POLITICS.independence):
 *
 *  PEACEFUL — grow movement support (funded campaigns + passive drift), then
 *  call a REFERENDUM. The sovereign grants it with odds weighted by support,
 *  the tier's independenceEase, and how warm relations with the sovereign are.
 *  A denied referendum still moves history: support consolidates, ties cool.
 *
 *  FORCE — declare unilaterally: a war of independence resolved over time by
 *  relative power (politicsStore drives the clock; sim math lives here).
 */
import { POLITICS, AUTONOMY } from '@/config/autonomy';
import { autonomyTier } from '@/sim/sovereignty';
import { nationalPower } from '@/sim/diplomacy';

const I = POLITICS.independence;
const R = POLITICS.reintegration;

export const canCallReferendum = (support: number) => support >= I.referendumThreshold;

/** Probability (0..1) the sovereign grants independence at a referendum.
 *  `relations` is the sovereign's opinion of the dependency (−100..100):
 *  a furious sovereign suppresses even an overwhelming vote. */
export function referendumOdds(dependencyId: string, support: number, relations: number): number {
  const ease = AUTONOMY[autonomyTier(dependencyId)].independenceEase;
  const support01 = Math.max(0, Math.min(1, support / 100));
  let p = I.grantBase + I.grantSupportWeight * support01 + I.grantEaseWeight * ease;
  if (relations < 0) p -= I.hostilePenalty * (Math.min(100, -relations) / 100);
  return Math.max(0, Math.min(0.97, p));
}

/** Deterministic referendum roll — hashed from the campaign clock + a stable
 *  key (polity id, or `rein:<provinceId>`) so a reload can't reroll a vote. */
export function referendumPasses(key: string, gameHours: number, odds: number): boolean {
  let h = 2166136261;
  const s = `${key}:${Math.floor(gameHours)}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000 < odds;
}

/** Probability (0..1) a REINTEGRATION referendum passes: content provinces
 *  vote to return to the fold; entrenched de-facto states rarely do. */
export function reintegrationOdds(unrest: number, entrenched: boolean): number {
  const content = 1 - Math.max(0, Math.min(100, unrest)) / 100;
  let p = R.oddsBase + R.oddsContentWeight * content;
  if (entrenched) p -= R.entrenchedPenalty;
  return Math.max(0.05, Math.min(0.95, p));
}

/** Passive support drift per game-year (neglect simmers; contentment cools). */
export function supportDriftPerYear(dependencyId: string): number {
  return I.passiveDriftPerYear * (0.5 + AUTONOMY[autonomyTier(dependencyId)].unrestBias * 2.5);
}

/** War of independence: monthly progress toward liberation (+) or suppression
 *  (−), from the power ratio. Small states grind; near-peers break away fast. */
export function warProgressPerMonth(dependencyId: string, sovereignId: string): number {
  const pd = nationalPower(dependencyId);
  const ps = nationalPower(sovereignId);
  if (ps <= 0) return 10;
  const ratio = pd / ps;
  // ratio 0.001 → −6 (crushed), 0.05 → ~0 (stalemate-ish), 0.5+ → +8 (winning)
  return Math.max(-8, Math.min(10, 3.2 * Math.log10(Math.max(1e-4, ratio / 0.05))));
}
