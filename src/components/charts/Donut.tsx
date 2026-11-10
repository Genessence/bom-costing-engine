import { fmt } from '../../domain/format';
import { esc } from './tip';

export interface DonutPart { label: string; value: number; color: string }

export function Donut({ parts, size: S = 180, unit, center, centerSub, label = 'Breakdown' }:
  { parts: DonutPart[]; size?: number; unit?: 'kg'; center?: string; centerSub?: string; label?: string }) {
  const r = S / 2 - 10, ir = r - 22, cx = S / 2, cy = S / 2, tot = parts.reduce((a, b) => a + b.value, 0);
  let a0 = -Math.PI / 2;
  const paths = parts.map((p, i) => {
    const a1 = a0 + (p.value / tot) * Math.PI * 2, large = a1 - a0 > Math.PI ? 1 : 0;
    const p1 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)], p2 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
    const p3 = [cx + ir * Math.cos(a1), cy + ir * Math.sin(a1)], p4 = [cx + ir * Math.cos(a0), cy + ir * Math.sin(a0)];
    const tip = `<b>${esc(p.label)}</b><br>${unit === 'kg' ? fmt.n(p.value, 2) + ' kg' : fmt.inr(p.value)} (${((p.value / tot) * 100).toFixed(1)}%)`;
    a0 = a1;
    return <path key={i} d={`M${p1} A${r} ${r} 0 ${large} 1 ${p2} L${p3} A${ir} ${ir} 0 ${large} 0 ${p4}Z`} fill={p.color} stroke="var(--paper)" strokeWidth="2" data-tip={tip} />;
  });
  return (
    <div className="chart" style={{ maxWidth: S }}>
      <svg viewBox={`0 0 ${S} ${S}`} role="img" aria-label={label}>
        {paths}
        {center ? (
          <>
            <text x={cx} y={cy - 2} textAnchor="middle" style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 600, fill: 'var(--ink)' }}>{center}</text>
            <text x={cx} y={cy + 16} textAnchor="middle">{centerSub || ''}</text>
          </>
        ) : null}
      </svg>
    </div>
  );
}
