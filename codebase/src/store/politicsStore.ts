/**
 * ============================================================================
 *  AETHERION — POLITICS STORE  (unrest relief, insurgencies, independence)
 * ============================================================================
 *  The sparse internal-politics ledger: everything here is a DEVIATION from the
 *  derived baseline (sim/unrest.ts computes unrest on demand; sim/independence
 *  prices the roads out of — and back into — dependency). Persisted with the
 *  campaign.
 *
 *    police       provinceId → decaying unrest relief the player bought
 *    autonomy     provinceId → local-autonomy grant (revocable by reintegration)
 *    breakaways   provinceId → active separatist insurgency (de-facto region)
 *    ops          provinceId → the ONE operation running there (nothing lands
 *                 instantly: police surges, devolution, suppression and all
 *                 three reintegration paths take game time to resolve)
 *    resentment   provinceId → reintegration residue: + seethes, − (goodwill) calms
 *    support      dependency nation → independence-movement support 0..100
 *    tension      dependency nation → friction with its sovereign 0..100
 *    campaigns    dependency nation → active support drip from a funded push
 *    pendingReferendums  dependency nation → a scheduled independence vote
 *    independent  polities that won independence this campaign (overrides the
 *                 static NE map via sim/sovereignty.setIndependentOverride)
 *
 *  `tickPolitics` is the scheduler hook: it advances every operation, decays
 *  police relief and resentment, grows insurgencies, drips campaign support,
 *  resolves scheduled referendums, and grinds wars of independence.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Province } from '@/types';
import { POLITICS } from '@/config/autonomy';
import { YEAR_HOURS } from '@/config/economy';
import { provinceUnrest } from '@/sim/unrest';
import {
  canCallReferendum,
  referendumOdds,
  referendumPasses,
  reintegrationOdds,
  supportDriftPerYear,
  warProgressPerMonth,
} from '@/sim/independence';
import { isDependency, sovereignOf, setIndependentOverride } from '@/sim/sovereignty';
import { useSessionStore } from '@/store/sessionStore';
import { useSimStore } from '@/store/simStore';
import { useWorldStore, getProvince } from '@/store/worldStore';
import { useEconomyStore } from '@/store/economyStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useDiplomacyStore } from '@/store/diplomacyStore';
import { nationLedger } from '@/sim/nationLedger';
import { spendTreasury } from '@/engine/engineSingleton';
import { gameDate, money } from '@/lib/format';
import type { EventCategory, Severity } from '@/types';

export interface Breakaway {
  since: number; // gameHours when the insurgency ignited
  strength: number; // 0..100 — 0 = re-controlled, 100 = entrenched de-facto state
  entrenched?: boolean;
}

export interface IndependenceWar {
  since: number;
  progress: number; // −100 (crushed) .. +100 (liberated)
}

/** Every province lever is an OPERATION that runs on the campaign clock. */
export type OpKind =
  | 'police'
  | 'devolve'
  | 'suppress'
  | 'reintegrate_referendum'
  | 'reintegrate_political'
  | 'reintegrate_force';

export type ReintegrationPath = 'referendum' | 'political' | 'force';

export interface ProvinceOp {
  kind: OpKind;
  provinceId: number;
  startedAt: number; // gameHours
  completesAt: number; // gameHours
}

export const OP_LABEL: Record<OpKind, string> = {
  police: 'Police Surge',
  devolve: 'Devolution Statute',
  suppress: 'Counter-Insurgency',
  reintegrate_referendum: 'Reintegration Referendum',
  reintegrate_political: 'Negotiated Reintegration',
  reintegrate_force: 'Forced Reintegration',
};

/** 0..1 completion of an operation at `now` (gameHours). */
export const opProgress = (op: ProvinceOp, now: number): number =>
  Math.max(0, Math.min(1, (now - op.startedAt) / Math.max(1, op.completesAt - op.startedAt)));

export interface LeverResult {
  ok: boolean;
  reason?: string;
}

interface Campaign {
  endsAt: number; // gameHours
  perHour: number; // support gained per game-hour while active
}

interface PendingReferendum {
  calledAt: number;
  resolvesAt: number;
}

interface PoliticsState {
  police: Record<number, number>;
  autonomy: Record<number, true>;
  breakaways: Record<number, Breakaway>;
  ops: Record<number, ProvinceOp>;
  resentment: Record<number, number>;
  support: Record<string, number>;
  tension: Record<string, number>;
  campaigns: Record<string, Campaign>;
  pendingReferendums: Record<string, PendingReferendum>;
  independent: Record<string, true>;
  independenceWars: Record<string, IndependenceWar>;
  lastReferendum: Record<string, number>;
  lastReintegration: Record<number, number>; // failed-vote cooldown
  rev: number;

  /** Live unrest for a province, with the full context assembled. */
  unrestOf: (p: Province) => number;

  /* -- province levers (owner only; all start a timed operation) ---------- */
  policeProvince: (provinceId: number) => LeverResult;
  grantAutonomy: (provinceId: number) => LeverResult;
  suppressInsurgency: (provinceId: number) => LeverResult;
  startReintegration: (provinceId: number, path: ReintegrationPath) => LeverResult;
  /** Stand down the operation underway (no refund — the money is spent).
   *  Walking back a promise adds resentment per POLITICS.cancel. */
  cancelOp: (provinceId: number) => LeverResult;
  /** External grievance hook (broken investment promises, future events). */
  addResentment: (provinceId: number, amount: number) => void;

  /* -- dependency independence (player-as-dependency) --------------------- */
  fundCampaign: () => LeverResult;
  callReferendum: () => LeverResult;
  declareIndependence: () => LeverResult;

  /* -- scheduler hooks ----------------------------------------------------- */
  triggerInsurgency: (provinceId: number, unrest: number) => void;
  tickPolitics: (gameHours: number, dtHours: number) => void;

  reset: () => void;
}

const U = POLITICS.unrest;
const I = POLITICS.independence;
const T = POLITICS.timing;
const R = POLITICS.reintegration;

/** Police relief drains ~5 points per 30 game-days. */
const POLICE_DECAY_PER_HOUR = 5 / (30 * 24);
/** Unchecked insurgency strengthens ~0.5/game-day. */
const INSURGENCY_GROWTH_PER_HOUR = 0.5 / 24;
/** One full suppression operation knocks this much strength off an insurgency. */
const SUPPRESS_HIT = 18;

const nationName = (id: string) => useWorldStore.getState().nations.get(id)?.name ?? id;

function notify(category: EventCategory, severity: Severity, headline: string, detail?: string) {
  useNotificationStore.getState().push({
    id: crypto.randomUUID(),
    gameDate: gameDate(useSimStore.getState().gameHours),
    category,
    severity,
    headline,
    detail,
  });
}

/** Per-nation ledger facts unrest needs (dev index, tax share, government),
 *  memoized per game-day so scheduler batches don't recompute ledgers 400×. */
interface NationFacts {
  dev: number;
  taxShare: number;
  gov: string;
}
let ledgerMemoDay = -1;
const ledgerMemo = new Map<string, NationFacts>();
function nationFacts(id: string, gameHours: number): NationFacts {
  const day = Math.floor(gameHours / 24);
  if (day !== ledgerMemoDay) {
    ledgerMemoDay = day;
    ledgerMemo.clear();
  }
  let f = ledgerMemo.get(id);
  if (!f) {
    const led = useEconomyStore.getState().ledger;
    const l = led && led.id === id ? led : nationLedger(id);
    f = l
      ? { dev: l.development, taxShare: l.gdp > 0 ? l.revenue.total / l.gdp : 0.16, gov: l.government }
      : { dev: 0.3, taxShare: 0.16, gov: 'Republic' };
    ledgerMemo.set(id, f);
  }
  return f;
}

/** Yearly revenue basis for pricing levers (player's live ledger preferred). */
function playerRevenue(): number {
  const pid = useSessionStore.getState().playerNation;
  if (!pid) return 0;
  const led = useEconomyStore.getState().ledger;
  const l = led && led.id === pid ? led : nationLedger(pid);
  return l?.revenue.total ?? 0;
}

function payLever(costFrac: number): { ok: boolean; reason?: string; cost: number } {
  const cost = Math.round(playerRevenue() * costFrac);
  if (cost > 0 && useSimStore.getState().treasury < cost)
    return { ok: false, reason: `Needs ${money(cost)} — treasury short`, cost };
  if (cost > 0) spendTreasury(cost);
  return { ok: true, cost };
}

const months = (days: number) => Math.max(1, Math.round(days / 30));

export const usePoliticsStore = create<PoliticsState>()(
  persist(
    (set, get) => ({
      police: {},
      autonomy: {},
      breakaways: {},
      ops: {},
      resentment: {},
      support: {},
      tension: {},
      campaigns: {},
      pendingReferendums: {},
      independent: {},
      independenceWars: {},
      lastReferendum: {},
      lastReintegration: {},
      rev: 0,

      unrestOf: (p) => {
        if (!p.nationId || p.isSea) return 0;
        const s = get();
        const gameHours = useSimStore.getState().gameHours;
        const facts = nationFacts(p.nationId, gameHours);
        const pid = useSessionStore.getState().playerNation;
        const owned = pid === p.nationId;

        // Player-nation extras: investment hope from works underway, durable
        // relief from delivered economic tiers, and the national fiscal mood.
        let levels;
        let activeProjectProgress: number[] | undefined;
        let builtEconTiers: number | undefined;
        let austerity: boolean | undefined;
        let fiscalCrisis: boolean | undefined;
        if (owned) {
          const eco = useEconomyStore.getState();
          levels = eco.levels(p.id);
          for (const c of eco.projects) {
            if (c.provinceId !== p.id) continue;
            (activeProjectProgress ??= []).push(
              Math.max(0, Math.min(1, (gameHours - c.startedAt) / Math.max(1, c.completesAt - c.startedAt))),
            );
          }
          const b = eco.built[p.id];
          if (b) builtEconTiers = (b.infrastructure ?? 0) + (b.industry ?? 0) + (b.port ?? 0) + (b.special ?? 0);
          austerity = !!eco.finance.imf?.active;
          fiscalCrisis = eco.financing?.mode === 'reserves' && useSimStore.getState().treasury < 0;
        }

        return provinceUnrest(p, {
          nationDev: facts.dev,
          taxShare: facts.taxShare,
          government: facts.gov,
          levels,
          policeRelief: s.police[p.id] ?? 0,
          autonomyGranted: !!s.autonomy[p.id],
          resentment: s.resentment[p.id] ?? 0,
          atWar: false, // war weariness joins when the military system lands
          activeProjectProgress,
          builtEconTiers,
          austerity,
          fiscalCrisis,
          gameHours,
        });
      },

      policeProvince: (provinceId) => {
        const p = getProvince(provinceId);
        const pid = useSessionStore.getState().playerNation;
        if (!p || p.nationId !== pid) return { ok: false, reason: 'Not your territory' };
        if (get().ops[provinceId]) return { ok: false, reason: 'An operation is already underway here' };
        const pay = payLever(U.policeCostFrac);
        if (!pay.ok) return pay;
        const now = useSimStore.getState().gameHours;
        set((s) => ({
          ops: {
            ...s.ops,
            [provinceId]: { kind: 'police', provinceId, startedAt: now, completesAt: now + T.policeDays * 24 },
          },
          rev: s.rev + 1,
        }));
        notify('DOMESTIC', 'INFO', `Police surge ordered in ${p.name}`, `Units deploy over ${T.policeDays} days — relief builds as they arrive, then slowly stands down.`);
        return { ok: true };
      },

      grantAutonomy: (provinceId) => {
        const p = getProvince(provinceId);
        const pid = useSessionStore.getState().playerNation;
        if (!p || p.nationId !== pid) return { ok: false, reason: 'Not your territory' };
        if (get().autonomy[provinceId]) return { ok: false, reason: 'Already autonomous' };
        if (get().ops[provinceId]) return { ok: false, reason: 'An operation is already underway here' };
        const now = useSimStore.getState().gameHours;
        set((s) => ({
          ops: {
            ...s.ops,
            [provinceId]: { kind: 'devolve', provinceId, startedAt: now, completesAt: now + T.devolveDays * 24 },
          },
          rev: s.rev + 1,
        }));
        notify('DOMESTIC', 'INFO', `Devolution statute drafted for ${p.name}`, `Autonomy takes effect in ~${months(T.devolveDays)} months once the statute passes.`);
        return { ok: true };
      },

      suppressInsurgency: (provinceId) => {
        const p = getProvince(provinceId);
        const pid = useSessionStore.getState().playerNation;
        if (!p || p.nationId !== pid) return { ok: false, reason: 'Not your territory' };
        const b = get().breakaways[provinceId];
        if (!b) return { ok: false, reason: 'No active insurgency' };
        if (b.entrenched)
          return { ok: false, reason: 'Entrenched de-facto state — reintegrate it (referendum, political, or force)' };
        if (get().ops[provinceId]) return { ok: false, reason: 'An operation is already underway here' };
        const pay = payLever(U.policeCostFrac * 2);
        if (!pay.ok) return pay;
        const now = useSimStore.getState().gameHours;
        set((s) => ({
          ops: {
            ...s.ops,
            [provinceId]: { kind: 'suppress', provinceId, startedAt: now, completesAt: now + T.suppressDays * 24 },
          },
          rev: s.rev + 1,
        }));
        notify('DOMESTIC', 'MEDIUM', `Counter-insurgency launched in ${p.name}`, `A ${T.suppressDays}-day operation. Insurgent growth halts while forces are engaged.`);
        return { ok: true };
      },

      startReintegration: (provinceId, path) => {
        const p = getProvince(provinceId);
        const pid = useSessionStore.getState().playerNation;
        if (!p || p.nationId !== pid) return { ok: false, reason: 'Not your territory' };
        const s = get();
        const entrenched = !!s.breakaways[provinceId]?.entrenched;
        if (!s.autonomy[provinceId] && !entrenched)
          return { ok: false, reason: 'No autonomous region to reintegrate here' };
        if (s.ops[provinceId]) return { ok: false, reason: 'An operation is already underway here' };
        const now = useSimStore.getState().gameHours;
        if (path === 'referendum') {
          const retry = (s.lastReintegration[provinceId] ?? -Infinity) + R.retryCooldownDays * 24 - now;
          if (retry > 0)
            return { ok: false, reason: `The region refuses another vote for ${Math.ceil(retry / 24)} days` };
        }
        const costFrac =
          path === 'referendum' ? R.referendumCostFrac : path === 'political' ? R.politicalCostFrac : R.forceCostFrac;
        const pay = payLever(costFrac);
        if (!pay.ok) return pay;
        const days = path === 'referendum' ? R.referendumDays : path === 'political' ? R.politicalDays : R.forceDays;
        const kind: OpKind = `reintegrate_${path}`;
        set((st) => ({
          ops: { ...st.ops, [provinceId]: { kind, provinceId, startedAt: now, completesAt: now + days * 24 } },
          rev: st.rev + 1,
        }));
        if (path === 'referendum')
          notify('DOMESTIC', 'INFO', `Reintegration referendum called in ${p.name}`, `The vote is set for ${gameDate(now + days * 24)}. A content region votes to return; a seething one will not.`);
        else if (path === 'political')
          notify('DOMESTIC', 'INFO', `Reintegration talks open with ${p.name}`, `A negotiated settlement over ~${months(days)} months. Costly but certain — and it leaves some resentment.`);
        else
          notify('MILITARY', 'HIGH', `Forces move to retake ${p.name}`, `A ${days}-day campaign to restore central control. The world is watching.`);
        return { ok: true };
      },

      cancelOp: (provinceId) => {
        const op = get().ops[provinceId];
        if (!op) return { ok: false, reason: 'No operation underway' };
        const p = getProvince(provinceId);
        const name = p?.name ?? 'the province';
        const backlash = POLITICS.cancel[op.kind] ?? 0;
        set((s) => {
          const ops = { ...s.ops };
          delete ops[provinceId];
          const resentment = { ...s.resentment };
          if (backlash > 0) resentment[provinceId] = (resentment[provinceId] ?? 0) + backlash;
          return { ops, resentment, rev: s.rev + 1 };
        });
        switch (op.kind) {
          case 'police':
            notify('DOMESTIC', 'LOW', `Police surge stood down — ${name}`, 'The reinforcements rotate home early. What calm they bought fades.');
            break;
          case 'devolve':
            notify('DOMESTIC', 'MEDIUM', `Devolution statute withdrawn — ${name}`, 'The promised autonomy is shelved. The region reads it as betrayal.');
            break;
          case 'suppress':
            notify('DOMESTIC', 'MEDIUM', `Counter-insurgency stood down — ${name}`, 'Forces disengage before the job is done. The insurgency resumes its growth.');
            break;
          default:
            notify('DOMESTIC', 'MEDIUM', `Reintegration abandoned — ${name}`, 'The overture is withdrawn mid-course. Those who staked their names on it are left exposed — resentment lingers.');
        }
        return { ok: true };
      },

      addResentment: (provinceId, amount) => {
        if (!amount) return;
        set((s) => ({
          resentment: { ...s.resentment, [provinceId]: (s.resentment[provinceId] ?? 0) + amount },
          rev: s.rev + 1,
        }));
      },

      fundCampaign: () => {
        const pid = useSessionStore.getState().playerNation;
        if (!pid || !isDependency(pid)) return { ok: false, reason: 'You are already sovereign' };
        if (get().campaigns[pid]) return { ok: false, reason: 'Campaign already underway — let it work' };
        const pay = payLever(I.campaignCostFrac);
        if (!pay.ok) return pay;
        const now = useSimStore.getState().gameHours;
        set((s) => ({
          campaigns: {
            ...s.campaigns,
            [pid]: { endsAt: now + T.campaignDays * 24, perHour: I.campaignPush / (T.campaignDays * 24) },
          },
          tension: { ...s.tension, [pid]: Math.min(100, (s.tension[pid] ?? 0) + 5) },
          rev: s.rev + 1,
        }));
        notify('DOMESTIC', 'INFO', 'Independence campaign funded', `Organisers fan out — support builds over the next ${months(T.campaignDays)} months.`);
        return { ok: true };
      },

      callReferendum: () => {
        const pid = useSessionStore.getState().playerNation;
        if (!pid || !isDependency(pid)) return { ok: false, reason: 'You are already sovereign' };
        const s = get();
        if (s.pendingReferendums[pid]) return { ok: false, reason: 'A referendum is already scheduled' };
        const support = s.support[pid] ?? 0;
        if (!canCallReferendum(support))
          return { ok: false, reason: `Needs ${I.referendumThreshold}% support (at ${Math.round(support)}%)` };
        const now = useSimStore.getState().gameHours;
        const last = s.lastReferendum[pid] ?? -Infinity;
        if (now - last < 2 * YEAR_HOURS) return { ok: false, reason: 'Too soon after the last vote' };

        const resolvesAt = now + T.referendumLeadDays * 24;
        set((st) => ({
          pendingReferendums: { ...st.pendingReferendums, [pid]: { calledAt: now, resolvesAt } },
          lastReferendum: { ...st.lastReferendum, [pid]: now },
          rev: st.rev + 1,
        }));
        notify('DIPLOMATIC', 'MEDIUM', 'Independence referendum called', `The vote is set for ${gameDate(resolvesAt)}. Support on the day decides it.`);
        return { ok: true };
      },

      declareIndependence: () => {
        const pid = useSessionStore.getState().playerNation;
        if (!pid || !isDependency(pid)) return { ok: false, reason: 'You are already sovereign' };
        if (get().independenceWars[pid]) return { ok: false, reason: 'The war is already underway' };
        const now = useSimStore.getState().gameHours;
        const sov = sovereignOf(pid);
        set((s) => {
          const pendingReferendums = { ...s.pendingReferendums };
          delete pendingReferendums[pid]; // a UDI supersedes any scheduled vote
          return {
            independenceWars: { ...s.independenceWars, [pid]: { since: now, progress: 0 } },
            tension: { ...s.tension, [pid]: 100 },
            pendingReferendums,
            rev: s.rev + 1,
          };
        });
        useDiplomacyStore.getState().addCasusBelli(sov, pid, 'Unilateral declaration of independence');
        notify('MILITARY', 'CRITICAL', `${nationName(pid)} declares independence`, `${nationName(sov)} moves to restore control. A war of independence begins.`);
        return { ok: true };
      },

      triggerInsurgency: (provinceId, unrest) => {
        const p = getProvince(provinceId);
        if (!p || get().breakaways[provinceId]) return;
        const now = useSimStore.getState().gameHours;
        set((s) => ({
          breakaways: { ...s.breakaways, [provinceId]: { since: now, strength: unrest } },
          rev: s.rev + 1,
        }));
        const pid = useSessionStore.getState().playerNation;
        notify(
          'DOMESTIC',
          p.nationId === pid ? 'CRITICAL' : 'MEDIUM',
          `Insurgency erupts in ${p.name}`,
          p.nationId === pid
            ? 'Separatists seize control — the province is now a de-facto breakaway. Suppress it, or address the grievances that fed it.'
            : `Separatists challenge ${nationName(p.nationId)} for control of the province.`,
        );
      },

      tickPolitics: (gameHours, dtHours) => {
        if (dtHours <= 0) return;
        const s = get();
        let mutated = false;
        let independentChanged = false;

        // Copy-on-entry working maps (all sparse; a handful of entries each).
        const police = { ...s.police };
        const autonomy = { ...s.autonomy };
        const breakaways = { ...s.breakaways };
        const ops = { ...s.ops };
        const resentment = { ...s.resentment };
        const support = { ...s.support };
        const tension = { ...s.tension };
        const campaigns = { ...s.campaigns };
        const pendingReferendums = { ...s.pendingReferendums };
        const independent = { ...s.independent };
        const independenceWars = { ...s.independenceWars };
        const lastReintegration = { ...s.lastReintegration };

        const sliceStart = gameHours - dtHours;

        // Hours of this slice each province spent under active suppression —
        // insurgent growth is paused for exactly that portion (step 3).
        const suppressedHours: Record<number, number> = {};

        // 1. Operations advance; some act continuously, all resolve on completion.
        for (const op of Object.values(s.ops)) {
          const id = op.provinceId;
          const p = getProvince(id);
          const name = p?.name ?? 'the province';
          const activeHours = Math.max(0, Math.min(gameHours, op.completesAt) - Math.max(op.startedAt, sliceStart));

          if (op.kind === 'police' && activeHours > 0) {
            police[id] = Math.min(60, (police[id] ?? 0) + (U.policeRelief / (T.policeDays * 24)) * activeHours);
            mutated = true;
          }

          if (op.kind === 'suppress') {
            suppressedHours[id] = activeHours;
            const b = breakaways[id];
            if (!b) {
              delete ops[id]; // insurgency ended some other way — stand down
              mutated = true;
              continue;
            }
            if (activeHours > 0) {
              const strength = b.strength - (SUPPRESS_HIT / (T.suppressDays * 24)) * activeHours;
              if (strength <= 0) {
                delete breakaways[id];
                delete ops[id];
                // Post-conflict garrison: enough relief to keep it below the trigger.
                police[id] = Math.min(60, (police[id] ?? 0) + U.policeRelief * 2);
                notify('DOMESTIC', 'MEDIUM', `Insurgency in ${name} quelled`, 'Government control restored. Grievances remain — invest or devolve.');
                mutated = true;
                continue;
              }
              breakaways[id] = { ...b, strength };
              mutated = true;
            }
          }

          if (gameHours < op.completesAt || !ops[id]) continue;

          // -- resolution ----------------------------------------------------
          delete ops[id];
          mutated = true;
          switch (op.kind) {
            case 'police':
              notify('DOMESTIC', 'LOW', `Police surge in ${name} concluded`, 'The reinforcements rotate home; the calm they bought fades over time.');
              break;
            case 'devolve':
              autonomy[id] = true;
              notify('DOMESTIC', 'INFO', `${name} granted local autonomy`, 'The statute passes. Devolved powers calm separatist sentiment for good — reintegration is always possible later.');
              break;
            case 'suppress':
              notify('DOMESTIC', 'MEDIUM', `Operation in ${name} concluded`, 'The insurgency is weakened but persists. Another operation could finish it.');
              break;
            case 'reintegrate_referendum': {
              const entrenched = !!breakaways[id]?.entrenched;
              const unrest = p ? get().unrestOf(p) : 50;
              const odds = reintegrationOdds(unrest, entrenched);
              if (referendumPasses(`rein:${id}`, op.completesAt, odds)) {
                delete autonomy[id];
                delete breakaways[id];
                resentment[id] = R.referendumGoodwill;
                notify('DOMESTIC', 'HIGH', `${name} votes to reintegrate`, 'The region returns willingly. Goodwill from the honest vote calms tensions for years.');
              } else {
                resentment[id] = (resentment[id] ?? 0) + R.failBacklash;
                lastReintegration[id] = gameHours;
                notify('DOMESTIC', 'MEDIUM', `${name} rejects reintegration`, 'The vote fails and separatist feeling hardens. The region refuses another vote for now.');
              }
              break;
            }
            case 'reintegrate_political':
              delete autonomy[id];
              delete breakaways[id];
              resentment[id] = R.politicalResentment;
              notify('DOMESTIC', 'HIGH', `${name} reincorporated by settlement`, 'Autonomy is bought out at the table. Those who profited from the old arrangement resent it — for a while.');
              break;
            case 'reintegrate_force': {
              delete autonomy[id];
              delete breakaways[id];
              resentment[id] = R.forceResentment;
              const pid = useSessionStore.getState().playerNation;
              if (pid) useDiplomacyStore.getState().worldReaction(pid, -R.aggressorWorldAnger);
              notify('MILITARY', 'CRITICAL', `${name} retaken by force`, 'Central control is restored at gunpoint. The region seethes — and every chancellery in the world takes note.');
              break;
            }
          }
        }

        // 2. Police relief decays (including what ops just added).
        for (const k of Object.keys(police)) {
          const id = Number(k);
          const nv = police[id] - POLICE_DECAY_PER_HOUR * dtHours;
          if (nv > 0.5) police[id] = nv;
          else delete police[id];
          mutated = true;
        }

        // 3. Insurgencies strengthen while unaddressed (paused under suppression,
        //    including the hours an op covered before completing mid-slice).
        for (const [k, b] of Object.entries(breakaways)) {
          const id = Number(k);
          if (b.entrenched) continue;
          const growHours = Math.max(0, dtHours - (suppressedHours[id] ?? 0));
          if (growHours <= 0) continue;
          const strength = Math.min(100, b.strength + INSURGENCY_GROWTH_PER_HOUR * growHours);
          if (strength >= 100) {
            breakaways[id] = { ...b, strength: 100, entrenched: true };
            notify('DOMESTIC', 'HIGH', `${getProvince(id)?.name ?? 'A breakaway region'} entrenches its autonomy`, 'The de-facto region now functions as a state. Recover it by referendum, negotiation, or force.');
          } else {
            breakaways[id] = { ...b, strength };
          }
          mutated = true;
        }

        // 4. Wars of independence grind toward liberation or suppression.
        for (const [natId, w] of Object.entries(independenceWars)) {
          const sov = sovereignOf(natId);
          const progress = w.progress + (warProgressPerMonth(natId, sov) / (30 * 24)) * dtHours;
          if (progress >= 100) {
            delete independenceWars[natId];
            independent[natId] = true;
            independentChanged = true;
            useDiplomacyStore.getState().applyDelta(sov, natId, -40);
            useDiplomacyStore.getState().applyDelta(natId, sov, -25);
            notify('MILITARY', 'CRITICAL', `${nationName(natId)} wins its independence`, `${nationName(sov)} withdraws. Sovereignty is seized, not granted — the wound will take decades to heal.`);
          } else if (progress <= -100) {
            delete independenceWars[natId];
            support[natId] = 20;
            notify('MILITARY', 'HIGH', `Independence war crushed`, `${nationName(sov)} restores control over ${nationName(natId)}. The movement is broken — for now.`);
          } else {
            independenceWars[natId] = { ...w, progress };
          }
          mutated = true;
        }

        // 5. Funded campaigns drip support over their window.
        for (const [natId, c] of Object.entries(campaigns)) {
          const activeHours = Math.max(0, Math.min(gameHours, c.endsAt) - sliceStart);
          if (activeHours > 0) {
            support[natId] = Math.min(100, (support[natId] ?? 0) + c.perHour * activeHours);
            mutated = true;
          }
          if (gameHours >= c.endsAt) {
            delete campaigns[natId];
            mutated = true;
          }
        }

        // 6. Movement support drifts for the player's dependency.
        const pid = useSessionStore.getState().playerNation;
        if (pid && isDependency(pid) && !independenceWars[pid]) {
          const drift = (supportDriftPerYear(pid) / YEAR_HOURS) * dtHours;
          const cur = support[pid] ?? 0;
          const nv = Math.min(100, cur + drift);
          if (nv !== cur) {
            support[pid] = nv;
            mutated = true;
          }
        }

        // 7. Scheduled independence referendums resolve on their set date.
        for (const [natId, pr] of Object.entries(pendingReferendums)) {
          if (gameHours < pr.resolvesAt) continue;
          delete pendingReferendums[natId];
          mutated = true;
          const sov = sovereignOf(natId);
          const sup = support[natId] ?? 0;
          const relations = 30 - (tension[natId] ?? 0); // warm start, cools as you push
          const odds = referendumOdds(natId, sup, relations);
          if (referendumPasses(natId, pr.resolvesAt, odds)) {
            independent[natId] = true;
            independentChanged = true;
            // An amicable divorce: the ex-sovereign stays warm.
            useDiplomacyStore.getState().applyDelta(sov, natId, 12);
            useDiplomacyStore.getState().applyDelta(natId, sov, 12);
            notify('DIPLOMATIC', 'HIGH', `${nationName(natId)} votes for independence`, `${nationName(sov)} honours the result. Full sovereignty assumed — military and foreign policy unlocked.`);
          } else {
            tension[natId] = Math.min(100, (tension[natId] ?? 0) + 15);
            notify('DIPLOMATIC', 'MEDIUM', 'Referendum denied', `${nationName(sov)} rejects the result. The movement hardens; ties with the metropole cool.`);
          }
        }

        // 8. Reintegration residue decays toward 0 (grudges and goodwill fade).
        const rDecay = (R.resentmentDecayPerYear / YEAR_HOURS) * dtHours;
        for (const k of Object.keys(resentment)) {
          const id = Number(k);
          const v = resentment[id];
          const nv = Math.abs(v) <= rDecay ? 0 : v - Math.sign(v) * rDecay;
          if (Math.abs(nv) < 0.5) delete resentment[id];
          else resentment[id] = nv;
          mutated = true;
        }

        if (mutated) {
          set({
            police,
            autonomy,
            breakaways,
            ops,
            resentment,
            support,
            tension,
            campaigns,
            pendingReferendums,
            independent,
            independenceWars,
            lastReintegration,
            rev: s.rev + 1,
          });
          if (independentChanged) setIndependentOverride(Object.keys(independent));
        }
      },

      reset: () => {
        set((s) => ({
          police: {},
          autonomy: {},
          breakaways: {},
          ops: {},
          resentment: {},
          support: {},
          tension: {},
          campaigns: {},
          pendingReferendums: {},
          independent: {},
          independenceWars: {},
          lastReferendum: {},
          lastReintegration: {},
          rev: s.rev + 1,
        }));
        setIndependentOverride([]);
      },
    }),
    {
      name: 'aetherion.politics.v1',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        if (version < 2) {
          delete p.lastCampaignPush; // replaced by the campaigns drip
          return {
            ...p,
            ops: {},
            resentment: {},
            campaigns: {},
            pendingReferendums: {},
            lastReintegration: {},
          };
        }
        return p;
      },
      partialize: (s) => ({
        police: s.police,
        autonomy: s.autonomy,
        breakaways: s.breakaways,
        ops: s.ops,
        resentment: s.resentment,
        support: s.support,
        tension: s.tension,
        campaigns: s.campaigns,
        pendingReferendums: s.pendingReferendums,
        independent: s.independent,
        independenceWars: s.independenceWars,
        lastReferendum: s.lastReferendum,
        lastReintegration: s.lastReintegration,
      }),
      onRehydrateStorage: () => (state) => {
        // Campaign history must correct the static NE map as soon as we load.
        if (state) setIndependentOverride(Object.keys(state.independent));
      },
    },
  ),
);
