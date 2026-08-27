/**
 * Right HUD — the selected province. Beyond identity and economy it now exposes
 * the DEVELOPMENT slots (GDD Ch.23): the six improvements the player builds up
 * over the campaign. For provinces you own, each slot shows its current tier and
 * a one-click "develop" that spends treasury on the next tier (priced by size)
 * and immediately feeds the national ledger. Provinces you don't own are
 * read-only. This is the buildable foundation the war/economy/logistics systems
 * extend.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Panel } from '@/ui/Panel';
import { StatRow } from '@/ui/StatRow';
import { Flag } from '@/ui/Flag';
import { TierPips } from '@/ui/TierPips';
import { Bar } from '@/ui/Bar';
import { useUIStore } from '@/store/uiStore';
import { useWorldStore } from '@/store/worldStore';
import { useSimStore } from '@/store/simStore';
import { useSessionStore } from '@/store/sessionStore';
import { useEconomyStore, type ConstructionProject } from '@/store/economyStore';
import { usePoliticsStore, OP_LABEL, opProgress, type ProvinceOp } from '@/store/politicsStore';
import { DiplomacyCard } from '@/features/diplomacy/DiplomacyCard';
import { compact, money } from '@/lib/format';
import { sortedDeposits, resourceColor } from '@/config/resources';
import { provinceGdp } from '@/sim/economy';
import { growthMultiplier } from '@/sim/nationLedger';
import { buildCost, buildTimeDays, canBuild, isCoastal } from '@/sim/infrastructure';
import { unrestBand } from '@/sim/unrest';
import { reintegrationOdds } from '@/sim/independence';
import { effectiveForeignPolicyNation, sovereigntyDescriptor } from '@/sim/sovereignty';
import { devSlotList, DEV_SLOTS, type DevSlotId } from '@/config/infrastructure';
import { POLITICS } from '@/config/autonomy';
import { color, mapViz } from '@/config/tokens';
import type { InfraLevels, Province } from '@/types';

/** Short "what this tier does" tag, driven by the slot's primary effect. */
function slotSummary(id: DevSlotId, level: number): string {
  const e = DEV_SLOTS[id].effect;
  const at = (frac: number, unit: string) =>
    level > 0 ? `+${Math.round(frac * level * 100)}% ${unit}` : `+${Math.round(frac * 100)}%/tier ${unit}`;
  switch (id) {
    case 'infrastructure':
    case 'industry':
    case 'special':
      return at(e.gdpPerTier ?? 0, 'output');
    case 'port':
      return at(e.tradePerTier ?? 0, 'trade');
    case 'fortification':
      return at(e.defensePerTier ?? 0, 'defence');
    case 'airfield':
      return level > 0 ? `${level} air wing${level > 1 ? 's' : ''}` : 'air staging';
    default:
      return '';
  }
}

/** Deposit chips: colour swatch + name + richness pips (1..5). */
function ResourceList({ deposits }: { deposits: ReturnType<typeof sortedDeposits> }) {
  if (deposits.length === 0) return null;
  return (
    <div className="mt-3 border-t border-steel/40 pt-2">
      <div className="mb-1.5 font-sans text-[10px] uppercase tracking-[0.14em] text-slate">Resources</div>
      <div className="space-y-1">
        {deposits.map(({ def, size }) => (
          <div key={def.id} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full ring-1 ring-white/20" style={{ backgroundColor: resourceColor(def.id) }} />
              <span className="text-xs text-white/90">{def.name}</span>
            </div>
            <div className="flex items-center gap-[3px]" title={`Richness ${size}/5`}>
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className="h-[3px] w-2 rounded-sm" style={{ backgroundColor: i <= size ? resourceColor(def.id) : 'rgba(148,163,184,0.18)' }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** One development slot row. Owned + buildable → a costed develop button that
 *  starts a construction PROJECT; while one is underway the row shows its live
 *  progress and days to completion instead. */
function DevRow({
  province,
  id,
  levels,
  owned,
  treasury,
  project,
  gameHours,
  onDevelop,
  onCancel,
}: {
  province: Province;
  id: DevSlotId;
  levels: InfraLevels;
  owned: boolean;
  treasury: number;
  project?: ConstructionProject;
  gameHours: number;
  onDevelop: (id: DevSlotId) => void;
  onCancel: (id: DevSlotId) => void;
}) {
  const def = DEV_SLOTS[id];
  const level = levels[id];
  const maxed = level >= def.maxTier;
  const coastalBlocked = !!def.coastalOnly && !isCoastal(province);
  const cost = buildCost(province, id, level);
  const days = buildTimeDays(province, id, level);
  const buildable = owned && canBuild(province, id, level);
  const afford = treasury >= cost;
  const tint = def.category === 'military' ? color.crimson : def.category === 'special' ? '#9a6fb8' : color.goldLight;
  const progress = project
    ? Math.max(0, Math.min(1, (gameHours - project.startedAt) / Math.max(1, project.completesAt - project.startedAt)))
    : 0;
  const refund = project ? Math.round(project.cost * (1 - progress) * 0.5) : 0;

  return (
    <div className="flex items-center gap-2 py-1">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-wider text-slate">{def.short}</span>
          <span className="truncate text-[12px] text-off-white/90">{def.name}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <TierPips level={level} max={def.maxTier} color={tint} title={`${def.name} — tier ${level}/${def.maxTier}`} />
          <span className="font-mono text-[9px] text-slate">{slotSummary(id, level)}</span>
        </div>
      </div>
      {owned ? (
        project ? (
          <div className="flex shrink-0 items-center gap-1">
            <div
              className="w-[4.5rem]"
              title={`Under construction — completes in ${Math.max(0, Math.ceil((project.completesAt - gameHours) / 24))} days. The visible works already calm the province.`}
            >
              <div className="flex items-baseline justify-between font-mono text-[8.5px] uppercase tracking-wider text-gold-light/80">
                <span>Building</span>
                <span className="tabular-nums">{Math.max(0, Math.ceil((project.completesAt - gameHours) / 24))}d</span>
              </div>
              <Bar value={progress} color={tint} className="mt-1" height={3} />
            </div>
            <button
              onClick={() => onCancel(id)}
              title={`Cancel the works — recover ${money(refund)} of ${money(project.cost)} (half the unbuilt share). The broken promise adds +${POLITICS.unrest.cancelBacklash} resentment, fading over years.`}
              className="rounded-sm border border-steel/40 px-1 py-0.5 font-mono text-[9px] text-slate transition-colors hover:border-crimson/60 hover:text-crimson"
            >
              ✕
            </button>
          </div>
        ) : maxed ? (
          <span className="font-mono text-[9px] uppercase tracking-wider text-gold-light/70">Max</span>
        ) : coastalBlocked ? (
          <span className="font-mono text-[8.5px] leading-tight text-slate" title="Ports can only be built in coastal provinces">
            Coastal
            <br />
            only
          </span>
        ) : (
          <button
            disabled={!buildable || !afford}
            onClick={() => onDevelop(id)}
            title={
              afford
                ? `Build tier ${level + 1} — ${money(cost)}, ~${days} days of construction`
                : `Need ${money(cost)} — treasury short`
            }
            className={`shrink-0 rounded-sm border px-1.5 py-1 font-mono text-[10px] tabular-nums transition-all duration-150 ${
              afford
                ? 'border-gold/50 bg-gold/15 text-gold-light hover:bg-gold/30 active:scale-95'
                : 'cursor-not-allowed border-steel/40 bg-ink/40 text-slate/60'
            }`}
          >
            ▲ {money(cost)}
          </button>
        )
      ) : (
        <span className="font-mono text-[9px] text-slate/70">T{level}</span>
      )}
    </div>
  );
}

/** A running province operation: label, days remaining, live progress — and a
 *  stand-down control for the owner (no refund; some walk-backs breed grudges). */
function OpProgressCard({ op, now, onCancel }: { op: ProvinceOp; now: number; onCancel?: () => void }) {
  const days = Math.max(0, Math.ceil((op.completesAt - now) / 24));
  const tint = op.kind === 'suppress' || op.kind === 'reintegrate_force' ? color.crimson : color.gold;
  const backlash = POLITICS.cancel[op.kind] ?? 0;
  return (
    <div className="mt-1.5 rounded-sm bg-ink/40 px-2 py-1.5">
      <div className="flex items-baseline justify-between gap-1.5">
        <span className="font-sans text-[9.5px] uppercase tracking-[0.12em] text-gold-light/80">{OP_LABEL[op.kind]}</span>
        <span className="flex items-center gap-1.5">
          <span className="font-mono text-[9.5px] tabular-nums text-slate">{days}d left</span>
          {onCancel && (
            <button
              onClick={onCancel}
              title={`Stand down — the money is spent${backlash ? `; walking back the promise adds +${backlash} resentment` : ''}`}
              className="rounded-sm border border-steel/40 px-1 font-mono text-[9px] leading-4 text-slate transition-colors hover:border-crimson/60 hover:text-crimson"
            >
              ✕
            </button>
          )}
        </span>
      </div>
      <Bar value={opProgress(op, now)} color={tint} className="mt-1" height={3} />
    </div>
  );
}

/** Stability: live unrest with the calm→critical ramp. Every lever is a TIMED
 *  operation (one per province): police surges and devolution for calm
 *  provinces, counter-insurgency against active separatists, and the three
 *  reintegration roads (referendum / political / force) for autonomous regions
 *  and entrenched breakaways. */
function StabilitySection({ province, owned }: { province: Province; owned: boolean }) {
  const rev = usePoliticsStore((s) => s.rev);
  const gameHours = useSimStore((s) => s.gameHours);
  const politics = usePoliticsStore.getState();
  const [msg, setMsg] = useState<string | null>(null);
  void rev; // re-render on any politics change
  const breakaway = politics.breakaways[province.id];
  const op = politics.ops[province.id];
  const unrest = politics.unrestOf(province);
  const band = unrestBand(unrest);
  const tint = mapViz.diplomacy.unrest[band];
  const autonomous = !!politics.autonomy[province.id];
  const residue = politics.resentment[province.id] ?? 0;
  const reintegrable = owned && !op && (autonomous || !!breakaway?.entrenched);
  const odds = reintegrationOdds(unrest, !!breakaway?.entrenched);
  const R = POLITICS.reintegration;
  const U = POLITICS.unrest;
  const revenue = useEconomyStore.getState().ledger?.revenue.total ?? 0;
  const costOf = (frac: number) => money(Math.round(revenue * frac));

  // Investment calms: hope from works underway + durable relief from delivered
  // economic tiers (mirrors the unrest model's inputs so the player sees WHY).
  let hope = 0;
  let deliveredRelief = 0;
  if (owned) {
    const eco = useEconomyStore.getState();
    for (const c of eco.projects) {
      if (c.provinceId !== province.id) continue;
      const t = Math.max(0, Math.min(1, (gameHours - c.startedAt) / Math.max(1, c.completesAt - c.startedAt)));
      hope += U.investmentHopeBase + U.investmentHopeRamp * t;
    }
    hope = Math.min(U.investmentHopeMax, hope);
    const b = eco.built[province.id];
    if (b) {
      const tiers = (b.infrastructure ?? 0) + (b.industry ?? 0) + (b.port ?? 0) + (b.special ?? 0);
      deliveredRelief = Math.min(U.devReliefMax, tiers * U.devReliefPerTier);
    }
  }

  const run = (fn: () => { ok: boolean; reason?: string }) => {
    const res = fn();
    setMsg(res.ok ? null : (res.reason ?? 'Unavailable'));
  };

  const reinBtn =
    'flex-1 rounded-sm border px-1 py-1 font-mono text-[9px] uppercase tracking-wider transition-colors';

  return (
    <div className="mt-3 border-t border-steel/40 pt-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-sans text-[10px] uppercase tracking-[0.14em] text-slate">Stability</span>
        {breakaway ? (
          <span className="rounded-full border border-crimson/60 px-1.5 py-px font-display text-[8.5px] uppercase tracking-[0.14em] text-crimson">
            {breakaway.entrenched ? 'Breakaway Region' : 'Insurgency'}
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            {autonomous && (
              <span className="rounded-full border border-gold/50 px-1.5 py-px font-display text-[8px] uppercase tracking-[0.14em] text-gold-light/90">
                Autonomous
              </span>
            )}
            <span className="font-mono text-[9.5px] tabular-nums" style={{ color: tint }}>
              {unrest} · {band}
            </span>
          </span>
        )}
      </div>

      {breakaway ? (
        <>
          <div className="flex items-baseline justify-between">
            <span className="font-sans text-[10px] text-slate">Insurgent control</span>
            <span className="font-mono text-[10px] tabular-nums text-crimson">{Math.round(breakaway.strength)}%</span>
          </div>
          <Bar value={breakaway.strength / 100} color={color.crimson} className="mt-1" />
          <p className="mt-1.5 font-serif text-[10.5px] italic leading-snug text-slate">
            {breakaway.entrenched
              ? 'The region functions as a de-facto state. Policing will not recover it — reintegrate it below.'
              : 'Separatists hold the province against the government.'}
          </p>
          {owned && !op && !breakaway.entrenched && (
            <button
              onClick={() => run(() => politics.suppressInsurgency(province.id))}
              title={`A ${POLITICS.timing.suppressDays}-day operation — halts insurgent growth while it runs`}
              className="mt-1.5 w-full rounded-sm border border-crimson/50 bg-crimson/15 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-crimson transition-colors hover:bg-crimson/30"
            >
              Fund counter-insurgency
            </button>
          )}
        </>
      ) : (
        <>
          <Bar value={unrest / 100} color={tint} className="mt-0.5" />
          {residue !== 0 && (
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-sans text-[9.5px] text-slate">
                {residue > 0 ? 'Grievance (broken promises, reintegration)' : 'Reunification goodwill'}
              </span>
              <span
                className="font-mono text-[9.5px] tabular-nums"
                style={{ color: residue > 0 ? color.high : color.ally }}
                title="Fades over the years"
              >
                {residue > 0 ? '+' : ''}
                {Math.round(residue)} unrest
              </span>
            </div>
          )}
          {hope > 0 && (
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-sans text-[9.5px] text-slate">Development hope</span>
              <span
                className="font-mono text-[9.5px] tabular-nums"
                style={{ color: color.ally }}
                title="Works underway are a visible promise — relief grows as they progress, and is forfeit if cancelled"
              >
                −{Math.round(hope)} unrest
              </span>
            </div>
          )}
          {deliveredRelief > 0 && (
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-sans text-[9.5px] text-slate">Delivered investment</span>
              <span
                className="font-mono text-[9.5px] tabular-nums"
                style={{ color: color.ally }}
                title="Economic development you completed here keeps calming the province"
              >
                −{Math.round(deliveredRelief)} unrest
              </span>
            </div>
          )}
          {owned && !op && (
            <div className="mt-1.5 flex gap-1.5">
              <button
                onClick={() => run(() => politics.policeProvince(province.id))}
                title={`Fund a ${POLITICS.timing.policeDays}-day police surge — relief builds as units arrive, then decays`}
                className="flex-1 rounded-sm border border-steel/50 bg-ink/40 px-2 py-1 font-mono text-[9.5px] uppercase tracking-wider text-off-white/80 transition-colors hover:border-gold/50 hover:text-gold-light"
              >
                Police
              </button>
              <button
                onClick={() => run(() => politics.grantAutonomy(province.id))}
                disabled={autonomous}
                title={
                  autonomous
                    ? 'Local autonomy already devolved'
                    : `Draft a devolution statute — takes ~${Math.round(POLITICS.timing.devolveDays / 30)} months to pass, then calms the province for good`
                }
                className={`flex-1 rounded-sm border px-2 py-1 font-mono text-[9.5px] uppercase tracking-wider transition-colors ${
                  autonomous
                    ? 'cursor-default border-steel/30 text-slate/50'
                    : 'border-steel/50 bg-ink/40 text-off-white/80 hover:border-gold/50 hover:text-gold-light'
                }`}
              >
                {autonomous ? 'Autonomous' : 'Devolve'}
              </button>
            </div>
          )}
        </>
      )}

      {op && (
        <OpProgressCard
          op={op}
          now={gameHours}
          onCancel={owned ? () => run(() => politics.cancelOp(province.id)) : undefined}
        />
      )}

      {reintegrable && (
        <div className="mt-2 border-t border-steel/20 pt-1.5">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-sans text-[9.5px] uppercase tracking-[0.14em] text-slate">Reintegration</span>
            <span className="font-mono text-[9px] tabular-nums text-gold-light/70" title="Odds a reintegration referendum passes today">
              vote {Math.round(odds * 100)}%
            </span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => run(() => politics.startReintegration(province.id, 'referendum'))}
              title={`Call a reintegration referendum — ${R.referendumDays} days, ${costOf(R.referendumCostFrac)}. A content region votes to return (${Math.round(odds * 100)}% today); failure hardens it.`}
              className={`${reinBtn} border-gold/50 bg-gold/10 text-gold-light hover:bg-gold/25`}
            >
              Vote
            </button>
            <button
              onClick={() => run(() => politics.startReintegration(province.id, 'political'))}
              title={`Negotiate reincorporation — ~${Math.round(R.politicalDays / 30)} months, ${costOf(R.politicalCostFrac)}. Certain, but leaves resentment among those who profited.`}
              className={`${reinBtn} border-steel/50 bg-ink/40 text-off-white/80 hover:border-gold/50 hover:text-gold-light`}
            >
              Talks
            </button>
            <button
              onClick={() => run(() => politics.startReintegration(province.id, 'force'))}
              title={`Retake by force — ${R.forceDays} days, ${costOf(R.forceCostFrac)}. Certain and fast, but the region seethes for years and world opinion of you falls.`}
              className={`${reinBtn} border-crimson/50 bg-crimson/10 text-crimson hover:bg-crimson/25`}
            >
              Force
            </button>
          </div>
        </div>
      )}

      {msg && <div className="mt-1 font-mono text-[10px] text-crimson">{msg}</div>}
    </div>
  );
}

export function DistrictDetailPanel() {
  const selectedId = useUIStore((s) => s.selectedProvinceId);
  const clear = useUIStore((s) => s.select);
  const province = useWorldStore((s) => (selectedId ? s.provinces.get(selectedId) : undefined));
  const nation = useWorldStore((s) => (province ? s.nations.get(province.nationId) : undefined));
  const playerNation = useSessionStore((s) => s.playerNation);
  const treasury = useSimStore((s) => s.treasury);
  const gameHours = useSimStore((s) => s.gameHours);
  const built = useEconomyStore((s) => s.built); // subscribe so pips refresh after a build
  const projects = useEconomyStore((s) => s.projects);
  const develop = useEconomyStore((s) => s.develop);
  const cancelProject = useEconomyStore((s) => s.cancelProject);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setMsg(null);
  }, [selectedId]);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2200);
    return () => clearTimeout(t);
  }, [msg]);

  const owned = !!province && !!playerNation && province.nationId === playerNation;
  // `built` is read above purely to re-render on change; levels() reads current state.
  void built;
  const levels = province ? useEconomyStore.getState().levels(province.id) : null;
  // The province's nation is a dependency → say whose flag it really flies.
  const sovLine =
    province?.nationId && nation
      ? sovereigntyDescriptor(province.nationId, (id) => useWorldStore.getState().nations.get(id)?.name)
      : null;
  // Foreign = a different foreign-policy actor (a dependency shares its lord's).
  const foreign =
    !!province?.nationId &&
    !province.isSea &&
    !!playerNation &&
    effectiveForeignPolicyNation(province.nationId) !== effectiveForeignPolicyNation(playerNation);

  const onDevelop = (id: DevSlotId) => {
    if (!province) return;
    const res = develop(province.id, id);
    if (!res.ok) setMsg(res.reason ?? 'Cannot build');
    else setMsg(null);
  };
  const onCancel = (id: DevSlotId) => {
    if (!province) return;
    const res = cancelProject(province.id, id);
    if (!res.ok) setMsg(res.reason ?? 'Cannot cancel');
    else setMsg(null);
  };

  return (
    <AnimatePresence>
      {province && levels && (
        <Panel key={province.id} title="Province" from="right" accent="gold" className="w-72">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <div className="font-serif text-lg font-semibold leading-tight text-white">{province.name}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate">
                {nation && <Flag iso2={nation.flag ?? null} className="h-3" />}
                {nation?.name ?? (province.nationId ? province.nationId : 'International Waters')}
              </div>
              {sovLine && <div className="mt-0.5 font-serif text-[10.5px] italic text-gold-light/70">{sovLine}</div>}
            </div>
            <button onClick={() => clear(null)} className="font-mono text-xs text-slate transition-colors hover:text-gold-light" title="Close">
              ✕
            </button>
          </div>

          <div className="hud-scroll max-h-[70vh]">
          <StatRow label="Terrain" value={province.data.terrain.charAt(0) + province.data.terrain.slice(1).toLowerCase()} />
          <StatRow label="Population" value={compact(province.data.population)} accent="code" />
          <StatRow
            label="Province GDP"
            value={money(
              provinceGdp(
                province.nationId,
                province.data.population,
                province.data.economy.resourceOutput,
                growthMultiplier(province.nationId),
              ),
            )}
            accent="gold"
          />
          {province.data.economy.resourceOutput > 0 && (
            <StatRow label="Resource Output" value={`${money(province.data.economy.resourceOutput)}/yr`} />
          )}
          <StatRow label="Strategic Value" value={`${province.data.value ?? 0}`} />

          {/* diplomacy with the power that answers for this province */}
          {foreign && <DiplomacyCard targetNationId={province.nationId} />}

          {/* internal stability (land provinces with people in them) */}
          {province.nationId && !province.isSea && (province.data.population || 0) > 0 && (
            <StabilitySection province={province} owned={owned} />
          )}

          {/* development */}
          {province.nationId && (
            <div className="mt-3 border-t border-steel/40 pt-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-sans text-[10px] uppercase tracking-[0.14em] text-slate">Development</span>
                {owned ? (
                  <span className="font-mono text-[9px] text-gold-light/70">Treasury {money(treasury)}</span>
                ) : (
                  <span className="font-mono text-[9px] text-slate/70">Not your territory</span>
                )}
              </div>
              <div className="divide-y divide-steel/20">
                {devSlotList.map((def) => (
                  <DevRow
                    key={def.id}
                    province={province}
                    id={def.id}
                    levels={levels}
                    owned={owned}
                    treasury={treasury}
                    project={projects.find((c) => c.provinceId === province.id && c.slotId === def.id)}
                    gameHours={gameHours}
                    onDevelop={onDevelop}
                    onCancel={onCancel}
                  />
                ))}
              </div>
              {msg && <div className="mt-1.5 font-mono text-[10px] text-crimson">{msg}</div>}
            </div>
          )}

          <ResourceList deposits={sortedDeposits(province)} />
          </div>
        </Panel>
      )}
    </AnimatePresence>
  );
}
