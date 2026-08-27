/**
 * Bottom-right map controls — zoom in/out and "frame the world", in the same
 * engraved-plaque chrome as the rest of the HUD, with the keyboard hints
 * stacked beneath. Vertical so it never collides with the centered overlay
 * toolbar on narrow windows.
 */
import { mapControl } from '@/map/mapControl';

const HINTS: Array<[string, string]> = [
  ['H', 'hide UI'],
  ['L', 'event log'],
  ['ESC', 'deselect'],
  ['SPACE', 'pause'],
  ['1·2·3', 'speed'],
];

function ControlButton({
  label,
  title,
  onClick,
}: {
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex h-8 w-8 items-center justify-center font-mono text-[15px] leading-none text-off-white/85 transition-all duration-150 ease-expo-out hover:bg-steel/40 hover:text-gold-light active:bg-gold/20"
    >
      {label}
    </button>
  );
}

export function MapControls() {
  return (
    <div data-hud className="pointer-events-auto flex flex-col items-end gap-2">
      <div className="rounded-md bg-gradient-to-b from-steel/45 via-steel/40 to-gold/30 p-px shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
        <div className="flex flex-col divide-y divide-steel/40 overflow-hidden rounded-[7px] bg-gradient-to-b from-navy/95 to-ink/90 backdrop-blur-md">
          <ControlButton label="+" title="Zoom in" onClick={mapControl.zoomIn} />
          <ControlButton label="−" title="Zoom out" onClick={mapControl.zoomOut} />
          <ControlButton label="◍" title="Frame the world" onClick={mapControl.resetView} />
        </div>
      </div>
      <div className="hidden flex-col items-end gap-1 text-[10px] text-slate/80 md:flex">
        {HINTS.map(([key, what]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className="font-sans">{what}</span>
            <kbd className="min-w-[22px] rounded-[3px] border border-steel/60 bg-ink/60 px-1 py-px text-center font-mono text-[9px] text-off-white/80">
              {key}
            </kbd>
          </span>
        ))}
      </div>
    </div>
  );
}
