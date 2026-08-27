/**
 * ============================================================================
 *  AETHERION — AI FOREIGN POLICY  (the world conducts its own diplomacy)
 * ============================================================================
 *  Until now, every relation in the world was frozen unless the PLAYER moved
 *  it: opinions decayed toward their baseline and nothing else ever happened.
 *  Rivals never fell out further, partners never signed anything, and nobody
 *  ever reacted to the player except through the player's own actions.
 *
 *  This fills the LOD slot the scheduler has been reserving. It is deliberately
 *  NOT a general utility engine (that arrives with the military system, GDD
 *  Ch.03) — it is the smallest thing that makes the world's relations move:
 *
 *    - Only the powers named in `blocs.json` act. A nation with no bloc, no
 *      rival and no partner has no foreign policy worth simulating, so most of
 *      the world's polities cost nothing at all.
 *    - Each acting power WATCHES a handful of nations — its rivals, its
 *      partners, a rotating window of its bloc, and the player. No N x N scan.
 *    - A power thinks roughly monthly and takes AT MOST ONE action, drawn from
 *      the same catalogue the player uses, gated by the same requirements.
 *    - WAR IS NOT ON THE MENU. There is no military system to resolve one, and
 *      a war nobody can fight is worse than no war. The AI escalates as far as
 *      sanctions and stops there, by design, until the frontline system lands.
 *
 *  Deterministic: the same world state on the same game-day yields the same move.
 */
import { ACTIONS, type ActionDef } from '@/config/diplomacy';
import BLOCS_JSON from '@/config/blocs.json';
import { dirKey, baselineOpinion } from '@/sim/diplomacy';
import { effectiveForeignPolicyNation, isSovereign, controls } from '@/sim/sovereignty';
import { useDiplomacyStore } from '@/store/diplomacyStore';
import { useSimStore } from '@/store/simStore';

export interface AiMove {
  actor: string;
  target: string;
  action: ActionDef;
  /** Why it moved — carried into the dispatch when the player is the target. */
  motive: string;
}

/* ---- who acts, and who they watch (built once from the config) ------------ */

const blocs = BLOCS_JSON.blocs as Record<string, { kind: string; members: string[] }>;
const rivalries = BLOCS_JSON.rivalries as { a: string; b: string }[];
const partnerships = BLOCS_JSON.partnerships as { a: string; b: string }[];

/** Explicit counterparties: everyone a nation has a named relationship with. */
const counterparts = new Map<string, string[]>();
const link = (a: string, b: string) => {
  if (!counterparts.has(a)) counterparts.set(a, []);
  const list = counterparts.get(a)!;
  if (!list.includes(b)) list.push(b);
};
for (const r of [...rivalries, ...partnerships]) {
  link(r.a, r.b);
  link(r.b, r.a);
}

/** Bloc mates, in declaration order — sampled through a rotating window rather
 *  than scanned, so a 32-member alliance costs what a 3-member one costs. */
const blocMates = new Map<string, string[]>();
for (const bloc of Object.values(blocs)) {
  for (const m of bloc.members) {
    if (!blocMates.has(m)) blocMates.set(m, []);
    const list = blocMates.get(m)!;
    for (const other of bloc.members) if (other !== m && !list.includes(other)) list.push(other);
  }
}

/** Bloc membership by KIND. A treaty that only restates a bloc a pair already
 *  shares is not diplomacy, it is paperwork: NATO members do not need to ally
 *  each other, and EU members already have a trade agreement. Skipping those is
 *  what keeps the world's treaty list meaningful instead of quadratic. */
const kindMates = new Map<string, Map<string, Set<string>>>(); // kind -> nation -> mates
for (const bloc of Object.values(blocs)) {
  if (!kindMates.has(bloc.kind)) kindMates.set(bloc.kind, new Map());
  const byNation = kindMates.get(bloc.kind)!;
  for (const m of bloc.members) {
    if (!byNation.has(m)) byNation.set(m, new Set());
    for (const other of bloc.members) if (other !== m) byNation.get(m)!.add(other);
  }
}
const sharesBlocKind = (a: string, b: string, kind: string) => !!kindMates.get(kind)?.get(a)?.has(b);
const sharesAnyBloc = (a: string, b: string) => [...kindMates.keys()].some((k) => sharesBlocKind(a, b, k));

/** The powers with a foreign policy: everyone named anywhere in blocs.json. */
export const ACTING_POWERS: string[] = [...new Set([...blocMates.keys(), ...counterparts.keys()])].sort();

const MATE_WINDOW = 4;

/** Who `actor` is thinking about today. Small and rotating, never the world. */
export function watchlist(actor: string, day: number, player: string | null): string[] {
  const mates = blocMates.get(actor) ?? [];
  const offset = mates.length ? (day * MATE_WINDOW) % mates.length : 0;
  const window = mates.slice(offset, offset + MATE_WINDOW);
  if (window.length < MATE_WINDOW) window.push(...mates.slice(0, MATE_WINDOW - window.length));
  const seen = new Set<string>([actor]);
  const out: string[] = [];
  for (const id of [...(counterparts.get(actor) ?? []), ...window, ...(player ? [player] : [])]) {
    const eff = effectiveForeignPolicyNation(id);
    if (seen.has(eff)) continue;
    seen.add(eff);
    out.push(eff);
  }
  return out;
}

/* ---- what a power will consider doing ------------------------------------- */

/** The AI's menu. War is absent deliberately — see the header. */
const MENU = ['improve', 'trade_agreement', 'non_aggression', 'alliance', 'denounce', 'sanctions', 'lift_sanctions'];
const MENU_ACTIONS = MENU.map((id) => ACTIONS.find((a) => a.id === id)).filter((a): a is ActionDef => !!a);

type Store = ReturnType<typeof useDiplomacyStore.getState>;

/** The same requirement gate the player's actions pass, minus the parts that
 *  only make sense for a treasury the AI does not keep. */
function permitted(def: ActionDef, actor: string, them: string, s: Store, now: number, player: string | null): boolean {
  if (def.effect.war) return false;
  // A treaty binds BOTH sides, and the player has not been asked. Until the
  // dialogue engine exists (GDD Ch.06), the AI only ever offers treaties to
  // other AI powers; with the player it is limited to what needs no consent.
  if (def.effect.addTreaty && them === player) return false;
  // Saturation: at the extremes there is nothing left to build or break, and
  // repeating the gesture only pins every rivalry to exactly -100. An action's
  // weight falls mostly on how THEY see US, so both views have to be checked —
  // guarding only the actor's own view still lets one side hammer the other to
  // the floor while feeling merely cool about it.
  const mine = s.opinionOf(actor, them);
  const theirs = s.opinionOf(them, actor);
  if (def.kind === 'negative' && (mine <= -85 || theirs <= -85)) return false;
  if (def.kind === 'positive' && (mine >= 88 || theirs >= 92)) return false;
  if ((s.cooldowns[`${dirKey(actor, them)}:${def.id}`] ?? 0) > now) return false;
  const req = def.requires ?? {};
  const mods = s.pairMods(actor, them);
  if (mods.atWar) return false;
  if (req.notSevered && mods.severed) return false;
  if (req.severed && !mods.severed) return false;
  if (req.treaty && !mods.treaties.includes(req.treaty)) return false;
  if (req.noTreaty && mods.treaties.includes(req.noTreaty)) return false;
  const sanctionsInForce = s.sanctions[dirKey(actor, them)] ?? [];
  if (req.sanction && !sanctionsInForce.includes(req.sanction)) return false;
  if (req.noSanction && sanctionsInForce.includes(req.noSanction)) return false;
  if (req.minOpinion != null && mine < req.minOpinion) return false;
  if (req.maxOpinion != null && mine > req.maxOpinion) return false;
  // A treaty needs their consent too — they must feel at least as warmly.
  if (def.effect.addTreaty && theirs < (req.minOpinion ?? 0)) return false;
  return true;
}

/** How badly `actor` wants to do this to `them`, and why. One rule per action,
 *  because the actions are not interchangeable: a non-aggression pact is what
 *  uneasy neighbours sign, an alliance is what close friends OUTSIDE an existing
 *  bloc sign, and a denunciation is what you do to someone you already loathe. */
function appetite(def: ActionDef, actor: string, them: string, s: Store): { score: number; motive: string } {
  const my = s.opinionOf(actor, them);
  const base = baselineOpinion(actor, them);
  switch (def.id) {
    case 'improve':
      // Repair: the relation has drifted below where history puts it.
      return { score: base - my - 12, motive: 'repairing a relationship that had fallen below its historic level' };
    case 'lift_sanctions':
      // Sanctions come off when relations have genuinely thawed — not merely
      // because the sanctions themselves depressed the relation below baseline,
      // which would make every sanction oscillate on and off for ever.
      return { score: my - 10, motive: 'easing economic pressure as relations thaw' };
    case 'trade_agreement':
      // Commerce crosses bloc lines; inside an economic bloc it is redundant.
      if (sharesBlocKind(actor, them, 'economic')) return { score: -1, motive: '' };
      return { score: my - 25, motive: 'seeking commercial advantage' };
    case 'non_aggression':
      // The uneasy middle: too wary to be friends, too exposed to risk a war.
      if (sharesAnyBloc(actor, them)) return { score: -1, motive: '' };
      return { score: 22 - Math.abs(my - 5), motive: 'insuring an uneasy border against surprise' };
    case 'alliance':
      // Only outside an existing military bloc — NATO members are already allied.
      if (sharesBlocKind(actor, them, 'military')) return { score: -1, motive: '' };
      return { score: my - 70, motive: 'binding a close partner into mutual defence' };
    case 'denounce':
      return { score: -my - 45, motive: 'answering a relationship that has turned hostile' };
    case 'sanctions':
      // A step beyond words, so it needs more than coldness to justify.
      return { score: -my - 62, motive: 'bringing economic pressure to bear' };
    default:
      return { score: -1, motive: '' };
  }
}

/** The single best move for one power today, or null if it is content. */
export function chooseMove(actor: string, day: number, player: string | null): AiMove | null {
  if (!isSovereign(actor) || controls(actor).diplomacy === 'none') return null;
  const limited = controls(actor).diplomacy === 'limited';
  const s = useDiplomacyStore.getState();
  const now = useSimStore.getState().gameHours;
  let best: AiMove | null = null;
  let bestScore = 0; // a strictly positive appetite is required to act at all
  for (const them of watchlist(actor, day, player)) {
    if (them === actor) continue;
    for (const def of MENU_ACTIONS) {
      if (limited && def.kind !== 'positive') continue;
      if (!permitted(def, actor, them, s, now, player)) continue;
      const { score, motive } = appetite(def, actor, them, s);
      if (score > bestScore) {
        bestScore = score;
        best = { actor, target: them, action: def, motive };
      }
    }
  }
  return best;
}

/* ---- Self-check ----------------------------------------------------------
 * Runs on a DEV boot next to the growth model's. It guards the two things that
 * would break quietly: an empty world of actors (a config rename), and war
 * creeping onto the menu (which nothing could resolve). */
export function foreignPolicySelfCheck(): boolean {
  const ok = (cond: boolean, what: string) => {
    if (!cond) throw new Error(`foreign-policy self-check failed: ${what}`);
  };
  ok(ACTING_POWERS.length > 50, `blocs.json yields actors (${ACTING_POWERS.length})`);
  ok(MENU_ACTIONS.length === MENU.length, 'every menu action exists in the catalogue');
  ok(!MENU_ACTIONS.some((a) => a.effect.war), 'no action on the menu starts a war');
  const list = watchlist('USA', 0, 'DEU');
  ok(!list.includes('USA'), 'a power never watches itself');
  ok(list.length <= 40 && list.length > 0, `watchlist stays small (${list.length})`);
  ok(new Set(list).size === list.length, 'watchlist has no duplicates');
  return true;
}
