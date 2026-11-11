import { describe, expect, it } from 'vitest';
import { compute, engineWeights, landed, rates, snapshotFrom, specFor, specRows, splitChange } from './engine';
import { COMMODITIES, MODELS, SNAPS } from './seed';
import { freshDB } from '../api/mock/db';
import type { RateSnapshot } from './types';

const model = (id: string) => MODELS.find((m) => m.id === id)!;
const manualSeed = () => Object.fromEntries(COMMODITIES.map((c) => [c.code, c.q3])) as RateSnapshot;
const aicm = snapshotFrom('aicm', manualSeed());

describe('rates snapshot', () => {
  it('AICM mode uses each commodity q3 average', () => {
    COMMODITIES.forEach((c) => expect(aicm[c.code]).toBe(c.q3));
  });
  it('manual mode uses the manual rates', () => {
    const manual = { ...manualSeed(), CU: 15000 };
    expect(snapshotFrom('manual', manual).CU).toBe(15000);
  });
});

describe('landed cost (HANDOFF seed check values)', () => {
  it('copper landed is ₹1,490.52/kg', () => {
    expect(landed('CU', aicm).value).toBeCloseTo(1490.52, 2);
  });
  it('LME formula: idx × FX / 1000 × (1 + premium) + conversion', () => {
    expect(landed('AL', aicm).value).toBeCloseTo((3241 * 95.82) / 1000 * 1.04 + 68, 6);
  });
  it('domestic steel: (HRC + spread) / 1000 + freight', () => {
    expect(landed('ST', aicm).value).toBeCloseTo((46380 + 10200) / 1000 + 1.8, 6);
  });
  it('polymer: SM × FX / 1000 + compounding', () => {
    expect(landed('PL', aicm).value).toBeCloseTo((1514 * 95.82) / 1000 + 10, 6);
  });
  it('compressor import stack excludes IGST', () => {
    const cif = 72 * 95.82, bcd = cif * 0.15, aidc = cif * 0.0225, sws = (bcd + aidc) * 0.1, clr = cif * 0.015;
    const L = landed('CP', aicm);
    expect(L.value).toBeCloseTo(cif + bcd + aidc + sws + clr, 6);
    expect(L.unit).toBe('₹/unit');
    expect(L.steps[L.steps.length - 1]?.excluded).toBe(true);
  });
  it('refrigerant is the flat supplier rate', () => {
    expect(rates(aicm).RF).toBe(525);
  });
});

describe('compute (quote per set)', () => {
  it('Voltas VL-183V-3S = ₹29,031/set', () => {
    expect(Math.round(compute(model('M-VL18'), aicm).total)).toBe(29031);
  });
  it('Daikin DK-FTKM18-5S = ₹30,148/set', () => {
    expect(Math.round(compute(model('M-DK18'), aicm).total)).toBe(30148);
  });
  it('cost = material + assembly + freight + warranty + capped contingency; quote = cost × 1.08', () => {
    const c = compute(model('M-DK18'), aicm);
    expect(c.material).toBeCloseTo(c.common + c.exclusive, 6);
    expect(c.assembly).toBe(1030);
    expect(c.contingency).toBeCloseTo(Math.min(100000 / 2500, 0.006 * c.material), 6);
    expect(c.total).toBeCloseTo((c.material * 1.032 + 1030 + c.contingency) * 1.08, 6);
  });
  it('the credit exclusive part is negative', () => {
    const c = compute(model('M-DK18'), aicm);
    expect(c.exLines.find((e) => e.k === 'CRD')?.cost).toBe(-210);
  });
  it('SAP moving-average toggle and exclusive price overrides re-price', () => {
    const m = model('M-DK18');
    const lpp = compute(m, aicm), avg = compute(m, aicm, { priceMode: 'avg' });
    expect(avg.total).not.toBeCloseTo(lpp.total, 0);
    const edited = compute(m, aicm, { exPrice: { RMT: 240 } });
    expect(edited.exclusive - lpp.exclusive).toBeCloseTo(100, 6);
  });
  it('weights include exclusive material parts', () => {
    const m = model('M-DK18');
    expect(engineWeights(m).CU - engineWeights({ ...m, excl: [] }).CU).toBeCloseTo(0.45, 6);
  });
});

describe('history split (Daikin v1 → v3)', () => {
  it('rate effect +₹2,018 and scope effect −₹128', () => {
    const db = freshDB();
    const dk = db.versions.filter((v) => v.model === 'M-DK18').sort((a, b) => a.v - b.v);
    const v1 = dk[0], v3 = dk[2];
    expect(v1.snap).toEqual(SNAPS['Q1-2026']);
    const { rate, scope } = splitChange(model('M-DK18'), v1, v3);
    expect(Math.round(rate)).toBe(2018);
    expect(Math.round(scope)).toBe(-128);
    expect(rate + scope).toBeCloseTo(v3.total - v1.total, 6);
  });
});

describe('spec sheet', () => {
  it('has 72 rows, 55 of which go to the customer', () => {
    expect(specRows(true)).toHaveLength(72);
    expect(specRows(true).filter((r) => !r.internal)).toHaveLength(55);
  });
  it('specFor fills every template key', () => {
    const spec = specFor(model('M-LG24'));
    specRows(true).forEach((r) => expect(spec).toHaveProperty(r.k));
    expect(spec.wifi).toBe('Yes, app control');
  });
});
