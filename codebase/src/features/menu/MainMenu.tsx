/**
 * Main menu — the front door. Renders over the slowly-orbiting globe (the scene
 * stays mounted; only the mode changes), so the planet is the living backdrop.
 * The overlay itself is pointer-transparent except the menu card, so the globe
 * can still be grabbed and spun behind it.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSessionStore, hasCampaign } from '@/store/sessionStore';
import { useWorldStore } from '@/store/worldStore';
import { getNationStat } from '@/features/menu/nationStats';
import { Flag } from '@/ui/Flag';
import { LoadGameModal } from '@/features/menu/LoadGameModal';

function MenuItem({
  label,
  sub,
  onClick,
  disabled,
  primary,
}: {
  label: string;
  sub?: string;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative w-full rounded-md p-px text-left transition-all duration-200 ease-expo-out ${
        disabled
          ? 'cursor-default opacity-40'
          : primary
            ? 'bg-gradient-to-r from-gold/70 via-gold/30 to-steel/25 hover:from-gold/90'
            : 'bg-gradient-to-r from-gold/25 via-steel/40 to-steel/15 hover:from-gold/50'
      }`}
    >
      <div className="rounded-[7px] bg-gradient-to-b from-navy/90 to-ink/85 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-baseline justify-between gap-3">
          <span
            className={`font-display text-sm font-semibold uppercase tracking-[0.26em] ${
              primary ? 'text-gold-light' : 'text-off-white group-hover:text-gold-light'
            }`}
          >
            {label}
          </span>
          {sub && <span className="font-mono text-[10px] tracking-wide text-slate">{sub}</span>}
        </div>
      </div>
      {!disabled && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-2 left-0 w-0.5 rounded-full bg-gold/0 transition-all duration-200 group-hover:bg-gold/80"
        />
      )}
    </button>
  );
}

export function MainMenu() {
  const session = useSessionStore();
  const worldLoaded = useWorldStore((s) => s.loaded);
  const [loadOpen, setLoadOpen] = useState(false);
  const resumable = hasCampaign(session);
  const stat = getNationStat(resumable ? session.playerNation : null);
  const nation = useWorldStore((s) => (session.playerNation ? s.nations.get(session.playerNation) : undefined));

  const lastPlayed = session.lastPlayedISO
    ? new Date(session.lastPlayedISO).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : undefined;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="pointer-events-none absolute inset-0 z-40"
    >
      {/* left legibility scrim */}
      <div className="absolute inset-y-0 left-0 w-[46%] bg-gradient-to-r from-ink/85 via-ink/45 to-transparent" />

      <div className="absolute left-14 top-1/2 w-[22rem] max-w-[80vw] -translate-y-1/2">
        {/* wordmark */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.5 }}
          className="mb-8"
        >
          <div className="mb-2 flex items-center gap-3">
            <span aria-hidden className="h-px w-8 bg-gradient-to-r from-transparent to-gold/70" />
            <span aria-hidden className="text-[10px] text-gold/80">✦</span>
            <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
          </div>
          <h1 className="font-display text-5xl font-bold tracking-[0.2em] text-gold-light [text-shadow:0_0_36px_rgba(184,134,11,0.4)]">
            AETHERION
          </h1>
          <p className="mt-2 font-serif text-sm italic tracking-[0.14em] text-slate">
            A real-time geopolitical grand strategy.
          </p>
        </motion.div>

        {/* menu */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.5 }}
          className="pointer-events-auto flex flex-col gap-2.5"
        >
          {resumable && (
            <MenuItem
              primary
              label="Continue"
              sub={lastPlayed ? `Resumed ${lastPlayed}` : undefined}
              onClick={() => session.continueCampaign()}
            />
          )}
          <MenuItem
            label="New Game"
            sub={worldLoaded ? undefined : 'loading world…'}
            disabled={!worldLoaded}
            onClick={() => session.goSetup()}
          />
          <MenuItem label="Load Game" sub="0 saves" onClick={() => setLoadOpen(true)} />
          <MenuItem label="Settings" sub="soon" disabled />
        </motion.div>

        {/* resumable-campaign badge */}
        {resumable && nation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-6 flex items-center gap-2.5 border-t border-steel/30 pt-3"
          >
            <Flag iso2={nation.flag} className="h-4" />
            <div className="leading-tight">
              <div className="font-serif text-sm text-off-white">{nation.name}</div>
              <div className="font-mono text-[10px] tracking-wide text-slate">
                {stat?.tier ?? 'Campaign'} · your standing campaign
              </div>
            </div>
          </motion.div>
        )}

        <div className="mt-8 font-mono text-[10px] tracking-wide text-slate/70">
          Phase 1 · The World Graph — v0.1.0
        </div>
      </div>

      <LoadGameModal open={loadOpen} onClose={() => setLoadOpen(false)} />
    </motion.div>
  );
}
