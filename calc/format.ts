// Number formatting for trace strings. Traces are prose; the UI formats on-screen figures itself.
// Formatters are built once per precision: toLocaleString builds a new one on every call, and
// the traces make tens of thousands of calls each time the model is recomputed.

const formatters = new Map<number, Intl.NumberFormat>();

function formatter(dp: number): Intl.NumberFormat {
  let f = formatters.get(dp);
  if (!f) {
    f = new Intl.NumberFormat('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
    formatters.set(dp, f);
  }
  return f;
}

let quiet = 0;

/**
 * Runs fn with trace formatting switched off: every figure prints as ''. The numbers the model
 * computes are untouched — only the prose around them goes. For sweeps that read decisions, not
 * traces (calc/robustness.ts), where formatting is three-quarters of the work. Synchronous only.
 */
export function withoutTraces<T>(fn: () => T): T {
  quiet++;
  try {
    return fn();
  } finally {
    quiet--;
  }
}

export const usd = (n: number): string => (quiet ? '' : (n < 0 ? '−' : '') + '$' + formatter(0).format(Math.round(Math.abs(n))));
export const usd2 = (n: number): string => (quiet ? '' : (n < 0 ? '−' : '') + '$' + Math.abs(n).toFixed(2));
export const num = (n: number, dp = 0): string => (quiet ? '' : formatter(dp).format(n));

/** Money as a person says it in a message — "$4.83M", "$80K" — the same rounding as on screen. */
export function usdShort(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(abs >= 1e8 ? 0 : abs >= 1e7 ? 1 : 2)}M`;
  if (abs >= 1e3) return `${sign}$${Math.round(abs / 1e3)}K`;
  return `${sign}$${Math.round(abs)}`;
}

/** A date as a person writes it — "4 May 2027" — for messages, where an ISO date reads as code. */
export function dayMonthYear(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
