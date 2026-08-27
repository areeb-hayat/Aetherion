/** Color helpers shared by the renderer, overlays, and UI. Pure functions. */

export interface RGB {
  r: number;
  g: number;
  b: number;
} // 0..1 each

/** "#RRGGBB" -> {r,g,b} in 0..1. Accepts an optional leading #. */
export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const to = (v: number) =>
    Math.round(Math.max(0, Math.min(1, v)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Linear interpolation between two 0..1 colors. */
export function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

/** Two-stop heat ramp on 0..1: cold -> hot. Used by data overlays. */
export function heat(t: number, cold: RGB, hot: RGB): RGB {
  return mixRgb(cold, hot, Math.max(0, Math.min(1, t)));
}

/** Deterministic pseudo-color from any integer — for placeholder overlays. */
export function hashColor(seed: number): RGB {
  const hue = (seed * 47.3) % 360;
  return hslToRgb(hue, 0.5, 0.5);
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: f(0), g: f(8), b: f(4) };
}
