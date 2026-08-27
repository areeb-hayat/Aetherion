/** Display formatting for money, big numbers, and the game clock. */

import { SIM } from '@/config/gameConfig';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Compact currency: 1.2B, 340M, 5.0T. */
export function money(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function compact(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return `${Math.round(v)}`;
}

/** Money with an explicit +/− sign — for balances and deltas (−$340M, +$1.2B). */
export function signedMoney(v: number): string {
  const s = money(Math.abs(v));
  return v < 0 ? `−${s}` : `+${s}`;
}

/** A 0..1 fraction as a percentage string, e.g. 0.824 → "82%". */
export function pct(v: number, digits = 0): string {
  return `${(v * 100).toFixed(digits)}%`;
}

/** Convert hours-since-epoch into a calendar date label, e.g. "14 Mar 2027". */
export function gameDate(gameHours: number): string {
  const start = new Date(Date.UTC(SIM.epoch.year, SIM.epoch.month - 1, SIM.epoch.day));
  const d = new Date(start.getTime() + gameHours * 3600 * 1000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
