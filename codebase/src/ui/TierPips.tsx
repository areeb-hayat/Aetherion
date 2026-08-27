/** Segmented tier meter (0..max) — the development-slot and richness readout.
 *  Filled segments up to `level` glow in `color`; the rest sit muted. */
export function TierPips({
  level,
  max,
  color,
  title,
}: {
  level: number;
  max: number;
  color: string;
  title?: string;
}) {
  return (
    <div className="flex items-center gap-[3px]" title={title ?? `Tier ${level}/${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className="h-[5px] w-2.5 rounded-[1px]"
          style={{ backgroundColor: i < level ? color : 'rgba(148,163,184,0.16)' }}
        />
      ))}
    </div>
  );
}
