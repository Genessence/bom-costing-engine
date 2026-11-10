import { useState } from 'react';
import { api } from '../../api';
import { Donut } from '../../components/charts/Donut';
import { Swatch } from '../../components/ui';
import { compute } from '../../domain/engine';
import { fmt } from '../../domain/format';
import { COLORS, MAT_NAME, matColor, MODELS } from '../../domain/seed';
import type { MatCode, WeightCode } from '../../domain/types';
import { useSession } from '../../state/session';
import { useToast } from '../../state/toasts';
import { useUiState } from '../../state/uiMemory';

interface BomState { code: string; state: 'idle' | 'loading' | 'done'; step: number }
const STEPS = ['Connecting to SAP (plant 1100)', 'Reading material BOM, IDU + ODU', 'Exploding multi-level BOM', 'Fetching last purchase prices', 'Mapping parts to commodities'];
const WEIGHT_KEYS: WeightCode[] = ['CU', 'AL', 'ST', 'PL', 'RF'];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function Bom() {
  const { snap } = useSession();
  const toast = useToast();
  const [b, setB] = useUiState<BomState>('bom', () => ({ code: MODELS[0].code, state: 'idle', step: 0 }));
  const [input, setInput] = useState(b.code);

  const fetchBom = async (raw: string) => {
    const code = raw.trim().toUpperCase();
    const m = MODELS.find((x) => x.code === code);
    if (!m) { toast('No BOM for ' + (code || 'that code') + ' in SAP. Check the model code.', true); return; }
    setInput(code);
    try {
      for (let i = 0; i < 5; i++) {
        setB({ code, state: 'loading', step: i });
        if (i === 1) await api.sapBom(code);
        else if (i === 3) await api.sapLpp(code);
        else await sleep(380);
      }
      setB({ code, state: 'done', step: 5 });
      toast('BOM for ' + code + ' loaded from SAP');
    } catch (e) {
      setB({ code, state: 'idle', step: 0 });
      toast((e as Error).message, true);
    }
  };

  const m = MODELS.find((x) => x.code === b.code);
  let body: JSX.Element | null = null;
  if (b.state === 'idle' || !m) {
    body = <div className="lock-note"><div className="ic" aria-hidden="true">⇅</div><div><b>Enter a model code and fetch its BOM from SAP.</b><div className="small">The BOM stays in SAP where the model is developed. This pulls the breakup, latest purchase prices and commodity weights.</div></div></div>;
  } else if (b.state === 'loading') {
    body = (
      <div className="panel"><div className="panel-b"><b>Fetching {b.code} from SAP S/4HANA</b>
        <ul className="sap-steps" id="sapSteps" aria-live="polite">
          {STEPS.map((s, i) => <li key={s} className={i < b.step ? 'ok' : i === b.step ? 'run' : ''}><span className="k" aria-hidden="true">{i < b.step ? '✓' : ''}</span>{s}<span className="sr-only">{i < b.step ? ' (done)' : i === b.step ? ' (in progress)' : ''}</span></li>)}
        </ul></div></div>
    );
  } else {
    const cL = compute(m, snap, { priceMode: 'lpp' }), cA = compute(m, snap, { priceMode: 'avg' }), w = cL.weights;
    const bo = cL.lines.filter((l) => l.type === 'bo');
    const totalW = WEIGHT_KEYS.reduce((a, k) => a + w[k], 0);
    body = (
      <>
        <div className="grid g4" style={{ marginBottom: 16 }}>
          <div className="panel kpi"><div className="l">BOM lines</div><div className="v num">{cL.lines.length + cL.exLines.length}</div><div className="f">{cL.lines.length} chassis, {cL.exLines.length} exclusive</div></div>
          <div className="panel kpi"><div className="l">Copper in this model</div><div className="v num">{fmt.n(w.CU, 2)} kg</div><div className="f">Across coil, stubs and tubing</div></div>
          <div className="panel kpi"><div className="l">Material at SAP average</div><div className="v num">{fmt.inr(cA.material)}</div><div className="f">What the BOM shows</div></div>
          <div className="panel kpi"><div className="l">Material at LPP</div><div className="v num">{fmt.inr(cL.material)}</div><div className={'f ' + (cL.material > cA.material ? 'diff-up' : 'diff-dn')}>{cL.material > cA.material ? '+' : '−'}{fmt.inr(Math.abs(cL.material - cA.material))} vs average</div></div>
        </div>
        <div className="grid g-main">
          <div className="panel"><div className="panel-h"><h3>BOM breakup</h3><span className="small muted">{m.code}, plant 1100</span></div><div className="panel-b" style={{ overflowX: 'auto' }}>
            <table className="tbl"><thead><tr><th>Part</th><th>Unit</th><th>Commodity</th><th className="r">Qty / weight</th><th className="r">SAP moving avg</th><th className="r">LPP</th><th className="r">Gap</th></tr></thead><tbody>
              {cL.lines.map((l) => { const gap = l.type === 'bo' ? l.lpp - l.avg : 0; return (
                <tr key={l.pc}>
                  <td><b>{l.name}</b><div className="small muted">{l.pc}</div></td>
                  <td><span className="chip">{l.unit}</span></td>
                  <td><Swatch color={l.type === 'bo' ? '#9AA8A1' : matColor(l.type === 'cp' ? 'CP' : l.m!)}>{l.type === 'bo' ? 'Bought-out' : MAT_NAME[l.type === 'cp' ? 'CP' : (l.m as MatCode)]}</Swatch></td>
                  <td className="r num">{l.type === 'mat' ? fmt.n(l.kg, 2) + ' kg' : '1 no'}</td>
                  <td className="r num">{l.type === 'bo' ? fmt.inr(l.avg) : <span className="muted small">Rate linked</span>}</td>
                  <td className="r num">{l.type === 'bo' ? fmt.inr(l.lpp) : <span className="muted small">Rate linked</span>}</td>
                  <td className={'r num ' + (gap > 0 ? 'diff-up' : gap < 0 ? 'diff-dn' : '')}>{l.type === 'bo' ? (gap >= 0 ? '+' : '−') + fmt.inr(Math.abs(gap)) : ''}</td>
                </tr>); })}
            </tbody></table></div></div>
          <div className="grid" style={{ alignContent: 'start' }}>
            <div className="panel"><div className="panel-h"><h3>Critical material roll-up</h3></div>
              <div className="panel-b" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <Donut parts={WEIGHT_KEYS.map((k) => ({ label: MAT_NAME[k], value: w[k], color: COLORS[k] }))} size={160} unit="kg" center={fmt.n(totalW, 1) + ' kg'} centerSub="per set" label="Material roll-up" />
                <div style={{ flex: 1, minWidth: 130 }}>{WEIGHT_KEYS.map((k) => <div key={k} className="row-x small" style={{ padding: '3px 0' }}><Swatch color={COLORS[k]}>{MAT_NAME[k]}</Swatch><span className="spacer"></span><b className="num">{fmt.n(w[k], 2)} kg</b></div>)}</div>
              </div></div>
            <div className="panel"><div className="panel-h"><h3>Why LPP, not the BOM price</h3></div><div className="panel-b small sub">SAP values the BOM at a moving average: a compressor bought at ₹3,000 last year and ₹5,000 now shows somewhere in between. Quotes for next quarter need today's price, so each part code is looked up in the LPP report. {bo.filter((l) => l.lpp > l.avg).length} of {bo.length} bought-outs are dearer at LPP.</div></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-head"><div className="t"><h1>SAP BOM explorer</h1><p>Type a model code to pull its BOM from SAP: no digging through hundreds of lines. Weights roll up by commodity and every part is priced at its latest purchase price.</p></div></div>
      <div className="panel" style={{ marginBottom: 16 }}>
        <form className="panel-b row-x" onSubmit={(e) => { e.preventDefault(); if (b.state !== 'loading') void fetchBom(input); }}>
          <div className="field" style={{ flex: 1, maxWidth: 420 }}><label htmlFor="bomCode">Model code</label>
            <input className="inp" id="bomCode" list="bomCodes" value={input} onChange={(e) => setInput(e.target.value)} />
            <datalist id="bomCodes">{MODELS.map((mm) => <option key={mm.code} value={mm.code}>{mm.name}</option>)}</datalist></div>
          <button type="submit" className="btn primary" style={{ alignSelf: 'flex-end' }} disabled={b.state === 'loading'}>Fetch from SAP</button>
          <span className="small muted" style={{ alignSelf: 'flex-end' }}>Try {MODELS.slice(1, 4).map((mm, i) => (
            <span key={mm.code}>{i ? ', ' : ''}<a href="#" onClick={(e) => { e.preventDefault(); if (b.state !== 'loading') { setInput(mm.code); void fetchBom(mm.code); } }}>{mm.code}</a></span>
          ))}</span>
        </form>
      </div>
      {body}
    </>
  );
}
