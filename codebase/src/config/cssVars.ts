/**
 * Bridges the design tokens into CSS custom properties at runtime, so raw CSS
 * (the body backdrop, scrollbars, keyframes) reads from the SAME source as
 * Tailwind and the shaders. Call once at boot. Keeps tokens.ts the only place
 * a color/timing value is ever written.
 */
import { color, motion, radius } from './tokens';

const kebab = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

export function injectCssVariables() {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(color)) root.style.setProperty(`--c-${kebab(k)}`, v);
  for (const [k, v] of Object.entries(radius)) root.style.setProperty(`--r-${k}`, v);
  root.style.setProperty('--ease-out', `cubic-bezier(${motion.ease.out.join(',')})`);
  root.style.setProperty('--ease-back', `cubic-bezier(${motion.ease.backOut.join(',')})`);
  root.style.setProperty('--dur-fast', `${motion.duration.fast}s`);
  root.style.setProperty('--dur-base', `${motion.duration.base}s`);
}
