import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api';
import { busyLabel } from '../../components/ui';
import { specFor, specRows } from '../../domain/engine';
import { fmt } from '../../domain/format';
import { canOpen } from '../../domain/permissions';
import { MODELS } from '../../domain/seed';
import type { Version } from '../../domain/types';
import { useSession, useUser } from '../../state/session';
import { useToast } from '../../state/toasts';
import { useUiState } from '../../state/uiMemory';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const model = (id: string) => MODELS.find((m) => m.id === id)!;

export function CustomerSheet() {
  const { verId = '' } = useParams();
  const { data } = useSession();
  const v = data.versions.find((x) => x.id === verId);
  if (!v) return <div className="empty">Version not found.</div>;
  return <Sheet key={v.id + v.status} v={v} />;
}

function Sheet({ v }: { v: Version }) {
  const u = useUser();
  const { data, refresh } = useSession();
  const toast = useToast();
  const [view, setView] = useUiState<'customer' | 'internal'>('custView', () => 'customer');
  const [to, setTo] = useState(v.sentTo);
  const [sending, setSending] = useState(false);
  const toRef = useRef<HTMLInputElement>(null);
  const m = model(v.model), req = data.requests.find((r) => r.id === v.req), spec = req ? req.spec : specFor(m);
  const all = specRows(true), custRows = all.filter((x) => !x.internal);
  const rows = view === 'customer' ? custRows : all;

  const send = async () => {
    const addr = to.trim();
    if (!EMAIL.test(addr)) { toast('Enter a valid customer email address', true); toRef.current?.focus(); return; }
    setSending(true);
    try {
      await api.sendMail(v.id, addr);
      await refresh('versions', 'requests', 'audit');
      toast('Quotation sent to ' + addr + ' and logged');
    } catch (e) { toast((e as Error).message, true); setSending(false); }
  };

  return (
    <>
      <div className="page-head">
        <div className="t"><div className="crumbs"><Link to="/history">Quote history</Link> / {m.code} v{v.v}</div><h1>Customer sheet: {m.name}</h1>
          <p>Derived automatically from the internal costing sheet. The same {all.length - custRows.length} internal rows are always removed, so the customer sheet never needs to be built by hand.</p></div>
        <div className="row-x"><div className="seg" role="group" aria-label="Sheet view">
          <button className={view === 'customer' ? 'on' : ''} aria-pressed={view === 'customer'} onClick={() => setView('customer')}>Customer view, {custRows.length} rows</button>
          <button className={view === 'internal' ? 'on' : ''} aria-pressed={view === 'internal'} onClick={() => setView('internal')}>Internal view, {all.length} rows</button>
        </div></div>
      </div>
      <div className="grid g-main">
        <div className="panel"><div className="panel-h"><h3>{m.brand} {m.code}, quotation v{v.v}</h3><span className="chip">{v.quarter}</span></div><div className="panel-b">
          <div className="row-x" style={{ padding: '10px 12px', background: 'var(--paper-2)', borderRadius: 8, marginBottom: 8 }}>
            <div><div className="small sub">Price per set, IDU + ODU, ex-works</div><div style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 600 }} className="num">{fmt.inr(v.total)}</div></div>
            <span className="spacer"></span><div className="small sub" style={{ textAlign: 'right' }}>Valid for {v.quarter}<br />Prices linked to commodity indices</div>
          </div>
          {rows.map((rw, i) => (
            <div key={rw.k} className={'spec-row ' + (rw.internal ? 'internal' : '')} style={{ gridTemplateColumns: '34px 1fr 1.2fr' + (view === 'internal' ? ' 110px' : '') }}>
              <span className="no num">{i + 1}</span><span>{rw.label}</span><span><b style={{ fontWeight: 500 }}>{String(spec[rw.k] || '—')}</b></span>
              {view === 'internal' ? <span className={'x small ' + (rw.internal ? '' : 'muted')}>{rw.internal ? 'Removed for customer' : 'Sent'}</span> : null}
            </div>
          ))}
        </div></div>
        <div className="grid" style={{ alignContent: 'start' }}>
          {canOpen(u.role, 'costing') ? (
            <div className="mail">
              <div className="mh"><span>From</span><b>costing@ambergroupindia.com</b><label htmlFor="mailTo" style={{ color: 'var(--ink-3)' }}>To</label>
                <input className="inp" id="mailTo" ref={toRef} value={to} onChange={(e) => setTo(e.target.value)} type="email" />
                <span>Subject</span><b>{m.brand} {m.code}: quotation v{v.v} for {v.quarter}</b></div>
              <div className="mb">{`Dear ${m.brand} sourcing team,

Please find attached our quotation for ${m.name} (${m.code}), valid for ${v.quarter}.

Price per set (IDU + ODU): ${fmt.inr(v.total)}, ex-works, linked to the ${v.basis === 'Manual' ? 'agreed' : "previous quarter's average"} copper, aluminium and USD/INR rates.

Regards,
${u.name}
Costing, Amber Enterprises`}</div>
              <span className="attach">📄 {m.code}_Quotation_v{v.v}.pdf <span className="muted">{custRows.length} rows, generated</span></span>
              <div style={{ padding: '0 16px 16px' }} className="row-x">
                {v.status === 'SENT'
                  ? <><span className="chip dark"><span className="d"></span>Sent to {v.sentTo}</span><span className="spacer"></span><button className="btn" onClick={send} disabled={sending}>{busyLabel(sending, 'Send again', 'Sending')}</button></>
                  : <><span className="small muted">Sent from the system and logged against {v.req}.</span><span className="spacer"></span><button className="btn primary" onClick={send} disabled={sending}>{busyLabel(sending, 'Send to customer', 'Sending')}</button></>}
              </div>
            </div>
          ) : <div className="note">Only the costing team can send quotations.</div>}
          <div className="panel"><div className="panel-h"><h3>Removed for the customer</h3><span className="chip warn">{all.length - custRows.length} rows</span></div>
            <div className="panel-b small">{all.filter((x) => x.internal).map((x) => x.label).join(', ')}</div></div>
        </div>
      </div>
    </>
  );
}
