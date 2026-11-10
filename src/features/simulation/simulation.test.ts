import { describe, expect, it } from 'vitest';
import { landed, snapshotFrom } from '../../domain/engine';
import { SEED_MANUAL } from '../../state/session';
import { copperPresetPct, simSnap } from './Simulation';

describe('simulation copper preset', () => {
  it('lands copper at ~₹1,700/kg', () => {
    const base = snapshotFrom('aicm', SEED_MANUAL);
    const pct = copperPresetPct(base);
    expect(pct).toBe(15);
    const v = landed('CU', simSnap(base, { CU: pct, AL: 0, FX: 0, ST: 0, PL: 0, CP: 0, RF: 0 })).value;
    expect(Math.abs(v - 1700)).toBeLessThan(15);
  });
});
