// Number formatting for trace strings. Traces are prose; the UI formats on-screen figures itself.
// Formatters are built once per precision: toLocaleString builds a new one on every call, and
// the traces make tens of thousands of calls each time the scenario panel moves.

const formatters = new Map<number, Intl.NumberFormat>();

function formatter(dp: number): Intl.NumberFormat {
  let f = formatters.get(dp);
  if (!f) {
    f = new Intl.NumberFormat('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
    formatters.set(dp, f);
  }
  return f;
}

export const usd = (n: number): string => (n < 0 ? '−' : '') + '$' + formatter(0).format(Math.round(Math.abs(n)));
export const usd2 = (n: number): string => (n < 0 ? '−' : '') + '$' + Math.abs(n).toFixed(2);
export const num = (n: number, dp = 0): string => formatter(dp).format(n);
