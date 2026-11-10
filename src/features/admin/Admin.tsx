import { useState } from 'react';
import { api } from '../../api';
import { Avatar, busyLabel, Loaded, person } from '../../components/ui';
import { MODULES, PEOPLE, ROLES } from '../../domain/seed';
import type { AuditEvent, RoleId } from '../../domain/types';
import { useResetDemo } from '../../state/actions';
import { useLoad } from '../../state/useLoad';

const Tick = ({ on }: { on: boolean }) => (
  <td style={{ textAlign: 'center' }}>{on ? <span style={{ color: 'var(--down)', fontWeight: 700 }} aria-label="Allowed">✓</span> : <span className="muted" aria-label="Not allowed">—</span>}</td>
);

export function Admin() {
  const [log, setLog] = useState<AuditEvent[]>([]);
  const [resetting, setResetting] = useState(false);
  const reset = useResetDemo();
  const state = useLoad(async () => setLog(await api.audit()), []);
  const roleKeys = Object.keys(ROLES) as RoleId[];
  const mods = MODULES.filter((m) => m.id !== 'home');

  const doReset = async () => {
    setResetting(true);
    await reset();
    setLog(await api.audit().catch(() => []));
    setResetting(false);
  };

  return (
    <Loaded state={state} text="Loading users and audit trail">{() => (
      <>
        <div className="page-head"><div className="t"><h1>Admin</h1><p>Who can see what. Costing data is confidential, so access is role-based and every change is logged.</p></div>
          <button className="btn danger" onClick={doReset} disabled={resetting}>{busyLabel(resetting, 'Reset demo data', 'Resetting')}</button></div>
        <div className="grid g2">
          <div className="panel"><div className="panel-h"><h3>Users</h3><span className="chip">{Object.keys(PEOPLE).length}</span></div><div className="panel-b" style={{ overflowX: 'auto' }}><table className="tbl"><tbody>
            {Object.values(PEOPLE).map((p) => (
              <tr key={p.id}><td><Avatar id={p.id} size={28} /></td><td><b>{p.name}</b><div className="small muted">{p.title}</div></td><td><span className="chip">{ROLES[p.role].label}</span></td><td className="r small muted">Password + SSO</td></tr>
            ))}
          </tbody></table></div></div>
          <div className="panel"><div className="panel-h"><h3>Permissions by role</h3></div><div className="panel-b" style={{ overflowX: 'auto' }}><table className="tbl">
            <thead><tr><th>Module</th>{roleKeys.map((k) => <th key={k} style={{ textAlign: 'center' }}>{ROLES[k].label}</th>)}</tr></thead>
            <tbody>
              {mods.map((m) => <tr key={m.id}><td>{m.label}</td>{roleKeys.map((k) => <Tick key={k} on={ROLES[k].modules.includes(m.id)} />)}</tr>)}
              <tr><td>Edit spec sheet</td>{roleKeys.map((k) => <Tick key={k} on={k === 'rnd'} />)}</tr>
              <tr><td>Approve spec</td>{roleKeys.map((k) => <Tick key={k} on={k === 'lead'} />)}</tr>
            </tbody></table></div></div>
        </div>
        <div className="panel" style={{ marginTop: 16 }}><div className="panel-h"><h3>Audit trail</h3><span className="chip">{log.length} events</span></div><div className="panel-b" style={{ overflowX: 'auto' }}><table className="tbl">
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Record</th></tr></thead>
          <tbody>{log.map((a, i) => <tr key={i}><td className="small num">{a.t}</td><td><Avatar id={a.who} size={22} /> {person(a.who).name}</td><td>{a.a}</td><td className="small">{a.obj}</td></tr>)}</tbody>
        </table></div></div>
      </>
    )}</Loaded>
  );
}
