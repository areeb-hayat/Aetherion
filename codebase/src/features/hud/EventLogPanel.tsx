/**
 * Bottom-left EVENT LOG — the rolling campaign history (toasts are transient;
 * this is where they land). Toggled from the system buttons or the L key.
 * Severity is carried by a coloured left rule per entry, matching the toast
 * language, so the log reads like a wire dispatch archive.
 */
import { AnimatePresence } from 'framer-motion';
import { Panel } from '@/ui/Panel';
import { useUIStore } from '@/store/uiStore';
import { useNotificationStore } from '@/store/notificationStore';
import { color } from '@/config/tokens';
import type { Severity } from '@/types';

const severityColor: Record<Severity, string> = {
  CRITICAL: color.critical,
  HIGH: color.high,
  MEDIUM: color.warning,
  LOW: color.slate,
  INFO: color.gold,
};

export function EventLogPanel() {
  const open = useUIStore((s) => s.eventLogOpen);
  const toggle = useUIStore((s) => s.toggleEventLog);
  const log = useNotificationStore((s) => s.log);

  return (
    <AnimatePresence>
      {open && (
        <Panel
          key="event-log"
          title="Event Log"
          from="bottom"
          className="w-[24rem] max-w-[92vw]"
          headerRight={
            <button
              onClick={toggle}
              title="Close the log (L)"
              className="font-mono text-xs text-slate transition-colors hover:text-gold-light"
            >
              ✕
            </button>
          }
        >
          <div className="hud-scroll -my-1 max-h-[34vh]">
            {log.length === 0 ? (
              <p className="py-1 font-serif text-[11px] italic text-slate">
                Nothing on the wire yet — history is being written.
              </p>
            ) : (
              log.map((e) => (
                <div
                  key={e.id}
                  className="border-l-2 py-1.5 pl-2 [&+&]:border-t [&+&]:border-t-steel/15"
                  style={{ borderLeftColor: severityColor[e.severity] }}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-slate">{e.category}</span>
                    <span className="font-mono text-[9px] tabular-nums text-slate/80">{e.gameDate}</span>
                  </div>
                  <div className="mt-0.5 font-sans text-[12px] leading-snug text-off-white">{e.headline}</div>
                  {e.detail && <div className="mt-0.5 font-serif text-[10.5px] italic leading-snug text-slate">{e.detail}</div>}
                </div>
              ))
            )}
          </div>
        </Panel>
      )}
    </AnimatePresence>
  );
}
