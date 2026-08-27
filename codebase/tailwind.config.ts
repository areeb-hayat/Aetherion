import type { Config } from 'tailwindcss';
// Tailwind v3 loads this TS config via jiti, so importing the shared token
// module works at build time. This is what wires the design tokens into every
// utility class (bg-navy, text-gold, rounded-md, etc.).
import { color, font, radius, motion } from './src/config/tokens';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: color.navy,
        steel: color.steel,
        ink: color.ink,
        teal: color.teal,
        gold: color.gold,
        'gold-light': color.goldLight,
        crimson: color.crimson,
        white: color.white,
        'off-white': color.offWhite,
        slate: color.slate,
        'code-blue': color.codeBlue,
        'code-dark': color.codeDark,
        // semantic severity
        info: color.info,
        warning: color.warning,
        high: color.high,
        critical: color.critical,
        ally: color.ally,
        enemy: color.enemy,
      },
      fontFamily: {
        sans: [font.sans],
        mono: [font.mono],
        display: [font.display],
        serif: [font.serif],
      },
      borderRadius: {
        sm: radius.sm,
        md: radius.md,
        lg: radius.lg,
      },
      transitionTimingFunction: {
        'expo-out': `cubic-bezier(${motion.ease.out.join(',')})`,
        'back-out': `cubic-bezier(${motion.ease.backOut.join(',')})`,
      },
    },
  },
  plugins: [],
};

export default config;
