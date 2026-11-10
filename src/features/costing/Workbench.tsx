import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import { Donut } from '../../components/charts/Donut';
import { Waterfall, type WaterfallStep } from '../../components/charts/Waterfall';
import { Drawer } from '../../components/Drawer';
import { busyLabel, Loaded, person, Swatch } from '../../components/ui';
import { compute } from '../../domain/engine';
import { fmt, fmtIdx } from '../../domain/format';
import { COSTABLE_STATUSES } from '../../domain/permissions';
import {
  COLORS, COMMODITIES, EXCLUSIVES, IDU_CHASSIS, MAT_NAME, matColor, MODELS, ODU_CHASSIS, OVERHEADS, QUARTER_BASIS, STATUS, ZONE_NAME,
} from '../../domain/seed';
import type { CostLine, ExclusiveKey, MatCode, PriceMode, Request, WeightCode } from '../../domain/types';
import { useSession } from '../../state/session';
import { useToast } from '../../state/toasts';
import { useUiState } from '../../state/uiMemory';
import { useLoad } from '../../state/useLoad';
import { UnitArt } from './UnitArt';

const model = (id: string) => MODELS.find((m) => m.id === id)!;
const WEIGHT_KEYS: WeightCode[] = ['CU', 'AL', 'ST', 'PL', 'RF'];

interface WbState {
  reqId: string;
  excl: ExclusiveKey[];
  exPrice: Partial<Record<ExclusiveKey, number>>;
  priceMode: PriceMode;
  zone: string | null;
  unit: 'all' | 'IDU' | 'ODU';
}

export function Workbench() {
  const { id = '' } = useParams();
  const { data, mode, patch } = useSession();
  const x = data.requests.find((r) => r.id === id);
  const ok = !!x && (COSTABLE_STATUSES as readonly string[]).includes(x.status);
  const state = useLoad(async () => {
    if (!x || !ok) return;
    const m = model(x.model);
    const [, , com, req] = await Promise.all([
      api.chassis(m.idu), api.chassis(m.odu), api.commodities(mode), api.startCosting(x.id, mode === 'aicm' ? 'AICM' : 'Manual'),
    ]);
    patch({ com });
    if (req.status !== x.status) patch({ requests: data.requests.map((r) => (r.id === req.id ? req : r)) });
  }, [id]);

  if (!x) return <div className="empty">Request not found.</div>;
  const m = model(x.model);
  if (!ok) {
    return (
      <>
        <div className="page-head"><div className="t"><div className="crumbs"><Link to="/costing">Costing</Link> / {x.id}</div><h1>{m.name}</h1></div></div>
        <div className="lock-note"><div className="ic" aria-hidden="true">⏳</div><div><b>The spec isn't approved yet.</b><div className="small">Costing opens after the team lead approves the spec sheet. Current status: {STATUS[x.status].label}.</div></div></div>
      </>
    );
  }
  return <Loaded state={state} text="Loading chassis masters and rates">{() => <Bench x={x} />}</Loaded>;
}

function Bench({ x }: { x: Request }) {
  const { data, snap, mode, basisLabel, refresh } = useSession();
  const toast = useToast();
  const nav = useNavigate();
  const m = model(x.model);
  const fresh = (): WbState => ({ reqId: x.id, excl: m.excl.slice(), exPrice: {}, priceMode: 'lpp', zone: null, unit: 'all' });
  const [stored, setW] = useUiState<WbState>('wb', fresh);
  const w = stored.reqId === x.id ? stored : fresh();
  const upd = (p: Partial<WbState>) => setW({ ...w, ...p });
  const [drawer, setDrawer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addKey, setAddKey] = useState<ExclusiveKey | ''>('');

  const c = compute(m, snap, { excl: w.excl, exPrice: w.exPrice, priceMode: w.priceMode });
  const cAlt = compute(m, snap, { excl: w.excl, exPrice: w.exPrice, priceMode: w.priceMode === 'lpp' ? 'avg' : 'lpp' });
  const vers = data.versions.filter((v) => v.model === m.id).sort((a, b) => a.v - b.v), last = vers[vers.length - 1];
  const lines = c.lines.filter((l) => (!w.zone || l.unit + ':' + l.zone === w.zone) && (w.unit === 'all' || l.unit === w.unit));
  const R = c.R;
  const rateTxt = (l: CostLine) => l.type === 'mat' ? `${fmt.n(l.kg, 2)} kg × ${fmt.inr(R[l.m as MatCode], 1)}/kg`
    : l.type === 'cp' ? `Landed ${fmt.inr(R.CP)} × ${ODU_CHASSIS[m.odu].cp}`
      : (w.priceMode === 'lpp' ? 'LPP ' : 'SAP avg ') + fmt.inr(w.priceMode === 'lpp' ? l.lpp : l.avg);
  const steps: WaterfallStep[] = [
    { label: 'Chassis common parts', value: c.common, kind: 'add', color: '#22564A' },
    { label: 'Exclusive parts', value: c.exclusive, kind: 'add', color: COLORS.CU },
    { label: 'Assembly & testing', value: c.assembly, kind: 'add', color: '#7A8781' },
    { label: 'Freight & warranty', value: c.freight + c.warranty, kind: 'add', color: '#7A8781' },
    { label: 'Contingency', value: c.contingency, kind: 'add', color: '#C79A1E' },
    { label: 'Margin', value: c.margin, kind: 'add', color: '#1E9C94' },
    { label: 'Quote per set', value: c.total, kind: 'total' },
  ];
  const wts = c.weights;
  const catalogue = (Object.keys(EXCLUSIVES) as ExclusiveKey[]).filter((k) => !w.excl.includes(k));
  const addSel = addKey && catalogue.includes(addKey) ? addKey : catalogue[0];
  const delta = last ? c.total - last.total : 0;
  const totalW = WEIGHT_KEYS.reduce((a, k) => a + wts[k], 0);

  const pickZone = (z: string) => upd({ zone: z || null, ...(z ? { unit: 'all' as const } : {}) });
  const setExPrice = (k: ExclusiveKey, raw: string): boolean => {
    const v = parseFloat(raw);
    if (isNaN(v) || v < 0) { toast('Enter a price of zero or more', true); return false; }
    upd({ exPrice: { ...w.exPrice, [k]: v } });
    toast('Price updated for this quote');
    return true;
  };
  const saveVersion = async (note: string) => {
    setSaving(true);
    try {
      const v = await api.saveVersion(x.id, {
        snap, excl: w.excl.slice(), total: c.total, material: c.material,
        source: mode === 'aicm' ? 'AICM' : 'Manual', basis: mode === 'aicm' ? 'Q3-2026' : 'Manual', note,
      });
      await refresh('requests', 'versions', 'audit');
      setDrawer(false);
      toast('Saved v' + v.v + ' at ' + fmt.inr(v.total) + ' per set');
      nav('/customer/' + v.id);
    } catch (e) { toast((e as Error).message, true); setSaving(false); }
  };

  return (
    <>
      <div className="page-head">
        <div className="t"><div className="crumbs"><Link to="/costing">Costing</Link> / <Link to={'/requests/' + x.id}>{x.id}</Link></div><h1>{m.name}</h1>
          <p>{m.code}. Chassis {IDU_CHASSIS[m.idu].label} and {ODU_CHASSIS[m.odu].label}, priced for {QUARTER_BASIS.quoteFor}.</p></div>
        <div className="row-x">
          <button className="btn" onClick={() => nav('/spec/' + x.id)}>View spec</button>
          <button className="btn" onClick={() => nav('/simulation')}>Simulate rates</button>
          <button className="btn primary" onClick={() => setDrawer(true)}>Save as version {vers.length + 1}</button>
        </div>
      </div>

      <section className="cost-hero">
        <div className="l">
          <span className={'pill ' + (mode === 'manual' ? 'manual' : '')}><i></i>{basisLabel}</span>
          <div style={{ marginTop: 14, color: '#9DB8AC', fontSize: 13 }}>Quote price per set (IDU + ODU)</div>
          <div className="big num" id="wbTotal" aria-live="polite">{fmt.inr(c.total)}<small>/set</small></div>
          {last ? <div style={{ marginTop: 8, fontSize: 13, color: delta > 0 ? '#F08A78' : '#6EDDB4' }}>{delta > 0 ? '▲' : '▼'} {fmt.inr(Math.abs(delta))} ({fmt.pct(delta / last.total)}) vs v{last.v} sent {last.on}, {last.quarter}</div> : null}
          <div className="meta">
            <div><b className="num">{fmt.inr(c.material)}</b>Material</div>
            <div><b className="num">{c.lines.length} of {c.lines.length + c.exLines.length}</b>Parts from chassis master ({Math.round((c.lines.length / (c.lines.length + c.exLines.length)) * 100)}%)</div>
            <div><b className="num">{fmt.inr(c.exclusive)}</b>Exclusive ({w.excl.length} items)</div>
            <div><b className="num">{fmt.n(wts.CU, 2)} kg</b>Copper per set</div>
          </div>
        </div>
        <div className="r">
          <UnitArt c={c} focus={w.zone} onPick={pickZone} />
          <div className="art-legend">
            {(['CU', 'AL', 'PL', 'ST', 'CP', 'RF'] as MatCode[]).map((k) => <Swatch key={k} color={COLORS[k]}>{MAT_NAME[k]}</Swatch>)}
            <Swatch color="#9AA8A1">Bought-out</Swatch>
            {w.zone ? <button className="btn sm" onClick={() => pickZone('')} style={{ marginLeft: 'auto', background: 'transparent', color: '#CFE3DA', borderColor: 'rgba(255,255,255,.2)' }}>Clear filter</button>
              : <span style={{ marginLeft: 'auto' }}>Click a part to filter</span>}
          </div>
        </div>
      </section>

      <div className="grid g-main" style={{ marginTop: 16 }}>
        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="panel"><div className="panel-h"><h3>How the price builds up</h3><span className="small muted">Hover a bar for values</span></div>
            <div className="panel-b"><Waterfall steps={steps} w={680} h={260} /></div></div>

          <div className="panel">
            <div className="panel-h"><h3>Chassis common parts</h3>
              <div className="seg" role="group" aria-label="Unit">
                {([['all', 'Both units'], ['IDU', 'Indoor'], ['ODU', 'Outdoor']] as const).map(([k, l]) => (
                  <button key={k} className={w.unit === k ? 'on' : ''} aria-pressed={w.unit === k} onClick={() => upd({ unit: k, zone: null })}>{l}</button>
                ))}
              </div>
            </div>
            <div className="panel-b" style={{ overflowX: 'auto' }}>
              <p className="small sub" style={{ marginTop: 0 }}>{w.zone ? 'Filtered to ' + w.zone.split(':')[0] + ' ' + ZONE_NAME[w.zone.split(':')[1]] + '. ' : ''}Pulled from the {m.idu} and {m.odu} chassis masters. Material lines re-price from the commodity master; bought-outs use the latest purchase price.</p>
              <table className="tbl"><thead><tr><th>Part</th><th>Unit</th><th>Material</th><th>Basis</th><th className="r">Cost</th></tr></thead><tbody>
                {lines.map((l) => (
                  <tr key={l.pc}>
                    <td><b>{l.name}</b><div className="small muted">{l.pc}</div></td>
                    <td><span className="chip">{l.unit}</span></td>
                    <td><Swatch color={l.type === 'bo' ? '#9AA8A1' : matColor(l.type === 'cp' ? 'CP' : l.m!)}>{l.type === 'bo' ? 'Bought-out' : MAT_NAME[l.type === 'cp' ? 'CP' : (l.m as MatCode)]}</Swatch></td>
                    <td className="small sub">{rateTxt(l)}</td>
                    <td className="r num">{fmt.inr(l.cost)}</td>
                  </tr>
                ))}
              </tbody><tfoot><tr><td colSpan={4}>{lines.length === c.lines.length ? 'Chassis common parts total' : 'Filtered subtotal'}</td><td className="r num">{fmt.inr(lines.reduce((a, b) => a + b.cost, 0))}</td></tr></tfoot></table>
            </div>
          </div>

          <div className="panel"><div className="panel-h"><h3>Exclusive parts for {m.brand}</h3><span className="chip">{w.excl.length} items</span></div>
            <div className="panel-b" style={{ overflowX: 'auto' }}>
              <p className="small sub" style={{ marginTop: 0 }}>Parts that differ from the common chassis. Add or remove items; bought-out prices can be edited for this quote.</p>
              <table className="tbl"><thead><tr><th>Part</th><th>Type</th><th className="r">Price</th><th className="r">Effect</th><th></th></tr></thead><tbody>
                {c.exLines.map((e) => (
                  <tr key={e.k}>
                    <td><b>{e.name}</b></td>
                    <td className="small">{e.type === 'mat' ? <Swatch color={matColor(e.m!)}>{fmt.n(e.kg, 2)} kg {MAT_NAME[e.m as MatCode].toLowerCase()}</Swatch> : 'Bought-out'}</td>
                    <td className="r">{e.type === 'bo'
                      ? <PriceCell key={e.k + ':' + Math.round(Math.abs(e.cost))} k={e.k} name={e.name} value={Math.round(Math.abs(e.cost))} onCommit={setExPrice} />
                      : <span className="small muted">From rates</span>}</td>
                    <td className={'r num ' + (e.sign < 0 ? 'diff-dn' : '')}>{e.sign < 0 ? '− ' : '+ '}{fmt.inr(Math.abs(e.cost))}</td>
                    <td className="r"><button className="btn sm ghost" aria-label={'Remove ' + e.name} onClick={() => { upd({ excl: w.excl.filter((k) => k !== e.k) }); toast('Removed ' + EXCLUSIVES[e.k].name.toLowerCase()); }}>Remove</button></td>
                  </tr>
                ))}
              </tbody><tfoot><tr><td colSpan={3}>Exclusive parts net</td><td className="r num">{fmt.inr(c.exclusive)}</td><td></td></tr></tfoot></table>
              {catalogue.length ? (
                <div className="row-x" style={{ marginTop: 10 }}>
                  <select className="sel" id="exAdd" aria-label="Exclusive part to add" style={{ maxWidth: 360 }} value={addSel} onChange={(e) => setAddKey(e.target.value as ExclusiveKey)}>
                    {catalogue.map((k) => <option key={k} value={k}>{EXCLUSIVES[k].name}</option>)}
                  </select>
                  <button className="btn" onClick={() => { if (!addSel) return; upd({ excl: [...w.excl, addSel] }); toast('Added ' + EXCLUSIVES[addSel].name.toLowerCase()); }}>Add exclusive part</button>
                </div>
              ) : null}
            </div></div>

          <div className="panel"><div className="panel-h"><h3>Overheads, contingency and margin</h3></div><div className="panel-b" style={{ overflowX: 'auto' }}>
            <table className="tbl"><tbody>
              <tr><td>Assembly &amp; testing</td><td className="small sub">IDU ₹{OVERHEADS.assembly.IDU} + ODU ₹{OVERHEADS.assembly.ODU} per set</td><td className="r num">{fmt.inr(c.assembly)}</td></tr>
              <tr><td>Inbound freight</td><td className="small sub">{(OVERHEADS.freightPct * 100).toFixed(1)}% of material</td><td className="r num">{fmt.inr(c.freight)}</td></tr>
              <tr><td>Warranty provision</td><td className="small sub">{(OVERHEADS.warrantyPct * 100).toFixed(1)}% of material</td><td className="r num">{fmt.inr(c.warranty)}</td></tr>
              <tr><td>Contingency: {OVERHEADS.contingency.label}</td><td className="small sub">₹1,00,000 ÷ {fmt.n(OVERHEADS.contingency.lotQty)} sets = {fmt.inr(c.contRaw)}, capped at {(OVERHEADS.contingency.capPct * 100).toFixed(1)}% of material ({fmt.inr(c.contCap)})</td><td className="r num">{fmt.inr(c.contingency)}</td></tr>
              <tr><td>Margin</td><td className="small sub">{(OVERHEADS.marginPct * 100).toFixed(0)}% on cost</td><td className="r num">{fmt.inr(c.margin)}</td></tr>
            </tbody><tfoot><tr><td colSpan={2}>Quote price per set</td><td className="r num">{fmt.inr(c.total)}</td></tr></tfoot></table>
          </div></div>
        </div>

        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="panel"><div className="panel-h"><h3>Rates used</h3><Link to="/commodities" className="small">Commodity master</Link></div><div className="panel-b"><table className="tbl"><tbody>
            {(['CU', 'AL', 'ST', 'PL', 'RF', 'CP'] as MatCode[]).map((k) => { const cm = COMMODITIES.find((q) => q.code === k)!; return (
              <tr key={k}><td><Swatch color={COLORS[k]}>{cm.name}</Swatch><div className="small muted">{fmtIdx(snap[k])} {cm.unit}</div></td>
                <td className="r num"><b>{fmt.inr(R[k], k === 'CP' ? 0 : 1)}</b><div className="small muted">{k === 'CP' ? 'landed/unit' : 'landed/kg'}</div></td></tr>); })}
            <tr><td>INR per USD</td><td className="r num"><b>{fmt.n(snap.FX, 2)}</b></td></tr>
          </tbody></table></div></div>

          <div className="panel"><div className="panel-h"><h3>Material weight per set</h3></div>
            <div className="panel-b" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <Donut parts={WEIGHT_KEYS.map((k) => ({ label: MAT_NAME[k], value: wts[k], color: COLORS[k] }))} size={170} unit="kg" center={fmt.n(totalW, 1) + ' kg'} centerSub="critical materials" label="Material weights" />
              <div style={{ flex: 1, minWidth: 140 }}>
                {WEIGHT_KEYS.map((k) => <div key={k} className="row-x small" style={{ padding: '3px 0' }}><Swatch color={COLORS[k]}>{MAT_NAME[k]}</Swatch><span className="spacer"></span><b className="num">{fmt.n(wts[k], 2)} kg</b></div>)}
              </div>
            </div></div>

          <div className="panel"><div className="panel-h"><h3>Bought-out price basis</h3></div><div className="panel-b">
            <div className="seg" style={{ marginBottom: 10 }} role="group" aria-label="Bought-out price basis">
              <button className={w.priceMode === 'lpp' ? 'on' : ''} aria-pressed={w.priceMode === 'lpp'} onClick={() => upd({ priceMode: 'lpp' })}>Latest purchase price</button>
              <button className={w.priceMode === 'avg' ? 'on' : ''} aria-pressed={w.priceMode === 'avg'} onClick={() => upd({ priceMode: 'avg' })}>SAP moving average</button>
            </div>
            <p className="small sub" style={{ margin: 0 }}>The SAP BOM carries a moving average that blends old cheap and new expensive buys. Quotes use LPP. Switching changes this quote by <b className={cAlt.total > c.total ? 'diff-up' : 'diff-dn'}>{cAlt.total > c.total ? '+' : '−'}{fmt.inr(Math.abs(cAlt.total - c.total))}</b> per set.</p>
          </div></div>

          <div className="panel"><div className="panel-h"><h3>Previous versions</h3><Link to="/history" className="small">Quote history</Link></div><div className="panel-b">
            {vers.length ? <ul className="tl">{vers.slice().reverse().map((v) => (
              <li key={v.id}><span className="b"></span><div><b>v{v.v}</b>, {v.quarter} <span className="num" style={{ float: 'right' }}>{fmt.inr(v.total)}</span></div><div className="w">{v.on}, {person(v.by).name}, {v.source}{v.status === 'DRAFT' ? ', draft' : ''}</div></li>
            ))}</ul> : <div className="empty">First costing for this model.</div>}
          </div></div>
        </div>
      </div>

      {drawer ? (
        <SaveDrawer onClose={() => { if (!saving) setDrawer(false); }} saving={saving} onSave={saveVersion}
          total={c.total} basisLabel={basisLabel} modelName={m.name} reqId={x.id} cu={snap.CU} fx={snap.FX} exclCount={w.excl.length} aicm={mode === 'aicm'} />
      ) : null}
    </>
  );
}

/* Editable bought-out price: commits on blur or Enter, like the POC's change event. */
function PriceCell({ k, name, value, onCommit }: { k: ExclusiveKey; name: string; value: number; onCommit(k: ExclusiveKey, raw: string): boolean }) {
  const [v, setV] = useState(String(value));
  const commit = () => {
    if (v === String(value)) return;
    if (!onCommit(k, v)) {
      const e = EXCLUSIVES[k];
      setV(String(Math.round(e.type === 'bo' ? e.price : value)));
    }
  };
  return (
    <input className="cell num" data-ex={k} value={v} inputMode="decimal" aria-label={'Price for ' + name}
      onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
  );
}

function SaveDrawer(p: { onClose(): void; onSave(note: string): void; saving: boolean; total: number; basisLabel: string; modelName: string; reqId: string; cu: number; fx: number; exclCount: number; aicm: boolean }) {
  const [note, setNote] = useState('Q4 quote. ' + (p.aicm ? 'Rates from AICM Q3 average.' : 'Manual rates.'));
  return (
    <Drawer title="Save costing version" onClose={p.onClose}
      footer={<div className="row-x"><span className="spacer"></span><button className="btn" onClick={p.onClose}>Cancel</button><button className="btn primary" disabled={p.saving} onClick={() => p.onSave(note)}>{busyLabel(p.saving, 'Save version', 'Saving')}</button></div>}>
      <div className="kpi panel"><div className="l">Quote price per set</div><div className="v num">{fmt.inr(p.total)}</div><div className="f">{p.basisLabel}</div></div>
      <div className="note">Saving freezes the rates, exclusive parts and prices used, so this exact number can be reproduced years later.</div>
      <table className="tbl"><tbody>
        <tr><td className="muted">Model</td><td>{p.modelName}</td></tr>
        <tr><td className="muted">Request</td><td>{p.reqId}</td></tr>
        <tr><td className="muted">Copper basis</td><td className="num">{fmt.n(p.cu, 2)} USD/MT</td></tr>
        <tr><td className="muted">FX</td><td className="num">{fmt.n(p.fx, 2)}</td></tr>
        <tr><td className="muted">Exclusive parts</td><td>{p.exclCount} items</td></tr>
      </tbody></table>
      <div className="field"><label htmlFor="verNote">Note for this version</label><textarea className="inp" id="verNote" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></div>
    </Drawer>
  );
}
