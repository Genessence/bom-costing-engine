import { beforeEach, describe, expect, it } from 'vitest';
import { createMockClient } from './mockClient';
import { freshDB } from './db';
import { inspector } from '../inspector';
import { ApiError } from '../client';

const mk = () => createMockClient({ db: freshDB(), persist: false, latency: () => 0 });

describe('mock API', () => {
  beforeEach(() => inspector.clear());

  it('logs every call with method, path and status', async () => {
    const api = mk();
    await api.login('rahul');
    await api.requests();
    const log = inspector.getState().log;
    expect(log[0]).toMatchObject({ method: 'GET', path: '/api/requests', status: 200 });
    expect(log[1]).toMatchObject({ method: 'POST', path: '/api/auth/login', status: 201 });
  });

  it('returns 403 for forbidden roles and logs it', async () => {
    const api = mk();
    await api.login('rahul');
    await expect(api.allocate('REQ-2611-022', 'ritika')).rejects.toMatchObject({ status: 403 });
    await expect(api.commodities('aicm')).rejects.toBeInstanceOf(ApiError);
    await api.login('ritika');
    await expect(api.saveVersion('REQ-2610-008', {} as never)).rejects.toMatchObject({ status: 403 });
    await expect(api.chassis('I3')).rejects.toMatchObject({ status: 403 });
    expect(inspector.getState().log[0].status).toBe(403);
  });

  it('runs the request workflow NEW → RND → SUBMITTED → APPROVED → COSTING → COSTED → SENT', async () => {
    const api = mk();
    await api.login('rahul');
    const r = await api.createRequest({ model: 'M-VL18', via: 'Email', due: '2026-12-02', priority: 'Medium', note: 'x' });
    expect(r.status).toBe('NEW');
    expect(r.id).toBe('REQ-2611-030');
    await api.login('navdeep');
    expect((await api.allocate(r.id, 'ritika')).status).toBe('RND');
    await api.login('ritika');
    const s = await api.saveSpec(r.id, { iseer: '4.3' });
    expect(s.spec.iseer).toBe('4.3');
    expect(s.specLog).toHaveLength(1);
    expect((await api.submitSpec(r.id)).status).toBe('SUBMITTED');
    await api.login('navdeep');
    await expect(api.decide(r.id, false, '')).rejects.toMatchObject({ status: 400 });
    expect((await api.decide(r.id, true, '')).status).toBe('APPROVED');
    await api.login('vivek');
    expect((await api.startCosting(r.id, 'AICM')).status).toBe('COSTING');
    const v = await api.saveVersion(r.id, { snap: freshDB().manual, excl: ['FAS'], total: 1, material: 1, source: 'AICM', basis: 'Q3-2026', note: '' });
    expect(v.v).toBe(4);
    await expect(api.sendMail(v.id, 'not-an-email')).rejects.toMatchObject({ status: 400 });
    expect((await api.sendMail(v.id, 'buyer@voltas.example')).status).toBe('SENT');
    expect((await api.requests()).find((x) => x.id === r.id)?.status).toBe('SENT');
  });

  it('returns copies, not live references', async () => {
    const api = mk();
    await api.login('vivek');
    const a = await api.requests();
    a[0].status = 'SENT';
    a[0].note = 'mutated';
    expect((await api.requests())[0].note).not.toBe('mutated');
  });

  it('manual upload loads the sheet; reset restores the seed', async () => {
    const api = mk();
    await api.login('vivek');
    await api.uploadManual('Rates_Q4_FY27.xlsx');
    expect((await api.commodities('manual')).manual.CU).toBe(15000);
    await api.resetDemo();
    expect((await api.commodities('manual')).manual.CU).toBe(14101.73);
  });
});
