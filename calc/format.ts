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
