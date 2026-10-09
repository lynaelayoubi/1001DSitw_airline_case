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

const WORDS = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
/** A count as a word in running text — "these ten" — and as figures past twelve. */
export const count = (n: number): string => WORDS[n] ?? int(n);

/** A rate per unit, to the cent: a lease's compensation rate as written. */
export const perUnit = (n: number): string => '$' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function months(n: number): string {
  return `${n.toFixed(1).replace(/\.0$/, '')} mo`;
}

/**
 * A decide-by date as a person says it: "decide today" when it is the data's date, otherwise the date.
 * When today is the shop slot's lead time, which slot it secures: "decide today to secure the February 2027 slot".
 */
export const decideBy = (d: string, asOf: string, slotMonth?: string | null): string =>
  d === asOf ? (slotMonth ? `decide today to secure the ${slotMonth} slot` : 'decide today') : `decide by ${date(d)}`;

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
