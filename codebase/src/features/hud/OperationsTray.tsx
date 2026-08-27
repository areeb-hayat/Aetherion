/**
 * Left-rail OPERATIONS tray — every timed undertaking in flight, each with a
 * live progress bar and days-to-completion: construction projects, province
 * operations (police surges, devolution, counter-insurgency, reintegration),
 * the independence campaign and any scheduled referendum. Clicking a province
 * row selects that province on the map. Renders nothing when idle, so the map
 * stays clean until the player actually sets things in motion.
 */
import { Panel } from '@/ui/Panel';
import { Bar } from '@/ui/Bar';
import { color } from '@/config/tokens';
import { POLITICS } from '@/config/autonomy';
import { DEV_SLOTS } from '@/config/infrastructure';
import { usePoliticsStore, OP_LABEL, type OpKind } from '@/store/politicsStore';
import { useEconomyStore } from '@/store/economyStore';
import { useSimStore } from '@/store/simStore';
import { useSessionStore } from '@/store/sessionStore';
import { useUIStore } from '@/store/uiStore';
import { getProvince } from '@/store/worldStore';
import { gameDate } from '@/lib/format';

const OP_TINT: Record<OpKind, string> = {
  police: color.gold,
  devolve: color.codeBlue,
  suppress: color.crimson,
  reintegrate_referendum: color.goldLight,
  reintegrate_political: color.codeBlue,
  reintegrate_force: color.crimson,
};

interface Row {
  key: string;
  label: string;
  sub: string;
  provinceId?: number;
  startedAt: number;
  completesAt: number;
  tint: string;
}

export function OperationsTray() {
  const politicsRev = usePoliticsStore((s) => s.rev);
  const projects = useEconomyStore((s) => s.projects);
  const gameHours = useSimStore((s) => s.gameHours);
  const playerNation = useSessionStore((s) => s.playerNation);
  const select = useUIStore((s) => s.select);
  void politicsRev;

  const politics = usePoliticsStore.getState();
  const rows: Row[] = [];

  for (const op of Object.values(politics.ops)) {
    rows.push({
      key: `op:${op.provinceId}`,
      label: OP_LABEL[op.kind],
      sub: getProvince(op.provinceId)?.name ?? 'Province',
      provinceId: op.provinceId,
      startedAt: op.startedAt,
      completesAt: op.completesAt,
      tint: OP_TINT[op.kind],
    });
  }
  for (const c of projects) {
    rows.push({
      key: `build:${c.provinceId}:${c.slotId}`,
      label: `${DEV_SLOTS[c.slotId].name} construction`,
      sub: getProvince(c.provinceId)?.name ?? 'Province',
      provinceId: c.provinceId,
      startedAt: c.startedAt,
      completesAt: c.completesAt,
      tint: color.goldLight,
    });
  }
  if (playerNation) {
    const pending = politics.pendingReferendums[playerNation];
    if (pending) {
      rows.push({
        key: 'referendum',
        label: 'Independence referendum',
        sub: `Vote on ${gameDate(pending.resolvesAt)}`,
        startedAt: pending.calledAt,
        completesAt: pending.resolvesAt,
        tint: color.gold,
      });
    }
    const campaign = politics.campaigns[playerNation];
    if (campaign) {
      rows.push({
        key: 'campaign',
        label: 'Independence campaign',
        sub: 'Support building',
        startedAt: campaign.endsAt - POLITICS.timing.campaignDays * 24,
        completesAt: campaign.endsAt,
        tint: color.gold,
      });
    }
  }

  if (rows.length === 0) return null;
  rows.sort((a, b) => a.completesAt - b.completesAt);

  return (
    <Panel
      title="Operations"
      from="left"
      className="w-64"
      headerRight={<span className="font-mono text-[9.5px] tabular-nums text-slate">{rows.length} active</span>}
    >
      <div className="hud-scroll -my-1 max-h-[24vh]">
        {rows.map((r) => {
          const daysLeft = Math.max(0, Math.ceil((r.completesAt - gameHours) / 24));
          const prog = Math.max(0, Math.min(1, (gameHours - r.startedAt) / Math.max(1, r.completesAt - r.startedAt)));
          return (
            <button
              key={r.key}
              onClick={() => r.provinceId && select(r.provinceId)}
              title={r.provinceId ? 'Select province' : undefined}
              className="block w-full py-1.5 text-left"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-sans text-[10.5px] text-off-white/90">{r.label}</span>
                <span className="shrink-0 font-mono text-[9px] tabular-nums text-slate">{daysLeft}d</span>
              </div>
              <div className="truncate font-mono text-[8.5px] uppercase tracking-wider text-slate/80">{r.sub}</div>
              <Bar value={prog} color={r.tint} className="mt-1" height={3} />
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
