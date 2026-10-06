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

/** A rate per unit, to the cent: a lease's compensation rate as written. */
export const perUnit = (n: number): string => '$' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

/** An assumption's value in the unit it is shown, and overridden, in: a multiple, dollars a day, a share or months. */
export function inputValue(input: AssumptionInput, v: number): string {
  switch (input.unit) {
    case 'multiplier':
      return `× ${v.toFixed(2)}`;
    case 'usd-per-day':
      return `${money(v)}/day`;
    case 'share':
      return `${Math.round(v * 100)}%`;
    case 'months':
      return `${v} months`;
  }
}
