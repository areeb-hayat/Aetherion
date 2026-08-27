/** A label/value row used throughout the data panels. */
import type { ReactNode } from 'react';

export function StatRow({ label, value, accent }: { label: string; value: ReactNode; accent?: 'gold' | 'crimson' | 'code' }) {
  const valueClass =
    accent === 'gold'
      ? 'text-gold-light'
      : accent === 'crimson'
        ? 'text-crimson'
        : accent === 'code'
          ? 'text-code-blue'
          : 'text-off-white';
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="font-sans text-[11px] uppercase tracking-wider text-slate">{label}</span>
      <span className={`font-mono text-sm tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}
