import { fmt } from '../../domain/format';
import { esc } from './tip';

export interface WaterfallStep { label: string; value: number; kind: 'add' | 'sub' | 'total'; color?: string }

export function Waterfall({ steps, w: W = 640, h: H = 250 }: { steps: WaterfallStep[]; w?: number; h?: number }) {
  const padL = 8, padB = 40, padT = 22;
  let run = 0;
  const bars = steps.map((s) => {
    if (s.kind === 'total') { run = s.value; return { ...s, y0: 0, y1: s.value }; }
    const y0 = run; run += s.value; return { ...s, y0, y1: run };
  });
  const mx = Math.max(...bars.map((b) => Math.max(b.y0, b.y1))) * 1.08;
  const bw = (W - padL * 2) / bars.length, gap = Math.min(14, bw * 0.28);
  const sy = (v: number) => padT + (H - padB - padT) * (1 - v / mx);
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Cost build-up waterfall">
        <g className="grid">{[0, 1, 2, 3].map((i) => { const y = sy((mx * i) / 4); return <line key={i} x1="0" x2={W} y1={y} y2={y} />; })}</g>
        {bars.map((b, i) => {
          const x = padL + i * bw + gap / 2, w = bw - gap, top = sy(Math.max(b.y0, b.y1)), bot = sy(Math.min(b.y0, b.y1));
          const hgt = Math.max(2, bot - top);
          const col = b.color || (b.kind === 'total' ? '#0E2E25' : b.value < 0 ? '#1A8259' : '#B5622D');
          const tip = `<b>${esc(b.label)}</b><br>${b.kind === 'total' ? '' : b.value < 0 ? '− ' : '+ '}${fmt.inr(Math.abs(b.value))}${b.kind === 'total' ? '' : '<br>Running: ' + fmt.inr(b.y1)}`;
          const words = b.label.split(' '), l1 = words.slice(0, 2).join(' '), l2 = words.slice(2).join(' ');
          const nx = padL + (i + 1) * bw + gap / 2;
          return (
            <g key={i}>
              <rect className="wf-bar" x={x} y={top} width={w} height={hgt} rx="4" fill={col} data-tip={tip}
                style={{ transformOrigin: `${x + w / 2}px ${H - padB}px`, animationDelay: `${i * 0.05}s` }} />
              {i < bars.length - 1 && b.kind !== 'total' ? <line x1={x + w} x2={nx} y1={sy(b.y1)} y2={sy(b.y1)} stroke="#9AA8A1" strokeDasharray="2 3" /> : null}
              <text className="val" x={x + w / 2} y={top - 6} textAnchor="middle">{fmt.k(Math.abs(b.kind === 'total' ? b.y1 : b.value))}</text>
              <text className="lbl" x={x + w / 2} y={H - padB + 16} textAnchor="middle">{l1}</text>
              {l2 ? <text className="lbl" x={x + w / 2} y={H - padB + 30} textAnchor="middle">{l2}</text> : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
