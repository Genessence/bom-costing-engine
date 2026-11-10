import type { KeyboardEvent, ReactNode } from 'react';
import { fmt } from '../../domain/format';
import { COLORS, ZONE_NAME } from '../../domain/seed';
import type { CostResult } from '../../domain/types';
import { esc } from '../../components/charts/tip';

/* Clickable exploded IDU + ODU drawing, coloured by material. Clicking a part filters the parts table. */
export function UnitArt({ c, focus, onPick }: { c: CostResult; focus: string | null; onPick(zone: string): void }) {
  const z: Record<string, number> = {};
  c.lines.forEach((l) => { const k = l.unit + ':' + l.zone; z[k] = (z[k] || 0) + l.cost; });
  const part = (k: string, inner: ReactNode) => {
    const [u, zn] = k.split(':');
    const label = `${u} ${ZONE_NAME[zn]}`;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(k); } };
    return (
      <g key={k} className={'part ' + (focus === k ? 'on' : '')} data-z={k} role="button" tabIndex={0}
        aria-label={`${label}, ${fmt.inr(z[k] || 0)} per set. Filter parts`} aria-pressed={focus === k}
        data-tip={`<b>${esc(label)}</b><br>${fmt.inr(z[k] || 0)} per set<br>Click to filter parts`}
        onClick={() => onPick(k)} onKeyDown={onKey}>
        {inner}
      </g>
    );
  };
  const fin = (x: number, y: number, w: number, h: number) => {
    const out: ReactNode[] = [];
    for (let i = x + 4; i < x + w; i += 6) out.push(<line key={i} x1={i} y1={y + 2} x2={i} y2={y + h - 2} stroke="rgba(255,255,255,.35)" strokeWidth="1" />);
    return out;
  };
  return (
    <svg className={'unit-art ' + (focus ? 'focus' : '')} viewBox="0 0 520 300" role="group" aria-label="Exploded view of indoor and outdoor unit, coloured by material">
      {part('IDU:plate', <rect x="70" y="6" width="380" height="7" rx="3" fill={COLORS.ST} />)}
      {part('IDU:body', <rect x="20" y="18" width="480" height="112" rx="22" fill="#2A4A40" stroke="#4E6E63" />)}
      {part('IDU:coil', <><rect x="44" y="30" width="432" height="38" rx="6" fill={COLORS.CU} />{fin(44, 30, 432, 38)}</>)}
      {part('IDU:fan', <><rect x="62" y="76" width="350" height="24" rx="12" fill={COLORS.PL} />{[...Array(14)].map((_, i) => <line key={i} x1={78 + i * 24} y1="79" x2={84 + i * 24} y2="97" stroke="rgba(0,0,0,.25)" />)}</>)}
      {part('IDU:pcb', <><rect x="424" y="76" width="56" height="24" rx="4" fill="#9AA8A1" /><rect x="432" y="82" width="14" height="10" fill="#0E2E25" opacity=".5" /></>)}
      {part('IDU:louver', <rect x="44" y="108" width="432" height="12" rx="6" fill="#D9C27A" />)}
      {part('ODU:cabinet', <rect x="40" y="152" width="440" height="128" rx="10" fill="#2A4A40" stroke={COLORS.ST} strokeWidth="2" />)}
      {part('ODU:coil', <><rect x="52" y="162" width="22" height="108" rx="4" fill={COLORS.CU} />{[...Array(16)].map((_, i) => <line key={i} x1="54" y1={166 + i * 6.5} x2="72" y2={166 + i * 6.5} stroke="rgba(255,255,255,.35)" />)}</>)}
      {part('ODU:fan', <><circle cx="180" cy="216" r="52" fill="#173F35" stroke={COLORS.PL} strokeWidth="3" />{[0, 120, 240].map((a) => <ellipse key={a} cx="180" cy="190" rx="13" ry="24" fill={COLORS.PL} transform={`rotate(${a} 180 216)`} />)}<circle cx="180" cy="216" r="9" fill="#0E2E25" /></>)}
      {part('ODU:comp', <><rect x="306" y="198" width="54" height="72" rx="20" fill={COLORS.CP} /><rect x="306" y="214" width="54" height="5" fill="rgba(255,255,255,.25)" /></>)}
      {part('ODU:pipe', <><path d="M333 198 C333 172 392 176 404 214 L470 214" fill="none" stroke={COLORS.RF} strokeWidth="5" strokeLinecap="round" /><path d="M360 248 L470 248" fill="none" stroke={COLORS.CU} strokeWidth="5" strokeLinecap="round" /></>)}
      {part('ODU:pcb', <><rect x="392" y="162" width="76" height="34" rx="4" fill="#9AA8A1" /><rect x="400" y="170" width="20" height="14" fill="#0E2E25" opacity=".5" /></>)}
      {part('ODU:base', <rect x="34" y="282" width="452" height="9" rx="4" fill={COLORS.ST} />)}
    </svg>
  );
}
