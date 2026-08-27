/**
 * Diplomacy card — rendered in the province panel whenever the selected
 * province belongs to a FOREIGN power. Shows the two-way stance (yours of them,
 * theirs of you) on ±100 gauges, treaties/sanctions in force, who else loves or
 * loathes them, and expands into the full action list (improve/sanction/embargo/
 * sever/rebuild/pacts/alliance/war — war gated behind a casus belli).
 *
 * If the player is a dependency without its own foreign policy, the actions are
 * disabled with the sovereign explainer — the RELATIONSHIP shown is then the
 * one their sovereign holds, because that is the law of the land.
 */
import { useMemo, useState } from 'react';
import { useWorldStore } from '@/store/worldStore';
import { useSessionStore } from '@/store/sessionStore';
import { useDiplomacyStore, playerActor } from '@/store/diplomacyStore';
import { stance, pairKey, dirKey } from '@/sim/diplomacy';
import { effectiveForeignPolicyNation, controls, sovereignOf, isDependency, sovereigntyDescriptor } from '@/sim/sovereignty';
import { ACTIONS, TREATY_LABEL, SANCTION_LABEL, type ActionDef } from '@/config/diplomacy';
import { isSovereign } from '@/sim/sovereignty';
import { color } from '@/config/tokens';
import { money } from '@/lib/format';
import { Flag } from '@/ui/Flag';

/* -- a ±100 opinion gauge --------------------------------------------------- */
function OpinionGauge({ label, value }: { label: string; value: number }) {
  const t = (value + 100) / 200;
  const band = stance(value);
  return (
    <div className="py-[3px]">
      <div className="flex items-baseline justify-between">
        <span className="font-sans text-[10px] text-slate">{label}</span>
        <span className="font-mono text-[10.5px] tabular-nums" style={{ color: band.color }}>
          {value > 0 ? '+' : ''}
          {Math.round(value)} · {band.label}
        </span>
      </div>
      <div className="relative mt-1 h-[5px] overflow-hidden rounded-full bg-ink/70 ring-1 ring-black/30">
        {/* neutral tick */}
        <span className="absolute left-1/2 top-0 h-full w-px bg-white/20" />
        <span
          className="absolute top-0 h-full rounded-full transition-all duration-300"
          style={{
            backgroundColor: band.color,
            left: `${Math.min(50, t * 100)}%`,
            width: `${Math.abs(t - 0.5) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}

function Chip({ children, tint }: { children: React.ReactNode; tint?: string }) {
  return (
    <span
      className="rounded-full px-1.5 py-px font-mono text-[8.5px] uppercase tracking-wider ring-1 ring-white/10"
      style={{ color: tint ?? color.slate, backgroundColor: 'rgba(10,14,20,0.5)' }}
    >
      {children}
    </span>
  );
}

/* -- one action row ---------------------------------------------------------- */
function ActionRow({ def, target, onDone }: { def: ActionDef; target: string; onDone: (msg: string | null) => void }) {
  const availability = useDiplomacyStore((s) => s.availability);
  const act = useDiplomacyStore((s) => s.act);
  const avail = availability(def.id, target);
  const kindTint = def.kind === 'positive' ? color.ally : def.kind === 'aggressive' ? color.crimson : color.warning;

  return (
    <button
      disabled={!avail.ok}
      onClick={() => {
        const res = act(def.id, target);
        onDone(res.ok ? null : (res.reason ?? 'Unavailable'));
      }}
      title={avail.ok ? def.blurb : avail.reason}
      className={`flex w-full items-center gap-2 rounded-sm px-1.5 py-1 text-left transition-colors ${
        avail.ok ? 'hover:bg-steel/40' : 'cursor-not-allowed opacity-45'
      }`}
    >
      <span aria-hidden className="w-4 text-center text-[11px]" style={{ color: kindTint }}>
        {def.icon}
      </span>
      <span className="min-w-0 flex-1 truncate font-sans text-[11.5px] text-off-white/90">{def.label}</span>
      {avail.cooldownHours > 0 ? (
        <span className="font-mono text-[9px] text-slate/70">{Math.ceil(avail.cooldownHours / 24)}d</span>
      ) : avail.cost > 0 ? (
        <span className="font-mono text-[9px] tabular-nums text-gold-light/80">{money(avail.cost)}</span>
      ) : null}
    </button>
  );
}

/* ---------------------------------------------------------------------------- */

export function DiplomacyCard({ targetNationId }: { targetNationId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const nations = useWorldStore((s) => s.nations);
  const playerNation = useSessionStore((s) => s.playerNation);
  const rev = useDiplomacyStore((s) => s.rev);
  const store = useDiplomacyStore.getState();

  const actor = playerActor();
  const them = effectiveForeignPolicyNation(targetNationId);
  const themNation = nations.get(them);

  // Opinions + pair state (recomputed when any diplomacy state changes).
  const view = useMemo(() => {
    if (!actor) return null;
    void rev;
    return {
      mine: store.opinionOf(actor, them),
      theirs: store.opinionOf(them, actor),
      mods: store.pairMods(actor, them),
      mySanctions: store.sanctions[dirKey(actor, them)] ?? [],
      theirSanctions: store.sanctions[dirKey(them, actor)] ?? [],
      atWar: !!store.wars[pairKey(actor, them)],
      casusBelli: store.hasCasusBelli(actor, them),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor, them, rev]);

  // Who else loves/loathes them — their strongest relations among sovereigns.
  const theirWorld = useMemo(() => {
    void rev;
    const rows: { id: string; v: number }[] = [];
    nations.forEach((_, id) => {
      if (id === them || !isSovereign(id)) return;
      rows.push({ id, v: store.opinionOf(them, id) });
    });
    rows.sort((a, b) => b.v - a.v);
    return { friends: rows.slice(0, 3).filter((r) => r.v >= 30), rivals: rows.slice(-3).filter((r) => r.v <= -30).reverse() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [them, rev, nations]);

  if (!view || !playerNation || !themNation) return null;

  const gates = controls(playerNation);
  const noDiplomacy = gates.diplomacy === 'none';
  const targetIsDependency = isDependency(targetNationId) && targetNationId !== them;
  const depDescriptor = targetIsDependency
    ? sovereigntyDescriptor(targetNationId, (id) => nations.get(id)?.name)
    : null;

  return (
    <div className="mt-3 border-t border-steel/40 pt-2">
      <button onClick={() => setExpanded((v) => !v)} className="group flex w-full items-center justify-between">
        <span className="font-sans text-[10px] uppercase tracking-[0.14em] text-slate">Diplomacy</span>
        <span className="font-mono text-[10px] text-slate transition-colors group-hover:text-gold-light">
          {expanded ? '▾ collapse' : '▸ actions'}
        </span>
      </button>

      {/* who you are actually dealing with */}
      <div className="mt-1.5 flex items-center gap-2">
        <Flag iso2={themNation.flag} className="h-3.5" />
        <span className="min-w-0 flex-1 truncate font-serif text-[13px] text-white">{themNation.name}</span>
        {view.atWar && <Chip tint={color.crimson}>At War</Chip>}
        {view.mods.severed && !view.atWar && <Chip tint={color.warning}>Ties Severed</Chip>}
      </div>
      {depDescriptor && (
        <div className="mt-0.5 font-serif text-[10.5px] italic text-slate">
          {nations.get(targetNationId)?.name} is a{depDescriptor.startsWith('O') || depDescriptor.startsWith('A') ? 'n' : ''}{' '}
          {depDescriptor} — relations run through the metropole.
        </div>
      )}

      <OpinionGauge label="Your view of them" value={view.mine} />
      <OpinionGauge label="Their view of you" value={view.theirs} />

      {/* standing agreements + pressure */}
      {(view.mods.treaties.length > 0 || view.mySanctions.length > 0 || view.theirSanctions.length > 0 || view.casusBelli) && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {view.mods.treaties.map((t) => (
            <Chip key={t} tint={color.ally}>
              {TREATY_LABEL[t]}
            </Chip>
          ))}
          {view.mySanctions.map((s) => (
            <Chip key={`m${s}`} tint={color.warning}>
              Your {SANCTION_LABEL[s]}
            </Chip>
          ))}
          {view.theirSanctions.map((s) => (
            <Chip key={`t${s}`} tint={color.crimson}>
              Their {SANCTION_LABEL[s]}
            </Chip>
          ))}
          {view.casusBelli && !view.atWar && <Chip tint={color.crimson}>Casus Belli</Chip>}
        </div>
      )}

      {/* their strongest relations — the world beyond you */}
      {(theirWorld.friends.length > 0 || theirWorld.rivals.length > 0) && (
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <div>
            <div className="mb-0.5 font-sans text-[8.5px] uppercase tracking-[0.14em] text-slate/80">Close to</div>
            {theirWorld.friends.length ? (
              theirWorld.friends.map((r) => (
                <div key={r.id} className="flex items-center gap-1 py-px">
                  <Flag iso2={nations.get(r.id)?.flag ?? null} className="h-2" />
                  <span className="truncate font-sans text-[9.5px] text-off-white/80">{nations.get(r.id)?.name ?? r.id}</span>
                </div>
              ))
            ) : (
              <span className="font-mono text-[9px] text-slate/60">—</span>
            )}
          </div>
          <div>
            <div className="mb-0.5 font-sans text-[8.5px] uppercase tracking-[0.14em] text-slate/80">At odds with</div>
            {theirWorld.rivals.length ? (
              theirWorld.rivals.map((r) => (
                <div key={r.id} className="flex items-center gap-1 py-px">
                  <Flag iso2={nations.get(r.id)?.flag ?? null} className="h-2" />
                  <span className="truncate font-sans text-[9.5px] text-off-white/80">{nations.get(r.id)?.name ?? r.id}</span>
                </div>
              ))
            ) : (
              <span className="font-mono text-[9px] text-slate/60">—</span>
            )}
          </div>
        </div>
      )}

      {/* actions */}
      {expanded &&
        (noDiplomacy ? (
          <p className="mt-2 rounded-sm bg-ink/40 px-2 py-1.5 font-serif text-[10.5px] italic leading-snug text-slate">
            Foreign affairs are conducted by {nations.get(sovereignOf(playerNation))?.name ?? 'your sovereign'}. Win
            independence to take this seat yourself.
          </p>
        ) : (
          <div className="mt-1.5 divide-y divide-steel/15">
            {ACTIONS.map((a) => (
              <ActionRow key={a.id} def={a} target={targetNationId} onDone={setMsg} />
            ))}
          </div>
        ))}
      {msg && <div className="mt-1 font-mono text-[10px] text-crimson">{msg}</div>}
    </div>
  );
}
