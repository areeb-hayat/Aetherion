/**
 * New Game — choose the nation you'll command. The globe is in "setup" mode:
 * hovering spotlights the whole nation under the cursor, clicking commits it as
 * the reviewed candidate (and flies the camera to frame it). The dossier on the
 * right reads that candidate; the search box groups DEPENDENCIES under their
 * sovereign (every polity stays playable — a dependency campaign is the
 * independence arc). One doctrine only: broad oversight, busywork automated.
 *
 * The overlay is pointer-transparent except its panels, so the centre of the
 * screen stays a live, clickable globe.
 */
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '@/store/sessionStore';
import { useWorldStore } from '@/store/worldStore';
import { useEconomyStore } from '@/store/economyStore';
import { usePoliticsStore } from '@/store/politicsStore';
import { useDiplomacyStore } from '@/store/diplomacyStore';
import { getNationStat, resourceName, type NationStat } from '@/features/menu/nationStats';
import { openingLedger } from '@/sim/nationLedger';
import { INCOME_LABEL } from '@/config/economy';
import { resourceColor } from '@/config/resources';
import { mapViz } from '@/config/tokens';
import { AUTONOMY } from '@/config/autonomy';
import {
  isDependency,
  autonomyTier,
  sovereignOf,
  dependenciesOf,
  sovereigntyDescriptor,
} from '@/sim/sovereignty';
import { Flag } from '@/ui/Flag';
import { money, compact } from '@/lib/format';
import type { Nation } from '@/types';

const tierClass: Record<string, string> = {
  Superpower: 'text-gold-light border-gold/60',
  'Great Power': 'text-gold-light border-gold/50',
  'Major Power': 'text-off-white border-steel/60',
  'Regional Power': 'text-off-white border-steel/50',
  'Minor Power': 'text-slate border-steel/40',
  Micronation: 'text-slate border-steel/40',
};

/* -------------------------------------------------------------------------- */

function SearchBox({ nations }: { nations: Map<string, Nation> }) {
  const [q, setQ] = useState('');
  const setSetupNation = useSessionStore((s) => s.setSetupNation);
  const list = useMemo(() => [...nations.values()].sort((a, b) => a.name.localeCompare(b.name)), [nations]);

  // Matches grouped by sovereignty: sovereign states first (with a territory
  // count badge), each matched dependency nested under its sovereign's name.
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    const hit = list.filter((n) => n.name.toLowerCase().includes(t) || n.id.toLowerCase() === t);
    const sovereigns = hit.filter((n) => !isDependency(n.id));
    const deps = hit.filter((n) => isDependency(n.id));
    // Order: sovereigns, then dependencies grouped after their sovereign when
    // it also matched, otherwise appended (still shown, labeled with its lord).
    const ordered: Nation[] = [];
    for (const s of sovereigns) {
      ordered.push(s);
      for (const d of deps) if (sovereignOf(d.id) === s.id) ordered.push(d);
    }
    for (const d of deps) if (!ordered.includes(d)) ordered.push(d);
    return ordered.slice(0, 9);
  }, [q, list]);

  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search nations…"
        className="w-full rounded-sm border border-steel/50 bg-ink/60 px-3 py-1.5 font-sans text-sm text-off-white placeholder:text-slate/70 outline-none transition-colors focus:border-gold/60"
      />
      {results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-sm border border-steel/50 bg-navy/95 backdrop-blur-md shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
          {results.map((n) => {
            const dep = isDependency(n.id);
            const depCount = dep ? 0 : dependenciesOf(n.id).length;
            return (
              <button
                key={n.id}
                onClick={() => {
                  setSetupNation(n.id);
                  setQ('');
                }}
                className={`flex w-full items-center gap-2.5 py-1.5 pr-3 text-left transition-colors hover:bg-steel/40 ${dep ? 'pl-7' : 'pl-3'}`}
              >
                {dep && <span aria-hidden className="-ml-3 font-mono text-[10px] text-slate/70">↳</span>}
                <Flag iso2={n.flag} className="h-3.5" />
                <span className="min-w-0 flex-1 truncate font-serif text-sm text-off-white">{n.name}</span>
                {dep ? (
                  <span className="font-mono text-[8.5px] uppercase tracking-wider text-slate/80">
                    {AUTONOMY[autonomyTier(n.id)].short}
                  </span>
                ) : depCount > 0 ? (
                  <span className="font-mono text-[8.5px] text-slate/70">{depCount} terr.</span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TerrainBar({ mix }: { mix: NationStat['terrainMix'] }) {
  const total = mix.reduce((s, m) => s + m.count, 0) || 1;
  if (mix.length === 0) return null;
  return (
    <div className="mt-3">
      <div className="mb-1 font-sans text-[10px] uppercase tracking-[0.14em] text-slate">Terrain</div>
      <div className="flex h-2 overflow-hidden rounded-full ring-1 ring-black/30">
        {mix.map((m) => (
          <span
            key={m.terrain}
            style={{ width: `${(m.count / total) * 100}%`, backgroundColor: mapViz.terrain.palette[m.terrain] ?? '#556' }}
            title={`${m.terrain} · ${m.count}`}
          />
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
        {mix.slice(0, 3).map((m) => (
          <span key={m.terrain} className="font-mono text-[9.5px] text-slate">
            <span
              className="mr-1 inline-block h-2 w-2 rounded-[2px] align-middle"
              style={{ backgroundColor: mapViz.terrain.palette[m.terrain] ?? '#556' }}
            />
            {m.terrain.charAt(0) + m.terrain.slice(1).toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

function Cell({ label, value, accent }: { label: string; value: string; accent?: 'gold' | 'code' }) {
  const c = accent === 'gold' ? 'text-gold-light' : accent === 'code' ? 'text-code-blue' : 'text-off-white';
  return (
    <div className="rounded-sm bg-ink/40 px-2.5 py-1.5">
      <div className="font-sans text-[9px] uppercase tracking-[0.14em] text-slate">{label}</div>
      <div className={`font-mono text-sm tabular-nums ${c}`}>{value}</div>
    </div>
  );
}

function Dossier({ nationId }: { nationId: string }) {
  const nation = useWorldStore((s) => s.nations.get(nationId));
  const nations = useWorldStore((s) => s.nations);
  const stat = getNationStat(nationId);
  // Year zero, always — see openingLedger.
  const ledger = useMemo(() => openingLedger(nationId), [nationId]);
  if (!nation || !stat) return null;

  const dep = isDependency(nationId);
  const tierDef = AUTONOMY[autonomyTier(nationId)];
  const sovDescriptor = sovereigntyDescriptor(nationId, (id) => nations.get(id)?.name);
  const territories = dep ? [] : dependenciesOf(nationId);

  return (
    <div className="w-[19rem]">
      <div className="mb-3 flex items-start gap-3">
        <Flag iso2={nation.flag} className="mt-0.5 h-7 ring-1 ring-black/40" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-serif text-xl font-semibold leading-tight text-white">{nation.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={`rounded-full border px-2 py-px font-display text-[9px] uppercase tracking-[0.16em] ${tierClass[stat.tier] ?? 'text-slate border-steel/40'}`}
            >
              {stat.tier}
            </span>
            {dep && (
              <span className="rounded-full border border-gold/40 px-2 py-px font-display text-[9px] uppercase tracking-[0.16em] text-gold-light/90">
                {tierDef.label}
              </span>
            )}
            <span className="font-mono text-[10px] text-slate">{stat.government}</span>
            {ledger && (
              <span className="font-mono text-[10px] text-slate">· {INCOME_LABEL[ledger.incomeGroup]}</span>
            )}
          </div>
          {sovDescriptor && (
            <div className="mt-1 font-serif text-[11px] italic text-gold-light/80">{sovDescriptor}</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <Cell label="Population" value={compact(stat.population)} accent="code" />
        <Cell label="GDP / yr" value={money(stat.gdp)} accent="gold" />
        <Cell label="GDP / capita" value={money(stat.gdpPerCapita)} />
        <Cell label="Gov. Revenue" value={ledger ? `${money(ledger.revenue.total)}/yr` : '—'} accent="gold" />
        <Cell label="Treasury" value={ledger ? money(ledger.treasury) : '—'} accent="code" />
        <Cell label="Credit" value={ledger ? `${ledger.creditRating}` : '—'} />
        <Cell label="Provinces" value={String(stat.provinceCount)} />
        <Cell label="Capital" value={stat.capital ?? '—'} />
      </div>

      {stat.topResources.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 font-sans text-[10px] uppercase tracking-[0.14em] text-slate">Key Resources</div>
          <div className="flex flex-wrap gap-1.5">
            {stat.topResources.map((r) => (
              <span
                key={r.id}
                className="flex items-center gap-1.5 rounded-full bg-ink/50 px-2 py-0.5 ring-1 ring-white/5"
              >
                <span className="h-2 w-2 rounded-full ring-1 ring-white/20" style={{ backgroundColor: resourceColor(r.id) }} />
                <span className="font-sans text-[11px] text-white/90">{resourceName(r.id)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <TerrainBar mix={stat.terrainMix} />

      {territories.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 font-sans text-[10px] uppercase tracking-[0.14em] text-slate">
            Territories & Dependencies · {territories.length}
          </div>
          <div className="flex flex-wrap gap-1">
            {territories.slice(0, 8).map((id) => {
              const t = nations.get(id);
              return (
                <span key={id} className="flex items-center gap-1 rounded-full bg-ink/50 px-1.5 py-0.5 ring-1 ring-white/5">
                  <Flag iso2={t?.flag ?? null} className="h-2" />
                  <span className="font-sans text-[9.5px] text-white/80">{t?.name ?? id}</span>
                </span>
              );
            })}
            {territories.length > 8 && (
              <span className="font-mono text-[9px] text-slate/80">+{territories.length - 8} more</span>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 border-t border-steel/30 pt-2 font-serif text-[11px] italic leading-relaxed text-slate">
        {dep
          ? `${tierDef.blurb} Your campaign can end in nationhood: build support for a referendum — or seize sovereignty by force.`
          : stat.tier === 'Superpower' || stat.tier === 'Great Power'
            ? 'A first-rank power. The whole board reacts to your moves — expectations, and enemies, scale accordingly.'
            : stat.tier === 'Micronation'
              ? 'A featherweight on the world stage. Survival will demand cunning, alliances, and asymmetry.'
              : 'A capable state with room to rise — leverage your resources and neighbours wisely.'}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2">
      <span
        className={`relative h-4 w-7 rounded-full transition-colors ${on ? 'bg-gold/60' : 'bg-steel/50'}`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-off-white transition-all ${on ? 'left-3.5' : 'left-0.5'}`}
        />
      </span>
      <span className="font-mono text-[11px] uppercase tracking-wider text-slate">{label}</span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */

export function NewGameSetup() {
  const nations = useWorldStore((s) => s.nations);
  const setupNationId = useSessionStore((s) => s.setupNationId);
  const hoverNationId = useSessionStore((s) => s.setupHoverNationId);
  const options = useSessionStore((s) => s.options);
  const setOptions = useSessionStore((s) => s.setOptions);
  const beginCampaign = useSessionStore((s) => s.beginCampaign);
  const goMenu = useSessionStore((s) => s.goMenu);

  const hoverNation = hoverNationId ? nations.get(hoverNationId) : undefined;
  const canBegin = !!setupNationId;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="pointer-events-none absolute inset-0 z-40"
    >
      {/* top bar */}
      <div className="pointer-events-auto absolute left-1/2 top-4 -translate-x-1/2">
        <div className="rounded-md bg-gradient-to-b from-gold/40 via-steel/45 to-steel/20 p-px shadow-[0_10px_36px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-3 rounded-[7px] bg-gradient-to-b from-navy/95 to-ink/90 px-5 py-2 backdrop-blur-md">
            <button
              onClick={goMenu}
              className="font-mono text-[11px] uppercase tracking-wider text-slate transition-colors hover:text-gold-light"
            >
              ‹ Back
            </button>
            <span aria-hidden className="h-4 w-px bg-steel/60" />
            <span className="font-display text-[12px] font-semibold uppercase tracking-[0.3em] text-gold-light">
              Choose Your Nation
            </span>
          </div>
        </div>
      </div>

      {/* left: instructions + search + hover readout */}
      <div className="pointer-events-auto absolute left-6 top-24 w-64">
        <div className="rounded-md bg-gradient-to-b from-gold/25 via-steel/40 to-steel/15 p-px shadow-[0_10px_36px_rgba(0,0,0,0.5)]">
          <div className="rounded-[7px] bg-gradient-to-b from-navy/95 to-ink/90 p-3.5 backdrop-blur-md">
            <p className="mb-3 font-serif text-[12px] italic leading-relaxed text-slate">
              Click any territory on the globe to review the nation that holds it — or search by name.
            </p>
            <SearchBox nations={nations} />
            <div className="mt-3 h-5">
              <AnimatePresence mode="wait">
                {hoverNation && (
                  <motion.div
                    key={hoverNation.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Flag iso2={hoverNation.flag} className="h-3" />
                    <span className="font-mono text-[11px] tracking-wide text-off-white">{hoverNation.name}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* right: dossier */}
      <div className="pointer-events-auto absolute right-6 top-24">
        <div className="rounded-md bg-gradient-to-b from-gold/40 via-steel/45 to-steel/20 p-px shadow-[0_12px_44px_rgba(0,0,0,0.55)]">
          <div className="min-h-[16rem] rounded-[7px] bg-gradient-to-b from-navy/95 to-ink/92 p-4 backdrop-blur-md">
            {setupNationId ? (
              <Dossier nationId={setupNationId} />
            ) : (
              <div className="grid h-56 w-[19rem] place-items-center text-center">
                <div>
                  <div className="mb-2 text-3xl text-gold/40">✦</div>
                  <div className="font-serif text-sm italic text-slate">
                    Select a nation to review its dossier.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* bottom: campaign brief + begin */}
      <div className="pointer-events-auto absolute bottom-5 left-1/2 w-[38rem] max-w-[94vw] -translate-x-1/2">
        <div className="rounded-md bg-gradient-to-b from-steel/45 via-steel/40 to-gold/30 p-px shadow-[0_12px_44px_rgba(0,0,0,0.55)]">
          <div className="flex items-center gap-4 rounded-[7px] bg-gradient-to-b from-navy/95 to-ink/92 px-4 py-3 backdrop-blur-md">
            <div className="min-w-0 flex-1">
              <div className="font-display text-[10px] uppercase tracking-[0.28em] text-gold-light/90">Command</div>
              <p className="mt-1 font-serif text-[11.5px] italic leading-snug text-slate">
                Full oversight of state, economy and diplomacy — the busywork runs itself.
              </p>
              <div className="mt-2 flex items-center gap-4">
                <Toggle on={options.fogOfWar} label="Fog of War" onClick={() => setOptions({ fogOfWar: !options.fogOfWar })} />
                <Toggle on={options.ironman} label="Ironman" onClick={() => setOptions({ ironman: !options.ironman })} />
              </div>
            </div>
            <button
              disabled={!canBegin}
              onClick={() => {
                if (!canBegin) return;
                // A fresh campaign starts from a clean slate on every system.
                useEconomyStore.getState().reset();
                usePoliticsStore.getState().reset();
                useDiplomacyStore.getState().reset();
                beginCampaign(setupNationId!, useSessionStore.getState().options);
              }}
              className={`w-40 shrink-0 rounded-sm p-px transition-all duration-200 ${
                canBegin ? 'bg-gradient-to-b from-gold/90 to-gold/40 hover:from-gold' : 'bg-steel/40 opacity-50'
              }`}
            >
              <div className="grid h-full place-items-center rounded-[3px] bg-gradient-to-b from-navy/60 to-ink/60 px-3 py-3">
                <span className={`font-display text-sm font-bold uppercase tracking-[0.2em] ${canBegin ? 'text-gold-light' : 'text-slate'}`}>
                  Begin
                </span>
                <span className="mt-0.5 font-mono text-[9px] tracking-wide text-slate">
                  {canBegin ? 'Launch campaign' : 'Select a nation'}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
