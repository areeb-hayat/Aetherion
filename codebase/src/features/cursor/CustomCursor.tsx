/**
 * Context-aware custom cursor: a precise center dot plus a lagging ring that
 * springs toward the pointer. The ring grows and turns gold over a hoverable
 * province, and pulses on the selected one — the bespoke "feel" layer.
 */
import { useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { color } from '@/config/tokens';

export function CustomCursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 500, damping: 36, mass: 0.6 });
  const ringY = useSpring(y, { stiffness: 500, damping: 36, mass: 0.6 });

  const hovering = useUIStore((s) => s.hoveredProvinceId !== null);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, [x, y]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999]">
      {/* lagging ring */}
      <motion.div
        style={{ x: ringX, y: ringY }}
        className="absolute -ml-[14px] -mt-[14px]"
        animate={{ scale: hovering ? 1.5 : 1, opacity: hovering ? 1 : 0.6 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        <div
          className="h-7 w-7 rounded-full border"
          style={{ borderColor: hovering ? color.gold : color.slate }}
        />
      </motion.div>
      {/* precise dot */}
      <motion.div
        style={{ x, y }}
        className="absolute -ml-[2px] -mt-[2px] h-1 w-1 rounded-full"
      >
        <div className="h-1 w-1 rounded-full" style={{ backgroundColor: color.goldLight }} />
      </motion.div>
    </div>
  );
}
