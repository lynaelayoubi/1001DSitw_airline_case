// Number formatting for trace strings. Traces are prose; the UI formats on-screen figures itself.

export const usd = (n: number): string => (n < 0 ? '−' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US');
export const usd2 = (n: number): string => (n < 0 ? '−' : '') + '$' + Math.abs(n).toFixed(2);
export const num = (n: number, dp = 0): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
