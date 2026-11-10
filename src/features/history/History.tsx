import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BrandDot, person, Swatch } from '../../components/ui';
import { splitChange } from '../../domain/engine';
import { fmt, fmtIdx } from '../../domain/format';
import { COLORS, EXCLUSIVES, MODELS, SIM_KEYS } from '../../domain/seed';
import type { CommodityCode, Version } from '../../domain/types';
import { useSession } from '../../state/session';
import { useUiState } from '../../state/uiMemory';

interface HistState { sel: string[]; q: string }
const model = (id: string) => MODELS.find((m) => m.id === id)!;
const tone = (k: CommodityCode) => (k === 'FX' ? '#465650' : COLORS[k]);

export function History() {
  const { verId } = useParams();
  const { data } = useSession();
  const nav = useNavigate();
  const [H, setH] = useUiState<HistState>('hist', () => ({ sel: [], q: '' }));
  const selIds = verId && !H.sel.includes(verId) ? [verId] : H.sel;
  useEffect(() => { if (verId && !H.sel.includes(verId)) setH({ ...H, sel: [verId] }); }, [verId]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = H.q.toLowerCase();
  const list = data.versions.slice().sort((a, b) => b.on.localeCompare(a.on)).filter((v) => {
    const m = model(v.model);
    return !q || (m.name + ' ' + m.code + ' ' + v.quarter + ' ' + v.req + ' ' + v.on).toLowerCase().includes(q);
  });
  const sel = selIds.map((id) => data.versions.find((v) => v.id === id)).filter((v): v is Version => !!v);

  const pick = (id: string) => {
    let s = selIds.slice();
    if (s.includes(id)) s = s.filter((x) => x !== id);
    else { s.push(id); if (s.length > 2) s.shift(); }
    setH({ ...H, sel: s });
    if (verId) nav('/history', { replace: true });
  };

  let detail: JSX.Element;
  if (sel.length === 2) {
    const [a, b] = sel.slice().sort((x, y) => x.on.localeCompare(y.on));
    const m = model(b.model), same = a.model === b.model;
    const split = same ? splitChange(m, a, b) : null;
    const added = b.excl.filter((k) => !a.excl.includes(k)), removed = a.excl.filter((k) => !b.excl.includes(k));
    detail = (
      <div className="panel"><div className="panel-h"><h3>Compare v{a.v} ({a.quarter}) with v{b.v} ({b.quarter})</h3></div><div className="panel-b">
        {!same ? <div className="note">These versions are for different models. Totals and rates are compared; the change is not split into causes.</div> : null}
        <div className="grid g3" style={{ margin: '6px 0 14px' }}>
          <div><div className="small sub">{a.quarter}</div><div className="kpi" style={{ padding: 0 }}><div className="v num">{fmt.inr(a.total)}</div></div></div>
          <div><div className="small sub">{b.quarter}</div><div className="kpi" style={{ padding: 0 }}><div className="v num">{fmt.inr(b.total)}</div></div></div>
          <div><div className="small sub">Change</div><div className="kpi" style={{ padding: 0 }}><div className={'v num ' + (b.total > a.total ? 'diff-up' : 'diff-dn')}>{b.total > a.total ? '+' : '−'}{fmt.inr(Math.abs(b.total - a.total))}</div></div></div>
        </div>
        {split ? (
          <div className="formula">
            <div className="row-x"><span>Commodity rates moved</span><span className="spacer"></span><b className={'num ' + (split.rate > 0 ? 'diff-up' : 'diff-dn')}>{split.rate >= 0 ? '+' : '−'}{fmt.inr(Math.abs(split.rate))}</b></div>
            <div className="row-x"><span>Scope changed (exclusive parts)</span><span className="spacer"></span><b className={'num ' + (split.scope > 0 ? 'diff-up' : split.scope < 0 ? 'diff-dn' : '')}>{split.scope >= 0 ? '+' : '−'}{fmt.inr(Math.abs(split.scope))}</b></div>
          </div>
        ) : null}
        <div style={{ overflowX: 'auto' }}><table className="tbl" style={{ marginTop: 12 }}><thead><tr><th>Rate</th><th className="r">v{a.v}</th><th className="r">v{b.v}</th><th className="r">Change</th></tr></thead><tbody>
          {SIM_KEYS.map(([k, l]) => { const d = (b.snap[k] - a.snap[k]) / a.snap[k]; return (
            <tr key={k}><td><Swatch color={tone(k)}>{l}</Swatch></td><td className="r num">{fmtIdx(a.snap[k])}</td><td className="r num">{fmtIdx(b.snap[k])}</td>
              <td className={'r num ' + (d > 0.0005 ? 'diff-up' : d < -0.0005 ? 'diff-dn' : '')}>{fmt.pct(d)}</td></tr>); })}
        </tbody></table></div>
        {added.length || removed.length ? (
          <div className="row-x" style={{ marginTop: 10 }}>
            {added.map((k) => <span key={'a' + k} className={'chip ' + (EXCLUSIVES[k].sign > 0 ? 'up' : 'down')}>Added: {EXCLUSIVES[k].name}</span>)}
            {removed.map((k) => <span key={'r' + k} className={'chip ' + (EXCLUSIVES[k].sign > 0 ? 'down' : 'up')}>Removed: {EXCLUSIVES[k].name}</span>)}
          </div>
        ) : null}
      </div></div>
    );
  } else if (sel.length === 1) {
    const v = sel[0], m = model(v.model);
    detail = (
      <div className="panel"><div className="panel-h"><h3>{m.brand} {m.code}, v{v.v}</h3><span className={'chip ' + (v.status === 'SENT' ? 'dark' : 'warn')}>{v.status === 'SENT' ? 'Sent' : 'Draft'}</span></div><div className="panel-b">
        <div className="kpi" style={{ padding: '0 0 10px' }}><div className="v num">{fmt.inr(v.total)}</div><div className="f">per set, {v.quarter}</div></div>
        <table className="tbl"><tbody>
          <tr><td className="muted">Request</td><td>{v.req}</td></tr>
          <tr><td className="muted">Costed by</td><td>{person(v.by).name} on {v.on}</td></tr>
          <tr><td className="muted">Rate source</td><td>{v.source}, basis {v.basis.replace('-', ' ')}</td></tr>
          <tr><td className="muted">Copper used</td><td className="num">{fmt.n(v.snap.CU, 2)} USD/MT</td></tr>
          <tr><td className="muted">Sent to</td><td>{v.status === 'SENT' ? v.sentTo : 'Not sent yet'}</td></tr>
          {v.note ? <tr><td className="muted">Note</td><td>{v.note}</td></tr> : null}
        </tbody></table>
        <div className="row-x" style={{ marginTop: 12 }}><span className="small muted">Pick a second version to compare.</span><span className="spacer"></span><button className="btn primary" onClick={() => nav('/customer/' + v.id)}>Customer sheet</button></div>
      </div></div>
    );
  } else {
    detail = <div className="lock-note"><div className="ic" aria-hidden="true">⇆</div><div><b>Pick a version to see exactly what was quoted.</b><div className="small">Pick two to compare: the change is split into commodity movement and scope change.</div></div></div>;
  }

  return (
    <>
      <div className="page-head"><div className="t"><h1>Quote history</h1><p>Every costing ever sent, with the rates and parts it used. Answer "what did we give whom, and why" two years later.</p></div></div>
      <div className="grid g-main">
        <div className="panel"><div className="panel-b" style={{ overflowX: 'auto' }}>
          <input className="inp" id="histQ" placeholder="Search: Voltas, Q2 2025, REQ-2603…" value={H.q} style={{ marginBottom: 10 }} aria-label="Search quote history" onChange={(e) => setH({ ...H, sel: selIds, q: e.target.value })} />
          <table className="tbl"><thead><tr><th><span className="sr-only">Selected</span></th><th>Model</th><th>Version</th><th>Quarter</th><th>Source</th><th className="r">Quote / set</th></tr></thead><tbody>
            {list.length ? list.map((v) => { const m = model(v.model), on = selIds.includes(v.id); return (
              <tr key={v.id} className="click" tabIndex={0} aria-selected={on} onClick={() => pick(v.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(v.id); } }} style={on ? { background: 'var(--mint-wash)' } : undefined}>
                <td><input type="checkbox" checked={on} readOnly tabIndex={-1} aria-label={'Select ' + m.code + ' v' + v.v} /></td>
                <td><BrandDot b={m.brand} /> <span className="small muted">{m.code}</span></td>
                <td>v{v.v} {v.status === 'DRAFT' ? <span className="chip warn">Draft</span> : null}</td>
                <td className="small">{v.quarter}<div className="muted">{v.on}</div></td>
                <td><span className={'chip ' + (v.source === 'AICM' ? 'mint' : '')}>{v.source}</span></td>
                <td className="r num"><b>{fmt.inr(v.total)}</b></td>
              </tr>); }) : <tr><td colSpan={6} className="empty">No quotes match. Try a brand, quarter or request ID.</td></tr>}
          </tbody></table>
        </div></div>
        <div>{detail}</div>
      </div>
    </>
  );
}
