/* Costing engine: pure functions ported 1:1 from the POC's data.js. No I/O, no globals. */
import {
  COMMODITIES, EXCLUSIVES, IDU_CHASSIS, IDU_LINES, ODU_CHASSIS, ODU_LINES, OVERHEADS, SPEC_TEMPLATE,
} from './seed';
import type {
  BomLine, ByMaterial, CommodityCode, ComputeOptions, CostLine, CostResult, ExCostLine, Landed,
  LandedRates, MatCode, Model, RateMode, RateSnapshot, Spec, Weights,
} from './types';

const commodity = (code: CommodityCode) => {
  const c = COMMODITIES.find((x) => x.code === code);
  if (!c) throw new Error('Unknown commodity ' + code);
  return c;
};

/** AICM mode quotes next quarter off last quarter's average (q3); manual mode uses the costing team's rates. */
export function snapshotFrom(mode: RateMode, manual: RateSnapshot): RateSnapshot {
  const snap = {} as RateSnapshot;
  COMMODITIES.forEach((c) => {
    snap[c.code] = mode === 'manual' ? manual[c.code] : c.q3;
  });
  return snap;
}

export function landed(code: CommodityCode, snap: RateSnapshot): Landed {
  const c = commodity(code);
  const fx = snap.FX;
  const v = snap[code];
  const out: Landed = { code, steps: [], value: 0, unit: '₹/kg' };
  const step = (label: string, value: number, unit: string, excluded?: boolean) => ({ label, value, unit, excluded });
  if (c.structure === 'lme') {
    const premium = c.premium ?? 0;
    const conv = c.conv ?? 0;
    const base = (v * fx) / 1000;
    const prem = base * premium;
    out.steps = [
      step('Index ' + c.index, v, c.unit),
      step('× FX ÷ 1000 → base metal', base, '₹/kg'),
      step('+ supplier premium ' + (premium * 100).toFixed(1) + '%', prem, '₹/kg'),
      step('+ ' + c.convLabel, conv, '₹/kg'),
    ];
    out.value = base + prem + conv;
  } else if (c.structure === 'domestic') {
    const spread = c.spread ?? 0;
    const freight = c.freight ?? 0;
    const base = (v + spread) / 1000;
    out.steps = [
      step('HRC index', v, 'INR/MT'),
      step('+ CRC/GI spread', spread, 'INR/MT'),
      step('÷ 1000 → base', base, '₹/kg'),
      step('+ inbound freight', freight, '₹/kg'),
    ];
    out.value = base + freight;
  } else if (c.structure === 'polymer') {
    const compounding = c.compounding ?? 0;
    const base = (v * fx) / 1000;
    out.steps = [
      step('Styrene monomer index', v, c.unit),
      step('× FX ÷ 1000', base, '₹/kg'),
      step('+ compounding & masterbatch', compounding, '₹/kg'),
    ];
    out.value = base + compounding;
  } else if (c.structure === 'import') {
    const cif = v * fx;
    const bcd = cif * (c.bcd ?? 0);
    const aidc = cif * (c.aidc ?? 0);
    const sws = (bcd + aidc) * (c.sws ?? 0);
    const clr = cif * (c.clearing ?? 0);
    const igst = (cif + bcd + aidc + sws) * (c.igst ?? 0);
    out.unit = '₹/unit';
    out.steps = [
      step('CIF USD × FX', cif, '₹'),
      step('+ Basic customs duty 15%', bcd, '₹'),
      step('+ AIDC 2.25%', aidc, '₹'),
      step('+ Social welfare surcharge 10% on duty', sws, '₹'),
      step('+ Clearing & port 1.5%', clr, '₹'),
      step('IGST 18% (input credit, not costed)', igst, '₹', true),
    ];
    out.value = cif + bcd + aidc + sws + clr; // IGST is input credit: shown, never costed
  } else if (c.structure === 'flat') {
    out.steps = [step('Supplier rate', v, '₹/kg')];
    out.value = v;
  } else {
    out.value = v;
    out.unit = c.unit;
  }
  return out;
}

const MAT_KEYS: MatCode[] = ['CU', 'AL', 'ST', 'PL', 'CP', 'RF'];
export function rates(snap: RateSnapshot): LandedRates {
  const r = {} as LandedRates;
  MAT_KEYS.forEach((k) => (r[k] = landed(k, snap).value));
  return r;
}

export function engineWeights(model: Pick<Model, 'idu' | 'odu' | 'excl'>): Weights {
  const s = IDU_CHASSIS[model.idu].s;
  const o = ODU_CHASSIS[model.odu].s;
  const w: Weights = { CU: 0, AL: 0, ST: 0, PL: 0, RF: 0 };
  IDU_LINES.forEach((l) => { if (l.type === 'mat') w[l.m] += l.kg * s; });
  ODU_LINES.forEach((l) => { if (l.type === 'mat') w[l.m] += l.kg * o; });
  model.excl.forEach((k) => { const e = EXCLUSIVES[k]; if (e.type === 'mat') w[e.m] += e.kg; });
  return w;
}

const boScale = (x: number) => (x < 1 ? 0.86 : x > 1 ? 1.2 : 1);

export function compute(model: Model, snap: RateSnapshot, opts: ComputeOptions = {}): CostResult {
  const R = rates(snap);
  const excl = opts.excl || model.excl;
  const priceMode = opts.priceMode || 'lpp';
  const s = IDU_CHASSIS[model.idu].s;
  const o = ODU_CHASSIS[model.odu];
  const lines: CostLine[] = [];
  const byMat: ByMaterial = { CU: 0, AL: 0, ST: 0, PL: 0, RF: 0, CP: 0, BO: 0 };

  function add(unit: 'IDU' | 'ODU', l: BomLine, sc: number) {
    let cost = 0, kg = 0, price = 0, avg = 0;
    if (l.type === 'mat') {
      kg = l.kg * sc;
      cost = kg * (1 + l.scrap) * R[l.m] + l.proc * (sc > 1 ? 1.15 : sc < 1 ? 0.9 : 1);
      byMat[l.m] += cost;
    } else if (l.type === 'cp') {
      cost = R.CP * o.cp;
      byMat.CP += cost;
    } else {
      price = l.lpp * boScale(sc);
      avg = l.avg * boScale(sc);
      cost = priceMode === 'avg' ? avg : price;
      byMat.BO += cost;
    }
    lines.push({
      unit, pc: l.pc + '-' + (unit === 'IDU' ? model.idu : model.odu), name: l.name, type: l.type,
      m: l.type === 'mat' ? l.m : undefined, kg, cost, lpp: price, avg, zone: l.zone,
    });
  }
  IDU_LINES.forEach((l) => add('IDU', l, s));
  ODU_LINES.forEach((l) => add('ODU', l, o.s));
  const common = lines.reduce((a, b) => a + b.cost, 0);

  const exLines: ExCostLine[] = excl.map((k) => {
    const e = EXCLUSIVES[k];
    let cost: number;
    if (e.type === 'mat') {
      cost = e.kg * 1.04 * R[e.m] + e.proc;
      byMat[e.m] += cost;
    } else {
      const override = opts.exPrice?.[k];
      cost = override != null ? override : e.price;
      byMat.BO += cost * e.sign;
    }
    return {
      k, name: e.name, type: e.type, m: e.type === 'mat' ? e.m : undefined,
      kg: e.type === 'mat' ? e.kg : 0, cost: cost * e.sign, sign: e.sign,
    };
  });
  const exclusive = exLines.reduce((a, b) => a + b.cost, 0);
  const material = common + exclusive;
  const assembly = OVERHEADS.assembly.IDU + OVERHEADS.assembly.ODU;
  const freight = material * OVERHEADS.freightPct;
  const warranty = material * OVERHEADS.warrantyPct;
  const ct = OVERHEADS.contingency;
  const contRaw = ct.amount / ct.lotQty;
  const contCap = material * ct.capPct;
  const contingency = opts.noCont ? 0 : Math.min(contRaw, contCap);
  const cost = material + assembly + freight + warranty + contingency;
  const margin = cost * OVERHEADS.marginPct;
  const total = cost + margin;
  const weights = engineWeights({ ...model, excl });
  return { lines, exLines, common, exclusive, material, assembly, freight, warranty, contingency, contRaw, contCap, cost, margin, total, byMat, weights, R };
}

/** Rate effect vs scope effect between two versions of the same model (history compare). */
export function splitChange(
  model: Model,
  a: { snap: RateSnapshot; excl: Model['excl']; total: number },
  b: { snap: RateSnapshot; total: number },
) {
  const mid = compute(model, b.snap, { excl: a.excl }).total;
  return { rate: mid - a.total, scope: b.total - mid };
}

/** Starting spec sheet for a model (72 fields). */
export function specFor(model: Model): Spec {
  const tr = model.tr;
  const s = IDU_CHASSIS[model.idu].s;
  const o = ODU_CHASSIS[model.odu];
  const capW = ({ 1: 3500, 1.5: 5200, 2: 6600 } as Record<number, number>)[tr];
  const w = engineWeights(model);
  return {
    brand: model.brand, iduCode: model.code + '-I', oduCode: model.code + '-O', tr: tr.toFixed(1), capW, star: model.star + ' star (BEE 2026)', iseer: model.iseer, ref: 'R32 (GWP 675)',
    volt: '230 V / 50 Hz / 1 ph', pin: Math.round(capW / (model.iseer * 0.86)), amp: (capW / (model.iseer * 0.86) / 230).toFixed(1), vrange: '145–290 V', stab: 'Yes', plug: '3-pin, 1.8 m',
    iduCh: model.idu, iduDim: IDU_CHASSIS[model.idu].width + ' × ' + (s > 1 ? 325 : s < 1 ? 285 : 298) + ' × ' + (s > 1 ? 238 : 220), iduNet: (9.5 * s + 1).toFixed(1), iduGross: (12 * s + 1.5).toFixed(1), air: Math.round(820 * s + 180), iduDb: (38 + s * 4).toFixed(0), ifm: 'BLDC', swing: '4-way auto', filter: model.excl.includes('PMF') ? 'PM2.5 + anti-dust' : 'Anti-dust', disp: model.excl.includes('DSP') ? 'Hidden LED, brand window' : 'LED', panel: model.brand + ' design, gloss white', evTube: '7 mm inner-grooved copper', evRows: (model.star >= 5 ? '3 rows' : '2 rows') + ' / 18 FPI', drain: 'Left & right',
    oduCh: model.odu, oduDim: ({ O20: '780 × 550 × 270', O22: '835 × 555 × 300', O24: '895 × 640 × 330' } as Record<string, string>)[model.odu], oduNet: (24 * o.s + 1).toFixed(1), oduGross: (27 * o.s + 2).toFixed(1), fan: o.fan + '"', oduDb: (50 + o.s * 4).toFixed(0), cond: 'Copper', cdTube: '7 mm smooth copper', cdRows: (model.star >= 5 ? '2 rows' : '1.5 rows') + ' / 20 FPI', fin: model.excl.includes('BLF') ? 'Blue-fin anti-corrosion' : 'Hydrophilic', cab: 'GI, powder coated', amb: 52,
    cpType: 'Rotary inverter', cpMake: 'GMCC / Highly (dual source)', cpModel: 'KSN' + Math.round(98 * o.cp) + 'D', cpCc: (10.2 * o.cp).toFixed(1), oil: 'POE', charge: (0.95 * o.s).toFixed(2),
    pipe: tr >= 2 ? '1/4" / 5/8"' : '1/4" / 1/2"', maxLen: tr >= 2 ? 20 : 15, maxEl: 10, stdLen: 3, kit: 'Copper pipe 3 m, drain hose, wall sleeve',
    wifi: model.wifi ? 'Yes, app control' : 'No', conv: '5-in-1', sleep: 'Yes', restart: 'Yes', clean: 'Yes', pm25: model.excl.includes('PMF') ? 'Yes' : 'No', remote: model.brand + ' backlit IR',
    pack: 'Corrugated carton + EPS', load: tr >= 2 ? '96 sets' : '120 sets', bis: 'Yes', warr: '1 yr / 10 yr',
    chRef: model.idu + ' + ' + model.odu + ' chassis master', commonPct: '≈80%', exclRef: model.excl.length + ' items: ' + model.excl.join(', '), cuKg: w.CU.toFixed(2), alKg: w.AL.toFixed(2), stKg: w.ST.toFixed(2), plKg: w.PL.toFixed(2), target: '', cpVendor: 'GMCC, LPP USD 72 (Oct 2026)', note: '',
  };
}

/* ----- spec sheet helpers ----- */
export interface SpecRowDef { sec: string; k: string; label: string; internal: boolean }
export function specRows(includeInternalSection: boolean): SpecRowDef[] {
  const out: SpecRowDef[] = [];
  SPEC_TEMPLATE.forEach(([sec, rows]) => {
    const internalSec = sec.startsWith('Internal');
    if (internalSec && !includeInternalSection) return;
    rows.forEach((r) => out.push({ sec, k: r[0], label: r[1], internal: !!r[2] || internalSec }));
  });
  return out;
}
export function specLabel(k: string): string {
  for (const [, rows] of SPEC_TEMPLATE) for (const r of rows) if (r[0] === k) return r[1];
  return k;
}
/** Derived fields R&D can never type into. */
export const SPEC_LOCKED = /^(cuKg|alKg|stKg|plKg|chRef|commonPct|exclRef)$/;
