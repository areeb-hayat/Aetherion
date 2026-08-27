/** Top-right toast stack (TDD Ch.09 — Priority Toast layer, Phase-1 subset).
 *  When the province panel is open on the right, the stack slides inward so
 *  toasts never land on top of it. */
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNotificationStore } from '@/store/notificationStore';
import { useUIStore } from '@/store/uiStore';
import { motion as M, color } from '@/config/tokens';
import type { GameEvent, Severity } from '@/types';

const severityColor: Record<Severity, string> = {
  CRITICAL: color.critical,
  HIGH: color.high,
  MEDIUM: color.warning,
  LOW: color.slate,
  INFO: color.gold,
};

export function NotificationLayer() {
  const toasts = useNotificationStore((s) => s.toasts);
  const districtOpen = useUIStore((s) => s.selectedProvinceId != null);
  return (
    <div
      className={`pointer-events-none fixed top-16 z-50 flex w-80 flex-col gap-2 transition-[right] duration-300 ease-expo-out ${
        districtOpen ? 'right-[19.5rem]' : 'right-4'
      }`}
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <Toast key={t.id} event={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toast({ event }: { event: GameEvent }) {
  const dismiss = useNotificationStore((s) => s.dismiss);
  useEffect(() => {
    const id = setTimeout(() => dismiss(event.id), 8000);
    return () => clearTimeout(id);
  }, [event.id, dismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 24, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.96 }}
      transition={M.spring.snappy}
      onClick={() => dismiss(event.id)}
      className="pointer-events-auto cursor-pointer rounded-md border-l-2 bg-navy/90 px-3 py-2 shadow-[0_6px_24px_rgba(0,0,0,0.5)] backdrop-blur-md"
      style={{ borderLeftColor: severityColor[event.severity] }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate">
          {event.category}
        </span>
        <span className="font-mono text-[10px] text-slate">{event.gameDate}</span>
      </div>
      <div className="mt-0.5 font-sans text-sm leading-snug text-off-white">{event.headline}</div>
    </motion.div>
  );
}
