export function Spark({ vals, w = 70, h = 22, color = '#6EDDB4' }: { vals: number[]; w?: number; h?: number; color?: string }) {
  const mn = Math.min(...vals), mx = Math.max(...vals), sx = w / (vals.length - 1);
  const sy = (v: number) => h - 2 - ((v - mn) / (mx - mn || 1)) * (h - 4);
  const d = vals.map((v, i) => (i ? 'L' : 'M') + (i * sx).toFixed(1) + ' ' + sy(v).toFixed(1)).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
