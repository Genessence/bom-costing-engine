import { useState } from 'react';
import { COMMODITIES, LOGIN_CARDS, MODELS, PEOPLE, ROLES, SEED_VERSIONS } from '../../domain/seed';
import { fmt } from '../../domain/format';
import { Avatar } from '../../components/ui';
import { useSession } from '../../state/session';
import { useToast } from '../../state/toasts';

export function Login() {
  const { login, data } = useSession();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const go = async (id: string) => {
    if (busy) return;
    setBusy(id);
    try {
      const u = await login(id);
      toast('Signed in as ' + u.name + ', ' + ROLES[u.role].label);
    } catch (e) {
      toast((e as Error).message, true);
      setBusy(null);
    }
  };
  const cu = COMMODITIES.find((c) => c.code === 'CU')!;
  const versions = data.versions.length || SEED_VERSIONS.length;
  return (
    <div className="login">
      <div className="login-art"><div className="fins"></div>
        <div className="brand"><span className="mark" aria-hidden="true"></span><div><div className="brand-name">ChassisIQ</div><div className="brand-for">Cost &amp; specification studio, prepared for Amber Enterprises</div></div></div>
        <div className="login-hero"><h1>Every quote, traceable to the gram.</h1>
          <p>From a brand's spec request to a priced, versioned customer sheet. Chassis base cost plus exclusive parts, re-priced live as copper, aluminium and the rupee move.</p></div>
        <div className="login-stack"><div><b>{MODELS.length}</b>models in the demo</div><div><b>{versions}</b>quote versions since 2025</div><div><b>{fmt.n(cu.cur)}</b>LME copper, USD/MT</div></div>
      </div>
      <main className="login-pick">
        <h2>Sign in as</h2>
        <p className="sub small" style={{ margin: '0 0 8px' }}>Each person sees only what their role allows. You can switch user at any time from the top bar.</p>
        {LOGIN_CARDS.map((id) => {
          const p = PEOPLE[id];
          return (
            <button key={id} className="role-card" onClick={() => go(id)} aria-busy={busy === id}>
              <Avatar id={id} size={44} />
              <span><b>{p.name}</b> <span className="muted small">{p.title}</span><div className="can">{ROLES[p.role].can}</div></span>
              <span className="go" aria-hidden="true">›</span>
            </button>
          );
        })}
        <div className="row-x small" style={{ marginTop: 4 }}>
          <span className="muted">Also sign in as</span>
          {Object.keys(PEOPLE).filter((id) => !LOGIN_CARDS.includes(id)).map((id) => (
            <button key={id} className="chip" onClick={() => go(id)} style={{ cursor: 'pointer' }}>{PEOPLE[id].name}, {ROLES[PEOPLE[id].role].label}</button>
          ))}
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>Demo build. Commodity rates mirror AICM on 06 Nov 2026; chassis BOMs, prices and quotes are illustrative until Amber shares real data.</p>
      </main>
    </div>
  );
}
