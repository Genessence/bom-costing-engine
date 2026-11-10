/* Domain types for ChassisIQ. Shapes mirror the POC's data.js / api.js one to one. */

export type MatCode = 'CU' | 'AL' | 'PL' | 'RF' | 'CP' | 'ST';
export type CommodityCode = MatCode | 'FX';
/** Weight buckets (compressor is priced per unit, so it has no weight). */
export type WeightCode = 'CU' | 'AL' | 'ST' | 'PL' | 'RF';
export type RateMode = 'aicm' | 'manual';
export type PriceMode = 'lpp' | 'avg';
export type RoleId = 'kam' | 'lead' | 'rnd' | 'costing' | 'admin';
export type ModuleId =
  | 'home' | 'requests' | 'spec' | 'costing' | 'commodities' | 'simulation'
  | 'bom' | 'history' | 'library' | 'admin';

export type CommodityStructure = 'lme' | 'fx' | 'domestic' | 'polymer' | 'import' | 'flat';

export interface Commodity {
  code: CommodityCode;
  name: string;
  index: string;
  src: string;
  unit: string;
  cur: number;
  q1: number;
  q2: number;
  q3: number;
  hist: number[];
  structure: CommodityStructure;
  premium?: number;
  conv?: number;
  convLabel?: string;
  spread?: number;
  freight?: number;
  compounding?: number;
  bcd?: number;
  aidc?: number;
  sws?: number;
  clearing?: number;
  igst?: number;
  hsn?: string;
}

/** Commodity index values used for a costing (one number per commodity). */
export type RateSnapshot = Record<CommodityCode, number>;

export interface IduChassis { code: string; label: string; width: number; tr: string; s: number }
export interface OduChassis { code: string; label: string; fan: number; tr: string; s: number; cp: number }
export type Chassis = IduChassis | OduChassis;

export type Zone =
  | 'coil' | 'fan' | 'body' | 'louver' | 'plate' | 'pcb' | 'cabinet' | 'base' | 'comp' | 'pipe';

interface BomLineBase { pc: string; name: string; zone: Zone }
export interface MatLine extends BomLineBase { type: 'mat'; m: WeightCode; kg: number; scrap: number; proc: number }
export interface CompressorLine extends BomLineBase { type: 'cp' }
export interface BoughtOutLine extends BomLineBase { type: 'bo'; lpp: number; avg: number }
export type BomLine = MatLine | CompressorLine | BoughtOutLine;

export type ExclusiveKey = 'FAS' | 'DSP' | 'RMT' | 'CTN' | 'NMP' | 'WIF' | 'BLF' | 'XCU' | 'PMF' | 'CRD';
export type ExclusivePart =
  | { name: string; type: 'mat'; m: WeightCode; kg: number; proc: number; sign: 1 | -1 }
  | { name: string; type: 'bo'; price: number; sign: 1 | -1 };

export interface Overheads {
  assembly: { IDU: number; ODU: number };
  freightPct: number;
  warrantyPct: number;
  marginPct: number;
  contingency: { label: string; amount: number; lotQty: number; capPct: number };
}

export interface Model {
  id: string;
  brand: string;
  series: string;
  name: string;
  code: string;
  idu: string;
  odu: string;
  tr: number;
  star: number;
  iseer: number;
  excl: ExclusiveKey[];
  wifi: boolean;
}

export interface Person { id: string; name: string; role: RoleId; title: string; tone: string }
export interface Role { label: string; can: string; modules: ModuleId[] }

/** [key, label, internal?] */
export type SpecField = [string, string, 1?];
export type SpecSection = [string, SpecField[]];
export type Spec = Record<string, string | number>;

export type Status =
  | 'NEW' | 'ALLOCATED' | 'RND' | 'RETURNED' | 'SUBMITTED' | 'APPROVED' | 'COSTING' | 'COSTED' | 'SENT';
export type Priority = 'High' | 'Medium' | 'Low';

export interface HistEntry { t: string; who: string; a: string; n: string }
export interface SpecLogEntry { t: string; who: string; k: string; from: string | number; to: string | number }

export interface SeedRequest {
  id: string;
  model: string;
  received: string;
  due: string;
  status: Status;
  priority: Priority;
  lead: string | null;
  assignee: string | null;
  via: string;
  note: string;
}
export interface Request extends SeedRequest {
  spec: Spec;
  specLog: SpecLogEntry[];
  hist: HistEntry[];
  versions: string[];
}

export type VersionSource = 'AICM' | 'Manual';
export interface SeedVersion {
  model: string;
  req: string;
  v: number;
  quarter: string;
  basis: string;
  on: string;
  by: string;
  source: VersionSource;
  status: 'SENT' | 'DRAFT';
  note: string;
}
export interface Version extends SeedVersion {
  id: string;
  snap: RateSnapshot;
  excl: ExclusiveKey[];
  total: number;
  material: number;
  sentTo: string;
}

export type SimPct = Record<CommodityCode, number>;
export interface Scenario { id: string; name: string; pct: SimPct; models: string[]; by: string; on: string }

export interface AuditEvent { t: string; who: string; a: string; obj: string }
export interface MailRecord { t: string; to: string; ver: string }

/* ----- engine outputs ----- */
export interface LandedStep { label: string; value: number; unit: string; excluded?: boolean }
export interface Landed { code: CommodityCode; steps: LandedStep[]; value: number; unit: string }
export type LandedRates = Record<MatCode, number>;

export interface CostLine {
  unit: 'IDU' | 'ODU';
  pc: string;
  name: string;
  type: BomLine['type'];
  m?: WeightCode;
  kg: number;
  cost: number;
  lpp: number;
  avg: number;
  zone: Zone;
}
export interface ExCostLine { k: ExclusiveKey; name: string; type: 'mat' | 'bo'; m?: WeightCode; kg: number; cost: number; sign: 1 | -1 }
export type Weights = Record<WeightCode, number>;
export type ByMaterial = Record<WeightCode | 'CP' | 'BO', number>;

export interface ComputeOptions {
  excl?: ExclusiveKey[];
  exPrice?: Partial<Record<ExclusiveKey, number>>;
  priceMode?: PriceMode;
  noCont?: boolean;
}
export interface CostResult {
  lines: CostLine[];
  exLines: ExCostLine[];
  common: number;
  exclusive: number;
  material: number;
  assembly: number;
  freight: number;
  warranty: number;
  contingency: number;
  contRaw: number;
  contCap: number;
  cost: number;
  margin: number;
  total: number;
  byMat: ByMaterial;
  weights: Weights;
  R: LandedRates;
}
