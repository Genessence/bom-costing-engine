/* Number formatting, ported from charts.js `fmt`. Indian digit grouping throughout. */
export const fmt = {
  inr: (v: number, d = 0) => '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d }),
  n: (v: number, d = 0) => Number(v).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d }),
  pct: (v: number, d = 1) => (v > 0 ? '+' : '') + (v * 100).toFixed(d) + '%',
  k: (v: number) =>
    Math.abs(v) >= 1e7 ? '₹' + (v / 1e7).toFixed(2) + ' Cr' : Math.abs(v) >= 1e5 ? '₹' + (v / 1e5).toFixed(2) + ' L' : fmt.inr(v),
};
/** The POC's "2 decimals under 200, else 0" rule for index values. */
export const fmtIdx = (v: number) => fmt.n(v, v < 200 ? 2 : 0);
