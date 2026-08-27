/** A thin proportion bar used across the finance/economy panels. Pure visual;
 *  pass a 0..1 value and a CSS color for the fill. */
export function Bar({
  value,
  color,
  height = 4,
  className = '',
  track = 'rgba(148,163,184,0.14)',
}: {
  value: number;
  color: string;
  height?: number;
  className?: string;
  track?: string;
}) {
  const w = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className={`w-full overflow-hidden rounded-full ${className}`}
      style={{ height, backgroundColor: track }}
    >
      <div className="h-full rounded-full transition-[width] duration-300 ease-out" style={{ width: `${w}%`, backgroundColor: color }} />
    </div>
  );
}
