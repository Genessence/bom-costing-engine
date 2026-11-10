import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import { Avatar, BrandDot, busyLabel, Loaded, person, StatusPill } from '../../components/ui';
import { specLabel } from '../../domain/engine';
import { fmt } from '../../domain/format';
import { canOpen } from '../../domain/permissions';
import { ENGINEERS, IDU_CHASSIS, MODELS, ODU_CHASSIS } from '../../domain/seed';
import type { Request } from '../../domain/types';
import { useSession, useUser } from '../../state/session';
import { useToast } from '../../state/toasts';
import { useLoad } from '../../state/useLoad';
import { Flow } from './Flow';

const model = (id: string) => MODELS.find((m) => m.id === id)!;

export function RequestDetail() {
  const { id = '' } = useParams();
  const { data, refresh } = useSession();
  const state = useLoad(() => refresh('requests'), [id]);
  return (
    <Loaded state={state} text="Opening request">{() => {
      const x = data.requests.find((r) => r.id === id);
      if (!x) return <div className="empty">Request not found.</div>;
      return <Detail x={x} />;
    }}</Loaded>
  );
}

function Detail({ x }: { x: Request }) {
  const u = useUser();
  const { data, refresh } = useSession();
  const toast = useToast();
  const nav = useNavigate();
  const m = model(x.model), role = u.role, me = u.id;
  const [eng, setEng] = useState(ENGINEERS[0]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const load = (eid: string) => data.requests.filter((q) => q.assignee === eid && ['RND', 'ALLOCATED', 'RETURNED', 'SUBMITTED'].includes(q.status)).length;

  const allocate = async () => {
    setBusy('allocate');
    try {
      await api.allocate(x.id, eng);
      await refresh('requests', 'audit');
      toast('Allocated to ' + person(eng).name + '. They have been notified.');
    } catch (e) { toast((e as Error).message, true); await refresh('requests'); }
    setBusy(null);
  };
  const decide = async (ok: boolean) => {
    if (!ok && !note) { toast('Add a note so R&D knows what to change', true); noteRef.current?.focus(); return; }
    setBusy(ok ? 'approve' : 'return');
    try {
      await api.decide(x.id, ok, note);
      await refresh('requests', 'audit');
      toast(ok ? 'Spec approved and locked for costing' : 'Returned to R&D with your note');
      setNote('');
    } catch (e) { toast((e as Error).message, true); }
    setBusy(null);
  };

  let action: JSX.Element | null = null;
  if (x.status === 'NEW') {
    action = role === 'lead' ? (
      <div className="panel"><div className="panel-h"><h3>Allocate to R&amp;D</h3></div><div className="panel-b">
        <p className="small sub" style={{ marginTop: 0 }}>Pick the engineer who will fill the spec sheet. Current open load is shown so work stays balanced.</p>
        <div className="grid" style={{ gap: 8 }} role="radiogroup" aria-label="R&D engineer">
          {ENGINEERS.map((eid) => { const n = load(eid); return (
            <label key={eid} className="role-card" style={{ gridTemplateColumns: 'auto 34px 1fr auto', cursor: 'pointer' }}>
              <input type="radio" name="eng" value={eid} checked={eng === eid} onChange={() => setEng(eid)} />
              <Avatar id={eid} size={34} />
              <span><b>{person(eid).name}</b><div className="can">{n} open spec{n === 1 ? '' : 's'}</div></span>
              <span className="chip">{n < 2 ? 'Available' : 'Busy'}</span>
            </label>); })}
        </div>
        <div className="row-x" style={{ marginTop: 12 }}><span className="spacer"></span>
          <button className="btn primary" onClick={allocate} disabled={!!busy}>{busyLabel(busy === 'allocate', 'Allocate request', 'Allocating')}</button></div>
      </div></div>
    ) : <div className="note">Waiting for a team lead to allocate this request. Navdeep and Mahendra have been notified.</div>;
  } else if (['RND', 'ALLOCATED', 'RETURNED'].includes(x.status)) {
    action = role === 'rnd' && x.assignee === me ? (
      <div className="panel"><div className="panel-b row-x"><div style={{ flex: 1 }}><b>Your turn: fill the spec sheet</b>
        <div className="small sub">{x.status === 'RETURNED' ? 'The lead returned this spec with comments. Update and resubmit.' : 'Enter the model specification, then submit it for approval.'}</div></div>
        <button className="btn primary" onClick={() => nav('/spec/' + x.id)}>Open spec sheet</button></div></div>
    ) : <div className="note">With {person(x.assignee).name} (R&amp;D) to fill the spec sheet.</div>;
  } else if (x.status === 'SUBMITTED') {
    action = role === 'lead' ? (
      <div className="panel"><div className="panel-h"><h3>Review the spec</h3></div><div className="panel-b">
        <p className="small sub" style={{ marginTop: 0 }}>Approving locks the spec for costing. Returning sends it back to {person(x.assignee).name} with your note.</p>
        <textarea className="inp" id="dec-note" ref={noteRef} rows={2} placeholder="Note for R&D (optional when approving)" aria-label="Note for R&D" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="row-x" style={{ marginTop: 10 }}>
          <button className="btn" onClick={() => nav('/spec/' + x.id)}>Open spec sheet</button><span className="spacer"></span>
          <button className="btn danger" onClick={() => decide(false)} disabled={!!busy}>{busyLabel(busy === 'return', 'Return to R&D', 'Saving')}</button>
          <button className="btn primary" onClick={() => decide(true)} disabled={!!busy}>{busyLabel(busy === 'approve', 'Approve spec', 'Saving')}</button>
        </div>
      </div></div>
    ) : <div className="note">Spec submitted. Waiting for {person(x.lead).name} to approve.</div>;
  } else if (['APPROVED', 'COSTING'].includes(x.status)) {
    action = role === 'costing' ? (
      <div className="panel"><div className="panel-b row-x"><div style={{ flex: 1 }}><b>Spec approved and locked</b>
        <div className="small sub">Open the costing workbench. Chassis {m.idu} + {m.odu} base cost is pulled automatically.</div></div>
        <button className="btn primary" onClick={() => nav('/costing/' + x.id)}>Open costing workbench</button></div></div>
    ) : <div className="note">Spec approved. The costing team is pricing this model.</div>;
  } else if (x.status === 'COSTED') {
    const v = data.versions.filter((q) => q.req === x.id).slice(-1)[0];
    action = role === 'costing' && v ? (
      <div className="panel"><div className="panel-b row-x"><div style={{ flex: 1 }}><b>Costed: {fmt.inr(v.total)} per set (v{v.v})</b>
        <div className="small sub">Review the customer sheet and send it from the system.</div></div>
        <button className="btn" onClick={() => nav('/costing/' + x.id)}>Re-open costing</button>
        <button className="btn primary" onClick={() => nav('/customer/' + v.id)}>Review &amp; send</button></div></div>
    ) : <div className="note">Costed. Waiting to be sent to the customer.</div>;
  } else if (x.status === 'SENT') {
    const v = data.versions.filter((q) => q.model === x.model && q.status === 'SENT').slice(-1)[0];
    action = (
      <div className="panel"><div className="panel-b row-x"><div style={{ flex: 1 }}><b>Sent to the customer</b>
        <div className="small sub">{v ? 'v' + v.v + ' went to ' + v.sentTo : ''}</div></div>
        {v && canOpen(role, 'history') ? <button className="btn" onClick={() => nav('/customer/' + v.id)}>View what was sent</button> : null}</div></div>
    );
  }

  return (
    <>
      <div className="page-head">
        <div className="t"><div className="crumbs"><Link to="/requests">Requests</Link> / {x.id}</div><h1>{m.name}</h1><p>{x.note}</p></div>
        <div className="row-x"><StatusPill s={x.status} /><span className="chip">{x.priority} priority</span></div>
      </div>
      <Flow st={x.status} />
      <div className="grid g-main">
        <div className="grid" style={{ alignContent: 'start' }}>
          {action}
          <div className="panel"><div className="panel-h"><h3>Request details</h3></div><div className="panel-b" style={{ overflowX: 'auto' }}><table className="tbl"><tbody>
            <tr><td className="muted">Customer / brand</td><td><BrandDot b={m.brand} /></td><td className="muted">Model code</td><td><b>{m.code}</b></td></tr>
            <tr><td className="muted">Chassis</td><td>{IDU_CHASSIS[m.idu].label}<br />{ODU_CHASSIS[m.odu].label}</td><td className="muted">Capacity</td><td>{m.tr} TR, {m.star}-star, ISEER {m.iseer}</td></tr>
            <tr><td className="muted">Received</td><td>{x.received}, {x.via}</td><td className="muted">Reply due</td><td>{x.due}</td></tr>
            <tr><td className="muted">Team lead</td><td>{x.lead ? <><Avatar id={x.lead} size={22} /> {person(x.lead).name}</> : 'Not allocated'}</td><td className="muted">R&amp;D engineer</td><td>{x.assignee ? <><Avatar id={x.assignee} size={22} /> {person(x.assignee).name}</> : '—'}</td></tr>
          </tbody></table></div></div>
          {x.specLog.length ? (
            <div className="panel"><div className="panel-h"><h3>Spec change log</h3><span className="chip">{x.specLog.length} edits</span></div><div className="panel-b" style={{ overflowX: 'auto' }}>
              <table className="tbl"><thead><tr><th>When</th><th>Who</th><th>Field</th><th>From</th><th>To</th></tr></thead><tbody>
                {x.specLog.slice().reverse().map((l, i) => (
                  <tr key={i}><td className="small">{l.t}</td><td><Avatar id={l.who} size={22} /></td><td>{specLabel(l.k)}</td><td className="muted">{String(l.from)}</td><td><b>{String(l.to)}</b></td></tr>
                ))}
              </tbody></table></div></div>
          ) : null}
        </div>
        <div className="panel"><div className="panel-h"><h3>Timeline</h3></div><div className="panel-b"><ul className="tl">
          {x.hist.slice().reverse().map((h, i) => (
            <li key={i}><span className="b"></span><div><b>{h.a}</b></div><div className="small"><Avatar id={h.who} size={18} /> {person(h.who).name}{h.n ? ', ' + h.n : ''}</div><div className="w">{h.t}</div></li>
          ))}
        </ul></div></div>
      </div>
    </>
  );
}
