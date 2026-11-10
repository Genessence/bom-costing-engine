/* Mock backend (ported from api.js): in-memory DB persisted to localStorage, 180–600 ms latency,
   403 for forbidden roles, every call logged to the inspector. Returns deep copies so callers can't
   mutate the "server" state by accident. */
import { specFor } from '../../domain/engine';
import { can, canEditSpec, COSTABLE_STATUSES, type Action } from '../../domain/permissions';
import { COMMODITIES, IDU_CHASSIS, MODELS, ODU_CHASSIS, PEOPLE, UPLOAD_SHEET } from '../../domain/seed';
import type { Person, Request, Scenario, Version } from '../../domain/types';
import { ApiError, type ApiClient } from '../client';
import { tracked } from '../inspector';
import { freshDB, loadDB, resetDB, saveDB, type DB } from './db';

export interface MockOptions {
  /** Override latency (tests pass 0). Default: 180–600 ms random, or the POC's fixed per-call value. */
  latency?: (fixedMs?: number) => number;
  db?: DB;
  persist?: boolean;
}

const clone = <T,>(v: T): T => structuredClone(v);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return '2026-11-11 ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

export function createMockClient(opts: MockOptions = {}): ApiClient & { _db(): DB } {
  let DB: DB = opts.db ?? loadDB();
  const persist = opts.persist ?? true;
  const latency = opts.latency ?? ((fixed?: number) => fixed ?? 180 + Math.round(Math.random() * 420));
  let session: Person | null = null;

  const audit = (who: string, a: string, obj: string) => DB.audit.unshift({ t: nowStamp(), who, a, obj });

  function call<T>(method: string, path: string, fn: () => T, fixedMs?: number): Promise<T> {
    return tracked(method, path, async () => {
      await sleep(latency(fixedMs));
      const out = fn();
      if (persist) saveDB(DB);
      return clone(out);
    });
  }

  const me = (): Person => {
    if (!session) throw new ApiError(401, 'Sign in first');
    return session;
  };
  const allow = (action: Action, msg: string): Person => {
    const u = me();
    if (!can(u.role, action)) throw new ApiError(403, msg);
    return u;
  };
  const req = (id: string): Request => {
    const r = DB.requests.find((x) => x.id === id);
    if (!r) throw new ApiError(404, 'Request ' + id + ' not found');
    return r;
  };
  const needStatus = (r: Request, ok: readonly string[], what: string) => {
    if (!ok.includes(r.status)) throw new ApiError(409, 'Cannot ' + what + ' while the request is ' + r.status);
  };

  return {
    _db: () => DB,

    login: (uid) =>
      call('POST', '/api/auth/login', () => {
        const user = PEOPLE[uid];
        if (!user) throw new ApiError(401, 'Unknown user');
        session = user;
        return { user, token: 'demo.' + uid };
      }),

    requests: () => call('GET', '/api/requests', () => { me(); return DB.requests; }),

    createRequest: (data) =>
      call('POST', '/api/requests', () => {
        const u = allow('request:create', 'Your role cannot log customer requests');
        const m = MODELS.find((x) => x.id === data.model);
        if (!m) throw new ApiError(400, 'Pick a brand and model');
        if (!data.due) throw new ApiError(400, 'Reply due date is required');
        const n = String(24 + DB.requests.filter((r) => r.id.startsWith('REQ-2611')).length).padStart(3, '0');
        const r: Request = {
          id: 'REQ-2611-' + n, model: data.model, received: '2026-11-11', due: data.due, status: 'NEW', priority: data.priority,
          lead: null, assignee: null, via: data.via, note: data.note, spec: specFor(m), specLog: [],
          hist: [{ t: nowStamp(), who: u.id, a: 'Logged request', n: data.via }], versions: [],
        };
        DB.requests.unshift(r);
        audit(u.id, 'Logged request', r.id);
        return r;
      }),

    allocate: (id, assignee) =>
      call('PATCH', '/api/requests/' + id + '/allocate', () => {
        const u = allow('request:allocate', 'Only team leads can allocate');
        const r = req(id);
        needStatus(r, ['NEW'], 'allocate');
        const eng = PEOPLE[assignee];
        if (!eng || eng.role !== 'rnd') throw new ApiError(400, 'Pick an R&D engineer');
        r.lead = u.id; r.assignee = assignee; r.status = 'RND';
        r.hist.push({ t: nowStamp(), who: u.id, a: 'Allocated to ' + eng.name, n: 'Due ' + r.due });
        audit(u.id, 'Allocated to ' + eng.name, id);
        return r;
      }),

    saveSpec: (id, changes) =>
      call('PUT', '/api/requests/' + id + '/spec', () => {
        const u = allow('spec:edit', 'Only R&D can edit specifications');
        const r = req(id);
        if (!canEditSpec(u, r)) throw new ApiError(403, 'This spec is not open for you to edit');
        Object.entries(changes).forEach(([k, v]) => {
          r.specLog.push({ t: nowStamp(), who: u.id, k, from: r.spec[k], to: v });
          r.spec[k] = v;
        });
        audit(u.id, 'Edited ' + Object.keys(changes).length + ' spec field(s)', id);
        return r;
      }),

    submitSpec: (id) =>
      call('POST', '/api/requests/' + id + '/submit', () => {
        const u = allow('spec:submit', 'Only R&D can submit specifications');
        const r = req(id);
        if (!canEditSpec(u, r)) throw new ApiError(403, 'This spec is not open for you to submit');
        r.status = 'SUBMITTED';
        r.hist.push({ t: nowStamp(), who: u.id, a: 'Submitted spec sheet', n: 'Sent to ' + (r.lead ? PEOPLE[r.lead].name : 'team lead') });
        audit(u.id, 'Submitted spec', id);
        return r;
      }),

    decide: (id, ok, note) =>
      call('POST', '/api/requests/' + id + (ok ? '/approve' : '/return'), () => {
        const u = allow('spec:decide', 'Only team leads can approve');
        const r = req(id);
        needStatus(r, ['SUBMITTED'], ok ? 'approve' : 'return');
        if (!ok && !note.trim()) throw new ApiError(400, 'Add a note so R&D knows what to change');
        r.status = ok ? 'APPROVED' : 'RETURNED';
        r.hist.push({ t: nowStamp(), who: u.id, a: ok ? 'Approved spec' : 'Returned spec to R&D', n: note || (ok ? 'Locked for costing' : '') });
        audit(u.id, ok ? 'Approved spec' : 'Returned spec', id);
        return r;
      }),

    startCosting: (id, source) =>
      call('POST', '/api/costing/' + id + '/start', () => {
        const u = allow('costing:write', 'Only the costing team can open the workbench');
        const r = req(id);
        if (r.status === 'APPROVED') {
          r.status = 'COSTING';
          r.hist.push({ t: nowStamp(), who: u.id, a: 'Started costing', n: 'Source: ' + source });
          audit(u.id, 'Started costing', id);
        }
        return r;
      }, 220),

    chassis: (code) =>
      call('GET', '/api/chassis/' + code, () => {
        allow('costing:read', 'Chassis costs are visible to the costing team only');
        const c = code.startsWith('I') ? IDU_CHASSIS[code] : ODU_CHASSIS[code];
        if (!c) throw new ApiError(404, 'No chassis ' + code);
        return c;
      }, 260),

    commodities: (mode) =>
      call('GET', '/api/commodities?source=' + mode, () => {
        allow('costing:read', 'Commodity rates are visible to the costing team only');
        return { mode, manual: DB.manual, manualFile: DB.manualFile, lastSync: DB.lastSync };
      }),

    syncAICM: () =>
      call('POST', '/api/integrations/aicm/sync', () => {
        const u = allow('commodities:write', 'Only the costing team can sync rates');
        DB.lastSync = nowStamp();
        audit(u.id, 'Synced commodity rates from AICM', 'Commodity master');
        return { synced: COMMODITIES.length, lastSync: DB.lastSync };
      }, 1400),

    saveManual: (vals) =>
      call('PUT', '/api/commodities/manual', () => {
        const u = allow('commodities:write', 'Only the costing team can edit rates');
        Object.entries(vals).forEach(([k, v]) => {
          if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) throw new ApiError(400, 'Every rate needs a number above zero');
          if (!(k in DB.manual)) throw new ApiError(400, 'Unknown commodity ' + k);
        });
        Object.assign(DB.manual, vals);
        audit(u.id, 'Updated manual commodity rates', 'Commodity master');
        return DB.manual;
      }),

    uploadManual: (file) =>
      call('POST', '/api/commodities/manual/upload', () => {
        const u = allow('commodities:write', 'Only the costing team can upload rates');
        Object.assign(DB.manual, UPLOAD_SHEET);
        DB.manualFile = file;
        audit(u.id, 'Uploaded rates sheet ' + file, 'Commodity master');
        return { ...UPLOAD_SHEET };
      }, 1100),

    saveVersion: (reqId, payload) =>
      call('POST', '/api/costing/' + reqId + '/versions', () => {
        const u = allow('costing:write', 'Only the costing team can save versions');
        const r = req(reqId);
        needStatus(r, COSTABLE_STATUSES, 'save a costing');
        const prev = DB.versions.filter((v) => v.model === r.model);
        const m = MODELS.find((x) => x.id === r.model)!;
        const v: Version = {
          id: 'VER-' + (1100 + DB.versions.length), model: r.model, req: reqId, v: prev.length + 1, quarter: 'Q4 2026', basis: payload.basis,
          on: '2026-11-11', by: u.id, source: payload.source, status: 'DRAFT', note: payload.note || '', snap: payload.snap, excl: payload.excl,
          total: payload.total, material: payload.material, sentTo: 'sourcing@' + m.brand.toLowerCase() + '.example',
        };
        DB.versions.push(v);
        r.status = 'COSTED';
        r.hist.push({ t: nowStamp(), who: u.id, a: 'Saved costing v' + v.v, n: '₹' + Math.round(v.total).toLocaleString('en-IN') + ' per set, ' + payload.source });
        audit(u.id, 'Saved costing v' + v.v, reqId);
        return v;
      }),

    versions: () => call('GET', '/api/costing/versions', () => { me(); return DB.versions; }, 200),

    sapBom: (code) =>
      call('GET', '/api/sap/bom/' + code + '?plant=1100&usage=1', () => {
        allow('sap:read', 'SAP BOMs are visible to the costing team only');
        const m = MODELS.find((x) => x.code === code);
        if (!m) throw new ApiError(404, 'No BOM for ' + code + ' in SAP');
        return m;
      }, 500),

    sapLpp: (code) =>
      call('GET', '/api/sap/lpp?material=' + code, () => { allow('sap:read', 'LPP is visible to the costing team only'); return true; }, 400),

    scenarios: () =>
      call('GET', '/api/simulations', () => { allow('costing:read', 'Simulations are visible to the costing team only'); return DB.scenarios; }, 200),

    saveScenario: (input) =>
      call('POST', '/api/simulations', () => {
        const u = allow('simulation:write', 'Only the costing team can save scenarios');
        const sc: Scenario = { ...input, id: 'SIM-' + (200 + DB.scenarios.length), by: u.id, on: nowStamp() };
        DB.scenarios.unshift(sc);
        audit(u.id, 'Saved simulation ' + sc.name, sc.id);
        return sc;
      }),

    sendMail: (verId, to) =>
      call('POST', '/api/mail/send', () => {
        const u = allow('mail:send', 'Only the costing team can send quotations');
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) throw new ApiError(400, 'Enter a valid customer email address');
        const v = DB.versions.find((x) => x.id === verId);
        if (!v) throw new ApiError(404, 'Version ' + verId + ' not found');
        v.status = 'SENT'; v.sentTo = to;
        const r = DB.requests.find((x) => x.id === v.req);
        if (r) { r.status = 'SENT'; r.hist.push({ t: nowStamp(), who: u.id, a: 'Sent customer sheet', n: 'v' + v.v + ' to ' + to }); }
        DB.mails.unshift({ t: nowStamp(), to, ver: verId });
        audit(u.id, 'Emailed customer sheet v' + v.v + ' to ' + to, v.req);
        return v;
      }, 900),

    audit: () => call('GET', '/api/audit?limit=50', () => { me(); return DB.audit; }, 200),

    resetDemo: () =>
      call('POST', '/api/admin/reset-demo', () => {
        DB = persist ? resetDB() : freshDB();
      }, 200),
  };
}
