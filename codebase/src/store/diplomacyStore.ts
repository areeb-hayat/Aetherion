/**
 * ============================================================================
 *  AETHERION — DIPLOMACY STORE  (sparse relationship state + the action engine)
 * ============================================================================
 *  Holds only DEVIATIONS from the derived baselines (sim/diplomacy.ts): directed
 *  opinion deltas, treaties, sanctions, severed ties, wars and casus belli — all
 *  sparse maps, persisted with the campaign. `opinionOf` composes baseline +
 *  delta + treaty/sanction modifiers on demand, so no NxN matrix ever exists.
 *
 *  `act` is the single choke point for diplomatic actions: it validates the
 *  action's requirements AND the counterparty's consent, prices it against the
 *  treasury, applies the effects, sets the cooldown, and fires a notification.
 *  The AI scheduler reuses the same primitives later.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  ACTION_BY_ID,
  TREATY_LABEL,
  SANCTION_LABEL,
  type TreatyType,
  type SanctionType,
} from '@/config/diplomacy';
import {
  pairKey,
  dirKey,
  baselineOpinion,
  clampOpinion,
  modifierOpinion,
  stance,
  hostilityCasusBelli,
  type PairMods,
} from '@/sim/diplomacy';
import { effectiveForeignPolicyNation, controls, sovereignOf, isSovereign } from '@/sim/sovereignty';
import { useSessionStore } from '@/store/sessionStore';
import { useSimStore } from '@/store/simStore';
import { useWorldStore } from '@/store/worldStore';
import { useNotificationStore } from '@/store/notificationStore';
import { nationLedger } from '@/sim/nationLedger';
import { spendTreasury } from '@/engine/engineSingleton';
import { gameDate, money } from '@/lib/format';
import type { Severity } from '@/types';

export interface ActResult {
  ok: boolean;
  reason?: string;
}

export interface Availability {
  ok: boolean;
  reason?: string;
  cost: number;
  /** Hours until the cooldown lapses (0 when ready). */
  cooldownHours: number;
}

interface DiplomacyState {
  /** Directed opinion deviations from baseline: "A>B" → −200..200. */
  deltas: Record<string, number>;
  /** Undirected treaties: "A|B" → treaty types in force. */
  treaties: Record<string, TreatyType[]>;
  /** Directed sanctions: "A>B" → sanction types A imposes on B. */
  sanctions: Record<string, SanctionType[]>;
  /** Undirected severed diplomatic ties. */
  severed: Record<string, true>;
  /** Undirected active wars. */
  wars: Record<string, true>;
  /** Directed casus belli: "A>B" → human-readable justification. */
  casusBelli: Record<string, string>;
  /** "A>B:actionId" → gameHours at which the action is usable again. */
  cooldowns: Record<string, number>;
  /** Bumped on every mutation — UI/overlay subscription key. */
  rev: number;

  opinionOf: (a: string, b: string) => number;
  pairMods: (a: string, b: string) => PairMods;
  hasCasusBelli: (a: string, b: string) => boolean;
  availability: (actionId: string, target: string) => Availability;
  act: (actionId: string, target: string) => ActResult;
  addCasusBelli: (a: string, b: string, reason: string) => void;
  applyDelta: (a: string, b: string, v: number) => void;
  /** The WORLD reacts to an outrage: every other sovereign's opinion of
   *  `target` shifts by `amount` (sparse deltas — they cool via decayBatch). */
  worldReaction: (target: string, amount: number) => void;
  /** Scheduler: move a batch of deltas toward 0 (grudges cool). */
  decayBatch: (keys: string[], amount: number) => void;
  reset: () => void;
}

/** The nation that conducts the player's foreign policy (self, or sovereign). */
export function playerActor(): string | null {
  const pid = useSessionStore.getState().playerNation;
  return pid ? effectiveForeignPolicyNation(pid) : null;
}

const nationName = (id: string) => useWorldStore.getState().nations.get(id)?.name ?? id;

function notify(severity: Severity, headline: string, detail?: string) {
  useNotificationStore.getState().push({
    id: crypto.randomUUID(),
    gameDate: gameDate(useSimStore.getState().gameHours),
    category: 'DIPLOMATIC',
    severity,
    headline,
    detail,
  });
}

export const useDiplomacyStore = create<DiplomacyState>()(
  persist(
    (set, get) => ({
      deltas: {},
      treaties: {},
      sanctions: {},
      severed: {},
      wars: {},
      casusBelli: {},
      cooldowns: {},
      rev: 0,

      pairMods: (a, b) => {
        const s = get();
        const pk = pairKey(a, b);
        return {
          treaties: s.treaties[pk] ?? [],
          sanctions: [...(s.sanctions[dirKey(a, b)] ?? []), ...(s.sanctions[dirKey(b, a)] ?? [])],
          severed: !!s.severed[pk],
          atWar: !!s.wars[pk],
        };
      },

      opinionOf: (a, b) => {
        const ea = effectiveForeignPolicyNation(a);
        const eb = effectiveForeignPolicyNation(b);
        if (ea === eb) return 100;
        const s = get();
        return clampOpinion(
          baselineOpinion(ea, eb) + (s.deltas[dirKey(ea, eb)] ?? 0) + modifierOpinion(s.pairMods(ea, eb)),
        );
      },

      hasCasusBelli: (a, b) => {
        const ea = effectiveForeignPolicyNation(a);
        const eb = effectiveForeignPolicyNation(b);
        return hostilityCasusBelli(get().opinionOf(ea, eb)) || !!get().casusBelli[dirKey(ea, eb)];
      },

      availability: (actionId, target) => {
        const none: Availability = { ok: false, cost: 0, cooldownHours: 0 };
        const def = ACTION_BY_ID.get(actionId);
        const pid = useSessionStore.getState().playerNation;
        if (!def || !pid) return { ...none, reason: 'Unavailable' };

        // A polity without its own diplomacy cannot act at all.
        if (controls(pid).diplomacy === 'none') {
          return { ...none, reason: `Foreign affairs are conducted by ${nationName(sovereignOf(pid))}` };
        }
        // Limited diplomacy (free association) can't take aggressive actions.
        if (controls(pid).diplomacy === 'limited' && def.kind !== 'positive') {
          return { ...none, reason: 'Your association compact bars hostile measures' };
        }

        const actor = effectiveForeignPolicyNation(pid);
        const them = effectiveForeignPolicyNation(target);
        if (actor === them) return { ...none, reason: 'Not a foreign power' };

        const s = get();
        const pk = pairKey(actor, them);
        const dk = dirKey(actor, them);
        const req = def.requires ?? {};
        const mods = s.pairMods(actor, them);
        const myOpinion = s.opinionOf(actor, them);
        const theirOpinion = s.opinionOf(them, actor);

        const ledger = nationLedger(pid);
        const cost = Math.round((ledger?.revenue.total ?? 0) * def.costFrac);

        const ready = s.cooldowns[`${dk}:${actionId}`] ?? 0;
        const now = useSimStore.getState().gameHours;
        const cooldownHours = Math.max(0, ready - now);
        const base = { cost, cooldownHours };

        if (mods.atWar && !def.effect.war) return { ...none, ...base, reason: 'You are at war' };
        if (cooldownHours > 0) return { ...none, ...base, reason: 'Recently attempted' };
        if (req.severed && !mods.severed) return { ...none, ...base, reason: 'Ties are not severed' };
        if (req.notSevered && mods.severed) return { ...none, ...base, reason: 'Ties are severed — rebuild them first' };
        if (req.treaty && !mods.treaties.includes(req.treaty))
          return { ...none, ...base, reason: `Requires ${TREATY_LABEL[req.treaty]}` };
        if (req.noTreaty && mods.treaties.includes(req.noTreaty))
          return { ...none, ...base, reason: `${TREATY_LABEL[req.noTreaty]} already in force` };
        if (req.sanction && !(s.sanctions[dk] ?? []).includes(req.sanction))
          return { ...none, ...base, reason: `No ${SANCTION_LABEL[req.sanction].toLowerCase()} in force` };
        if (req.noSanction && (s.sanctions[dk] ?? []).includes(req.noSanction))
          return { ...none, ...base, reason: `${SANCTION_LABEL[req.noSanction]} already in force` };
        if (req.minOpinion != null && myOpinion < req.minOpinion)
          return { ...none, ...base, reason: 'Relations are too cold' };
        if (req.maxOpinion != null && myOpinion > req.maxOpinion)
          return { ...none, ...base, reason: 'Relations are too warm' };
        // Counterparty consent for treaties: they must feel at least as warmly.
        if (def.effect.addTreaty && theirOpinion < (req.minOpinion ?? 0))
          return { ...none, ...base, reason: `${nationName(them)} declines — they do not trust you enough` };
        if (def.effect.war) {
          if (s.wars[pk]) return { ...none, ...base, reason: 'Already at war' };
          if (mods.treaties.includes('NAP')) return { ...none, ...base, reason: 'A non-aggression pact binds you' };
          if (mods.treaties.includes('ALLIANCE')) return { ...none, ...base, reason: 'You are allied' };
          if (!get().hasCasusBelli(actor, them))
            return { ...none, ...base, reason: 'No casus belli — the world would not accept this war' };
        }
        if (cost > 0 && useSimStore.getState().treasury < cost)
          return { ...none, ...base, reason: `Needs ${money(cost)} — treasury short` };

        return { ok: true, ...base };
      },

      act: (actionId, target) => {
        const avail = get().availability(actionId, target);
        if (!avail.ok) return { ok: false, reason: avail.reason };
        const def = ACTION_BY_ID.get(actionId)!;
        const pid = useSessionStore.getState().playerNation!;
        const actor = effectiveForeignPolicyNation(pid);
        const them = effectiveForeignPolicyNation(target);
        const pk = pairKey(actor, them);
        const dk = dirKey(actor, them);
        const now = useSimStore.getState().gameHours;

        if (avail.cost > 0) spendTreasury(avail.cost);

        set((s) => {
          const deltas = { ...s.deltas };
          const e = def.effect;
          if (e.opinionSelf) deltas[dirKey(actor, them)] = (deltas[dirKey(actor, them)] ?? 0) + e.opinionSelf;
          if (e.opinionThem) deltas[dirKey(them, actor)] = (deltas[dirKey(them, actor)] ?? 0) + e.opinionThem;

          const treaties = { ...s.treaties };
          let list = treaties[pk] ?? [];
          if (e.addTreaty && !list.includes(e.addTreaty)) list = [...list, e.addTreaty];
          if (e.removeTreaty) list = list.filter((t) => t !== e.removeTreaty);
          if (e.war) list = []; // war voids every treaty
          if (list.length) treaties[pk] = list;
          else delete treaties[pk];

          const sanctions = { ...s.sanctions };
          let mine = sanctions[dk] ?? [];
          if (e.addSanction && !mine.includes(e.addSanction)) mine = [...mine, e.addSanction];
          if (e.removeSanction) mine = mine.filter((x) => x !== e.removeSanction);
          if (mine.length) sanctions[dk] = mine;
          else delete sanctions[dk];

          const severed = { ...s.severed };
          if (e.sever) severed[pk] = true;
          if (e.restore) delete severed[pk];

          const wars = { ...s.wars };
          const casusBelli = { ...s.casusBelli };
          if (e.war) {
            wars[pk] = true;
            // An unprovoked-feeling attack hands THEM a standing justification.
            casusBelli[dirKey(them, actor)] = 'War of aggression against them';
          }

          const cooldowns = { ...s.cooldowns };
          if (def.cooldownDays > 0) cooldowns[`${dk}:${actionId}`] = now + def.cooldownDays * 24;

          return { deltas, treaties, sanctions, severed, wars, casusBelli, cooldowns, rev: s.rev + 1 };
        });

        const themName = nationName(them);
        const sev: Severity = def.effect.war ? 'CRITICAL' : def.kind === 'negative' ? 'HIGH' : 'INFO';
        notify(
          sev,
          def.effect.war ? `War declared on ${themName}` : `${def.label} — ${themName}`,
          def.effect.war ? 'Treaties voided. The world watches in alarm.' : def.blurb,
        );
        return { ok: true };
      },

      addCasusBelli: (a, b, reason) =>
        set((s) => ({ casusBelli: { ...s.casusBelli, [dirKey(a, b)]: reason }, rev: s.rev + 1 })),

      applyDelta: (a, b, v) =>
        set((s) => ({ deltas: { ...s.deltas, [dirKey(a, b)]: (s.deltas[dirKey(a, b)] ?? 0) + v }, rev: s.rev + 1 })),

      worldReaction: (target, amount) =>
        set((s) => {
          const t = effectiveForeignPolicyNation(target);
          const deltas = { ...s.deltas };
          useWorldStore.getState().nations.forEach((_n, id) => {
            if (id === t || !isSovereign(id)) return; // dependencies follow their sovereign
            const k = dirKey(id, t);
            deltas[k] = (deltas[k] ?? 0) + amount;
          });
          return { deltas, rev: s.rev + 1 };
        }),

      decayBatch: (keys, amount) =>
        set((s) => {
          if (keys.length === 0) return s;
          const deltas = { ...s.deltas };
          let changed = false;
          for (const k of keys) {
            const v = deltas[k];
            if (v == null) continue;
            const next = Math.abs(v) <= amount ? 0 : v - Math.sign(v) * amount;
            if (next === 0) delete deltas[k];
            else deltas[k] = next;
            changed = true;
          }
          return changed ? { deltas, rev: s.rev + 1 } : s;
        }),

      reset: () =>
        set((s) => ({
          deltas: {},
          treaties: {},
          sanctions: {},
          severed: {},
          wars: {},
          casusBelli: {},
          cooldowns: {},
          rev: s.rev + 1,
        })),
    }),
    {
      name: 'aetherion.diplomacy.v1',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (s) => ({
        deltas: s.deltas,
        treaties: s.treaties,
        sanctions: s.sanctions,
        severed: s.severed,
        wars: s.wars,
        casusBelli: s.casusBelli,
        cooldowns: s.cooldowns,
      }),
    },
  ),
);

/** Player-facing summary used by the Relations tab + stance helpers. */
export function stanceOf(target: string): ReturnType<typeof stance> {
  const actor = playerActor();
  const store = useDiplomacyStore.getState();
  return stance(actor ? store.opinionOf(actor, target) : 0);
}
