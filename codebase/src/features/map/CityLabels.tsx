/**
 * City name labels — a translucent DOM overlay above the canvas. The renderer
 * projects in-view cities by settlement class (capital / major / town, the same
 * ladder that colours their provinces) and pushes them to labelStore; this
 * paints them in cartographic serif with a soft halo. Labels that fall under a
 * HUD panel (anything marked [data-hud]) are dropped so text never shows
 * through the menus.
 */
import type { CSSProperties } from 'react';
import { useLabelStore, type CityLabel } from '@/store/labelStore';
import { font, mapViz, z } from '@/config/tokens';

/** Visual voice per settlement class (capital = engraved gold smallcaps). */
const STYLE: Record<CityLabel['cls'], { size: number; color: string; weight: number; spacing: string; caps: boolean; opacity: number }> = {
  1: { size: 10.5, color: mapViz.city.labelCapital, weight: 600, spacing: '0.14em', caps: true, opacity: 0.92 },
  2: { size: 9.5, color: mapViz.city.labelCity, weight: 500, spacing: '0.08em', caps: false, opacity: 0.82 },
  3: { size: 8.5, color: mapViz.city.labelTown, weight: 400, spacing: '0.05em', caps: false, opacity: 0.68 },
};

function hudRects(): DOMRect[] {
  if (typeof document === 'undefined') return [];
  return Array.from(document.querySelectorAll('[data-hud]')).map((el) => el.getBoundingClientRect());
}
// A label is centered on its anchor, so test its full text extent (not just the
// anchor) against each panel — that way wide names never bleed over a menu.
const overlaps = (l: CityLabel, r: DOMRect) => {
  const halfW = (l.name.length * STYLE[l.cls].size * 0.68) / 2 + 8;
  return l.x + halfW >= r.left - 2 && l.x - halfW <= r.right + 2 && l.y >= r.top - 16 && l.y <= r.bottom + 4;
};

export function CityLabels() {
  const labels = useLabelStore((s) => s.labels);
  if (!labels.length) return null;

  const panels = hudRects();
  const visible = labels.filter((l) => !panels.some((r) => overlaps(l, r)));

  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: z.mapLabels }}>
      {visible.map((l) => {
        const s = STYLE[l.cls];
        const style: CSSProperties = {
          left: l.x,
          top: l.y,
          transform: 'translate(-50%, -130%)',
          fontFamily: font.serif,
          fontSize: s.size,
          fontWeight: s.weight,
          letterSpacing: s.spacing,
          textTransform: s.caps ? 'uppercase' : 'none',
          color: s.color,
          opacity: s.opacity * l.alpha,
          textShadow:
            '0 0 4px rgba(3,7,12,0.95), 0 0 10px rgba(3,7,12,0.8), 0 1px 1px rgba(3,7,12,0.9)',
          whiteSpace: 'nowrap',
        };
        return (
          <span key={l.id} className="absolute" style={style}>
            {l.cls === 1 && (
              <span style={{ fontSize: s.size * 0.64, verticalAlign: '0.1em', marginRight: 4 }}>✦</span>
            )}
            {l.name}
          </span>
        );
      })}
    </div>
  );
}
