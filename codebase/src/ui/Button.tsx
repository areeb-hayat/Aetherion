/** Small HUD button with hover/active feel. */
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'default' | 'active' | 'ghost';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base =
  'rounded-sm px-2.5 py-1 font-mono text-xs uppercase tracking-wider transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] select-none';

const variants: Record<Variant, string> = {
  default: 'border border-steel/60 bg-steel/30 text-off-white hover:bg-steel/60 hover:text-white active:scale-[0.97]',
  active: 'border border-gold/70 bg-gold/20 text-gold-light shadow-[0_0_12px_rgba(184,134,11,0.35)]',
  ghost: 'text-slate hover:text-gold-light',
};

export function Button({ variant = 'default', className = '', ...rest }: Props) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...rest} />;
}
