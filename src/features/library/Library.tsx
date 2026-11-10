import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LineChart } from '../../components/charts/LineChart';
import { BrandDot, StatusPill } from '../../components/ui';
import { canOpen } from '../../domain/permissions';
import { BRANDS, EXCLUSIVES, IDU_CHASSIS, MODELS, ODU_CHASSIS } from '../../domain/seed';
import { useSession, useUser } from '../../state/session';
import { useUiState } from '../../state/uiMemory';

interface LibState { sel: string | null; q: string }

export function Library() {
  const { modelId } = useParams();
  const u = useUser();
  const { data } = useSession();
  const [L, setL] = useUiState<LibState>('lib', () => ({ sel: null, q: '' }));
  useEffect(() => { if (modelId && L.sel !== modelId) setL({ ...L, sel: modelId }); }, [modelId]); // eslint-disable-line react-hooks/exhaustive-deps
  const selId = modelId && L.sel !== modelId ? modelId : L.sel;
  const q = L.q.toLowerCase();
  const showCost = canOpen(u.role, 'costing');
  const ms = MODELS.filter((m) => !q || (m.name + ' ' + m.code + ' ' + m.idu + ' ' + m.odu).toLowerCase().includes(q));
  const pick = (id: string) => setL({ ...L, sel: id });

  const brands = BRANDS.filter((b) => ms.some((m) => m.brand === b));
  const tree = brands.map((b) => {
    const bm = ms.filter((m) => m.brand === b);
    return (
      <details open key={b}><summary><b>{b}</b><span className="ct">{bm.length} model{bm.length > 1 ? 's' : ''}</span></summary>
        {[...new Set(bm.map((m) => m.series))].map((s) => (
          <details open key={s}><summary>{s}</summary>
            {bm.filter((m) => m.series === s).map((m) => (
              <div key={m.id} className="leaf" role="button" tabIndex={0} aria-pressed={selId === m.id}
                onClick={() => pick(m.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(m.id); } }}
                style={selId === m.id ? { background: 'var(--mint-wash)' } : undefined}>
                <span className="chip">{m.idu} + {m.odu}</span>{m.code}<span className="ct">{m.tr} TR</span>
              </div>
            ))}
          </details>
        ))}
      </details>
    );
  });

  let card = <div className="lock-note"><div className="ic" aria-hidden="true">▤</div><div><b>Pick a model to see its spec, chassis and quote history.</b><div className="small">Organised by customer, then series, then model. Every record lives in one place.</div></div></div>;
  const m = selId ? MODELS.find((x) => x.id === selId) : undefined;
  if (m) {
    const vs = data.versions.filter((v) => v.model === m.id).sort((a, b) => a.v - b.v), rq = data.requests.filter((x) => x.model === m.id);
    card = (
      <div className="panel"><div className="panel-h"><h3>{m.name}</h3><span className="chip">{m.code}</span></div><div className="panel-b">
        <table className="tbl"><tbody>
          <tr><td className="muted">Customer</td><td><BrandDot b={m.brand} /></td></tr>
          <tr><td className="muted">Path</td><td className="small">{m.brand} / {m.series} / {m.idu} + {m.odu} / {m.code}</td></tr>
          <tr><td className="muted">Chassis</td><td>{IDU_CHASSIS[m.idu].label}<br />{ODU_CHASSIS[m.odu].label}</td></tr>
          <tr><td className="muted">Rating</td><td>{m.tr} TR, {m.star}-star, ISEER {m.iseer}</td></tr>
          <tr><td className="muted">Exclusive parts</td><td className="small">{m.excl.map((k) => EXCLUSIVES[k].name).join(', ')}</td></tr>
        </tbody></table>
        {showCost && vs.length ? <>
          <h3 style={{ margin: '16px 0 6px' }}>Quote trend</h3>
          {vs.length > 1
            ? <LineChart series={[{ name: 'Quote per set', values: vs.map((v) => v.total), color: '#0E2E25' }]} labels={vs.map((v) => 'v' + v.v + ' ' + v.quarter.replace(' 20', " '"))} h={170} label="Quote trend" />
            : <div className="small muted">One quote so far: v{vs[0].v}, {vs[0].quarter}.</div>}
        </> : null}
        {!showCost ? <div className="note" style={{ marginTop: 12 }}>Prices are visible to the costing team only.</div> : null}
        <h3 style={{ margin: '16px 0 6px' }}>Requests</h3>
        {rq.length ? rq.map((x) => (
          <div key={x.id} className="row-x" style={{ padding: '5px 0' }}><Link to={'/requests/' + x.id}>{x.id}</Link><StatusPill s={x.status} /><span className="spacer"></span><span className="small muted">{x.received}</span></div>
        )) : <div className="small muted">No open requests.</div>}
      </div></div>
    );
  }

  return (
    <>
      <div className="page-head"><div className="t"><h1>Library</h1><p>All {MODELS.length} models across {BRANDS.length} customers, filed by customer, series and chassis so anything can be found by name.</p></div></div>
      <div className="grid g2 lib-grid">
        <div className="panel"><div className="panel-b">
          <input className="inp" id="libQ" placeholder="Search models, codes, chassis" value={L.q} style={{ marginBottom: 10 }} aria-label="Search library" onChange={(e) => setL({ ...L, sel: selId, q: e.target.value })} />
          <div className="tree">{tree.length ? tree : <div className="empty">No models match.</div>}</div>
        </div></div>
        <div>{card}</div>
      </div>
    </>
  );
}
