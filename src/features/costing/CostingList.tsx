import { useNavigate } from 'react-router-dom';
import { Loaded, StatusPill } from '../../components/ui';
import { compute } from '../../domain/engine';
import { fmt } from '../../domain/format';
import { COSTABLE_STATUSES } from '../../domain/permissions';
import { MODELS } from '../../domain/seed';
import { useSession } from '../../state/session';
import { useLoad } from '../../state/useLoad';

const model = (id: string) => MODELS.find((m) => m.id === id)!;
const costable = (s: string) => (COSTABLE_STATUSES as readonly string[]).includes(s);

export function CostingList() {
  const { data, refresh, snap, mode, basisLabel } = useSession();
  const nav = useNavigate();
  const state = useLoad(() => refresh('requests'), []);
  return (
    <Loaded state={state} text="Fetching costing queue">{() => {
      const ready = data.requests.filter((x) => costable(x.status));
      const waiting = data.requests.filter((x) => !costable(x.status));
      return (
        <>
          <div className="page-head">
            <div className="t"><h1>Costing</h1><p>Costing opens once a team lead approves the spec. The chassis base cost loads from the chassis master; you add or remove the brand's exclusive parts.</p></div>
            <span className={'chip ' + (mode === 'aicm' ? 'mint' : 'warn')}><span className="d"></span>{basisLabel}</span>
          </div>
          <div className="panel" style={{ marginBottom: 16 }}><div className="panel-h"><h3>Ready for costing</h3></div><div className="panel-b" style={{ overflowX: 'auto' }}>
            <table className="tbl"><thead><tr><th>Request</th><th>Model</th><th>Chassis</th><th className="r">Estimate at current rates</th><th>Status</th><th></th></tr></thead><tbody>
              {ready.map((x) => { const m = model(x.model); return (
                <tr key={x.id} className="click" tabIndex={0} onClick={() => nav('/costing/' + x.id)} onKeyDown={(e) => { if (e.key === 'Enter') nav('/costing/' + x.id); }}>
                  <td><b>{x.id}</b></td><td>{m.name}</td><td><span className="chip">{m.idu}</span> <span className="chip">{m.odu}</span></td>
                  <td className="r num">{fmt.inr(compute(m, snap).total)}</td><td><StatusPill s={x.status} /></td>
                  <td className="r"><span className="btn sm primary">Open workbench</span></td>
                </tr>); })}
            </tbody></table>
          </div></div>
          <div className="panel"><div className="panel-h"><h3>Not yet approved</h3><span className="chip">{waiting.length}</span></div><div className="panel-b" style={{ overflowX: 'auto' }}>
            <table className="tbl"><tbody>
              {waiting.map((x) => (
                <tr key={x.id}><td><b>{x.id}</b></td><td>{model(x.model).name}</td><td><StatusPill s={x.status} /></td><td className="r small muted">Opens after lead approval</td></tr>
              ))}
            </tbody></table>
          </div></div>
        </>
      );
    }}</Loaded>
  );
}
