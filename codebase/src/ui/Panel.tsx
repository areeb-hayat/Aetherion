/**
 * Floating HUD panel — the base chrome for every side panel (TDD Ch.07/08).
 * The look: an engraved bronze-and-lacquer plaque. A gradient gold hairline
 * frames a layered navy→ink glass body; gold corner brackets and a Cinzel
 * smallcaps title give it the grand-strategy voice. All colours come from the
 * design tokens via Tailwind classes — nothing is hard-coded here.
 */
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { motion as M } from '@/config/tokens';

interface PanelProps {
  title?: string;
  accent?: 'default' | 'gold' | 'crimson';
  children: ReactNode;
  className?: string;
  from?: 'left' | 'right' | 'top' | 'bottom';
  /** Optional control(s) pinned to the right edge of the header (e.g. dock). */
  headerRight?: ReactNode;
}

/** Gradient hairline frame per accent (the p-px wrapper paints the border). */
const frame = {
  default: 'bg-gradient-to-b from-gold/35 via-steel/45 to-steel/20',
  gold: 'bg-gradient-to-b from-gold/70 via-gold/30 to-steel/25',
  crimson: 'bg-gradient-to-b from-crimson/70 via-crimson/35 to-steel/25',
};

const cornerColor = {
  default: 'border-gold/50',
  gold: 'border-gold/80',
  crimson: 'border-crimson/80',
};

const offset = { left: { x: -16 }, right: { x: 16 }, top: { y: -16 }, bottom: { y: 16 } };

/** L-shaped bracket pinned to one corner of the panel. */
function Corner({ pos, accent }: { pos: 'tl' | 'tr' | 'bl' | 'br'; accent: keyof typeof cornerColor }) {
  const side = {
    tl: '-left-px -top-px border-l-2 border-t-2 rounded-tl-md',
    tr: '-right-px -top-px border-r-2 border-t-2 rounded-tr-md',
    bl: '-left-px -bottom-px border-l-2 border-b-2 rounded-bl-md',
    br: '-right-px -bottom-px border-r-2 border-b-2 rounded-br-md',
  }[pos];
  return <span aria-hidden className={`pointer-events-none absolute h-3 w-3 ${side} ${cornerColor[accent]}`} />;
}

export function Panel({ title, accent = 'default', children, className = '', from = 'left', headerRight }: PanelProps) {
  return (
    <motion.section
      data-hud
      initial={{ opacity: 0, ...offset[from] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, ...offset[from] }}
      transition={M.spring.soft}
      className={`pointer-events-auto relative ${className}`}
    >
      <div className={`rounded-md p-px ${frame[accent]} shadow-[0_12px_40px_rgba(0,0,0,0.55)]`}>
        <div className="rounded-[7px] bg-gradient-to-b from-navy/95 via-navy/90 to-ink/90 backdrop-blur-md">
          {title && (
            <header className="relative flex items-center justify-between px-3.5 pb-2 pt-2.5">
              <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.26em] text-gold-light">
                {title}
              </h2>
              {headerRight}
              <span
                aria-hidden
                className="absolute inset-x-3 bottom-0 h-px bg-gradient-to-r from-gold/60 via-steel/50 to-transparent"
              />
            </header>
          )}
          <div className="p-3.5">{children}</div>
        </div>
      </div>
      <Corner pos="tl" accent={accent} />
      <Corner pos="tr" accent={accent} />
      <Corner pos="bl" accent={accent} />
      <Corner pos="br" accent={accent} />
    </motion.section>
  );
}
