/**
 * Left HUD — STATECRAFT. The player's command dashboard, organised into tabs so
 * everything is reachable without burying the map: Overview (the state at a
 * glance), Budget (the live fiscal ledger with revenue/expenditure breakdowns),
 * Forces (military — wiring in as that system lands) and Relations (diplomacy).
 *
 * Every figure is real: GDP, per-capita, treasury (live from the tick worker),
 * the monthly balance, debt, credit rating and the full budget all come from the
 * economy model (`sim/economy.ts` → economyStore). Nothing here is a placeholder
 * number — the Forces/Relations tabs are honest "coming online" shells that
 * already surface the real defence budget and campaign doctrine.
 */
import { useMemo, useState } from 'react';
import { Panel } from '@/ui/Panel';
import { Flag } from '@/ui/Flag';
import { Bar } from '@/ui/Bar';
import { color } from '@/config/tokens';
import { useWorldStore } from '@/store/worldStore';
import { useSimStore } from '@/store/simStore';
import { useSessionStore } from '@/store/sessionStore';
import { useUIStore } from '@/store/uiStore';
import { useEconomyStore } from '@/store/economyStore';
import { useDiplomacyStore, playerActor } from '@/store/diplomacyStore';
import { usePoliticsStore } from '@/store/politicsStore';
import { getNationStat } from '@/features/menu/nationStats';
import { nationLedger, marketPosition } from '@/sim/nationLedger';
import { marketBoard } from '@/sim/market';
import { INCOME_LABEL, TRADE, YEAR_HOURS } from '@/config/economy';
import { IMF, BILATERAL, BOND } from '@/config/finance';
import { imfEligible } from '@/sim/finance';
import { growthRate, yearsElapsed } from '@/sim/growth';
import { TREATY_LABEL, SANCTION_LABEL } from '@/config/diplomacy';
import { POLITICS, AUTONOMY } from '@/config/autonomy';
import { stance } from '@/sim/diplomacy';
import { isSovereign, isDependency, autonomyTier, sovereignOf } from '@/sim/sovereignty';
import { canCallReferendum } from '@/sim/independence';
import { money, compact, signedMoney, pct } from '@/lib/format';
import type { NationLedger, Loan } from '@/types';

type Tab = 'overview' | 'budget' | 'forces' | 'relations';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'budget', label: 'Budget' },
  { id: 'forces', label: 'Forces' },
  { id: 'relations', label: 'Relations' },
];

const tierClass: Record<string, string> = {
  Superpower: 'text-gold-light border-gold/60',
  'Great Power': 'text-gold-light border-gold/50',
  'Major Power': 'text-off-white border-steel/60',
  'Regional Power': 'text-off-white border-steel/50',
  'Minor Power': 'text-slate border-steel/40',
  Micronation: 'text-slate border-steel/40',
};

const balanceColor = (v: number) => (v >= 0 ? color.ally : color.high);

/* -------------------------------------------------------------------------- */

function Cell({ label, value, accent, title }: { label: string; value: string; accent?: string; title?: string }) {
  return (
    <div className="rounded-sm bg-ink/40 px-2.5 py-1.5" title={title}>
      <div className="font-sans text-[9px] uppercase tracking-[0.14em] text-slate">{label}</div>
      <div className="font-mono text-[13px] tabular-nums" style={{ color: accent ?? color.offWhite }}>
        {value}
      </div>
    </div>
  );
}

/** One revenue/expenditure line: label, amount, and a share-of-total bar. */
function LedgerLine({ label, amount, total, tint }: { label: string; amount: number; total: number; tint: string }) {
  return (
    <div className="py-[3px]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-sans text-[10.5px] text-slate">{label}</span>
        <span className="font-mono text-[11px] tabular-nums text-off-white/90">{money(amount)}</span>
      </div>
      <Bar value={total > 0 ? amount / total : 0} color={tint} className="mt-1" />
    </div>
  );
}

function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-1 mt-3 flex items-center justify-between border-t border-steel/30 pt-2 first:mt-0 first:border-0 first:pt-0">
      <span className="font-display text-[9.5px] uppercase tracking-[0.2em] text-gold-light/80">{children}</span>
      {right}
    </div>
  );
}

/* ---- tabs ---------------------------------------------------------------- */

function Overview({ ledger, treasury }: { ledger: NationLedger; treasury: number }) {
  const monthly = ledger.balance / 12;
  const playerNation = useSessionStore((s) => s.playerNation);
  const growth = useEconomyStore((s) => s.growth);
  const gameHours = useSimStore((s) => s.gameHours);
  // Before the first daily advance (a fresh, still-paused campaign) the stored
  // rate is not yet meaningful — read the path directly.
  const rate =
    growth.lastTick > 0 || !playerNation ? growth.rate : growthRate(playerNation, yearsElapsed(gameHours));
  const rev = useDiplomacyStore((s) => s.rev);
  const politicsRev = usePoliticsStore((s) => s.rev);

  const standing = useMemo(() => {
    void rev;
    void politicsRev;
    if (!playerNation) return { wars: 0, treaties: 0, insurgencies: 0 };
    const actor = playerActor()!;
    const d = useDiplomacyStore.getState();
    const wars = Object.keys(d.wars).filter((k) => k.split('|').includes(actor)).length;
    const treaties = Object.entries(d.treaties)
      .filter(([k]) => k.split('|').includes(actor))
      .reduce((n, [, list]) => n + list.length, 0);
    const p = usePoliticsStore.getState();
    const world = useWorldStore.getState();
    const insurgencies = Object.keys(p.breakaways).filter(
      (id) => world.provinces.get(Number(id))?.nationId === playerNation,
    ).length;
    return { wars, treaties, insurgencies };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerNation, rev, politicsRev]);

  return (
    <>
      <div className="grid grid-cols-2 gap-1.5">
        <Cell label="Treasury" value={money(treasury)} accent={color.goldLight} title="Spendable national reserves" />
        <Cell label="Balance / mo" value={signedMoney(monthly)} accent={balanceColor(ledger.balance)} title="Net monthly surplus or deficit" />
        <Cell label="GDP / yr" value={money(ledger.gdp)} accent={color.goldLight} />
        <Cell label="GDP / capita" value={money(ledger.gdpPerCapita)} />
        <Cell label="Population" value={compact(ledger.population)} accent={color.codeBlue} />
        <Cell label="Credit" value={`${ledger.creditRating} · ${pct(ledger.interestRate, 1)}`} title="Sovereign credit rating and its borrowing rate" />
        <Cell label="Debt / GDP" value={pct(ledger.debtToGdp)} />
        <Cell
          label="Growth / yr"
          value={`${rate >= 0 ? '▲' : '▼'} ${pct(Math.abs(rate), 1)}`}
          accent={balanceColor(rate)}
          title="Real growth this year: the economy's long-run trend and where it sits in its cycle, less the cost of any war, sanctions or separatist control"
        />
      </div>

      <SectionTitle>Standing</SectionTitle>
      <div className="grid grid-cols-3 gap-1.5">
        <Cell label="Active Wars" value={String(standing.wars)} accent={standing.wars ? color.crimson : undefined} />
        <Cell label="Treaties" value={String(standing.treaties)} />
        <Cell
          label="Insurgencies"
          value={String(standing.insurgencies)}
          accent={standing.insurgencies ? color.high : undefined}
          title="Provinces under separatist control"
        />
      </div>

      {playerNation && <AutonomySection playerNation={playerNation} />}
    </>
  );
}

/** Dependency campaigns: the road to nationhood, right on the Overview tab.
 *  Campaigns and referendums are TIMED — a funded push drips support over
 *  months and a called vote resolves on a set date, both shown live here. */
function AutonomySection({ playerNation }: { playerNation: string }) {
  const rev = usePoliticsStore((s) => s.rev);
  const gameHours = useSimStore((s) => s.gameHours);
  const politics = usePoliticsStore.getState();
  const nations = useWorldStore((s) => s.nations);
  const [msg, setMsg] = useState<string | null>(null);
  void rev;

  if (!isDependency(playerNation)) return null;
  const tierDef = AUTONOMY[autonomyTier(playerNation)];
  const sov = sovereignOf(playerNation);
  const support = politics.support[playerNation] ?? 0;
  const war = politics.independenceWars[playerNation];
  const campaign = politics.campaigns[playerNation];
  const pending = politics.pendingReferendums[playerNation];

  const run = (fn: () => { ok: boolean; reason?: string }) => {
    const res = fn();
    setMsg(res.ok ? null : (res.reason ?? 'Unavailable'));
  };

  const daysTo = (at: number) => Math.max(0, Math.ceil((at - gameHours) / 24));

  return (
    <>
      <SectionTitle
        right={<span className="font-mono text-[10px] text-slate">{nations.get(sov)?.name ?? sov}</span>}
      >
        {tierDef.label}
      </SectionTitle>
      {war ? (
        <>
          <div className="flex items-baseline justify-between">
            <span className="font-sans text-[10.5px] text-slate">War of independence</span>
            <span className="font-mono text-[11px] tabular-nums" style={{ color: war.progress >= 0 ? color.ally : color.high }}>
              {war.progress >= 0 ? '+' : ''}
              {Math.round(war.progress)}
            </span>
          </div>
          <Bar value={(war.progress + 100) / 200} color={war.progress >= 0 ? color.ally : color.crimson} className="mt-1" />
          <p className="mt-1.5 font-serif text-[10.5px] italic leading-snug text-slate">
            +100 wins nationhood by force; −100 sees the movement crushed.
          </p>
        </>
      ) : (
        <>
          <div className="flex items-baseline justify-between">
            <span className="font-sans text-[10.5px] text-slate">Independence support</span>
            <span className="font-mono text-[11px] tabular-nums text-gold-light">{Math.round(support)}%</span>
          </div>
          <Bar value={support / 100} color={color.gold} className="mt-1" />

          {campaign && (
            <div className="mt-1.5 rounded-sm bg-ink/40 px-2 py-1.5">
              <div className="flex items-baseline justify-between">
                <span className="font-sans text-[9.5px] uppercase tracking-[0.12em] text-gold-light/80">Campaign underway</span>
                <span className="font-mono text-[9.5px] tabular-nums text-slate">{daysTo(campaign.endsAt)}d</span>
              </div>
              <Bar value={1 - daysTo(campaign.endsAt) / POLITICS.timing.campaignDays} color={color.gold} className="mt-1" height={3} />
            </div>
          )}
          {pending && (
            <div className="mt-1.5 rounded-sm bg-ink/40 px-2 py-1.5">
              <div className="flex items-baseline justify-between">
                <span className="font-sans text-[9.5px] uppercase tracking-[0.12em] text-gold-light/80">Vote scheduled</span>
                <span className="font-mono text-[9.5px] tabular-nums text-slate">{daysTo(pending.resolvesAt)}d</span>
              </div>
              <Bar
                value={(gameHours - pending.calledAt) / Math.max(1, pending.resolvesAt - pending.calledAt)}
                color={color.goldLight}
                className="mt-1"
                height={3}
              />
            </div>
          )}

          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            <button
              onClick={() => run(politics.fundCampaign)}
              disabled={!!campaign}
              title={
                campaign
                  ? 'A funded campaign is already building support'
                  : 'Fund the movement — support builds over months, and it irritates the metropole'
              }
              className={`rounded-sm border px-1 py-1 font-mono text-[9px] uppercase tracking-wider transition-colors ${
                campaign
                  ? 'border-steel/40 bg-ink/40 text-slate/60'
                  : 'border-steel/50 bg-ink/40 text-off-white/80 hover:border-gold/50 hover:text-gold-light'
              }`}
            >
              Campaign
            </button>
            <button
              onClick={() => run(politics.callReferendum)}
              disabled={!!pending}
              title={
                pending
                  ? `The vote is already scheduled — ${daysTo(pending.resolvesAt)} days out`
                  : canCallReferendum(support)
                    ? `Call the vote — it is held ${POLITICS.timing.referendumLeadDays} days out; support on the day decides it`
                    : `Needs ${POLITICS.independence.referendumThreshold}% support`
              }
              className={`rounded-sm border px-1 py-1 font-mono text-[9px] uppercase tracking-wider transition-colors ${
                !pending && canCallReferendum(support)
                  ? 'border-gold/50 bg-gold/15 text-gold-light hover:bg-gold/30'
                  : 'border-steel/40 bg-ink/40 text-slate/60'
              }`}
            >
              Referendum
            </button>
            <button
              onClick={() => run(politics.declareIndependence)}
              title="Seize sovereignty by force — a war of independence"
              className="rounded-sm border border-crimson/50 bg-crimson/10 px-1 py-1 font-mono text-[9px] uppercase tracking-wider text-crimson transition-colors hover:bg-crimson/25"
            >
              Declare
            </button>
          </div>
        </>
      )}
      {msg && <div className="mt-1 font-mono text-[10px] text-crimson">{msg}</div>}
    </>
  );
}

function Budget({ ledger, playerNation }: { ledger: NationLedger; playerNation: string }) {
  const r = ledger.revenue;
  const s = ledger.spending;
  return (
    <>
      <SectionTitle right={<span className="font-mono text-[11px] tabular-nums text-gold-light">{money(r.total)}/yr</span>}>
        Revenue
      </SectionTitle>
      <LedgerLine label="Taxation" amount={r.tax} total={r.total} tint={color.goldLight} />
      <LedgerLine label="Resource Royalties" amount={r.resource} total={r.total} tint="#cc7a3b" />
      <LedgerLine label="Tariffs & Transit" amount={r.trade} total={r.total} tint={color.codeBlue} />

      <SectionTitle right={<span className="font-mono text-[11px] tabular-nums text-off-white/90">{money(s.total)}/yr</span>}>
        Expenditure
      </SectionTitle>
      <LedgerLine label="Administration" amount={s.admin} total={s.total} tint="#7c8aa0" />
      <LedgerLine label="Defence" amount={s.military} total={s.total} tint={color.crimson} />
      <LedgerLine label="Social & Welfare" amount={s.social} total={s.total} tint="#6f8a4f" />
      <LedgerLine label="Infrastructure" amount={s.infrastructure} total={s.total} tint="#4f88a8" />
      <LedgerLine label="Debt Interest" amount={s.debtInterest} total={s.total} tint="#9a6fb8" />

      <div className="mt-3 flex items-center justify-between border-t border-steel/40 pt-2">
        <span className="font-display text-[10px] uppercase tracking-[0.2em] text-slate">Net Balance</span>
        <span className="font-mono text-sm tabular-nums" style={{ color: balanceColor(ledger.balance) }}>
          {signedMoney(ledger.balance)}/yr
        </span>
      </div>

      <CommodityMarket playerNation={playerNation} />

      <SovereignFinance ledger={ledger} playerNation={playerNation} />
    </>
  );
}

/* ---- the commodity market (GDD Ch.14): what the world pays this year ------- */

const CATEGORY_LABEL: Record<string, string> = {
  FUEL: 'Energy',
  INDUSTRIAL: 'Industrial metals',
  AGRICULTURE: 'Agricultural',
  STRATEGIC: 'Strategic minerals',
};

function CommodityMarket({ playerNation }: { playerNation: string }) {
  const gameHours = useSimStore((s) => s.gameHours);
  const years = yearsElapsed(gameHours);
  const board = marketBoard(years);
  const pos = marketPosition(playerNation);
  if (!pos) return null;
  const swing = pos.termsOfTrade - 1;

  return (
    <>
      <SectionTitle
        right={
          <span className="font-mono text-[11px] tabular-nums" style={{ color: balanceColor(pos.net) }}>
            {signedMoney(pos.net)}/yr
          </span>
        }
      >
        Commodity Market
      </SectionTitle>
      <p className="mb-2 font-sans text-[10.5px] leading-snug text-slate">
        {pos.net >= 0
          ? 'You sell more to the world than you buy from it. Rising prices carry your economy up with them.'
          : 'You buy more from the world than you sell to it. Rising prices are a tax on everything you make.'}
      </p>
      {board.map((b) => {
        const move = b.index - 1;
        return (
          <div key={b.category} className="flex items-baseline justify-between py-[3px]">
            <span className="font-sans text-[10.5px] text-slate">{CATEGORY_LABEL[b.category] ?? b.category}</span>
            <span className="font-mono text-[11px] tabular-nums" style={{ color: move >= 0 ? color.goldLight : color.codeBlue }}>
              {b.index.toFixed(2)}× <span className="text-[10px] text-slate">({move >= 0 ? '+' : ''}{pct(move, 1)})</span>
            </span>
          </div>
        );
      })}
      <div className="mt-2 flex items-center justify-between border-t border-steel/40 pt-2">
        <span
          className="font-display text-[10px] uppercase tracking-[0.2em] text-slate"
          title="What the swing in world prices since the campaign opened is worth to your economy, up or down"
        >
          Terms of Trade
        </span>
        <span className="font-mono text-sm tabular-nums" style={{ color: balanceColor(swing) }}>
          {swing >= 0 ? '+' : ''}{pct(swing, 1)} of output
        </span>
      </div>
    </>
  );
}

/* ---- sovereign finance (GDD Ch.15): how the deficit is actually funded ----- */

const FINANCING_VIEW = {
  surplus: { label: 'Surplus — reserves building', color: color.ally },
  bonds: { label: 'Deficit rolled at market', color: color.warning },
  reserves: { label: 'Markets closed — burning reserves', color: color.crimson },
} as const;

function FinanceButton({
  label,
  onClick,
  disabled,
  title,
  tone = 'steel',
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  tone?: 'steel' | 'gold' | 'crimson';
}) {
  const cls = disabled
    ? 'border-steel/40 bg-ink/40 text-slate/60'
    : tone === 'gold'
      ? 'border-gold/50 bg-gold/15 text-gold-light hover:bg-gold/30'
      : tone === 'crimson'
        ? 'border-crimson/50 bg-crimson/10 text-crimson hover:bg-crimson/25'
        : 'border-steel/50 bg-ink/40 text-off-white/80 hover:border-gold/50 hover:text-gold-light';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-sm border px-1.5 py-1 font-mono text-[9px] uppercase tracking-wider transition-colors ${cls}`}
    >
      {label}
    </button>
  );
}

function LoanRow({
  loan,
  gameHours,
  treasury,
  lenderName,
  run,
}: {
  loan: Loan;
  gameHours: number;
  treasury: number;
  lenderName: (id: string) => string;
  run: (fn: () => { ok: boolean; reason?: string }) => void;
}) {
  const graceLeft = Math.max(0, Math.ceil((loan.startedAt + loan.graceYears * YEAR_HOURS - gameHours) / 24));
  const eco = useEconomyStore.getState();
  return (
    <div className="mt-1.5 rounded-sm bg-ink/40 px-2 py-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 flex-1 truncate font-sans text-[10.5px] text-off-white/90">{lenderName(loan.lender)}</span>
        <span className="font-mono text-[10.5px] tabular-nums text-off-white/90">{money(loan.outstanding)}</span>
      </div>
      <Bar value={loan.principal > 0 ? loan.outstanding / loan.principal : 0} color={loan.kind === 'imf' ? color.codeBlue : color.gold} className="mt-1" height={3} />
      <div className="mt-1 flex items-center justify-between gap-1.5">
        <span className="font-mono text-[9px] text-slate">
          {pct(loan.rate, 1)} · {graceLeft > 0 ? `grace ${graceLeft}d` : 'amortizing'}
        </span>
        <div className="flex gap-1">
          <FinanceButton
            label="Settle"
            onClick={() => run(() => eco.repayLoan(loan.id))}
            disabled={treasury < loan.outstanding}
            title={treasury < loan.outstanding ? `Needs ${money(loan.outstanding)} in the treasury` : 'Repay the outstanding balance in full — a debt honoured is remembered'}
          />
          {loan.kind === 'bilateral' && (
            <FinanceButton
              label="Repudiate"
              tone="crimson"
              onClick={() => run(() => eco.repudiateLoan(loan.id))}
              title={`Write the debt off. ${lenderName(loan.lender)} gains a casus belli, world opinion falls, and markets cap us at ${BILATERAL.repudiate.ratingCap} for ${BILATERAL.repudiate.ratingCapYears} years.`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** Financing mode, live debt, the loan book, IMF program and bilateral credit. */
function SovereignFinance({ ledger, playerNation }: { ledger: NationLedger; playerNation: string }) {
  const financing = useEconomyStore((s) => s.financing);
  const finance = useEconomyStore((s) => s.finance);
  const treasury = useSimStore((s) => s.treasury);
  const gameHours = useSimStore((s) => s.gameHours);
  const dipRev = useDiplomacyStore((s) => s.rev);
  const nations = useWorldStore((s) => s.nations);
  const [msg, setMsg] = useState<string | null>(null);

  const sovereign = isSovereign(playerNation);
  const imf = finance.imf;

  const offers = useMemo(() => {
    void dipRev;
    void finance;
    return sovereign ? useEconomyStore.getState().listBilateralOffers() : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dipRev, finance, sovereign, ledger]);

  const tradePartners = useMemo(() => {
    void dipRev;
    const actor = playerActor() ?? playerNation;
    const myGdp = getNationStat(playerNation)?.gdp ?? 0;
    const out: { id: string; boost: number }[] = [];
    if (myGdp <= 0) return out;
    for (const [pk, list] of Object.entries(useDiplomacyStore.getState().treaties)) {
      if (!list.includes('TRADE')) continue;
      const [a, b] = pk.split('|');
      if (a !== actor && b !== actor) continue;
      const other = a === actor ? b : a;
      const w = Math.max(0, Math.min(1, (getNationStat(other)?.gdp ?? 0) / myGdp));
      out.push({ id: other, boost: TRADE.treatyBoost * w * TRADE.baseShare * myGdp });
    }
    return out.sort((x, y) => y.boost - x.boost);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dipRev, playerNation]);

  const run = (fn: () => { ok: boolean; reason?: string }) => {
    const res = fn();
    setMsg(res.ok ? null : (res.reason ?? 'Unavailable'));
  };
  const lenderName = (id: string) => (id === 'IMF' ? 'Intl. Monetary Fund' : (nations.get(id)?.name ?? id));
  const eco = useEconomyStore.getState();
  const fv = financing ? FINANCING_VIEW[financing.mode] : null;
  const eligible = imfEligible(ledger, treasury);
  const quota = IMF.quotaGdpFrac * ledger.gdp;
  const bondChunk = Math.round(ledger.debt * BOND.repayChunkFrac);

  return (
    <>
      <SectionTitle
        right={fv && <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color: fv.color }}>{fv.label}</span>}
      >
        Sovereign Finance
      </SectionTitle>

      {financing && (
        <div className="rounded-sm bg-ink/40 px-2.5 py-1.5">
          <div className="flex items-baseline justify-between">
            <span className="font-sans text-[10px] uppercase tracking-[0.14em] text-slate">National Debt</span>
            <span className="font-mono text-[11px] tabular-nums text-off-white/90">{money(ledger.debt)}</span>
          </div>
          <Bar value={Math.min(1, ledger.debtToGdp / 1.2)} color={ledger.debtToGdp > 0.9 ? color.high : color.gold} className="mt-1.5" height={5} />
          <div className="mt-1 flex justify-between font-mono text-[9px] text-slate">
            <span>{pct(ledger.debtToGdp)} of GDP</span>
            <span>{ledger.creditRating} · {pct(ledger.interestRate, 1)} rate</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-1.5 border-t border-steel/30 pt-1.5">
            <span className="font-mono text-[9px] text-slate" title="New debt taken on at market each year to cover the deficit and loan payments">
              {financing.mode === 'bonds'
                ? `Issuing ${money(financing.bondIssuancePerYear)}/yr`
                : financing.mode === 'reserves'
                  ? `Reserves −${money(financing.needPerYear)}/yr`
                  : `Treasury +${money(financing.treasuryDriftPerYear)}/yr`}
              {financing.loanServicePerYear > 0 && ` · loans ${money(financing.loanServicePerYear)}/yr`}
            </span>
            {sovereign && (
              <FinanceButton
                label="Buy back"
                onClick={() => run(eco.repayBonds)}
                disabled={ledger.debt <= 0 || treasury < bondChunk}
                title={`Retire ${money(bondChunk)} of bonds (${Math.round(BOND.repayChunkFrac * 100)}% of the stock) from the treasury`}
              />
            )}
          </div>
        </div>
      )}

      {finance.loans.map((l) => (
        <LoanRow key={l.id} loan={l} gameHours={gameHours} treasury={treasury} lenderName={lenderName} run={run} />
      ))}

      {sovereign && (
        <div className="mt-1.5 rounded-sm bg-ink/40 px-2 py-1.5">
          {imf?.active ? (
            <>
              <div className="flex items-baseline justify-between">
                <span className="font-sans text-[9.5px] uppercase tracking-[0.12em] text-gold-light/80">IMF program active</span>
                <span className="font-mono text-[9.5px] tabular-nums text-slate">
                  {imf.released}/{IMF.tranches} tranches
                </span>
              </div>
              <Bar value={imf.disbursed / imf.total} color={color.codeBlue} className="mt-1" height={3} />
              <div className="mt-1 flex flex-wrap gap-1">
                <span className="rounded-full bg-ink/50 px-1.5 py-0.5 font-mono text-[8.5px] text-high ring-1 ring-white/5">Welfare −{Math.round((1 - IMF.austerity.socialMult) * 100)}%</span>
                <span className="rounded-full bg-ink/50 px-1.5 py-0.5 font-mono text-[8.5px] text-high ring-1 ring-white/5">Admin −{Math.round((1 - IMF.austerity.adminMult) * 100)}%</span>
                <span className="rounded-full bg-ink/50 px-1.5 py-0.5 font-mono text-[8.5px] text-high ring-1 ring-white/5">Unrest +{IMF.austerity.unrest}</span>
                <span className="rounded-full bg-ink/50 px-1.5 py-0.5 font-mono text-[8.5px] text-ally ring-1 ring-white/5">Rating ≥ {IMF.ratingFloor}</span>
              </div>
              <div className="mt-1.5 flex justify-end">
                <FinanceButton
                  label="Walk away"
                  tone="crimson"
                  onClick={() => run(eco.exitImfProgram)}
                  title={`End the program: austerity lifts and undrawn tranches are cancelled, but the ${money(imf.disbursed)} drawn reprices to ${pct(IMF.earlyExit.penaltyRate, 0)} and Western capitals cool`}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-sans text-[9.5px] uppercase tracking-[0.12em] text-slate">IMF stabilisation</div>
                <div className="font-mono text-[9px] text-slate/80">{money(quota)} at {pct(IMF.rate, 1)} · austerity conditions</div>
              </div>
              <FinanceButton
                label="Request"
                tone="gold"
                onClick={() => run(eco.takeImfProgram)}
                disabled={!eligible}
                title={
                  eligible
                    ? `Sign a ${money(quota)} program: ${IMF.tranches} quarterly tranches at ${pct(IMF.rate, 1)}. Conditionality cuts welfare and administration — the street will feel it.`
                    : 'The Fund lends to crises, not comfort — requires high debt, dry reserves or a junk rating'
                }
              />
            </div>
          )}
        </div>
      )}

      {sovereign && (
        <>
          <SectionTitle>Bilateral Credit</SectionTitle>
          {offers.length ? (
            offers.map((o) => (
              <div key={o.lender} className="mt-1 flex items-center gap-2 rounded-sm bg-ink/40 px-2 py-1.5">
                <Flag iso2={nations.get(o.lender)?.flag ?? null} className="h-3" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-sans text-[10.5px] text-off-white/90">{lenderName(o.lender)}</div>
                  <div className="font-mono text-[9px] text-slate">
                    {money(o.amount)} · {pct(o.rate, 1)} · {o.termYears}y
                  </div>
                </div>
                <FinanceButton
                  label="Borrow"
                  onClick={() => run(() => eco.takeBilateralLoan(o.lender))}
                  title={`${money(o.amount)} disbursed up-front at ${pct(o.rate, 1)} (${o.graceYears}y grace, ${o.termYears}y term). Ties warm — and their rivals take note.`}
                />
              </div>
            ))
          ) : (
            <span className="font-mono text-[10px] text-slate/70">
              No friendly capital offers credit — warm relations open treasuries.
            </span>
          )}
        </>
      )}

      {tradePartners.length > 0 && (
        <>
          <SectionTitle>Trade Network</SectionTitle>
          <div className="flex flex-wrap gap-1">
            {tradePartners.map(({ id, boost }) => (
              <span key={id} className="rounded-full bg-ink/50 px-1.5 py-0.5 font-mono text-[9px] text-ally ring-1 ring-white/5" title="Estimated tariff & transit revenue from this trade agreement">
                {nations.get(id)?.name ?? id} +{money(boost)}/yr
              </span>
            ))}
          </div>
        </>
      )}

      {msg && <div className="mt-1 font-mono text-[10px] text-crimson">{msg}</div>}
    </>
  );
}

function Forces({ ledger }: { ledger: NationLedger }) {
  return (
    <>
      <SectionTitle right={<span className="font-mono text-[11px] tabular-nums text-crimson">{money(ledger.spending.military)}/yr</span>}>
        Defence Budget
      </SectionTitle>
      <div className="grid grid-cols-3 gap-1.5">
        <Cell label="Army Corps" value="—" />
        <Cell label="Fleets" value="—" />
        <Cell label="Air Wings" value="—" />
      </div>
      <p className="mt-3 border-t border-steel/30 pt-2 font-serif text-[11px] italic leading-relaxed text-slate">
        The Hardware Registry, doctrine and operational command come online with the
        military system. Your defence budget ({pct(ledger.spending.military / ledger.gdp, 1)} of GDP) is already
        being levied — fortifications, ports and airfields are built from the province panel.
      </p>
    </>
  );
}

/** One nation row with its stance chip. Clicking could later fly the camera. */
function RelationRow({ id, opinion }: { id: string; opinion: number }) {
  const nation = useWorldStore((s) => s.nations.get(id));
  const band = stance(opinion);
  return (
    <div className="flex items-center gap-2 py-[3px]">
      <Flag iso2={nation?.flag ?? null} className="h-3" />
      <span className="min-w-0 flex-1 truncate font-sans text-[11.5px] text-off-white/90">{nation?.name ?? id}</span>
      <span className="font-mono text-[10px] tabular-nums" style={{ color: band.color }}>
        {opinion > 0 ? '+' : ''}
        {Math.round(opinion)}
      </span>
      <span className="w-14 text-right font-mono text-[9px] uppercase tracking-wider" style={{ color: band.color }}>
        {band.label}
      </span>
    </div>
  );
}

function Relations() {
  const playerNation = useSessionStore((s) => s.playerNation);
  const rev = useDiplomacyStore((s) => s.rev);
  const nations = useWorldStore((s) => s.nations);

  const view = useMemo(() => {
    void rev;
    if (!playerNation) return null;
    const actor = playerActor()!;
    const d = useDiplomacyStore.getState();
    const rows: { id: string; v: number }[] = [];
    nations.forEach((_, id) => {
      if (id === actor || !isSovereign(id)) return;
      rows.push({ id, v: d.opinionOf(id, actor) }); // their view of you
    });
    rows.sort((a, b) => b.v - a.v);
    const friends = rows.filter((r) => r.v >= 30).slice(0, 6);
    const rivals = rows.filter((r) => r.v <= -30).slice(-6).reverse();
    const treaties = Object.entries(d.treaties)
      .filter(([k]) => k.split('|').includes(actor))
      .flatMap(([k, list]) => list.map((t) => ({ other: k.split('|').find((x) => x !== actor)!, t })));
    const sanctions = Object.entries(d.sanctions)
      .filter(([k]) => k.startsWith(`${actor}>`) || k.endsWith(`>${actor}`))
      .flatMap(([k, list]) => {
        const [from, to] = k.split('>');
        return list.map((s) => ({ mine: from === actor, other: from === actor ? to : from, s }));
      });
    const wars = Object.keys(d.wars)
      .filter((k) => k.split('|').includes(actor))
      .map((k) => k.split('|').find((x) => x !== actor)!);
    const delegated = playerNation !== actor;
    return { actor, friends, rivals, treaties, sanctions, wars, delegated };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerNation, rev, nations]);

  if (!view) return null;

  return (
    <>
      {view.delegated && (
        <p className="mb-2 rounded-sm bg-ink/40 px-2 py-1.5 font-serif text-[10.5px] italic leading-snug text-slate">
          Foreign policy is conducted by {nations.get(view.actor)?.name ?? view.actor} — these are the metropole's
          relations, and yours by law.
        </p>
      )}
      <div className="grid grid-cols-3 gap-1.5">
        <Cell label="Friendly+" value={String(view.friends.length)} accent={color.ally} />
        <Cell label="Hostile−" value={String(view.rivals.length)} accent={view.rivals.length ? color.high : undefined} />
        <Cell label="At War" value={String(view.wars.length)} accent={view.wars.length ? color.crimson : undefined} />
      </div>

      {view.wars.length > 0 && (
        <>
          <SectionTitle>Active Wars</SectionTitle>
          {view.wars.map((id) => (
            <RelationRow key={id} id={id} opinion={useDiplomacyStore.getState().opinionOf(id, view.actor)} />
          ))}
        </>
      )}

      <SectionTitle>Warmest</SectionTitle>
      {view.friends.length ? (
        view.friends.map((r) => <RelationRow key={r.id} id={r.id} opinion={r.v} />)
      ) : (
        <span className="font-mono text-[10px] text-slate/70">No close friends — yet.</span>
      )}

      <SectionTitle>Coldest</SectionTitle>
      {view.rivals.length ? (
        view.rivals.map((r) => <RelationRow key={r.id} id={r.id} opinion={r.v} />)
      ) : (
        <span className="font-mono text-[10px] text-slate/70">No open hostility.</span>
      )}

      {view.treaties.length > 0 && (
        <>
          <SectionTitle>Treaties</SectionTitle>
          <div className="flex flex-wrap gap-1">
            {view.treaties.map(({ other, t }, i) => (
              <span key={`${other}${t}${i}`} className="rounded-full bg-ink/50 px-1.5 py-0.5 font-mono text-[9px] text-off-white/80 ring-1 ring-white/5">
                {TREATY_LABEL[t]} · {nations.get(other)?.name ?? other}
              </span>
            ))}
          </div>
        </>
      )}

      {view.sanctions.length > 0 && (
        <>
          <SectionTitle>Sanctions & Embargoes</SectionTitle>
          <div className="flex flex-wrap gap-1">
            {view.sanctions.map(({ mine, other, s }, i) => (
              <span
                key={`${other}${s}${i}`}
                className="rounded-full bg-ink/50 px-1.5 py-0.5 font-mono text-[9px] ring-1 ring-white/5"
                style={{ color: mine ? color.warning : color.high }}
              >
                {mine ? 'On' : 'From'} {nations.get(other)?.name ?? other} · {SANCTION_LABEL[s]}
              </span>
            ))}
          </div>
        </>
      )}

      <p className="mt-3 border-t border-steel/30 pt-2 font-serif text-[10.5px] italic leading-relaxed text-slate">
        Select any foreign province on the globe to open the diplomacy card and act.
      </p>
    </>
  );
}

/* -------------------------------------------------------------------------- */

export function StatecraftPanel() {
  const [tab, setTab] = useState<Tab>('overview');
  const playerNation = useSessionStore((s) => s.playerNation);
  const nation = useWorldStore((s) => (playerNation ? s.nations.get(playerNation) : undefined));
  const treasury = useSimStore((s) => s.treasury);
  const storeLedger = useEconomyStore((s) => s.ledger);
  const open = useUIStore((s) => s.statecraftOpen);
  const toggle = useUIStore((s) => s.toggleStatecraft);

  if (!nation || !playerNation) return null;
  const stat = getNationStat(playerNation);
  const ledger = storeLedger && storeLedger.id === playerNation ? storeLedger : nationLedger(playerNation);
  if (!ledger) return null;

  // Docked: a slim tab keeps the map clear; one click brings the dashboard back.
  if (!open) {
    return (
      <div data-hud className="pointer-events-auto">
        <button
          onClick={toggle}
          title="Open the statecraft dashboard"
          className="flex flex-col items-center gap-2 rounded-md border border-steel/50 bg-navy/85 px-1.5 py-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.5)] backdrop-blur-md transition-colors hover:border-gold/60"
        >
          <Flag iso2={nation.flag} className="h-3.5 ring-1 ring-black/40" />
          <span className="font-display text-[9px] font-semibold uppercase tracking-[0.24em] text-gold-light [writing-mode:vertical-rl]">
            Statecraft
          </span>
        </button>
      </div>
    );
  }

  return (
    <Panel
      title="Statecraft"
      from="left"
      className="w-72"
      headerRight={
        <button
          onClick={toggle}
          title="Dock the dashboard out of the way"
          className="font-mono text-xs text-slate transition-colors hover:text-gold-light"
        >
          ◂
        </button>
      }
    >
      {/* nation header */}
      <div className="mb-2.5 flex items-start gap-2.5">
        <Flag iso2={nation.flag} className="mt-0.5 h-6 ring-1 ring-black/40" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-serif text-lg font-semibold leading-tight text-white">{nation.name}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className={`rounded-full border px-1.5 py-px font-display text-[8.5px] uppercase tracking-[0.14em] ${tierClass[stat?.tier ?? ''] ?? 'text-slate border-steel/40'}`}>
              {stat?.tier ?? '—'}
            </span>
            <span className="font-mono text-[9.5px] text-slate">{ledger.government}</span>
            <span className="font-mono text-[9.5px] text-slate">· {INCOME_LABEL[ledger.incomeGroup]}</span>
          </div>
        </div>
      </div>

      {/* tab bar */}
      <div className="mb-2.5 flex gap-0.5 rounded-sm border border-steel/40 bg-ink/40 p-0.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-[3px] py-1 font-sans text-[10px] uppercase tracking-[0.1em] transition-all duration-150 ${
              tab === t.id ? 'bg-gold/20 text-gold-light shadow-[0_0_8px_rgba(184,134,11,0.3)]' : 'text-slate hover:text-off-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="hud-scroll max-h-[48vh]">
        {tab === 'overview' && <Overview ledger={ledger} treasury={treasury} />}
        {tab === 'budget' && <Budget ledger={ledger} playerNation={playerNation} />}
        {tab === 'forces' && <Forces ledger={ledger} />}
        {tab === 'relations' && <Relations />}
      </div>
    </Panel>
  );
}
