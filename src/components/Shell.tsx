import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { canOpen, queueFor } from '../domain/permissions';
import { MODULES } from '../domain/seed';
import { useSession, useUser } from '../state/session';
import { ApiInspector } from './ApiInspector';
import { CommandPalette } from './CommandPalette';
import { RoleSwitch } from './RoleSwitch';
import { SourceSwitch } from './SourceSwitch';
import { Ticker } from './Ticker';

export function Shell({ children }: { children: ReactNode }) {
  const u = useUser();
  const { data } = useSession();
  const nav = useNavigate();
  const loc = useLocation();
  const [palette, setPalette] = useState(false);
  const seg = loc.pathname.split('/')[1] || 'home';
  const active = seg === 'customer' ? 'history' : seg;

  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  useEffect(() => { setPalette(false); }, [loc.pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const queue = data.requests.filter((r) => queueFor(u, r)).length;
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <>
      <a href="#view" className="sr-only" onClick={(e) => { e.preventDefault(); document.getElementById('view')?.focus(); }}>Skip to content</a>
      <div className="demo-band">Demo environment. Rates mirror AICM (06 Nov 2026); BOMs, prices and quotes are illustrative.</div>
      <header className="deck" id="deck">
        <div className="deck-top">
          <div className="brand"><span className="mark" aria-hidden="true"></span><div><div className="brand-name">ChassisIQ</div><div className="brand-for">for Amber Enterprises</div></div></div>
          <button className="deck-search" onClick={() => setPalette(true)} aria-keyshortcuts="Control+K Meta+K">
            <span aria-hidden="true">⌕</span><span>Search requests, models, quotes</span><kbd>{isMac ? '⌘ K' : 'Ctrl K'}</kbd>
          </button>
          <SourceSwitch />
          <RoleSwitch />
        </div>
        <Ticker />
        <nav className="tabs" aria-label="Modules">
          {MODULES.map((m) => {
            const ok = canOpen(u.role, m.id);
            const cnt = m.id === 'requests' ? queue : 0;
            return (
              <button key={m.id} className={'tab ' + (ok ? '' : 'locked ') + (active === m.id ? 'on' : '')} data-mod={m.id}
                aria-current={active === m.id ? 'page' : undefined} onClick={() => nav('/' + m.id)}
                aria-label={ok ? undefined : m.label + ' (restricted)'}>
                {ok ? '' : '🔒 '}{m.label}{cnt ? <span className="cnt" aria-label={cnt + ' need your action'}>{cnt}</span> : null}
              </button>
            );
          })}
        </nav>
      </header>
      <main className="view" id="view" tabIndex={-1}>{children}</main>
      <ApiInspector />
      {palette ? <CommandPalette onClose={() => setPalette(false)} /> : null}
    </>
  );
}
