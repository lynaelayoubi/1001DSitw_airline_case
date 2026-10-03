// On-screen number formatting. British copy; USD figures because leases are in USD.

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
