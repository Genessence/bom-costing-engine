import { useState, useSyncExternalStore } from 'react';
import { inspector } from '../api/inspector';
import { API_MODE } from '../api';

/* Floating API pill (last call, busy pulse) + the request log panel. */
export function ApiInspector() {
  const { log, busy } = useSyncExternalStore(inspector.subscribe, inspector.getState);
  const [open, setOpen] = useState(false);
  const last = log[0];
  const backend = API_MODE === 'mock' ? 'mock backend' : 'HTTP backend';
  const label = busy > 0 ? 'Calling API…' : last ? `${last.method} ${last.path.split('?')[0]}  ${last.status}  ${last.ms}ms` : (API_MODE === 'mock' ? 'Mock API ready' : 'API ready');
  return (
    <>
      <button className={'api-pill' + (busy > 0 ? ' busy' : '')} id="apiPill" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="apiPanel">
        <i></i><span id="apiTxt" style={{ whiteSpace: 'pre' }}>{label}</span>
      </button>
      <div className={'api-panel' + (open ? '' : ' hide')} id="apiPanel" role="log" aria-label="API requests">
        {open ? (
          <>
            <div className="hd">
              <b style={{ color: '#fff' }}>API requests</b>
              <span style={{ color: '#8FB0A3' }}>{log.length} calls this session, {backend}</span>
              <span className="spacer"></span>
              <button className="btn sm" onClick={() => setOpen(false)} style={{ background: 'transparent', color: '#CFE3DA', borderColor: 'rgba(255,255,255,.2)' }}>Close</button>
            </div>
            {log.length ? log.map((l) => (
              <div className="api-row" key={l.id}>
                <span className={'m ' + l.method}>{l.method}</span>
                <span className="p" title={l.err ? l.path + ' — ' + l.err : l.path}>{l.path}</span>
                <span className="s" style={l.status >= 400 ? { color: '#F08A78' } : undefined}>{l.status}</span>
                <span className="ms">{l.ms} ms</span>
              </div>
            )) : <div className="api-row"><span></span><span className="p">No calls yet</span></div>}
          </>
        ) : null}
      </div>
    </>
  );
}
