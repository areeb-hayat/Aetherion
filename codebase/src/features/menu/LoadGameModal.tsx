/**
 * Load Game — an intentional empty shell for Phase 1. Named save slots (with
 * multiple campaigns, thumbnails, and metadata) arrive with the persistence
 * layer in a later phase. For now the only durable campaign is the implicit
 * autosave, surfaced through the menu's "Continue".
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useSessionStore, hasCampaign } from '@/store/sessionStore';
import { useWorldStore } from '@/store/worldStore';

export function LoadGameModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const session = useSessionStore();
  const resumable = hasCampaign(session);
  const nation = useWorldStore((s) => (session.playerNation ? s.nations.get(session.playerNation) : undefined));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-ink/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[30rem] max-w-[90vw] rounded-md bg-gradient-to-b from-gold/40 via-steel/45 to-steel/20 p-px shadow-[0_18px_60px_rgba(0,0,0,0.6)]"
          >
            <div className="rounded-[7px] bg-gradient-to-b from-navy/95 to-ink/95 backdrop-blur-md">
              <header className="flex items-center justify-between px-4 pb-2.5 pt-3">
                <h2 className="font-display text-[12px] font-semibold uppercase tracking-[0.26em] text-gold-light">
                  Load Campaign
                </h2>
                <button
                  onClick={onClose}
                  className="font-mono text-xs text-slate transition-colors hover:text-gold-light"
                >
                  ✕
                </button>
              </header>
              <div className="h-px bg-gradient-to-r from-gold/50 via-steel/40 to-transparent" />

              <div className="space-y-2 p-4">
                {resumable ? (
                  <div className="rounded-sm border border-gold/30 bg-steel/15 px-3.5 py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-sm text-off-white">
                        {nation?.name ?? session.playerNation} — Autosave
                      </span>
                      <span className="font-mono text-[10px] text-slate">
                        {session.lastPlayedISO
                          ? new Date(session.lastPlayedISO).toLocaleString()
                          : ''}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        session.continueCampaign();
                        onClose();
                      }}
                      className="mt-2 rounded-sm border border-gold/60 bg-gold/15 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-gold-light transition-colors hover:bg-gold/25"
                    >
                      Resume
                    </button>
                  </div>
                ) : (
                  <div className="grid h-24 place-items-center rounded-sm border border-dashed border-steel/50 bg-ink/30">
                    <span className="font-serif text-sm italic text-slate">No saved campaigns yet.</span>
                  </div>
                )}

                {/* Empty future slots, dimmed, to signal what's coming. */}
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-sm border border-steel/30 bg-ink/20 px-3.5 py-2.5 opacity-45"
                  >
                    <span className="font-mono text-[11px] tracking-wide text-slate">Save Slot {i}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate">empty</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-steel/30 px-4 py-2.5 font-mono text-[10px] leading-relaxed text-slate/80">
                Multi-slot saves arrive with the persistence layer in a later phase. Your
                current campaign is autosaved continuously and survives a reload.
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
