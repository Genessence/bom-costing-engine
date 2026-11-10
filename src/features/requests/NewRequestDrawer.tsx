import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { Drawer } from '../../components/Drawer';
import { busyLabel } from '../../components/ui';
import { MODELS } from '../../domain/seed';
import type { Priority } from '../../domain/types';
import { useSession } from '../../state/session';
import { useToast } from '../../state/toasts';

export function NewRequestDrawer({ onClose }: { onClose(): void }) {
  const { refresh } = useSession();
  const toast = useToast();
  const nav = useNavigate();
  const [model, setModel] = useState(MODELS[0].id);
  const [via, setVia] = useState('Email from brand sourcing team');
  const [due, setDue] = useState('2026-12-02');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [note, setNote] = useState('Q4 pricing for the 1.5 TR inverter variant. Customer wants the brand fascia and Wi-Fi option costed separately.');
  const [attached, setAttached] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const r = await api.createRequest({ model, via, due, priority, note });
      await refresh('requests', 'audit');
      onClose();
      toast('Logged ' + r.id + '. Team leads have been notified.');
      nav('/requests/' + r.id);
    } catch (e) {
      toast((e as Error).message, true);
      setBusy(false);
    }
  };

  return (
    <Drawer title="Log a customer request" onClose={onClose}
      footer={<div className="row-x"><span className="spacer"></span><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save} disabled={busy}>{busyLabel(busy, 'Log request', 'Logging')}</button></div>}>
      <div className="note">Logged requests go to the team leads (Navdeep, Mahendra) for allocation to an R&amp;D engineer.</div>
      <div className="field"><label htmlFor="nr-model">Brand and model</label>
        <select className="sel" id="nr-model" value={model} onChange={(e) => setModel(e.target.value)}>
          {MODELS.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
        </select></div>
      <div className="grid g2">
        <div className="field"><label htmlFor="nr-via">Received via</label><input className="inp" id="nr-via" value={via} onChange={(e) => setVia(e.target.value)} /></div>
        <div className="field"><label htmlFor="nr-due">Reply due by</label><input className="inp" type="date" id="nr-due" value={due} onChange={(e) => setDue(e.target.value)} /></div>
      </div>
      <div className="field"><label id="nr-pri-l">Priority</label>
        <div className="seg" id="nr-pri" role="radiogroup" aria-labelledby="nr-pri-l">
          {(['High', 'Medium', 'Low'] as Priority[]).map((p) => <button key={p} className={priority === p ? 'on' : ''} role="radio" aria-checked={priority === p} onClick={() => setPriority(p)}>{p}</button>)}
        </div></div>
      <div className="field"><label htmlFor="nr-note">What the customer asked for</label><textarea className="inp" id="nr-note" rows={4} value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <button type="button" className="upload" id="nr-att" onClick={() => setAttached(true)}>
        {attached ? <>📎 Customer_spec_request.pdf <span className="muted small">(312 KB, attached)</span></> : "Attach the customer's email or spec PDF"}
      </button>
    </Drawer>
  );
}
