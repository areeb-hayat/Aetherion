/**
 * Decorative map frame — a vignette, an inset gilded border, corner brackets,
 * and edge ticks. Pure overlay (pointer-events-none) so it never blocks the map.
 */
import { color } from '@/config/tokens';

function Corner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const rot = { tl: 0, tr: 90, br: 180, bl: 270 }[pos];
  const place = {
    tl: 'left-2.5 top-2.5',
    tr: 'right-2.5 top-2.5',
    bl: 'left-2.5 bottom-2.5',
    br: 'right-2.5 bottom-2.5',
  }[pos];
  return (
    <svg className={`absolute ${place} h-7 w-7`} viewBox="0 0 28 28" style={{ transform: `rotate(${rot}deg)` }}>
      <path d="M2 12 L2 2 L12 2" fill="none" stroke={color.gold} strokeWidth="1.4" opacity="0.8" />
      <path d="M2 2 L9 9" fill="none" stroke={color.gold} strokeWidth="1" opacity="0.35" />
    </svg>
  );
}

export function MapFrame() {
  const ticks = Array.from({ length: 24 });
  return (
    <div className="pointer-events-none fixed inset-0 z-[15]">
      {/* vignette — the renderer's composite pass does the heavy lift now; this
          is a light top-up just inside the gilded frame */}
      <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 160px 30px rgba(3,7,12,0.35)' }} />

      {/* inset gilded border */}
      <div className="absolute inset-2.5 rounded-lg border" style={{ borderColor: `${color.gold}33` }} />
      <div className="absolute inset-[14px] rounded-md border" style={{ borderColor: `${color.teal}22` }} />

      {/* edge tick marks (top & bottom) */}
      <div className="absolute inset-x-4 top-[11px] flex justify-between">
        {ticks.map((_, i) => (
          <span key={i} className="block w-px" style={{ height: i % 6 === 0 ? 6 : 3, background: `${color.gold}40` }} />
        ))}
      </div>
      <div className="absolute inset-x-4 bottom-[11px] flex items-end justify-between">
        {ticks.map((_, i) => (
          <span key={i} className="block w-px" style={{ height: i % 6 === 0 ? 6 : 3, background: `${color.gold}40` }} />
        ))}
      </div>

      <Corner pos="tl" />
      <Corner pos="tr" />
      <Corner pos="bl" />
      <Corner pos="br" />
    </div>
  );
}
