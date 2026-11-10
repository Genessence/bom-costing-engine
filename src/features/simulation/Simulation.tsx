import { useState } from 'react';
import { api } from '../../api';
import { DivBars } from '../../components/charts/DivBars';
import { BrandDot, busyLabel, person, Swatch } from '../../components/ui';
import { compute, landed } from '../../domain/engine';
import { fmt, fmtIdx } from '../../domain/format';
import { COLORS, COMMODITIES, MODELS, SIM_KEYS } from '../../domain/seed';
import type { CommodityCode, RateSnapshot, SimPct } from '../../domain/types';
import { useSession } from '../../state/session';
import { useToast } from '../../state/toasts';
import { useUiState } from '../../state/uiMemory';

interface SimState { pct: SimPct; models: string[]; focus: string; name: string }
const ZERO: SimPct = { CU: 0, AL: 0, FX: 0, ST: 0, PL: 0, CP: 0, RF: 0 };
const model = (id: string) => MODELS.find((m) => m.id === id)!;
const tone = (k: CommodityCode) => (k === 'FX' ? '#465650' : COLORS[k]);
const VOLUME = 25000;

export function simSnap(base: RateSnapshot, pct: SimPct): RateSnapshot {
  const s = { ...base };
  (Object.keys(pct) as CommodityCode[]).forEach((k) => (s[k] = base[k] * (1 + pct[k] / 100)));
  return s;
}

/** Copper slider step (0.5%) that lands copper at ~₹1,700/kg for the current FX. */
export function copperPresetPct(base: RateSnapshot): number {
  const c = COMMODITIES.find((q) => q.code === 'CU')!;
  const target = (1700 - (c.conv ?? 0)) / ((base.FX / 1000) * (1 + (c.premium ?? 0)));
  return Math.round((target / base.CU - 1) * 200) / 2;
}

export function Simulation() {
  const { snap: base, basisLabel, data, refresh } = useSession();
  const toast = useToast();
  const [S, setS] = useUiState<SimState>('sim', () => ({ pct: { ...ZERO }, models: ['M-DK18', 'M-VL18', 'M-LG24', 'M-GD12'], focus: 'M-DK18', name: 'Copper spike scenario' }));
  const [saving, setSaving] = useState(false);
  const upd = (p: Partial<SimState>) => setS((s) => ({ ...s, ...p }));

  const scen = simSnap(base, S.pct), fm = model(S.focus);
  const rows = S.models.map((id) => { const m = model(id), b = compute(m, base).total, s = compute(m, scen).total; return { m, b, s, d: s - b }; });
  const bF = compute(fm, base).total;
  const impact = SIM_KEYS.map(([k, l]) => { const one = { ...base }; one[k] = base[k] * (1 + S.pct[k] / 100); return { label: l, value: compute(fm, one).total - bF, color: tone(k) }; });
  const cuL = landed('CU', base).value, cuS = landed('CU', scen).value;
  const annual = rows.reduce((a, b) => a + b.d, 0) * VOLUME;

  const preset = (p: 'meeting' | 'rupee' | 'soft' | 'duty') => {
    const pct = { ...ZERO };
    let name = S.name;
    if (p === 'meeting') { pct.CU = copperPresetPct(base); name = 'Copper ₹1,700/kg'; toast('Copper set to about ₹1,700/kg landed, the case raised in the meeting'); }
    if (p === 'rupee') { pct.FX = 3; name = 'Rupee weakens 3%'; }
    if (p === 'soft') { pct.CU = -8; pct.AL = -8; pct.ST = -8; name = 'Metals soften 8%'; }
    if (p === 'duty') { pct.CP = 10; name = 'Compressor CIF +10%'; }
    upd({ pct, name });
  };
  const toggleModel = (id: string, on: boolean) => {
    let models = on ? [...S.models, id] : S.models.filter((x) => x !== id);
    if (!models.length) { models = [id]; toast('Keep at least one model in the scenario', true); }
    upd({ models, focus: models.includes(S.focus) ? S.focus : models[0] });
  };
  const save = async () => {
    setSaving(true);
    try {
      const sc = await api.saveScenario({ name: S.name || 'Scenario', pct: { ...S.pct }, models: S.models.slice() });
      await refresh('scenarios', 'audit');
      toast('Saved scenario ' + sc.id);
    } catch (e) { toast((e as Error).message, true); }
    setSaving(false);
  };

  return (
    <>
      <div className="page-head">
        <div className="t"><h1>Simulation</h1><p>Move commodity prices and see what every quote would become. Baseline is {basisLabel}. Nothing here changes saved quotes until you save a new version.</p></div>
        <div className="row-x"><button className="btn" onClick={() => upd({ pct: { ...ZERO } })}>Reset to baseline</button><button className="btn primary" onClick={save} disabled={saving}>{busyLabel(saving, 'Save scenario', 'Saving')}</button></div>
      </div>
      <div className="row-x" style={{ marginBottom: 14 }}><span className="small sub">Presets</span>
        <button className="btn sm" onClick={() => preset('meeting')}>Copper to ₹1,700/kg landed</button>
        <button className="btn sm" onClick={() => preset('rupee')}>Rupee weakens 3%</button>
        <button className="btn sm" onClick={() => preset('soft')}>Metals soften 8%</button>
        <button className="btn sm" onClick={() => preset('duty')}>Compressor CIF +10%</button>
      </div>
      <div className="grid g-main">
        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="panel"><div className="panel-h"><h3>Rate changes</h3><span className="small muted">Copper landed {fmt.inr(cuL)}/kg → <b className={cuS > cuL ? 'diff-up' : cuS < cuL ? 'diff-dn' : ''}>{fmt.inr(cuS)}/kg</b></span></div><div className="panel-b">
            {SIM_KEYS.map(([k, l]) => { const c = COMMODITIES.find((q) => q.code === k)!; return (
              <div className="sl" key={k}>
                <span><Swatch color={tone(k)}>{l}</Swatch><div className="small muted num">{fmtIdx(base[k])} → {fmtIdx(scen[k])} {c.unit}</div></span>
                <input type="range" min={-30} max={30} step={0.5} value={S.pct[k]} data-sim={k} aria-label={l + ' change percent'}
                  aria-valuetext={(S.pct[k] > 0 ? '+' : '') + S.pct[k].toFixed(1) + '%'}
                  onChange={(e) => { const v = parseFloat(e.target.value); setS((s) => ({ ...s, pct: { ...s.pct, [k]: v } })); }} />
                <span className="val num">{S.pct[k] > 0 ? '+' : ''}{S.pct[k].toFixed(1)}%</span>
              </div>); })}
          </div></div>
          <div className="panel"><div className="panel-h"><h3>Effect on quotes</h3><span className="small muted">Per set, IDU + ODU</span></div><div className="panel-b" style={{ overflowX: 'auto' }}>
            <table className="tbl"><thead><tr><th></th><th>Model</th><th className="r">Baseline</th><th className="r">Scenario</th><th className="r">Change</th></tr></thead><tbody>
              {MODELS.map((m) => { const on = S.models.includes(m.id), row = rows.find((r) => r.m.id === m.id); return (
                <tr key={m.id}>
                  <td><input type="checkbox" data-simm={m.id} checked={on} aria-label={'Include ' + m.name} onChange={(e) => toggleModel(m.id, e.target.checked)} /></td>
                  <td><BrandDot b={m.brand} /> <span className="small muted">{m.tr} TR {m.star}★</span> {S.focus === m.id ? <span className="chip dark">In chart</span> : on ? <button className="btn sm ghost" onClick={() => upd({ focus: m.id })}>Chart this</button> : null}</td>
                  {row ? <>
                    <td className="r num">{fmt.inr(row.b)}</td><td className="r num"><b>{fmt.inr(row.s)}</b></td>
                    <td className={'r num ' + (row.d > 0.5 ? 'diff-up' : row.d < -0.5 ? 'diff-dn' : '')}>{row.d >= 0 ? '+' : '−'}{fmt.inr(Math.abs(row.d))} <span className="small">({fmt.pct(row.d / row.b)})</span></td>
                  </> : <td colSpan={3} className="r small muted">Not in scenario</td>}
                </tr>); })}
            </tbody></table>
            <div className="note" style={{ marginTop: 10 }}>Annual impact at the volumes in the demo forecast ({fmt.n(VOLUME)} sets per model): <b className={'num ' + (annual > 0 ? 'diff-up' : 'diff-dn')}>{fmt.k(annual)}</b> across {rows.length} models.</div>
          </div></div>
        </div>
        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="panel"><div className="panel-h"><h3>Where the change comes from</h3></div><div className="panel-b">
            <p className="small sub" style={{ marginTop: 0 }}>{fm.name}: each commodity's change on its own, per set.</p>
            <DivBars items={impact} w={520} />
          </div></div>
          <div className="panel"><div className="panel-h"><h3>Saved scenarios</h3></div><div className="panel-b">
            {data.scenarios.length ? <table className="tbl"><tbody>
              {data.scenarios.map((s) => (
                <tr key={s.id} className="click" tabIndex={0}
                  onClick={() => { upd({ pct: { ...s.pct }, models: s.models.slice(), name: s.name, focus: s.models.includes(S.focus) ? S.focus : s.models[0] }); toast('Loaded ' + s.name); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLElement).click(); }}>
                  <td><b>{s.name}</b><div className="small muted">{s.on}, {person(s.by).name}</div></td>
                  <td className="r small">{(Object.entries(s.pct) as [string, number][]).filter(([, v]) => v).map(([k, v]) => k + ' ' + (v > 0 ? '+' : '') + v + '%').join(', ') || 'No change'}</td>
                </tr>
              ))}
            </tbody></table> : <div className="empty">No saved scenarios yet. Move a slider, then save.</div>}
          </div></div>
        </div>
      </div>
    </>
  );
}
