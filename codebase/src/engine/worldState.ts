/**
 * Shared world-state binary layout (TDD Ch.10.3), Phase-1 slice.
 *
 * A single SharedArrayBuffer holds the hot simulation state so the worker can
 * write and the main thread can read with zero copying. Phase 1 only needs the
 * clock + treasury + speed control; the layout is sized to grow.
 *
 * One writer (tick worker), one reader (main) → control uses Atomics; the
 * Float64 state words are written/read plainly (single-writer is safe).
 */
export const SAB_BYTES = 64;

/** Int32 control region at byte 0. */
export const CTRL = {
  speed: 0, // SimSpeed 0..3
  running: 1, // 1 once the worker loop is live
} as const;

/** Float64 state region at byte 16 (8-byte aligned). */
export const STATE_BYTE_OFFSET = 16;
export const STATE = {
  gameHours: 0,
  treasury: 1,
} as const;

export interface SabViews {
  ctrl: Int32Array;
  state: Float64Array;
}

export function makeViews(sab: SharedArrayBuffer): SabViews {
  return {
    ctrl: new Int32Array(sab, 0, 4),
    state: new Float64Array(sab, STATE_BYTE_OFFSET, 4),
  };
}

/** Cross-origin isolation is required for SharedArrayBuffer. */
export function sabSupported(): boolean {
  return typeof SharedArrayBuffer !== 'undefined' && self.crossOriginIsolated === true;
}
