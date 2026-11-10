import { fmt } from '../../domain/format';
import { esc } from './tip';

export interface LineSeries { name: string; values: (number | null)[]; color: string; dash?: boolean }

export function LineChart({ series, labels, w: W = 640, h: H = 220, label = 'Trend', mark, band }:
  { series: LineSeries[]; labels: string[]; w?: number; h?: number; label?: string; mark?: number[]; band?: [number, number] }) {
  const padL = 48, padR = 14, padT = 12, padB = 26;
  const all = series.flatMap((s) => s.values).filter((v): v is number => v != null);
  const mn = Math.min(...all) * 0.97, mx = Math.max(...all) * 1.02;
  const sx = (i: number) => padL + i * ((W - padL - padR) / (labels.length - 1));
  const sy = (v: number) => padT + (H - padT - padB) * (1 - (v - mn) / (mx - mn));
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <g className="grid">
          {[0, 1, 2, 3, 4].map((i) => {
            const v = mn + ((mx - mn) * i) / 4, y = sy(v);
            return (
              <g key={i}>
                <line x1={padL} x2={W - padR} y1={y} y2={y} />
                <text x={padL - 8} y={y + 4} textAnchor="end">{fmt.n(v, v < 200 ? 1 : 0)}</text>
              </g>
            );
          })}
        </g>
        {band ? <rect x={sx(band[0]) - 8} y={padT} width={sx(band[1]) - sx(band[0]) + 16} height={H - padT - padB} fill="#36C79A" opacity=".10" rx="6" /> : null}
        {labels.map((l, i) => <text key={i} x={sx(i)} y={H - 6} textAnchor="middle">{l}</text>)}
        {series.map((s, si) => {
          const d = s.values.map((v, i) => (v == null ? '' : (i && s.values[i - 1] != null ? 'L' : 'M') + sx(i).toFixed(1) + ' ' + sy(v).toFixed(1))).join(' ');
          return <path key={'p' + si} d={d} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeDasharray={s.dash ? '4 4' : undefined} />;
        })}
        {series.map((s, si) => s.values.map((v, i) => {
          if (v == null) return null;
          const tip = `<b>${esc(labels[i])}</b><br>${esc(s.name)}: ${fmt.n(v, 2)}`;
          return (
            <g key={si + '-' + i}>
              <circle cx={sx(i)} cy={sy(v)} r={mark && mark.includes(i) ? 5 : 3.2} fill={s.color} stroke="var(--paper)" strokeWidth="2" data-tip={tip} />
              <circle cx={sx(i)} cy={sy(v)} r="12" fill="transparent" data-tip={tip} />
            </g>
          );
        }))}
      </svg>
    </div>
  );
}
