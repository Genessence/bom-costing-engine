/* The only door to data. Screens talk to an ApiClient; mock and HTTP implementations share this contract.
   Identity comes from the token returned by login(), never from arguments, so the HTTP client can drop in. */
import type {
  AuditEvent, Chassis, ExclusiveKey, Model, Person, Priority, RateMode, RateSnapshot, Request, Scenario,
  SimPct, Version, VersionSource,
} from '../domain/types';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface LoginResult { user: Person; token: string }
export interface NewRequestInput { model: string; via: string; due: string; priority: Priority; note: string }
export interface CommodityState { mode: RateMode; manual: RateSnapshot; manualFile: string | null; lastSync: string }
export interface SaveVersionInput {
  snap: RateSnapshot;
  excl: ExclusiveKey[];
  total: number;
  material: number;
  source: VersionSource;
  basis: string;
  note: string;
}
export interface NewScenarioInput { name: string; pct: SimPct; models: string[] }

export interface ApiClient {
  /** POST /api/auth/login */
  login(userId: string): Promise<LoginResult>;
  /** GET /api/requests */
  requests(): Promise<Request[]>;
  /** POST /api/requests */
  createRequest(data: NewRequestInput): Promise<Request>;
  /** PATCH /api/requests/:id/allocate (lead only) */
  allocate(id: string, assignee: string): Promise<Request>;
  /** PUT /api/requests/:id/spec (assigned R&D only; writes the spec log) */
  saveSpec(id: string, changes: Record<string, string>): Promise<Request>;
  /** POST /api/requests/:id/submit */
  submitSpec(id: string): Promise<Request>;
  /** POST /api/requests/:id/approve | /return (lead only; return requires a note) */
  decide(id: string, ok: boolean, note: string): Promise<Request>;
  /** POST /api/costing/:id/start (APPROVED → COSTING) */
  startCosting(id: string, source: VersionSource): Promise<Request>;
  /** GET /api/chassis/:code */
  chassis(code: string): Promise<Chassis>;
  /** GET /api/commodities?source=aicm|manual */
  commodities(mode: RateMode): Promise<CommodityState>;
  /** POST /api/integrations/aicm/sync */
  syncAICM(): Promise<{ synced: number; lastSync: string }>;
  /** PUT /api/commodities/manual */
  saveManual(values: Partial<RateSnapshot>): Promise<RateSnapshot>;
  /** POST /api/commodities/manual/upload */
  uploadManual(fileName: string): Promise<RateSnapshot>;
  /** POST /api/costing/:reqId/versions (freezes snapshot, exclusives, total) */
  saveVersion(reqId: string, payload: SaveVersionInput): Promise<Version>;
  /** GET /api/costing/versions — extension: the POC read versions straight from its DB */
  versions(): Promise<Version[]>;
  /** GET /api/sap/bom/:modelCode */
  sapBom(modelCode: string): Promise<Model>;
  /** GET /api/sap/lpp?material= */
  sapLpp(material: string): Promise<boolean>;
  /** GET /api/simulations — extension: the POC read scenarios straight from its DB */
  scenarios(): Promise<Scenario[]>;
  /** POST /api/simulations */
  saveScenario(sc: NewScenarioInput): Promise<Scenario>;
  /** POST /api/mail/send */
  sendMail(versionId: string, to: string): Promise<Version>;
  /** GET /api/audit */
  audit(): Promise<AuditEvent[]>;
  /** POST /api/admin/reset-demo — demo-only: restore the seed data */
  resetDemo(): Promise<void>;
}
