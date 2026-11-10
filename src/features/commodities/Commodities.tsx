import { useEffect, useState } from 'react';
import { api } from '../../api';
import { LineChart } from '../../components/charts/LineChart';
import { Drawer } from '../../components/Drawer';
import { busyLabel, Loaded, Spinner, Swatch } from '../../components/ui';
import { landed } from '../../domain/engine';
import { fmt, fmtIdx } from '../../domain/format';
import { COLORS, COMMODITIES, UPLOAD_FILE, UPLOAD_SHEET } from '../../domain/seed';
import type { CommodityCode, RateSnapshot } from '../../domain/types';
import { useSession } from '../../state/session';
import { useToast } from '../../state/toasts';
import { useUiState } from '../../state/uiMemory';
import { useLoad } from '../../state/useLoad';

const colorOf = (code: CommodityCode) => (COLORS as Record<string, string>)[code] || '#465650';
const STRUCT_LABEL: Record<string, string> = { import: 'Imported, duty stack', lme: 'LME linked', domestic: 'Domestic index', polymer: 'Polymer index', fx: 'Currency', flat: 'Supplier rate' };
const UNITS: Record<CommodityCode, string> = { CU: 'USD/MT', AL: 'USD/MT', FX: 'INR/USD', ST: 'INR/MT', PL: 'USD/MT', CP: 'USD/unit', RF: 'INR/kg' };

export function Commodities() {
  const { mode, refresh } = useSession();
  const state = useLoad(() => refresh('com'), [mode]);
  return <Loaded state={state} text="Fetching commodity master">{() => <Master />}</Loaded>;
}

function Master() {
  const { mode, snap, data, manual, refresh } = useSession();
  const toast = useToast();
  const [selCode, setSel] = useUiState<CommodityCode>('comSel', () => 'CU');
  const [busy, setBusy] = useState<'sync' | 'save' | null>(null);
  const [upload, setUpload] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  useEffect(() => { setEdits({}); }, [manual]);

  const aicm = mode === 'aicm';
  const sel = COMMODITIES.find((c) => c.code === selCode)!;
  const L = sel.code === 'FX' ? null : landed(sel.code, snap);
  const sentV = data.versions.filter((v) => v.status === 'SENT').sort((a, b) => a.on.localeCompare(b.on));
  const lastQ = sentV[sentV.length - 1];
  const byQ: Record<string, number> = {};
  sentV.forEach((v) => (byQ[v.quarter] = v.snap[sel.code]));
  const qs = Object.keys(byQ);
  const lastSync = data.com?.lastSync ?? '';

  const sync = async () => {
    setBusy('sync');
    try { await api.syncAICM(); await refresh('com', 'audit'); toast(COMMODITIES.length + ' rates synced from AICM. Q3 averages unchanged.'); }
    catch (e) { toast((e as Error).message, true); }
    setBusy(null);
  };
  const save = async () => {
    const vals = {} as RateSnapshot;
    let bad = false;
    COMMODITIES.forEach((c) => {
      const raw = c.code in edits ? edits[c.code] : String(manual[c.code]);
      const v = parseFloat(raw);
      if (isNaN(v) || v <= 0) bad = true;
      vals[c.code] = v;
    });
    if (bad) { toast('Every rate needs a number above zero', true); return; }
    setBusy('save');
    try { await api.saveManual(vals); await refresh('com', 'audit'); toast('Manual rates saved. New quotes will use them.'); }
    catch (e) { toast((e as Error).message, true); }
    setBusy(null);
  };

  return (
    <>
      <div className="page-head">
        <div className="t"><h1>Commodity master</h1><p>{aicm
          ? "Linked to AICM. Index prices and FX flow in from the AICM commodity page; quotes for the next quarter use the last quarter's average."
          : 'Manual mode, for when AICM is not available. The costing team types rates or uploads a rates sheet; every quote records which rates it used.'}</p></div>
        <div className="row-x">{aicm ? (
          <><span className="small muted">Last sync {lastSync}</span><button className="btn primary" onClick={sync} disabled={!!busy}>{busyLabel(busy === 'sync', 'Sync from AICM', 'Syncing from AICM')}</button></>
        ) : (
          <><button className="btn" onClick={() => setUpload(true)}>Upload rates sheet</button><button className="btn primary" onClick={save} disabled={!!busy}>{busyLabel(busy === 'save', 'Save rates', 'Saving')}</button></>
        )}</div>
      </div>
      <div className="grid g-main">
        <div className="panel"><div className="panel-b" style={{ paddingTop: 8, overflowX: 'auto' }}>
          <table className="tbl"><thead><tr><th>Commodity</th><th>Index &amp; source</th>
            {aicm ? <><th className="r">Spot</th><th className="r">Q1 avg</th><th className="r">Q2 avg</th></> : <th className="r">Last quote used</th>}
            <th className="r">{aicm ? 'Q3 avg (used)' : 'Manual rate (used)'}</th><th className="r">Landed</th></tr></thead><tbody>
            {COMMODITIES.map((c) => {
              const lv = c.code === 'FX' ? null : landed(c.code, snap);
              const raw = c.code in edits ? edits[c.code] : String(manual[c.code]);
              const last = lastQ?.snap[c.code];
              return (
                <tr key={c.code} className="click" tabIndex={0} aria-selected={selCode === c.code}
                  onClick={(e) => { if ((e.target as HTMLElement).tagName !== 'INPUT') setSel(c.code); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'INPUT') setSel(c.code); }}
                  style={selCode === c.code ? { background: 'var(--mint-wash)' } : undefined}>
                  <td><Swatch color={colorOf(c.code)}><b>{c.name}</b></Swatch><div className="small muted">{c.unit}</div></td>
                  <td className="small">{c.index}<div className="muted">{aicm ? 'AICM: ' + c.src : 'Entered by costing team'}</div></td>
                  {aicm ? <>
                    <td className="r num">{fmtIdx(c.cur)}</td><td className="r num muted">{fmtIdx(c.q1)}</td><td className="r num muted">{fmtIdx(c.q2)}</td>
                  </> : <td className="r num muted">{last != null ? <>{fmtIdx(last)}<div className="small">{lastQ.quarter}</div></> : '—'}</td>}
                  <td className="r num">{aicm ? <b>{fmtIdx(c.q3)}</b> : <>
                    <input className="cell num" data-man={c.code} value={raw} inputMode="decimal" aria-label={'Manual rate for ' + c.name}
                      onChange={(e) => setEdits((d) => ({ ...d, [c.code]: e.target.value }))} />
                    {last != null && manual[c.code] !== last ? <div className={'small ' + (manual[c.code] > last ? 'diff-up' : 'diff-dn')}>{fmt.pct((manual[c.code] - last) / last)} vs last quote</div> : null}
                  </>}</td>
                  <td className="r num">{lv ? <><b>{fmt.inr(lv.value, c.code === 'CP' ? 0 : 1)}</b><div className="small muted">{lv.unit}</div></> : <span className="muted small">FX input</span>}</td>
                </tr>
              );
            })}
          </tbody></table>
          {!aicm && data.com?.manualFile ? <div className="note" style={{ marginTop: 10 }}>Rates loaded from <b>{data.com.manualFile}</b>. Edit any cell, then save.</div> : null}
        </div></div>
        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="panel"><div className="panel-h"><h3>{sel.name}</h3><span className="chip">{STRUCT_LABEL[sel.structure]}</span></div><div className="panel-b">
            {aicm ? <>
              <LineChart series={[{ name: sel.index, values: sel.hist, color: colorOf(sel.code) }]} labels={['Nov', 'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Sep', 'Oct', 'Nov']} h={170} label={sel.index + ' trend'} band={[6, 7]} />
              <p className="small sub" style={{ margin: '6px 0 12px' }}>Shaded: Q3 window used as the basis for Q4 quotes.</p>
            </> : <>
              {qs.length > 1 ? <LineChart series={[{ name: 'Rate used in quotes', values: qs.map((q) => byQ[q]), color: colorOf(sel.code) }]} labels={qs.map((q) => q.replace(' 20', " '"))} h={170} label="Rates used in past quotes" /> : null}
              <p className="small sub" style={{ margin: '6px 0 12px' }}>Without AICM there is no live index, so this shows the rate each past quote used.</p>
            </>}
            {L ? (
              <div className="formula">
                {L.steps.map((s, i) => (
                  <div key={i} className="row-x" style={s.excluded ? { opacity: 0.55 } : undefined}><span>{s.label}</span><span className="spacer"></span><b className="num">{fmt.n(s.value, s.value < 500 ? 2 : 0)}</b> <span className="o">{s.unit}</span></div>
                ))}
                <div className="row-x" style={{ borderTop: '1px solid var(--line)', marginTop: 6, paddingTop: 6 }}><b>Landed cost</b><span className="spacer"></span><b className="num">{fmt.inr(L.value, sel.code === 'CP' ? 0 : 2)}</b> <span className="o">{L.unit}</span></div>
              </div>
            ) : <div className="formula">FX converts every USD-linked commodity and imported part. A 1% move in the rupee moves copper, aluminium, resin and compressor costs together.</div>}
            {sel.structure === 'import' ? <p className="small sub">HSN {sel.hsn}. Duty rates from the ICEGATE customs calculator; IGST is shown but not costed because it is claimed as input credit.</p> : null}
            <p className="small muted" style={{ marginBottom: 0 }}>Every commodity keeps its own working: copper is LME-linked with a tube conversion, compressors carry a customs duty stack, steel follows a domestic HRC index. Structures to be confirmed with Amber.</p>
          </div></div>
        </div>
      </div>
      {upload ? <UploadDrawer onClose={() => setUpload(false)} /> : null}
    </>
  );
}

function UploadDrawer({ onClose }: { onClose(): void }) {
  const { refresh } = useSession();
  const toast = useToast();
  const [reading, setReading] = useState(false);
  const go = async () => {
    if (reading) return;
    setReading(true);
    try {
      await api.uploadManual(UPLOAD_FILE);
      await refresh('com', 'audit');
      onClose();
      toast('7 rates read from ' + UPLOAD_FILE);
    } catch (e) { toast((e as Error).message, true); setReading(false); }
  };
  return (
    <Drawer title="Upload rates sheet" onClose={onClose}>
      <p className="sub" style={{ margin: 0 }}>Use the costing team's rates template: one row per commodity with code, rate and unit.</p>
      <button type="button" className="upload" style={{ padding: 34 }} onClick={go} aria-busy={reading}>
        {reading ? <span className="btn ghost" style={{ pointerEvents: 'none' }}><Spinner />Reading {UPLOAD_FILE}</span> : <>Drop <b>{UPLOAD_FILE}</b> here, or click to choose a file</>}
      </button>
      <table className="tbl"><thead><tr><th>Code</th><th>Rate in sheet</th><th>Unit</th></tr></thead><tbody>
        {(Object.keys(UPLOAD_SHEET) as CommodityCode[]).map((k) => <tr key={k}><td>{k}</td><td className="num">{fmtIdx(UPLOAD_SHEET[k])}</td><td className="muted">{UNITS[k]}</td></tr>)}
      </tbody></table>
    </Drawer>
  );
}
