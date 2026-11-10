import { useNavigate } from 'react-router-dom';
import { Avatar, Loaded, person, StatusPill } from '../../components/ui';
import { MODELS } from '../../domain/seed';
import { useSession, useUser } from '../../state/session';
import { useLoad } from '../../state/useLoad';

const model = (id: string) => MODELS.find((m) => m.id === id)!;

export function SpecList() {
  const u = useUser();
  const { data, refresh } = useSession();
  const nav = useNavigate();
  const state = useLoad(() => refresh('requests'), []);
  return (
    <Loaded state={state} text="Fetching spec sheets">{() => {
      const list = data.requests.filter((x) => u.role !== 'rnd' || x.assignee === u.id);
      return (
        <>
          <div className="page-head"><div className="t"><h1>Spec sheets</h1><p>One spec sheet per request. Only R&amp;D can type into it; leads approve it; costing reads it. Every edit is logged.</p></div></div>
          <div className="panel"><div className="panel-b" style={{ overflowX: 'auto' }}>
            <table className="tbl"><thead><tr><th>Request</th><th>Model</th><th>R&amp;D engineer</th><th>Edits</th><th>Status</th><th></th></tr></thead><tbody>
              {list.map((x) => (
                <tr key={x.id} className="click" tabIndex={0} onClick={() => nav('/spec/' + x.id)} onKeyDown={(e) => { if (e.key === 'Enter') nav('/spec/' + x.id); }}>
                  <td><b>{x.id}</b></td>
                  <td>{model(x.model).name}</td>
                  <td>{x.assignee ? <><Avatar id={x.assignee} size={22} /> {person(x.assignee).name}</> : <span className="muted">Not allocated</span>}</td>
                  <td className="num">{x.specLog.length}</td>
                  <td><StatusPill s={x.status} /></td>
                  <td className="r"><span className="btn sm">Open</span></td>
                </tr>
              ))}
            </tbody></table>
          </div></div>
        </>
      );
    }}</Loaded>
  );
}
