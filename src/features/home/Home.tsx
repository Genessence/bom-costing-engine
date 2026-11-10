import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, BrandDot, Loaded, person, StatusPill } from '../../components/ui';
import { LineChart } from '../../components/charts/LineChart';
import { compute } from '../../domain/engine';
import { fmt } from '../../domain/format';
import { queueFor } from '../../domain/permissions';
import { COLORS, COMMODITIES, MODELS } from '../../domain/seed';
import type { RoleId, Status } from '../../domain/types';
import { useSession, useUser } from '../../state/session';
import { useLoad } from '../../state/useLoad';
import { NewRequestDrawer } from '../requests/NewRequestDrawer';

const GREET: Record<RoleId, string> = {
  kam: 'Requests you logged and what has gone back to brands.',
  lead: 'Allocate new requests and clear specs waiting for your approval.',
  rnd: 'Spec sheets assigned to you.',
  costing: 'Approved specs ready for costing, and commodity moves that change your quotes.',
  admin: 'Users, access and the audit trail.',
};
const STAGES: [string, Status[]][] = [['Logged', ['NEW']], ['With R&D', ['ALLOCATED', 'RND', 'RETURNED']], ['Awaiting approval', ['SUBMITTED']], ['Approved', ['APPROVED']], ['Costing', ['COSTING']], ['Ready to send', ['COSTED']], ['Sent', ['SENT']]];
const model = (id: string) => MODELS.find((m) => m.id === id)!;

export function Home() {
  const u = useUser();
  const { data, snap, mode, refresh } = useSession();
  const nav = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const state = useLoad(() => refresh('requests', 'audit'), []);
  const canLog = ['kam', 'costing', 'lead'].includes(u.role);

  return (
    <Loaded state={state} text="Loading your workspace">{() => {
      const reqs = data.requests;
      const mine = reqs.filter((r) => queueFor(u, r));
      const cu = COMMODITIES.find((c) => c.code === 'CU')!;
      const rows = u.role === 'costing'
        ? MODELS.map((m) => { const c = compute(m, snap); return { m, total: c.total, cuShare: c.byMat.CU / c.material }; }).sort((a, b) => b.cuShare - a.cuShare)
        : [];
      return (
        <>
          <div className="page-head">
            <div className="t"><div className="crumbs">Wednesday, 11 November 2026</div><h1>Good morning, {u.name.split(' ')[0]}</h1><p>{GREET[u.role]}</p></div>
            {canLog ? <button className="btn primary" onClick={() => setDrawer(true)}>Log a customer request</button> : null}
          </div>
          <div className="panel" style={{ padding: 4, marginBottom: 16 }}>
            <div className="pipe">
              {STAGES.map(([l, s]) => (
                <div key={l} className={'stg ' + (s.some((x) => mine.find((m) => m.status === x)) ? 'hot' : '')}>
                  <b className="num">{reqs.filter((x) => s.includes(x.status)).length}</b><span>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid g-main">
            <div className="grid" style={{ alignContent: 'start' }}>
              <div className="panel">
                <div className="panel-h"><h3>Needs your action</h3><span className={'chip ' + (mine.length ? 'warn' : 'mint')}>{mine.length} open</span></div>
                <div className="panel-b">
                  {mine.length ? (
                    <table className="tbl"><tbody>
                      {mine.map((x) => { const m = model(x.model); return (
                        <tr key={x.id} className="click" tabIndex={0} onClick={() => nav('/requests/' + x.id)} onKeyDown={(e) => { if (e.key === 'Enter') nav('/requests/' + x.id); }}>
                          <td style={{ width: 120 }}><b className="num">{x.id}</b></td>
                          <td>{m.name}<div className="small muted">{x.via}</div></td>
                          <td><StatusPill s={x.status} /></td>
                          <td className="r small muted">Due {x.due}</td>
                        </tr>); })}
                    </tbody></table>
                  ) : <div className="empty">Nothing waiting on you. New requests appear here as soon as they are logged.</div>}
                </div>
              </div>
              {u.role === 'costing' ? (
                <div className="panel">
                  <div className="panel-h"><h3>Copper exposure by model</h3><span className="chip">{mode === 'aicm' ? 'AICM, Q3 avg' : 'Manual rates'}</span></div>
                  <div className="panel-b">
                    <table className="tbl"><thead><tr><th>Model</th><th className="r">Cost per set</th><th>Copper share of material</th></tr></thead><tbody>
                      {rows.map((x) => (
                        <tr key={x.m.id} className="click" tabIndex={0} onClick={() => nav('/library/' + x.m.id)} onKeyDown={(e) => { if (e.key === 'Enter') nav('/library/' + x.m.id); }}>
                          <td><BrandDot b={x.m.brand} /> <span className="muted small">{x.m.tr} TR, {x.m.star}★</span></td>
                          <td className="r num">{fmt.inr(x.total)}</td>
                          <td style={{ width: '42%' }}><div className="row-x"><div className="bar-track" style={{ flex: 1 }}><i style={{ width: (x.cuShare * 100 * 2.2).toFixed(0) + '%', background: 'var(--cu)' }}></i></div><span className="num small" style={{ width: 44, textAlign: 'right' }}>{(x.cuShare * 100).toFixed(1)}%</span></div></td>
                        </tr>
                      ))}
                    </tbody></table>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="grid" style={{ alignContent: 'start' }}>
              <div className="panel">
                <div className="panel-h"><h3>LME copper, quarterly average</h3><span className="chip mint"><span className="d"></span>AICM</span></div>
                <div className="panel-b">
                  <LineChart series={[{ name: 'Copper USD/MT', values: [cu.q1, cu.q2, cu.q3, cu.cur], color: COLORS.CU }]} labels={['Q1 avg', 'Q2 avg', 'Q3 avg', 'Spot 06 Nov']} h={190} label="LME copper quarterly average" mark={[2]} />
                  <p className="small sub" style={{ margin: '8px 0 0' }}>Next-quarter quotes use the last quarter's average: <b className="num">{fmt.n(cu.q3, 2)}</b> USD/MT, {fmt.pct((cu.q3 - cu.q2) / cu.q2)} on Q2.</p>
                </div>
              </div>
              <div className="panel">
                <div className="panel-h"><h3>Recent activity</h3></div>
                <div className="panel-b"><ul className="tl">
                  {data.audit.slice(0, 6).map((a, i) => (
                    <li key={i}><span className="b"></span><div><Avatar id={a.who} size={20} /> <b>{person(a.who).name}</b> {a.a.charAt(0).toLowerCase() + a.a.slice(1)}</div><div className="w">{a.obj}, {a.t}</div></li>
                  ))}
                </ul></div>
              </div>
            </div>
          </div>
          {drawer ? <NewRequestDrawer onClose={() => setDrawer(false)} /> : null}
        </>
      );
    }}</Loaded>
  );
}
