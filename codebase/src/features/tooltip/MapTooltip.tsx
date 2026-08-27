/**
 * Cursor-following tooltip for the hovered province (TDD Ch.05.4). Shows the
 * province in cartographic serif with its nation (flag + colour swatch), plus
 * terrain and population at a glance — a miniature of the detail panel.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { useWorldStore } from '@/store/worldStore';
import { motion as M } from '@/config/tokens';
import { Flag } from '@/ui/Flag';
import { compact } from '@/lib/format';
import { sortedDeposits, resourceColor } from '@/config/resources';

const pretty = (terrain: string) =>
  terrain.charAt(0) + terrain.slice(1).toLowerCase();

export function MapTooltip() {
  const hoveredId = useUIStore((s) => s.hoveredProvinceId);
  const pointer = useUIStore((s) => s.pointer);
  const province = useWorldStore((s) => (hoveredId ? s.provinces.get(hoveredId) : undefined));
  const nation = useWorldStore((s) => (province ? s.nations.get(province.nationId) : undefined));
  const deposits = province ? sortedDeposits(province) : [];

  return (
    <AnimatePresence>
      {province && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: M.duration.fast, ease: M.ease.backOut }}
          style={{ left: pointer.x + 18, top: pointer.y + 18 }}
          className="pointer-events-none fixed z-30"
        >
          <div className="rounded-md bg-gradient-to-b from-gold/40 via-steel/45 to-steel/20 p-px shadow-[0_10px_32px_rgba(0,0,0,0.6)]">
            <div className="min-w-[168px] rounded-[7px] bg-gradient-to-b from-navy/95 to-ink/95 px-3 py-2 backdrop-blur-sm">
              <div className="font-serif text-[15px] font-medium leading-tight text-white">
                {province.name}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate">
                {nation?.flag ? (
                  <Flag iso2={nation.flag} className="h-2.5" />
                ) : (
                  <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: nation?.color }} />
                )}
                <span className="font-sans">{nation?.name ?? 'International Waters'}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-4 border-t border-steel/40 pt-1.5">
                <span className="font-sans text-[10px] uppercase tracking-wider text-slate">
                  {pretty(province.data.terrain)}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-code-blue">
                  {compact(province.data.population)}
                </span>
              </div>
              {deposits.length > 0 && (
                <div className="mt-1 flex items-center gap-1.5">
                  {deposits.map(({ def }) => (
                    <span
                      key={def.id}
                      className="h-1.5 w-1.5 rounded-full ring-1 ring-white/20"
                      style={{ backgroundColor: resourceColor(def.id) }}
                    />
                  ))}
                  <span className="font-sans text-[9px] uppercase tracking-wider text-slate">
                    {deposits[0].def.name}
                    {deposits.length > 1 ? ` +${deposits.length - 1}` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
