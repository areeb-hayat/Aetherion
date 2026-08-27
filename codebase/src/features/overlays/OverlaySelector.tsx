/**
 * Bottom overlay toolbar — all 14 map views (TDD Ch.06/24), set in the same
 * engraved-plaque chrome as the rest of the HUD. The active view gets a gold
 * glow + underline; placeholder views carry a small dot until their systems
 * come online.
 */
import { overlayList } from '@/config/overlays';
import { useUIStore } from '@/store/uiStore';

export function OverlaySelector() {
  const active = useUIStore((s) => s.activeOverlay);
  const setOverlay = useUIStore((s) => s.setOverlay);
  const def = overlayList.find((o) => o.id === active);

  return (
    <div data-hud className="pointer-events-auto relative flex flex-col items-center gap-1">
      {def && (
        <div className="flex items-baseline gap-2 rounded-sm bg-ink/55 px-2.5 py-0.5 backdrop-blur-sm">
          <span className="font-display text-[10px] uppercase tracking-[0.28em] text-gold-light/90">
            {def.label}
          </span>
          <span className="font-sans text-[9.5px] text-slate/90">
            {def.hint}
            {def.live ? '' : ' — placeholder'}
          </span>
        </div>
      )}
      <div className="rounded-md bg-gradient-to-b from-steel/45 via-steel/40 to-gold/30 p-px shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
        <div className="flex items-center gap-0.5 rounded-[7px] bg-gradient-to-b from-navy/95 to-ink/90 px-2 py-1.5 backdrop-blur-md">
          {overlayList.map((o) => {
            const isActive = o.id === active;
            return (
              <button
                key={o.id}
                onClick={() => setOverlay(o.id)}
                title={`${o.label}${o.live ? '' : ' — placeholder data'} (${o.hint})`}
                className={`group relative rounded-sm px-2 py-1 font-mono text-[11px] tracking-wider transition-all duration-150 ease-expo-out ${
                  isActive
                    ? 'bg-gold/20 text-gold-light shadow-[0_0_12px_rgba(184,134,11,0.35)]'
                    : 'text-slate hover:bg-steel/40 hover:text-off-white'
                }`}
              >
                {o.short}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute inset-x-1.5 -bottom-px h-px bg-gradient-to-r from-transparent via-gold/80 to-transparent"
                  />
                )}
                {!o.live && (
                  <span className="absolute right-0.5 top-0.5 h-1 w-1 rounded-full bg-slate/70" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
