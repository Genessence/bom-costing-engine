import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, BrandDot, Loaded, StatusPill } from '../../components/ui';
import { queueFor } from '../../domain/permissions';
import { MODELS } from '../../domain/seed';
import { useSession, useUser } from '../../state/session';
import { useUiState } from '../../state/uiMemory';
import { useLoad } from '../../state/useLoad';
import { NewRequestDrawer } from './NewRequestDrawer';

type Filter = 'all' | 'mine' | 'open' | 'sent';
const model = (id: string) => MODELS.find((m) => m.id === id)!;

export function RequestList() {
  const u = useUser();
  const { data, refresh } = useSession();
  const nav = useNavigate();
  const [f, setF] = useUiState<Filter>('reqFilter', () => 'all');
  const [drawer, setDrawer] = useState(false);
  const state = useLoad(() => refresh('requests'), []);
  const canLog = ['kam', 'costing', 'lead'].includes(u.role);

  return (
    <Loaded state={state} text="Fetching requests">{() => {
      const reqs = data.requests;
      const list = reqs.filter((x) => f === 'all' || (f === 'mine' && queueFor(u, x)) || (f === 'open' && x.status !== 'SENT') || (f === 'sent' && x.status === 'SENT'));
      return (
        <>
          <div className="page-head">
            <div className="t"><h1>Customer requests</h1><p>Every spec request from a brand, from the moment it is logged to the priced sheet that goes back. Team leads allocate, R&amp;D fills the spec, leads approve, costing prices it.</p></div>
            {canLog ? <button className="btn primary" onClick={() => setDrawer(true)}>Log a customer request</button> : null}
          </div>
          <div className="row-x" style={{ marginBottom: 12 }}>
            <div className="seg" role="group" aria-label="Filter requests">
              {([['all', 'All'], ['mine', 'Needs my action'], ['open', 'Open'], ['sent', 'Sent']] as [Filter, string][]).map(([k, l]) => (
                <button key={k} className={f === k ? 'on' : ''} aria-pressed={f === k} onClick={() => setF(k)}>{l}</button>
              ))}
            </div>
            <span className="spacer"></span><span className="small muted">{list.length} of {reqs.length}</span>
          </div>
          <div className="panel"><div className="panel-b" style={{ paddingTop: 6, overflowX: 'auto' }}>
            <table className="tbl"><thead><tr><th>Request</th><th>Model</th><th>Chassis</th><th>Received</th><th>Team lead</th><th>R&amp;D</th><th>Status</th><th className="r">Due</th></tr></thead><tbody>
              {list.map((x) => { const m = model(x.model); return (
                <tr key={x.id} className="click" tabIndex={0} onClick={() => nav('/requests/' + x.id)} onKeyDown={(e) => { if (e.key === 'Enter') nav('/requests/' + x.id); }}>
                  <td><b className="num">{x.id}</b><div className="small muted">{x.priority} priority</div></td>
                  <td><BrandDot b={m.brand} /><div className="small sub">{m.name.replace(m.brand + ' ', '')}</div></td>
                  <td><span className="chip">{m.idu}</span> <span className="chip">{m.odu}</span></td>
                  <td className="small">{x.received}</td>
                  <td>{x.lead ? <Avatar id={x.lead} size={24} /> : <span className="muted small">Unassigned</span>}</td>
                  <td>{x.assignee ? <Avatar id={x.assignee} size={24} /> : <span className="muted small">—</span>}</td>
                  <td><StatusPill s={x.status} /></td>
                  <td className="r small">{x.due}</td>
                </tr>); })}
            </tbody></table>
          </div></div>
          {drawer ? <NewRequestDrawer onClose={() => setDrawer(false)} /> : null}
        </>
      );
    }}</Loaded>
  );
}
