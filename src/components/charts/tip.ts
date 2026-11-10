/* Chart marks carry their tooltip as an HTML string in data-tip (as in charts.js). Every dynamic
   piece goes through esc(), so the hover layer can render it as HTML safely. */
export function esc(s: unknown): string {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}
