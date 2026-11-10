import { COMMODITIES } from '../domain/seed';
import { fmtIdx } from '../domain/format';
import { Spark } from './charts/Spark';

/* Scrolling commodity ticker (spot vs previous reading). Duplicated track for a seamless loop. */
export function Ticker() {
  const items = (dup: boolean) => COMMODITIES.map((c) => {
    const prev = c.hist[c.hist.length - 2];
    const ch = (c.cur - prev) / prev;
    return (
      <span className="tk" key={(dup ? 'b' : 'a') + c.code} aria-hidden={dup || undefined}>
        <span className="nm">{c.index}</span>
        <span className="px num">{fmtIdx(c.cur)}</span>
        <span className="nm small">{c.unit}</span>
        <span className={'ch ' + (ch >= 0 ? 'up' : 'dn')}>{ch >= 0 ? '▲' : '▼'} {Math.abs(ch * 100).toFixed(1)}%</span>
        <Spark vals={c.hist} w={56} h={18} color={ch >= 0 ? '#F08A78' : '#6EDDB4'} />
      </span>
    );
  });
  return <div className="ticker" aria-label="Commodity spot prices"><div className="ticker-track">{items(false)}{items(true)}</div></div>;
}
