// On-screen number formatting. British copy; USD figures because leases are in USD.

import type { AssumptionInput } from '../calc/constants';

export function money(n: number, opts: { compact?: boolean } = {}): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (opts.compact !== false) {
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(abs >= 1e8 ? 0 : abs >= 1e7 ? 1 : 2)}M`;
    if (abs >= 1e3) return `${sign}$${Math.round(abs / 1e3)}K`;
  }
  return `${sign}$${Math.round(abs).toLocaleString('en-GB')}`;
}

export const int = (n: number): string => Math.round(n).toLocaleString('en-GB');

export function months(n: number): string {
  return `${n.toFixed(1).replace(/\.0$/, '')} mo`;
}

export function date(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export const unitLabel: Record<string, string> = {
  FH: 'hours',
  FC: 'cycles',
  months: 'calendar',
  'APU-FH': 'APU hours',
};

export const kindLabel: Record<string, string> = {
  engine: 'Engines',
  'landing-gear': 'Landing gear',
  airframe: 'Airframe',
  apu: 'APU',
};

/** An assumption as a person says it: shop costs and utilisation as a move on the stated figures, the rest in their own unit. */
export function inputShown(input: AssumptionInput, v: number): string {
  switch (input.unit) {
    case 'multiplier':
      return input.id === 'lessorMarkup' ? `× ${v.toFixed(2)}` : `${v >= 1 ? '+' : '−'}${Math.round(Math.abs(v - 1) * 100)}%`;
    case 'usd-per-day':
      return `${money(v)}/day`;
    case 'share':
      return `${Math.round(v * 100)}%`;
    case 'months':
      return `${v} months`;
  }
}

/** The value in use: a multiplier reads as a multiple, so the stated figures read × 1.00 rather than +0%. */
export const inputValue = (input: AssumptionInput, v: number): string => (input.unit === 'multiplier' ? `× ${v.toFixed(2)}` : inputShown(input, v));
