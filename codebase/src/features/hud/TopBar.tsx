/**
 * Top status bar: the wordmark, campaign date, speed controls, treasury and
 * world counters — one engraved plaque across the top of the theatre. Chrome
 * matches <Panel> (gradient gold hairline + layered glass), with the AETHERION
 * wordmark set in Cinzel between two ornament rules.
 */
import { useSimStore } from '@/store/simStore';
import { useWorldStore } from '@/store/worldStore';
import { useEconomyStore } from '@/store/economyStore';
import { setSimSpeed } from '@/engine/engineSingleton';
import { gameDate, money, signedMoney } from '@/lib/format';
import { color } from '@/config/tokens';
import type { SimSpeed } from '@/types';

const SPEEDS: { value: SimSpeed; label: string; title: string }[] = [
  { value: 0, label: '❙❙', title: 'Pause' },
  { value: 1, label: '▶', title: 'Speed 1' },
  { value: 2, label: '▶▶', title: 'Speed 2' },
  { value: 3, label: '▶▶▶', title: 'Speed 3' },
];

export function TopBar() {
  const speed = useSimStore((s) => s.speed);
  const gameHours = useSimStore((s) => s.gameHours);
  const treasury = useSimStore((s) => s.treasury);
  const balance = useEconomyStore((s) => s.ledger?.balance ?? 0);
  const financing = useEconomyStore((s) => s.financing);
  const nationCount = useWorldStore((s) => s.nations.size);
  const provinceCount = useWorldStore((s) => s.provinceCount);
  const monthly = balance / 12;

  // How the gap is funded colours the figure: green surplus, amber when bonds
  // roll the deficit (debt grows, treasury holds), red when reserves burn.
  const fmode = financing?.mode;
  const balanceTint = fmode === 'reserves' ? color.crimson : fmode === 'bonds' ? color.warning : monthly >= 0 ? color.ally : color.high;
  const balanceTitle =
    fmode === 'bonds'
      ? 'Deficit rolled at market — bond issuance covers the gap, so debt grows instead of the treasury draining'
      : fmode === 'reserves'
        ? 'Locked out of bond markets — the deficit burns treasury reserves'
        : 'Net monthly balance (revenue − expenditure)';

  return (
    <div data-hud className="pointer-events-auto relative">
      <div className="rounded-md bg-gradient-to-b from-gold/40 via-steel/45 to-steel/20 p-px shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
        <div className="flex flex-nowrap items-center gap-4 whitespace-nowrap rounded-[7px] bg-gradient-to-b from-navy/95 via-navy/90 to-ink/90 px-5 py-2 backdrop-blur-md">
          {/* wordmark between ornament rules */}
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="h-px w-5 bg-gradient-to-r from-transparent to-gold/60" />
            <span aria-hidden className="text-[8px] text-gold/80">✦</span>
            <span className="font-display text-sm font-bold tracking-[0.32em] text-gold-light">
              AETHERION
            </span>
            <span aria-hidden className="text-[8px] text-gold/80">✦</span>
            <span aria-hidden className="h-px w-5 bg-gradient-to-l from-transparent to-gold/60" />
          </div>

          <Divider />
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm tabular-nums tracking-wide text-off-white">
              {gameDate(gameHours)}
            </span>
            {speed === 0 && (
              <span
                className="animate-pulse rounded-full border border-warning/60 bg-warning/10 px-1.5 py-px font-display text-[8.5px] uppercase tracking-[0.18em]"
                style={{ color: color.warning }}
              >
                Paused
              </span>
            )}
          </div>

          <Divider />
          <div className="flex items-center gap-0.5 rounded-sm border border-steel/50 bg-ink/40 p-0.5">
            {SPEEDS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSimSpeed(s.value)}
                className={`min-w-[32px] rounded-[3px] px-1.5 py-0.5 font-mono text-xs transition-all duration-150 ease-expo-out ${
                  speed === s.value
                    ? 'bg-gold/25 text-gold-light shadow-[0_0_10px_rgba(184,134,11,0.4)]'
                    : 'text-slate hover:bg-steel/40 hover:text-off-white'
                }`}
                title={s.title}
              >
                {s.label}
              </button>
            ))}
          </div>

          <Divider />
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[9px] uppercase tracking-[0.2em] text-slate">
              Treasury
            </span>
            <span className="font-mono text-sm tabular-nums text-gold-light">{money(treasury)}</span>
            {balance !== 0 && (
              <span
                className="font-mono text-[11px] tabular-nums"
                style={{ color: balanceTint }}
                title={balanceTitle}
              >
                {monthly >= 0 ? '▲' : '▼'} {signedMoney(monthly)}/mo
              </span>
            )}
          </div>

          <div className="hidden items-center gap-4 xl:flex">
            <Divider />
            <div className="font-mono text-[11px] tabular-nums text-slate">
              {nationCount} nations · {provinceCount.toLocaleString()} provinces
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Divider = () => (
  <span aria-hidden className="h-5 w-px bg-gradient-to-b from-transparent via-steel/70 to-transparent" />
);
