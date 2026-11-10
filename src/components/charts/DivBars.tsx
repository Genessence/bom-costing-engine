import { fmt } from '../../domain/format';
import { esc } from './tip';

export interface DivItem { label: string; value: number; color: string }

/* Diverging horizontal bars; value in ₹ per set (+ means cost goes up). */
export function DivBars({ items, w: W = 560 }: { items: DivItem[]; w?: number }) {
  const rowH = 30, H = items.length * rowH + 10, mid = W * 0.55;
  const mx = Math.max(1, ...items.map((i) => Math.abs(i.value)));
  const sc = (v: number) => (Math.abs(v) / mx) * (W - mid - 60);
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Impact by commodity">
        <line x1={mid} x2={mid} y1="0" y2={H} stroke="#9AA8A1" />
        {items.map((it, i) => {
          const y = i * rowH + 6, w = Math.max(it.value ? 2 : 0, sc(it.value)), x = it.value >= 0 ? mid : mid - w;
          const sign = it.value >= 0 ? '+' : '−';
          return (
            <g key={i}>
              <text className="lbl" x={mid - sc(Math.min(0, it.value)) - 8} y={y + 15} textAnchor="end">{it.label}</text>
              <rect x={x} y={y + 3} width={w} height="16" rx="4" fill={it.color} data-tip={`<b>${esc(it.label)}</b><br>${sign}${fmt.inr(Math.abs(it.value))} per set`} />
              <text className="val" x={it.value >= 0 ? mid + w + 6 : mid + 6} y={y + 15}>{sign}{fmt.inr(Math.abs(it.value))}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
