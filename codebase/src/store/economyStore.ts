/**
 * ============================================================================
 *  AETHERION — ECONOMY STORE  (the live national ledger + development state)
 * ============================================================================
 *  Holds the player's BUILT development (per-province tier deltas on top of the
 *  derived base) and the recomputed national ledger. The built map is persisted
 *  with the campaign; the ledger is derived, recomputed whenever development or
 *  territory changes, and its net balance is pushed to the tick worker so the
 *  treasury drifts at the nation's real annual balance.
 *
 *  Development is a PROJECT, not a purchase: develop() funds it up-front and
 *  queues a construction that tickConstruction resolves after buildTimeDays of
 *  game time. Even then the effect is not instant — a completed tier phases its
 *  economic impact in over DEV_TIME.rampDays (the `ramping` list), so a new
 *  rail line takes a season to move the GDP needle. Projects can be CANCELLED:
 *  half the unbuilt share is recovered, and the province resents the broken
 *  promise (politicsStore resentment ledger).
 *
 *  SOVEREIGN FINANCE (GDD Ch.15) also lives here: a deficit is not a death
 *  timer — while bond markets trust you (sim/finance.marketAccess) the need is
 *  rolled into a LIVE debt stock that reprices your rating and interest; locked
 *  out, the treasury burns and the IMF or friendly capitals are the way back.
 *  The financing identity each recompute:
 *
 *    need = −balance + loan principal due   → surplus: treasury builds
 *                                           → bonds:   debt grows, treasury flat
 *                                           → reserves: treasury drains (crisis)
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { InfraLevels, NationLedger, Loan, ImfProgram, FinancingSummary, Severity } from '@/types';
import { DEV_SLOTS, DEV_TIME, type DevSlotId } from '@/config/infrastructure';
import { getProvince, useWorldStore } from '@/store/worldStore';
import { useSessionStore } from '@/store/sessionStore';
import { useSimStore } from '@/store/simStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useDiplomacyStore, playerActor } from '@/store/diplomacyStore';
import { usePoliticsStore } from '@/store/politicsStore';
import { nationLedger, growthMultiplier } from '@/sim/nationLedger';
import { strainDrag, advanceScar, growthRate, yearsElapsed } from '@/sim/growth';
import { computeLedger, provinceGdp, type LedgerMods } from '@/sim/economy';
import { getNationStat } from '@/features/menu/nationStats';
import {
  baseInfra,
  mergeLevels,
  infraEffects,
  upkeepCost,
  buildCost,
  buildTimeDays,
  canBuild,
} from '@/sim/infrastructure';
import { TAX, TRADE, YEAR_HOURS, RATING_ORDER, type CreditRating } from '@/config/economy';
import { BOND, IMF, BILATERAL } from '@/config/finance';
import {
  marketAccess,
  loanInterestPerYear,
  principalDuePerYear,
  amortizeLoans,
  imfEligible,
  imfTranchesDue,
  imfTrancheSize,
  bilateralOffers,
  type BilateralOffer,
} from '@/sim/finance';
import { baselineOpinion } from '@/sim/diplomacy';
import { isSovereign } from '@/sim/sovereignty';
import { POLITICS } from '@/config/autonomy';
import { setNetPerHour, spendTreasury } from '@/engine/engineSingleton';
import { gameDate, gameYear, money, pct } from '@/lib/format';

export interface DevelopResult {
  ok: boolean;
  reason?: string;
  cost?: number;
}

export interface FinanceResult {
  ok: boolean;
  reason?: string;
}

/** A tier under construction: funded up-front, delivered by tickConstruction. */
export interface ConstructionProject {
  provinceId: number;
  slotId: DevSlotId;
  startedAt: number; // gameHours
  completesAt: number; // gameHours
  cost: number;
}

/** A freshly completed tier still phasing its economic effect in. */
interface RampEntry {
  provinceId: number;
  slotId: DevSlotId;
  completedAt: number; // gameHours
}

/** Per-province built tiers (deltas over the derived base). */
type BuiltMap = Record<number, Partial<InfraLevels>>;

/** Persisted sovereign-finance state (sparse; everything else is derived). */
export interface FinanceState {
  /** LIVE bond-market debt ($). Null until it first diverges from the seeded
   *  figure (first issuance/buyback) — the base ledger's debt applies until then. */
  debt: number | null;
  loans: Loan[];
  imf: ImfProgram | null;
  /** gameHours of the last finance accrual (daily granularity). */
  lastAccrual: number;
  /** Last rating shown to the player — drives upgrade/downgrade notifications. */
  lastRating?: CreditRating;
  /** Repudiation stigma: rating capped at CCC until this gameHour. */
  defaultUntil?: number;
  /** One-shot flag so the reserves-burning alarm fires once per crisis. */
  crisisNotified?: boolean;
}

const FINANCE_ZERO: FinanceState = { debt: null, loans: [], imf: null, lastAccrual: 0 };

/** Persisted growth state — the ONLY path-dependent part of the world economy.
 *  Trend and cycle are closed-form in game time (sim/growth), so all that has
 *  to survive a reload is the damage the campaign itself has done. */
export interface GrowthState {
  /** Multiplier on the trend path: 1 = unharmed, floored by GROWTH.scarFloor. */
  scar: number;
  /** Last realised annual rate (trend + cycle - strain), for the HUD. */
  rate: number;
  /** gameHours of the last growth advance (daily granularity). */
  lastTick: number;
  /** Campaign year last reported to the player, and the GDP it closed on. */
  lastYear: number;
  lastYearGdp: number;
}

const GROWTH_ZERO: GrowthState = { scar: 1, rate: 0, lastTick: 0, lastYear: 0, lastYearGdp: 0 };

interface EconomyState {
  built: BuiltMap;
  projects: ConstructionProject[];
  ramping: RampEntry[];
  ledger: NationLedger | null;
  finance: FinanceState;
  growth: GrowthState;
  /** Derived each recompute: how the deficit/surplus is being financed. */
  financing: FinancingSummary | null;
  /** Recompute the player ledger (including built development) + push the rate. */
  recompute: () => void;
  /** Fund one tier of a slot in a province — starts a construction project. */
  develop: (provinceId: number, slotId: DevSlotId) => DevelopResult;
  /** Abandon a project underway: recover half the unbuilt share; the province
   *  resents the broken promise. */
  cancelProject: (provinceId: number, slotId: DevSlotId) => FinanceResult;
  /** The project underway for a slot in a province, if any. */
  projectFor: (provinceId: number, slotId: DevSlotId) => ConstructionProject | undefined;
  /** Current (base + built) levels for a province. */
  levels: (provinceId: number) => InfraLevels;
  /** Scheduler hook: construction + sovereign finance, in one call. */
  tickEconomy: (gameHours: number) => void;
  /** Deliver finished projects + advance effect ramps. */
  tickConstruction: (gameHours: number) => void;
  /** Accrue bond issuance, amortize loans, release IMF tranches, reprice. */
  tickFinance: (gameHours: number) => void;
  /** Advance the economy along its growth path; scar it while under strain. */
  tickGrowth: (gameHours: number) => void;
  /* -- sovereign finance actions -- */
  repayBonds: () => FinanceResult;
  takeImfProgram: () => FinanceResult;
  exitImfProgram: () => FinanceResult;
  listBilateralOffers: () => BilateralOffer[];
  takeBilateralLoan: (lender: string) => FinanceResult;
  repayLoan: (loanId: string) => FinanceResult;
  repudiateLoan: (loanId: string) => FinanceResult;
  reset: () => void;
}

/** The player's development index (from the base ledger) — for base-infra derivation. */
function playerDevelopment(): number {
  const pid = useSessionStore.getState().playerNation;
  return (pid && nationLedger(pid)?.development) || 0;
}

const RAMP_HOURS = DEV_TIME.rampDays * 24;

/** While ramps are active the ledger is refreshed once per game-day. */
let lastRampRecomputeDay = -1;

function notifyEcon(severity: Severity, headline: string, detail?: string) {
  useNotificationStore.getState().push({
    id: crypto.randomUUID(),
    gameDate: gameDate(useSimStore.getState().gameHours),
    category: 'ECONOMIC',
    severity,
    headline,
    detail,
  });
}

const nationName = (id: string) =>
  id === 'IMF' ? 'the International Monetary Fund' : (useWorldStore.getState().nations.get(id)?.name ?? id);

/** Trade multiplier from the diplomatic web: TRADE treaties boost tariff and
 *  transit revenue (weighted by how big the partner is relative to us);
 *  sanctions, embargoes, severed ties and wars cut it. Both directions capped. */
function tradeMultFor(actor: string, myGdp: number): number {
  if (myGdp <= 0) return 1;
  const d = useDiplomacyStore.getState();
  const weight = (other: string) => Math.max(0, Math.min(1, (getNationStat(other)?.gdp ?? 0) / myGdp));

  let boost = 0;
  let cut = 0;
  for (const [pk, list] of Object.entries(d.treaties)) {
    if (!list.includes('TRADE')) continue;
    const [a, b] = pk.split('|');
    if (a !== actor && b !== actor) continue;
    boost += TRADE.treatyBoost * weight(a === actor ? b : a);
  }
  for (const [dk, list] of Object.entries(d.sanctions)) {
    const [from, to] = dk.split('>');
    if (to === actor) {
      const w = weight(from);
      for (const s of list) cut += (s === 'EMBARGO' ? TRADE.embargoHit : TRADE.sanctionsHit) * w;
    } else if (from === actor) {
      cut += TRADE.selfSanctionHit * weight(to) * list.length;
    }
  }
  for (const pk of Object.keys(d.severed)) {
    const [a, b] = pk.split('|');
    if (a !== actor && b !== actor) continue;
    cut += TRADE.severedHit * weight(a === actor ? b : a);
  }
  for (const pk of Object.keys(d.wars)) {
    const [a, b] = pk.split('|');
    if (a !== actor && b !== actor) continue;
    cut += TRADE.embargoHit * weight(a === actor ? b : a); // war ends trade outright
  }
  return 1 + Math.min(TRADE.treatyBoostCap, boost) - Math.min(TRADE.reductionCap, cut);
}

const ratingIdx = (r: CreditRating) => RATING_ORDER.indexOf(r);

export const useEconomyStore = create<EconomyState>()(
  persist(
    (set, get) => ({
      built: {},
      projects: [],
      ramping: [],
      ledger: null,
      finance: FINANCE_ZERO,
      growth: GROWTH_ZERO,
      financing: null,

      levels: (provinceId) => {
        const p = getProvince(provinceId);
        if (!p) {
          return { infrastructure: 0, industry: 0, fortification: 0, port: 0, airfield: 0, special: 0 };
        }
        return mergeLevels(baseInfra(p, playerDevelopment()), get().built[provinceId]);
      },

      projectFor: (provinceId, slotId) =>
        get().projects.find((c) => c.provinceId === provinceId && c.slotId === slotId),

      recompute: () => {
        const pid = useSessionStore.getState().playerNation;
        const stat = pid ? getNationStat(pid) : undefined;
        if (!pid || !stat) {
          set({ ledger: null, financing: null });
          setNetPerHour(0);
          return;
        }
        const fin = get().finance;
        const now = useSimStore.getState().gameHours;
        const imfActive = !!fin.imf?.active;
        const defaulted = fin.defaultUntil != null && now < fin.defaultUntil;

        // Live finance threaded into the ledger builder: real debt stock, loan
        // interest, IMF conditionality/anchor, default stigma, treaty trade.
        const mods: LedgerMods = {
          debt: fin.debt ?? undefined,
          extraInterest: fin.loans.length ? loanInterestPerYear(fin.loans) : undefined,
          socialMult: imfActive ? IMF.austerity.socialMult : undefined,
          adminMult: imfActive ? IMF.austerity.adminMult : undefined,
          ratingFloor: imfActive ? IMF.ratingFloor : undefined,
          ratingCap: defaulted ? BILATERAL.repudiate.ratingCap : undefined,
          tradeMult: tradeMultFor(playerActor() ?? pid, stat.gdp),
          // The economy is dated: carried forward along its growth path from the
          // campaign start, less whatever the campaign has cost it.
          gdpMult: growthMultiplier(pid, get().growth.scar),
        };

        // Base ledger (matches the pre-game dossier — approximated infra line).
        const base = computeLedger(
          {
            id: pid,
            population: stat.population,
            provinceCount: stat.provinceCount,
            resourceOutput: stat.resourceOutput,
          },
          mods,
        );

        // Marginal effect of player-built development — iterate ONLY developed
        // provinces (cheap), summing extra output, trade and upkeep beyond base.
        let extraGdp = 0;
        let extraTrade = 0;
        let extraUpkeep = 0;
        const dev = base.development;
        // Development pays off against the economy as it stands today, not as
        // it stood on day one.
        const grown = growthMultiplier(pid, get().growth.scar);
        for (const [idStr, built] of Object.entries(get().built)) {
          const p = getProvince(Number(idStr));
          if (!p || p.nationId !== pid) continue;
          const bl = baseInfra(p, dev);
          const cur = mergeLevels(bl, built);
          const eb = infraEffects(bl);
          const ec = infraEffects(cur);
          const g0 = provinceGdp(pid, p.data.population, p.data.economy.resourceOutput, grown);
          extraGdp += g0 * (ec.gdpMult - eb.gdpMult);
          extraTrade += g0 * (ec.tradeMult - eb.tradeMult) * TRADE.baseShare;
          extraUpkeep += upkeepCost(p, cur) - upkeepCost(p, bl);
        }

        // Freshly completed tiers haven't reached full effect yet: withhold the
        // un-ramped share of their output (upkeep is charged in full — the
        // crews are already hired).
        for (const r of get().ramping) {
          const p = getProvince(r.provinceId);
          if (!p || p.nationId !== pid) continue;
          const frac = Math.max(0, Math.min(1, (now - r.completedAt) / RAMP_HOURS));
          if (frac >= 1) continue;
          const e = DEV_SLOTS[r.slotId].effect;
          const g0 = provinceGdp(pid, p.data.population, p.data.economy.resourceOutput, grown);
          const hold = 1 - frac;
          extraGdp -= (e.gdpPerTier ?? 0) * g0 * hold;
          extraTrade -= (e.tradePerTier ?? 0) * g0 * TRADE.baseShare * hold;
        }

        const effTaxRate = base.gdp > 0 ? base.revenue.tax / base.gdp : TAX.base;
        const ledger: NationLedger = {
          ...base,
          gdp: base.gdp + extraGdp,
          revenue: {
            ...base.revenue,
            tax: base.revenue.tax + effTaxRate * extraGdp,
            trade: base.revenue.trade + extraTrade,
            total: base.revenue.total + effTaxRate * extraGdp + extraTrade,
          },
          spending: {
            ...base.spending,
            infrastructure: base.spending.infrastructure + extraUpkeep,
            total: base.spending.total + extraUpkeep,
          },
          balance: 0,
        };
        ledger.balance = ledger.revenue.total - ledger.spending.total;

        // The financing identity: who covers the gap decides what the treasury
        // actually feels. Surpluses accumulate; bond-financed deficits grow the
        // debt stock instead of draining cash; a locked-out state burns reserves.
        const loanService = principalDuePerYear(fin.loans, now);
        const need = -ledger.balance + loanService;
        const access = marketAccess(ledger.creditRating, ledger.debtToGdp, imfActive);
        const financing: FinancingSummary =
          need <= 0
            ? {
                mode: 'surplus',
                access,
                needPerYear: 0,
                bondIssuancePerYear: 0,
                loanServicePerYear: loanService,
                treasuryDriftPerYear: -need,
              }
            : access
              ? {
                  mode: 'bonds',
                  access,
                  needPerYear: need,
                  bondIssuancePerYear: need,
                  loanServicePerYear: loanService,
                  treasuryDriftPerYear: 0,
                }
              : {
                  mode: 'reserves',
                  access,
                  needPerYear: need,
                  bondIssuancePerYear: 0,
                  loanServicePerYear: loanService,
                  treasuryDriftPerYear: -need,
                };

        // Rating-change + crisis alarms (one-shot, driven by state deltas).
        let nextFin = fin;
        if (fin.lastRating && fin.lastRating !== ledger.creditRating) {
          const up = ratingIdx(ledger.creditRating) < ratingIdx(fin.lastRating);
          notifyEcon(
            up ? 'INFO' : 'HIGH',
            `Credit rating ${up ? 'upgraded' : 'downgraded'} — ${fin.lastRating} → ${ledger.creditRating}`,
            up
              ? 'Creditors approve of the fiscal trajectory. Borrowing gets cheaper.'
              : 'Markets are repricing sovereign risk. Debt service will cost more.',
          );
        }
        if (fin.lastRating !== ledger.creditRating) nextFin = { ...nextFin, lastRating: ledger.creditRating };
        if (financing.mode === 'reserves' && !fin.crisisNotified) {
          notifyEcon(
            'CRITICAL',
            'Locked out of bond markets',
            `No creditor will roll over our paper at ${ledger.creditRating}. The deficit now burns ${money(need)} of reserves a year — seek an IMF program or bilateral credit.`,
          );
          nextFin = { ...nextFin, crisisNotified: true };
        } else if (financing.mode !== 'reserves' && fin.crisisNotified) {
          nextFin = { ...nextFin, crisisNotified: false };
        }

        set(nextFin === fin ? { ledger, financing } : { ledger, financing, finance: nextFin });
        setNetPerHour(financing.treasuryDriftPerYear / YEAR_HOURS);
      },

      develop: (provinceId, slotId) => {
        const pid = useSessionStore.getState().playerNation;
        const p = getProvince(provinceId);
        if (!p) return { ok: false, reason: 'Unknown province' };
        if (!pid || p.nationId !== pid) return { ok: false, reason: 'Not your territory' };
        if (get().projectFor(provinceId, slotId)) return { ok: false, reason: 'Already under construction' };

        const dev = playerDevelopment();
        const bl = baseInfra(p, dev);
        const built = get().built[provinceId] ?? {};
        const cur = mergeLevels(bl, built);
        const tier = cur[slotId];
        if (!canBuild(p, slotId, tier)) return { ok: false, reason: 'Cannot build here' };

        const cost = buildCost(p, slotId, tier);
        if (useSimStore.getState().treasury < cost) return { ok: false, reason: 'Insufficient treasury', cost };

        const now = useSimStore.getState().gameHours;
        const days = buildTimeDays(p, slotId, tier);
        spendTreasury(cost);
        set((s) => ({
          projects: [
            ...s.projects,
            { provinceId, slotId, startedAt: now, completesAt: now + days * 24, cost },
          ],
        }));
        useNotificationStore.getState().push({
          id: crypto.randomUUID(),
          gameDate: gameDate(now),
          category: 'ECONOMIC',
          severity: 'INFO',
          headline: `${DEV_SLOTS[slotId].name} ${['I', 'II', 'III', 'IV', 'V'][Math.min(4, tier)]} under construction — ${p.name}`,
          detail: `Completion ${gameDate(now + days * 24)} (${days} days). Its economic effect then phases in over ${DEV_TIME.rampDays} days.`,
        });
        return { ok: true, cost };
      },

      cancelProject: (provinceId, slotId) => {
        const project = get().projectFor(provinceId, slotId);
        if (!project) return { ok: false, reason: 'No project underway' };
        const p = getProvince(provinceId);
        const now = useSimStore.getState().gameHours;
        const span = Math.max(1, project.completesAt - project.startedAt);
        const progress = Math.max(0, Math.min(1, (now - project.startedAt) / span));
        // Half of the unbuilt share is salvageable; sunk works are sunk.
        const refund = Math.round(project.cost * (1 - progress) * 0.5);
        if (refund > 0) spendTreasury(-refund);
        set((s) => ({ projects: s.projects.filter((c) => c !== project) }));
        usePoliticsStore.getState().addResentment(provinceId, POLITICS.unrest.cancelBacklash);
        notifyEcon(
          'MEDIUM',
          `Construction abandoned — ${DEV_SLOTS[slotId].name}, ${p?.name ?? 'province'}`,
          `${money(refund)} recovered from the ${Math.round(progress * 100)}%-built site. The province seethes at the broken promise.`,
        );
        return { ok: true };
      },

      tickEconomy: (gameHours) => {
        get().tickConstruction(gameHours);
        get().tickFinance(gameHours);
        get().tickGrowth(gameHours);
      },

      tickConstruction: (gameHours) => {
        const s = get();
        if (s.projects.length === 0 && s.ramping.length === 0) return;

        const done = s.projects.filter((c) => gameHours >= c.completesAt);
        const rampedOut = s.ramping.some((r) => gameHours >= r.completedAt + RAMP_HOURS);

        if (done.length || rampedOut) {
          const built = { ...s.built };
          for (const c of done) {
            const prev = built[c.provinceId] ?? {};
            built[c.provinceId] = { ...prev, [c.slotId]: (prev[c.slotId] ?? 0) + 1 };
            const p = getProvince(c.provinceId);
            useNotificationStore.getState().push({
              id: crypto.randomUUID(),
              gameDate: gameDate(gameHours),
              category: 'ECONOMIC',
              severity: 'INFO',
              headline: `${DEV_SLOTS[c.slotId].name} completed — ${p?.name ?? 'province'}`,
              detail: 'The works are delivered. Output ramps up as the new capacity comes online.',
            });
          }
          set({
            built,
            projects: done.length ? s.projects.filter((c) => gameHours < c.completesAt) : s.projects,
            ramping: [
              ...s.ramping.filter((r) => gameHours < r.completedAt + RAMP_HOURS),
              ...done.map((c) => ({ provinceId: c.provinceId, slotId: c.slotId, completedAt: c.completesAt })),
            ],
          });
          get().recompute();
          lastRampRecomputeDay = Math.floor(gameHours / 24);
          return;
        }

        // Ramps still filling: refresh the ledger once per game-day so the
        // balance creeps up as new capacity comes online.
        const day = Math.floor(gameHours / 24);
        if (s.ramping.length && day !== lastRampRecomputeDay) {
          lastRampRecomputeDay = day;
          get().recompute();
        }
      },

      /* -- Growth: the world economy moves ------------------------------ */
      // Trend and cycle are closed-form in game time, so a day of growth costs
      // one exponential — no per-nation loop. Only the SCAR is stateful: war,
      // sanctions and separatist control compound damage onto the trend path,
      // and calm compounds recovery back toward whole.
      tickGrowth: (gameHours) => {
        const pid = useSessionStore.getState().playerNation;
        if (!pid) return;
        const g = get().growth;
        const days = Math.floor((gameHours - g.lastTick) / 24);
        if (days < 1) return;

        const actor = playerActor() ?? pid;
        const d = useDiplomacyStore.getState();
        const wars = Object.keys(d.wars).filter((k) => k.split('|').includes(actor)).length;
        const sanctions = Object.entries(d.sanctions).filter(
          ([k, list]) => k.endsWith(`>${actor}`) && list.length > 0,
        ).length;
        const world = useWorldStore.getState();
        const insurgencies = Object.keys(usePoliticsStore.getState().breakaways).filter(
          (id) => world.provinces.get(Number(id))?.nationId === pid,
        ).length;

        const drag = strainDrag({ wars, sanctions, insurgencies });
        const years = yearsElapsed(gameHours);
        set({
          growth: {
            ...g,
            scar: advanceScar(g.scar, drag, days),
            rate: growthRate(pid, years) - drag,
            lastTick: gameHours,
          },
        });
        get().recompute();

        // Close the books once a game-year: the player is told what the economy
        // actually did, in the same wire-dispatch language as everything else.
        // Measured GDP against GDP over whatever interval actually elapsed, so
        // the figure is true however the model's year and the calendar differ.
        const gdp = get().ledger?.gdp ?? 0;
        const year = gameYear(gameHours);
        if (year > g.lastYear || g.lastYearGdp === 0) {
          if (year > g.lastYear && g.lastYearGdp > 0) {
            const realised = gdp / g.lastYearGdp - 1;
            const up = realised >= 0.005;
            const down = realised <= -0.005;
            useNotificationStore.getState().push({
              id: crypto.randomUUID(),
              gameDate: gameDate(gameHours),
              category: 'ECONOMIC',
              severity: down ? 'MEDIUM' : 'INFO',
              headline: down
                ? `Recession — the economy contracted ${pct(Math.abs(realised), 1)}`
                : up
                  ? `The year closes — the economy grew ${pct(realised, 1)}`
                  : 'The year closes — the economy held flat',
              detail: down
                ? 'Output fell over the year. Receipts follow output: expect the balance to tighten before it eases.'
                : 'Output over the past year, measured against the year before. Tax receipts move with it.',
            });
          }
          set({ growth: { ...get().growth, lastYear: year, lastYearGdp: gdp } });
        }
      },

      tickFinance: (gameHours) => {
        const s = get();
        const fin = s.finance;
        // Bootstrap (fresh campaign or migrated save): don't back-accrue history.
        if (fin.lastAccrual === 0 && gameHours > 720) {
          set({ finance: { ...fin, lastAccrual: gameHours } });
          return;
        }
        const dt = Math.min(gameHours - fin.lastAccrual, 720); // ≤ a month per step
        if (dt < 24) return; // daily granularity
        if (!s.ledger || !useSessionStore.getState().playerNation) {
          set({ finance: { ...fin, lastAccrual: gameHours } });
          return;
        }
        const pid = useSessionStore.getState().playerNation!;

        const next: FinanceState = { ...fin, lastAccrual: gameHours };
        let needRecompute = false;

        // 1) Loans amortize (after grace) — retirements earn goodwill.
        if (fin.loans.length) {
          const { loans, retired } = amortizeLoans(fin.loans, gameHours, dt);
          next.loans = loans;
          for (const l of retired) {
            notifyEcon(
              'INFO',
              `Sovereign loan repaid in full — ${nationName(l.lender)}`,
              `${money(l.principal)} amortized over ${l.termYears} years. The books are clean.`,
            );
            if (l.kind === 'bilateral') useDiplomacyStore.getState().applyDelta(l.lender, pid, BILATERAL.repaidOpinion);
          }
          if (retired.length) needRecompute = true;
        }

        // 2) IMF tranches release quarterly through the disbursement window.
        if (next.imf?.active) {
          const due = imfTranchesDue(next.imf, gameHours);
          if (due > next.imf.released) {
            const size = imfTrancheSize(next.imf);
            const count = due - next.imf.released;
            spendTreasury(-size * count);
            next.imf = { ...next.imf, released: due, disbursed: next.imf.disbursed + size * count };
            next.loans = next.loans.map((l) =>
              l.kind === 'imf' ? { ...l, outstanding: l.outstanding + size * count } : l,
            );
            notifyEcon(
              'INFO',
              `IMF tranche released — ${money(size * count)}`,
              `Review ${due} of ${IMF.tranches} cleared. Conditionality holds.`,
            );
            if (due >= IMF.tranches) {
              next.imf = { ...next.imf, active: false };
              notifyEcon(
                'INFO',
                'IMF program completed',
                'The final review is cleared. Austerity conditionality lifts; the Fund anchor is withdrawn.',
              );
            }
            needRecompute = true;
          }
        }

        // 3) Bond-financed deficits accrue onto the live debt stock.
        const financing = s.financing;
        if (financing?.mode === 'bonds' && financing.needPerYear > 0) {
          next.debt = (fin.debt ?? s.ledger.debt) + financing.needPerYear * (dt / YEAR_HOURS);
        }

        // 4) Default stigma lapses.
        if (fin.defaultUntil != null && gameHours >= fin.defaultUntil) {
          next.defaultUntil = undefined;
          needRecompute = true;
          notifyEcon('INFO', 'Default stigma fades', 'Markets will look at our paper again.');
        }

        // 5) Monthly repricing (rating follows the drifting debt stock).
        if (Math.floor(gameHours / 720) !== Math.floor(fin.lastAccrual / 720)) needRecompute = true;

        set({ finance: next });
        if (needRecompute) get().recompute();
      },

      /* ---- sovereign finance actions ---------------------------------- */

      repayBonds: () => {
        const s = get();
        if (!s.ledger) return { ok: false, reason: 'No ledger' };
        const debt = s.finance.debt ?? s.ledger.debt;
        if (debt <= 0) return { ok: false, reason: 'No debt outstanding' };
        const chunk = Math.round(debt * BOND.repayChunkFrac);
        if (useSimStore.getState().treasury < chunk) return { ok: false, reason: `Needs ${money(chunk)}` };
        spendTreasury(chunk);
        set({ finance: { ...s.finance, debt: debt - chunk } });
        get().recompute();
        notifyEcon(
          'INFO',
          `Bond buyback — ${money(chunk)} retired`,
          'A tender offer takes paper out of the market. Creditors take note.',
        );
        return { ok: true };
      },

      takeImfProgram: () => {
        const s = get();
        const pid = useSessionStore.getState().playerNation;
        if (!pid || !s.ledger) return { ok: false, reason: 'No ledger' };
        if (!isSovereign(pid)) return { ok: false, reason: 'Only sovereign states deal with the Fund' };
        if (s.finance.imf?.active) return { ok: false, reason: 'A program is already active' };
        if (!imfEligible(s.ledger, useSimStore.getState().treasury))
          return { ok: false, reason: 'Not in fiscal distress — the Fund lends to crises, not comfort' };

        const now = useSimStore.getState().gameHours;
        const total = IMF.quotaGdpFrac * s.ledger.gdp;
        const size = total / IMF.tranches;
        spendTreasury(-size); // first tranche on signature
        const imf: ImfProgram = { startedAt: now, total, disbursed: size, released: 1, active: true };
        const loan: Loan = {
          id: crypto.randomUUID(),
          lender: 'IMF',
          principal: total,
          outstanding: size,
          rate: IMF.rate,
          startedAt: now,
          termYears: IMF.termYears,
          graceYears: IMF.graceYears,
          kind: 'imf',
        };
        set({ finance: { ...s.finance, imf, loans: [...s.finance.loans, loan] } });

        // The world reads the signature: the Fund's shareholders warm; capitals
        // structurally hostile to Washington read it as capitulation.
        const d = useDiplomacyStore.getState();
        useWorldStore.getState().nations.forEach((_n, id) => {
          if (id === pid || !isSovereign(id)) return;
          if ((IMF.imfPowers as readonly string[]).includes(id)) d.applyDelta(id, pid, IMF.signOpinion.powers);
          else if (baselineOpinion(id, 'USA') <= IMF.signOpinion.antiWestThreshold)
            d.applyDelta(id, pid, IMF.signOpinion.antiWest);
        });

        get().recompute();
        notifyEcon(
          'HIGH',
          `IMF stabilisation program signed — ${money(total)}`,
          `${money(size)} disbursed now; ${IMF.tranches - 1} quarterly tranches follow at ${(IMF.rate * 100).toFixed(1)}%. Conditionality: welfare −${Math.round((1 - IMF.austerity.socialMult) * 100)}%, administration −${Math.round((1 - IMF.austerity.adminMult) * 100)}% — the street will feel it.`,
        );
        return { ok: true };
      },

      exitImfProgram: () => {
        const s = get();
        const pid = useSessionStore.getState().playerNation;
        const imf = s.finance.imf;
        if (!pid || !imf?.active) return { ok: false, reason: 'No active program' };

        const loans = s.finance.loans.map((l) =>
          l.kind === 'imf'
            ? { ...l, principal: Math.max(1, imf.disbursed), rate: IMF.earlyExit.penaltyRate }
            : l,
        );
        set({ finance: { ...s.finance, imf: { ...imf, active: false }, loans } });

        const d = useDiplomacyStore.getState();
        for (const power of IMF.imfPowers) {
          if (power !== pid && isSovereign(power)) d.applyDelta(power, pid, IMF.earlyExit.powersOpinion);
        }
        get().recompute();
        notifyEcon(
          'HIGH',
          'IMF program abandoned',
          `Undrawn tranches are cancelled and the ${money(imf.disbursed)} drawn reprices to ${(IMF.earlyExit.penaltyRate * 100).toFixed(0)}%. Austerity ends; Western capitals cool.`,
        );
        return { ok: true };
      },

      listBilateralOffers: () => {
        const s = get();
        const pid = useSessionStore.getState().playerNation;
        if (!pid || !s.ledger || !isSovereign(pid)) return [];
        const d = useDiplomacyStore.getState();
        const candidates: { id: string; gdp: number }[] = [];
        useWorldStore.getState().nations.forEach((_n, id) => {
          if (id === pid || !isSovereign(id)) return;
          candidates.push({ id, gdp: getNationStat(id)?.gdp ?? 0 });
        });
        const lenders = new Set(
          s.finance.loans.filter((l) => l.kind === 'bilateral' && l.outstanding > 0).map((l) => l.lender),
        );
        return bilateralOffers(s.ledger, candidates, (lender) => d.opinionOf(lender, pid), lenders);
      },

      takeBilateralLoan: (lender) => {
        const s = get();
        const pid = useSessionStore.getState().playerNation;
        if (!pid || !s.ledger) return { ok: false, reason: 'No ledger' };
        const offer = get()
          .listBilateralOffers()
          .find((o) => o.lender === lender);
        if (!offer) return { ok: false, reason: 'No credit line on offer from them' };

        const now = useSimStore.getState().gameHours;
        const loan: Loan = {
          id: crypto.randomUUID(),
          lender: offer.lender,
          principal: offer.amount,
          outstanding: offer.amount,
          rate: offer.rate,
          startedAt: now,
          termYears: offer.termYears,
          graceYears: offer.graceYears,
          kind: 'bilateral',
        };
        spendTreasury(-offer.amount); // disbursed up-front
        set({ finance: { ...s.finance, loans: [...s.finance.loans, loan] } });

        // Credit binds the pair — and the lender's sworn rivals notice.
        const d = useDiplomacyStore.getState();
        d.applyDelta(pid, lender, BILATERAL.acceptOpinion.borrowerToLender);
        d.applyDelta(lender, pid, BILATERAL.acceptOpinion.lenderToBorrower);
        useWorldStore.getState().nations.forEach((_n, id) => {
          if (id === pid || id === lender || !isSovereign(id)) return;
          if (baselineOpinion(id, lender) <= BILATERAL.acceptOpinion.rivalThreshold)
            d.applyDelta(id, pid, BILATERAL.acceptOpinion.rivals);
        });

        get().recompute();
        notifyEcon(
          'INFO',
          `Sovereign loan signed — ${money(offer.amount)} from ${nationName(lender)}`,
          `${(offer.rate * 100).toFixed(1)}% over ${offer.termYears} years (${offer.graceYears}y grace), disbursed in full. Their rivals take note of the alignment.`,
        );
        return { ok: true };
      },

      repayLoan: (loanId) => {
        const s = get();
        const pid = useSessionStore.getState().playerNation;
        const loan = s.finance.loans.find((l) => l.id === loanId);
        if (!pid || !loan) return { ok: false, reason: 'No such loan' };
        if (useSimStore.getState().treasury < loan.outstanding)
          return { ok: false, reason: `Needs ${money(loan.outstanding)}` };
        spendTreasury(loan.outstanding);
        set({ finance: { ...s.finance, loans: s.finance.loans.filter((l) => l.id !== loanId) } });
        if (loan.kind === 'bilateral')
          useDiplomacyStore.getState().applyDelta(loan.lender, pid, BILATERAL.repaidOpinion);
        get().recompute();
        notifyEcon(
          'INFO',
          `Loan settled early — ${nationName(loan.lender)}`,
          `${money(loan.outstanding)} wired. ${loan.kind === 'bilateral' ? 'A debt honoured is remembered.' : 'The Fund closes the file.'}`,
        );
        return { ok: true };
      },

      repudiateLoan: (loanId) => {
        const s = get();
        const pid = useSessionStore.getState().playerNation;
        const loan = s.finance.loans.find((l) => l.id === loanId);
        if (!pid || !loan) return { ok: false, reason: 'No such loan' };
        if (loan.kind !== 'bilateral') return { ok: false, reason: 'Nobody repudiates the Fund and keeps a financial system' };

        const now = useSimStore.getState().gameHours;
        set({
          finance: {
            ...s.finance,
            loans: s.finance.loans.filter((l) => l.id !== loanId),
            defaultUntil: now + BILATERAL.repudiate.ratingCapYears * YEAR_HOURS,
          },
        });
        const d = useDiplomacyStore.getState();
        d.applyDelta(loan.lender, pid, BILATERAL.repudiate.lenderOpinion);
        d.addCasusBelli(loan.lender, pid, BILATERAL.repudiate.casusBelli);
        d.worldReaction(pid, BILATERAL.repudiate.worldOpinion);
        get().recompute();
        notifyEcon(
          'CRITICAL',
          `Debts to ${nationName(loan.lender)} repudiated — ${money(loan.outstanding)} written off`,
          `They now hold a casus belli against us. World opinion falls, and markets cap us at ${BILATERAL.repudiate.ratingCap} for ${BILATERAL.repudiate.ratingCapYears} years.`,
        );
        return { ok: true };
      },

      reset: () => {
        set({ built: {}, projects: [], ramping: [], ledger: null, finance: FINANCE_ZERO, growth: GROWTH_ZERO, financing: null });
        setNetPerHour(0);
      },
    }),
    {
      name: 'aetherion.economy.v1',
      storage: createJSONStorage(() => localStorage),
      version: 4,
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        if (version < 2) return { ...p, projects: [], ramping: [], finance: FINANCE_ZERO };
        if (version < 3) return { ...p, finance: FINANCE_ZERO, growth: GROWTH_ZERO };
        if (version < 4) return { ...p, growth: GROWTH_ZERO };
        return p;
      },
      partialize: (s) => ({ built: s.built, projects: s.projects, ramping: s.ramping, finance: s.finance, growth: s.growth }),
    },
  ),
);

/* ---- diplomacy → economy bridge --------------------------------------------
 * Treaties, sanctions and wars change trade revenue, so any diplomatic mutation
 * reprices the ledger. The rev guard keeps it to real mutations. Deferred a
 * microtask: this module sits in an import cycle with diplomacyStore (via the
 * engine → aiScheduler), so the binding isn't initialized at eval time. */
let lastDiplomacyRev = -1;
queueMicrotask(() =>
  useDiplomacyStore.subscribe((s) => {
    if (s.rev === lastDiplomacyRev) return;
    lastDiplomacyRev = s.rev;
    const eco = useEconomyStore.getState();
    if (eco.ledger) eco.recompute();
  }),
);
