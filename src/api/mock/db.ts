/* In-memory mock database (api.js freshDB/loadDB/saveDB/resetDB), persisted per browser. */
import { compute, specFor } from '../../domain/engine';
import { COMMODITIES, MODELS, PEOPLE, SEED_REQUESTS, SEED_VERSIONS, SNAPS, STATUS } from '../../domain/seed';
import type { AuditEvent, MailRecord, RateSnapshot, Request, Scenario, Version } from '../../domain/types';

export const STORE_KEY = 'chassisiq-poc-v1';

export interface DB {
  manual: RateSnapshot;
  manualFile: string | null;
  requests: Request[];
  versions: Version[];
  scenarios: Scenario[];
  audit: AuditEvent[];
  mails: MailRecord[];
  lastSync: string;
}

export function addDays(s: string, n: number): string {
  const d = new Date(s + 'T00:00:00');
  d.setDate(d.getDate() + n);
  // Local-date formatting (the POC used toISOString, which shifts a day east of UTC; see port notes).
  const p = (x: number) => String(x).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

const modelById = (id: string) => {
  const m = MODELS.find((x) => x.id === id);
  if (!m) throw new Error('Unknown model ' + id);
  return m;
};

export function freshDB(): DB {
  const manual = {} as RateSnapshot;
  COMMODITIES.forEach((c) => (manual[c.code] = c.q3));
  const requests: Request[] = SEED_REQUESTS.map((r) => {
    const m = modelById(r.model);
    const spec = specFor(m);
    const hist = [{ t: r.received + ' 10:12', who: 'rahul', a: 'Logged request', n: r.via }];
    const st = STATUS[r.status].step;
    if (r.lead && r.assignee) hist.push({ t: r.received + ' 15:40', who: r.lead, a: 'Allocated to ' + PEOPLE[r.assignee].name, n: 'Due ' + r.due });
    if (st >= 2 && r.assignee) hist.push({ t: addDays(r.received, 4) + ' 17:05', who: r.assignee, a: 'Submitted spec sheet', n: 'Spec v1' });
    if (st >= 3 && r.lead) hist.push({ t: addDays(r.received, 5) + ' 11:20', who: r.lead, a: 'Approved spec', n: 'Locked for costing' });
    if (st >= 4) hist.push({ t: addDays(r.received, 6) + ' 09:30', who: 'vivek', a: 'Started costing', n: 'Source: AICM' });
    if (st >= 6) hist.push({ t: addDays(r.received, 14) + ' 18:10', who: 'vivek', a: 'Sent customer sheet', n: 'v3 to sourcing@daikin (demo)' });
    return { ...r, spec, specLog: [], hist, versions: [] };
  });
  const versions: Version[] = SEED_VERSIONS.map((v, i) => {
    const m = modelById(v.model);
    const snap = SNAPS[v.basis];
    let excl = m.excl.slice();
    if (v.model === 'M-DK18' && v.v < 3) excl = excl.filter((k) => k !== 'PMF' && k !== 'CRD');
    if (v.model === 'M-VL18' && v.v === 1) excl = excl.filter((k) => k !== 'CRD');
    const r = compute(m, snap, { excl });
    return { id: 'VER-' + (1000 + i), ...v, snap, excl, total: r.total, material: r.material, sentTo: 'sourcing@' + m.brand.toLowerCase() + '.example' };
  });
  return {
    manual, manualFile: null, requests, versions, scenarios: [],
    audit: [
      { t: '2026-11-10 18:04', who: 'vivek', a: 'Synced commodity rates from AICM', obj: 'Commodity master' },
      { t: '2026-11-10 16:30', who: 'navdeep', a: 'Approved spec', obj: 'REQ-2610-008' },
      { t: '2026-11-09 11:15', who: 'rahul', a: 'Logged request', obj: 'REQ-2611-023' },
    ],
    mails: [], lastSync: '2026-11-06 01:13',
  };
}

const storage = (): Storage | null => {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
};

export function loadDB(): DB {
  try {
    const s = storage()?.getItem(STORE_KEY);
    if (s) return JSON.parse(s) as DB;
  } catch { /* corrupt or blocked storage: fall back to seed */ }
  return freshDB();
}
export function saveDB(db: DB): void {
  try { storage()?.setItem(STORE_KEY, JSON.stringify(db)); } catch { /* quota or private mode */ }
}
export function resetDB(): DB {
  const db = freshDB();
  saveDB(db);
  return db;
}
