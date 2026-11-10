import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import { busyLabel, Loaded, StatusPill } from '../../components/ui';
import { SPEC_LOCKED, specRows } from '../../domain/engine';
import { canEditSpec } from '../../domain/permissions';
import { MODELS, ROLES, SPEC_TEMPLATE } from '../../domain/seed';
import type { Request } from '../../domain/types';
import { useSession, useUser } from '../../state/session';
import { useToast } from '../../state/toasts';
import { useLoad } from '../../state/useLoad';

const model = (id: string) => MODELS.find((m) => m.id === id)!;

export function SpecSheet() {
  const { id = '' } = useParams();
  const { data, refresh } = useSession();
  const state = useLoad(() => refresh('requests'), [id]);
  return (
    <Loaded state={state} text="Loading spec sheet">{() => {
      const x = data.requests.find((r) => r.id === id);
      if (!x) return <div className="empty">Request not found.</div>;
      return <Sheet key={x.id} x={x} />;
    }}</Loaded>
  );
}

function Sheet({ x }: { x: Request }) {
  const u = useUser();
  const { refresh } = useSession();
  const toast = useToast();
  const nav = useNavigate();
  const m = model(x.model), role = u.role;
  const editable = canEditSpec(u, x);
  const seeInternal = role === 'costing';
  const rows = specRows(seeInternal);
  const all = specRows(true);
  const total = all.length, cust = all.filter((r) => !r.internal).length;
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'save' | 'submit' | null>(null);
  const n = Object.keys(draft).length;

  const edit = (k: string, v: string) => setDraft((d) => {
    const next = { ...d };
    if (v !== String(x.spec[k])) next[k] = v; else delete next[k];
    return next;
  });
  const save = async () => {
    setBusy('save');
    try {
      await api.saveSpec(x.id, draft);
      await refresh('requests', 'audit');
      toast(n + ' change' + (n > 1 ? 's' : '') + ' saved and logged');
      setDraft({});
    } catch (e) { toast((e as Error).message, true); }
    setBusy(null);
  };
  const submit = async () => {
    setBusy('submit');
    try {
      if (n) await api.saveSpec(x.id, draft);
      await api.submitSpec(x.id);
      await refresh('requests', 'audit');
      toast('Submitted. The team lead has been notified.');
      nav('/requests/' + x.id);
    } catch (e) { toast((e as Error).message, true); setBusy(null); }
  };

  let no = 0;
  return (
    <>
      <div className="page-head">
        <div className="t"><div className="crumbs"><Link to="/requests">Requests</Link> / <Link to={'/requests/' + x.id}>{x.id}</Link> / Spec sheet</div><h1>Spec sheet: {m.code}</h1>
          <p>{m.name}. {total} rows internally; {cust} rows go to the customer. Rows marked internal are stripped automatically from the customer sheet.</p></div>
        <div className="row-x"><StatusPill s={x.status} />
          {editable ? <>
            <button className="btn" id="specSave" onClick={save} disabled={!n || !!busy}>{busyLabel(busy === 'save', n ? 'Save ' + n + ' change' + (n > 1 ? 's' : '') : 'Save changes', 'Saving')}</button>
            <button className="btn primary" onClick={submit} disabled={!!busy}>{busyLabel(busy === 'submit', 'Submit for approval', 'Submitting')}</button>
          </> : null}
          {role === 'lead' && x.status === 'SUBMITTED' ? <button className="btn" onClick={() => nav('/requests/' + x.id)}>Approve or return</button> : null}
          {role === 'costing' && ['APPROVED', 'COSTING', 'COSTED', 'SENT'].includes(x.status) ? <button className="btn primary" onClick={() => nav('/costing/' + x.id)}>Open costing</button> : null}
        </div>
      </div>
      {!editable
        ? <div className="note" style={{ marginBottom: 12 }}>{role === 'rnd' ? 'This spec is read-only: it is not assigned to you, or it has already been submitted.' : 'Read-only for ' + ROLES[role].label + '. Only the assigned R&D engineer can edit specifications.'}</div>
        : <div className="note" style={{ marginBottom: 12 }}>Edit any field. Changed fields turn copper; saving writes each change to the audit log.</div>}
      <div className="panel"><div className="panel-b">
        {SPEC_TEMPLATE.map(([sec]) => {
          const rs = rows.filter((r) => r.sec === sec);
          if (!rs.length) return null;
          return (
            <div className="spec-sec" key={sec}>
              <h4>{sec} {sec.startsWith('Internal') ? <span className="chip warn">Costing only</span> : null}</h4>
              {rs.map((rw) => {
                no++;
                const ro = !(editable && !SPEC_LOCKED.test(rw.k));
                const val = rw.k in draft ? draft[rw.k] : String(x.spec[rw.k] ?? '');
                return (
                  <div className={'spec-row ' + (rw.internal ? 'internal' : '')} key={rw.k}>
                    <span className="no num">{no}</span>
                    <label htmlFor={'spec-' + rw.k}>{rw.label}</label>
                    <input id={'spec-' + rw.k} data-k={rw.k} value={val} readOnly={ro} className={rw.k in draft ? 'changed' : undefined}
                      onChange={ro ? undefined : (e) => edit(rw.k, e.target.value)} />
                    <span className={'x small ' + (rw.internal ? '' : 'muted')}>{rw.internal ? 'Internal only' : 'Customer sheet'}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div></div>
    </>
  );
}
