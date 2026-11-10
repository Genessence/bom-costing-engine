/* Small shared primitives: avatar, status pill, brand dot, loader, API-error note, locked view. */
import type { ReactNode } from 'react';
import { BRAND_TONE, MODULES, PEOPLE, ROLES, STATUS } from '../domain/seed';
import type { ModuleId, RoleId, Status } from '../domain/types';
import type { LoadState } from '../state/useLoad';

export const person = (id: string | null | undefined) => (id && PEOPLE[id]) || { id: '', name: '—', tone: '#999', role: 'kam' as RoleId, title: '' };

export function Avatar({ id, size = 28 }: { id: string | null | undefined; size?: number }) {
  const p = person(id);
  const ini = p.name.split(' ').map((x) => x[0]).join('').slice(0, 2);
  return (
    <span className="av" style={{ width: size, height: size, background: p.tone, fontSize: size < 30 ? 11 : 13 }} title={p.name} aria-label={p.name} role="img">
      {ini}
    </span>
  );
}

export const StatusPill = ({ s }: { s: Status }) => <span className={'st st-' + s}><i></i>{STATUS[s].label}</span>;

export const BrandDot = ({ b }: { b: string }) => <span className="mat"><i style={{ background: BRAND_TONE[b] }}></i>{b}</span>;

export const Swatch = ({ color, children }: { color: string; children: ReactNode }) => (
  <span className="mat"><i style={{ background: color }}></i>{children}</span>
);

export const Spinner = () => <span className="sp" aria-hidden="true"></span>;

export function Loader({ text = 'Loading' }: { text?: string }) {
  return <div className="empty"><span className="btn ghost" style={{ pointerEvents: 'none' }}><Spinner />{text}…</span></div>;
}

export function ApiErrorNote({ message }: { message: string }) {
  return (
    <div className="lock-note" role="alert"><div className="ic">!</div><div><b>{message}</b><div className="small">The mock API rejected this request.</div></div></div>
  );
}

/** Renders loader / error for a LoadState, otherwise the children. */
export function Loaded({ state, text, children }: { state: LoadState; text: string; children: () => ReactNode }) {
  if (state.status === 'loading') return <Loader text={text} />;
  if (state.status === 'error') return <ApiErrorNote message={state.message} />;
  return <>{children()}</>;
}

export function LockedView({ mod, role }: { mod: ModuleId; role: RoleId }) {
  const m = MODULES.find((x) => x.id === mod);
  return (
    <>
      <div className="page-head"><div className="t"><h1>{m ? m.label : 'Restricted'}</h1></div></div>
      <div className="lock-note">
        <div className="ic" aria-hidden="true">🔒</div>
        <div>
          <b>{ROLES[role].label} accounts can't open {m ? m.label.toLowerCase() : 'this page'}.</b>
          <div className="small">Costing data is confidential. Access is role-based: {ROLES[role].can.toLowerCase()}. Switch user to see this module.</div>
        </div>
      </div>
    </>
  );
}

/** Button that shows a spinner + label while an async action runs. */
export function busyLabel(busy: boolean, idle: ReactNode, working: string): ReactNode {
  return busy ? <><Spinner />{working}</> : idle;
}
