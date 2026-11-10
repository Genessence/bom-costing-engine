/* Seed data, ported verbatim from the POC's data.js.
   Commodity values from AICM (06 Nov 2026) + public data; everything else is labelled demo data. */
import type {
  BomLine, Commodity, CommodityCode, ExclusiveKey, ExclusivePart, IduChassis, MatCode, Model,
  ModuleId, OduChassis, Overheads, Person, RateSnapshot, Role, RoleId, SeedRequest, SeedVersion,
  SpecSection, Status,
} from './types';

export const COLORS: Record<MatCode, string> = {CU:'#B5622D', AL:'#2F7FC1', PL:'#C79A1E', RF:'#1E9C94', CP:'#8A57A8', ST:'#6E8A2A'};
export const MAT_NAME: Record<MatCode, string> = {CU:'Copper', AL:'Aluminium', PL:'Plastic', RF:'Refrigerant', CP:'Compressor', ST:'Steel'};

export const COMMODITIES: Commodity[] = [
  {code:'CU', name:'Copper (IGT tube)', index:'LME Copper', src:'Metals-API, London (LME)', unit:'USD/MT', cur:14110, q1:12840.25, q2:13331.63, q3:14101.73, hist:[10649,11420,12380,12840,13010,13331,13890,14101,14461,14110], structure:'lme', premium:0.035, conv:92, convLabel:'Tube drawing & IGT conversion'},
  {code:'AL', name:'Aluminium fin stock', index:'LME Aluminium', src:'Metals-API, London (LME)', unit:'USD/MT', cur:3160, q1:3080, q2:3412, q3:3241, hist:[2980,3020,3080,3150,3390,3412,3260,3241,3196,3160], structure:'lme', premium:0.04, conv:68, convLabel:'Fin stock rolling & coating'},
  {code:'FX', name:'INR per USD', index:'INR per USD', src:'Metals-API, FX (global)', unit:'INR/USD', cur:94.44, q1:91.2, q2:94.1, q3:95.82, hist:[88.6,89.4,90.6,91.2,93.1,94.1,96.2,95.82,96.4,94.44], structure:'fx'},
  {code:'ST', name:'Steel CRC / GI sheet', index:'Hot Rolled Coil', src:'Metals-API, India', unit:'INR/MT', cur:45083.97, q1:47200, q2:48150, q3:46380, hist:[49800,48900,47600,47200,48400,48150,47100,46380,45900,45084], structure:'domestic', spread:10200, freight:1.8},
  {code:'PL', name:'ABS / PP resin', index:'Styrene Monomer', src:'Polymerupdate, India', unit:'USD/MT', cur:1590, q1:1480, q2:1525, q3:1514, hist:[1420,1450,1470,1480,1510,1525,1500,1514,1540,1590], structure:'polymer', compounding:10},
  {code:'CP', name:'Rotary inverter compressor (1.5 TR)', index:'Vendor CIF quote (LPP)', src:'SAP LPP + customs duty stack', unit:'USD/unit', cur:72, q1:70, q2:71, q3:72, hist:[69,69,70,70,71,71,72,72,72,72], structure:'import', bcd:0.15, aidc:0.0225, sws:0.10, clearing:0.015, igst:0.18, hsn:'8414 30 00'},
  {code:'RF', name:'Refrigerant R32', index:'Domestic supplier quote', src:'SAP LPP', unit:'INR/kg', cur:520, q1:540, q2:510, q3:525, hist:[560,550,545,540,520,510,515,525,522,520], structure:'flat'}
];

export const QUARTER_BASIS = {label:'Q3 FY26-27 average (Jul–Sep 2026)', short:'Q3 avg', quoteFor:'Q4 (Oct–Dec 2026)'};

/* Chassis masters — common parts (~80%). Values are demo assumptions to be replaced with Amber's chassis BOMs */
export const IDU_CHASSIS: Record<string, IduChassis> = {
  I2:{code:'I2', label:'I2 indoor chassis', width:820, tr:'0.8–1.0 TR', s:0.8},
  I3:{code:'I3', label:'I3 indoor chassis', width:960, tr:'1.5 TR', s:1},
  I4:{code:'I4', label:'I4 indoor chassis', width:1080, tr:'1.8–2.0 TR', s:1.25}
};
export const ODU_CHASSIS: Record<string, OduChassis> = {
  O20:{code:'O20', label:'O20 outdoor chassis (20" fan)', fan:20, tr:'0.8–1.0 TR', s:0.8, cp:0.82},
  O22:{code:'O22', label:'O22 outdoor chassis (22" fan)', fan:22, tr:'1.5 TR', s:1, cp:1},
  O24:{code:'O24', label:'O24 outdoor chassis (24" fan)', fan:24, tr:'1.8–2.0 TR', s:1.3, cp:1.32}
};
export const IDU_LINES: BomLine[] = [
  {pc:'EVC-CU', name:'Evaporator coil, copper tube 7mm IGT', type:'mat', m:'CU', kg:1.35, scrap:.06, proc:85, zone:'coil'},
  {pc:'EVC-AL', name:'Evaporator fins, hydrophilic Al', type:'mat', m:'AL', kg:0.95, scrap:.08, proc:20, zone:'coil'},
  {pc:'IDB-ABS', name:'Chassis base moulding', type:'mat', m:'PL', kg:1.60, scrap:.03, proc:38, zone:'body'},
  {pc:'CFB-ABS', name:'Cross-flow blower wheel', type:'mat', m:'PL', kg:0.42, scrap:.03, proc:22, zone:'fan'},
  {pc:'DRP-PP', name:'Drain pan', type:'mat', m:'PL', kg:0.45, scrap:.03, proc:14, zone:'body'},
  {pc:'LVR-ABS', name:'Louver & vane set', type:'mat', m:'PL', kg:0.25, scrap:.03, proc:12, zone:'louver'},
  {pc:'MTP-CRC', name:'Wall mounting plate', type:'mat', m:'ST', kg:0.65, scrap:.08, proc:10, zone:'plate'},
  {pc:'STB-CU', name:'Indoor connecting stubs', type:'mat', m:'CU', kg:0.18, scrap:.04, proc:12, zone:'coil'},
  {pc:'BLDC-IM', name:'BLDC indoor fan motor', type:'bo', lpp:640, avg:612, zone:'fan'},
  {pc:'PCB-IDU', name:'Inverter control PCB (IDU)', type:'bo', lpp:780, avg:802, zone:'pcb'},
  {pc:'SWM-2', name:'Swing motors (2 nos)', type:'bo', lpp:92, avg:88, zone:'louver'},
  {pc:'HRN-IDU', name:'Thermistors & wiring harness', type:'bo', lpp:118, avg:110, zone:'pcb'},
  {pc:'FST-IDU', name:'Fasteners & clips kit', type:'bo', lpp:28, avg:27, zone:'body'}
];
export const ODU_LINES: BomLine[] = [
  {pc:'CDC-CU', name:'Condenser coil, copper tube 7mm', type:'mat', m:'CU', kg:2.60, scrap:.06, proc:140, zone:'coil'},
  {pc:'CDC-AL', name:'Condenser fins, Al', type:'mat', m:'AL', kg:1.70, scrap:.08, proc:30, zone:'coil'},
  {pc:'CAB-GI', name:'Cabinet panels, GI sheet', type:'mat', m:'ST', kg:6.80, scrap:.10, proc:120, zone:'cabinet'},
  {pc:'BSP-GI', name:'Base pan, GI sheet', type:'mat', m:'ST', kg:2.40, scrap:.10, proc:45, zone:'base'},
  {pc:'AXF-PP', name:'Axial fan blade', type:'mat', m:'PL', kg:0.55, scrap:.03, proc:18, zone:'fan'},
  {pc:'ICT-CU', name:'Interconnect & capillary tubing', type:'mat', m:'CU', kg:0.90, scrap:.05, proc:55, zone:'pipe'},
  {pc:'R32-CHG', name:'Refrigerant charge R32', type:'mat', m:'RF', kg:0.95, scrap:.02, proc:0, zone:'pipe'},
  {pc:'CMP-RI', name:'Rotary inverter compressor', type:'cp', zone:'comp'},
  {pc:'BLDC-OM', name:'BLDC outdoor fan motor', type:'bo', lpp:820, avg:790, zone:'fan'},
  {pc:'PCB-ODU', name:'Inverter drive PCB (ODU)', type:'bo', lpp:1450, avg:1390, zone:'pcb'},
  {pc:'EEV-4W', name:'EEV / 4-way valve', type:'bo', lpp:380, avg:395, zone:'pipe'},
  {pc:'SVV-BR', name:'Service valves, brass', type:'bo', lpp:210, avg:198, zone:'pipe'},
  {pc:'EBX-HRN', name:'Electrical box & harness', type:'bo', lpp:260, avg:248, zone:'pcb'},
  {pc:'AVM-FST', name:'Anti-vibration mounts & fasteners', type:'bo', lpp:85, avg:80, zone:'base'}
];

/* Exclusive parts catalogue (~20%), brand/model specific */
export const EXCLUSIVES: Record<ExclusiveKey, ExclusivePart> = {
  FAS:{name:'Front fascia & panel, brand design', type:'mat', m:'PL', kg:1.10, proc:65, sign:1},
  DSP:{name:'Display PCB with brand logo window', type:'bo', price:185, sign:1},
  RMT:{name:'Remote control, brand moulded', type:'bo', price:140, sign:1},
  CTN:{name:'Printed cartons, IDU + ODU', type:'bo', price:310, sign:1},
  NMP:{name:'Brand nameplate & badges', type:'bo', price:22, sign:1},
  WIF:{name:'Wi-Fi smart module', type:'bo', price:365, sign:1},
  BLF:{name:'Blue-fin anti-corrosion coating', type:'bo', price:145, sign:1},
  XCU:{name:'Extra copper for 5-star coil rows', type:'mat', m:'CU', kg:0.45, proc:25, sign:1},
  PMF:{name:'PM2.5 filter', type:'bo', price:95, sign:1},
  CRD:{name:'Credit: generic panel removed from chassis', type:'bo', price:210, sign:-1}
};

export const OVERHEADS: Overheads = {assembly:{IDU:420, ODU:610}, freightPct:0.012, warrantyPct:0.02, marginPct:0.08,
  contingency:{label:'Container held at port', amount:100000, lotQty:2500, capPct:0.006}};

export const BRANDS: string[] = ['Daikin','Voltas','LG','Hitachi','Panasonic','Whirlpool','Godrej'];
export const BRAND_TONE: Record<string, string> = {Daikin:'#2F7FC1', Voltas:'#4F5FB0', LG:'#8A57A8', Hitachi:'#465650', Panasonic:'#1E9C94', Whirlpool:'#C79A1E', Godrej:'#6E8A2A'};

export const MODELS: Model[] = [
  {id:'M-DK18', brand:'Daikin', series:'Inverter split', name:'Daikin 1.5 TR 5-star inverter split', code:'DK-FTKM18-5S', idu:'I3', odu:'O22', tr:1.5, star:5, iseer:5.2, excl:['FAS','DSP','RMT','CTN','NMP','XCU','PMF','CRD'], wifi:false},
  {id:'M-VL18', brand:'Voltas', series:'Inverter split', name:'Voltas 1.5 TR 3-star inverter split', code:'VL-183V-3S', idu:'I3', odu:'O22', tr:1.5, star:3, iseer:4.1, excl:['FAS','RMT','CTN','NMP','CRD'], wifi:false},
  {id:'M-LG24', brand:'LG', series:'AI dual inverter', name:'LG 2.0 TR 5-star dual inverter split', code:'LG-24K-5S', idu:'I4', odu:'O24', tr:2, star:5, iseer:5.0, excl:['FAS','DSP','RMT','CTN','NMP','WIF','XCU','BLF','CRD'], wifi:true},
  {id:'M-GD12', brand:'Godrej', series:'Inverter split', name:'Godrej 1.0 TR 3-star inverter split', code:'GD-12N-3S', idu:'I2', odu:'O20', tr:1, star:3, iseer:4.0, excl:['FAS','RMT','CTN','NMP'], wifi:false},
  {id:'M-HT18', brand:'Hitachi', series:'Inverter split', name:'Hitachi 1.5 TR 4-star inverter split', code:'HT-18Z-4S', idu:'I3', odu:'O22', tr:1.5, star:4, iseer:4.6, excl:['FAS','DSP','RMT','CTN','NMP','BLF','CRD'], wifi:false},
  {id:'M-PN18', brand:'Panasonic', series:'Smart inverter', name:'Panasonic 1.5 TR 3-star Wi-Fi inverter split', code:'PN-18W-3S', idu:'I3', odu:'O22', tr:1.5, star:3, iseer:4.2, excl:['FAS','DSP','RMT','CTN','NMP','WIF','CRD'], wifi:true},
  {id:'M-WP12', brand:'Whirlpool', series:'Inverter split', name:'Whirlpool 1.0 TR 5-star inverter split', code:'WP-12M-5S', idu:'I2', odu:'O20', tr:1, star:5, iseer:5.1, excl:['FAS','RMT','CTN','NMP','XCU'], wifi:false}
];

export const PEOPLE: Record<string, Person> = {
  rahul:{id:'rahul', name:'Rahul Bansal', role:'kam', title:'Key Account Manager', tone:'#2F7FC1'},
  navdeep:{id:'navdeep', name:'Navdeep', role:'lead', title:'Team Lead, R&D', tone:'#8A57A8'},
  mahendra:{id:'mahendra', name:'Mahendra', role:'lead', title:'Team Lead, R&D', tone:'#6E8A2A'},
  ritika:{id:'ritika', name:'Ritika Sharma', role:'rnd', title:'R&D Engineer', tone:'#1E9C94'},
  arjun:{id:'arjun', name:'Arjun Mehta', role:'rnd', title:'R&D Engineer', tone:'#C79A1E'},
  sana:{id:'sana', name:'Sana Qureshi', role:'rnd', title:'R&D Engineer', tone:'#B8392A'},
  vivek:{id:'vivek', name:'Vivek Arora', role:'costing', title:'Costing Manager', tone:'#B5622D'},
  pooja:{id:'pooja', name:'Pooja Nair', role:'costing', title:'Costing Analyst', tone:'#22564A'},
  admin:{id:'admin', name:'IT Admin', role:'admin', title:'System administrator', tone:'#465650'}
};
export const ROLES: Record<RoleId, Role> = {
  kam:{label:'Key Account', can:'Logs customer requests, sees customer-facing sheets only', modules:['home','requests','library']},
  lead:{label:'Team Lead', can:'Allocates requests to R&D, approves or returns specs', modules:['home','requests','spec','library']},
  rnd:{label:'R&D Engineer', can:'Fills the model spec sheet; no access to costing', modules:['home','requests','spec','library']},
  costing:{label:'Costing', can:'Full costing, commodities, simulation, quotes and sending', modules:['home','requests','spec','costing','commodities','simulation','bom','history','library']},
  admin:{label:'Admin', can:'Users, roles, permissions and audit trail', modules:['home','requests','library','admin']}
};
export const LOGIN_CARDS: string[] = ['rahul','navdeep','ritika','vivek','admin'];

/* Spec sheet template — ~70 rows; internal rows are stripped from the customer sheet */
export const SPEC_TEMPLATE: SpecSection[] = [
  ['General',[['brand','Brand'],['iduCode','Indoor unit model code'],['oduCode','Outdoor unit model code'],['tr','Capacity (TR)'],['capW','Rated cooling capacity (W)'],['star','BEE star rating'],['iseer','ISEER'],['ref','Refrigerant']]],
  ['Electrical',[['volt','Voltage / frequency / phase'],['pin','Rated power input (W)'],['amp','Rated current (A)'],['vrange','Operating voltage range'],['stab','Stabiliser-free operation'],['plug','Power cord & plug']]],
  ['Indoor unit',[['iduCh','Indoor chassis',1],['iduDim','Dimensions W×H×D (mm)'],['iduNet','Net weight (kg)'],['iduGross','Gross weight (kg)'],['air','Airflow, high (CMH)'],['iduDb','Noise, indoor (dB)'],['ifm','Indoor fan motor'],['swing','Louver swing'],['filter','Filter type'],['disp','Display'],['panel','Front panel finish'],['evTube','Evaporator tube'],['evRows','Evaporator rows / FPI',1],['drain','Drain connection side']]],
  ['Outdoor unit',[['oduCh','Outdoor chassis',1],['oduDim','Dimensions W×H×D (mm)'],['oduNet','Net weight (kg)'],['oduGross','Gross weight (kg)'],['fan','Fan diameter'],['oduDb','Noise, outdoor (dB)'],['cond','Condenser coil material'],['cdTube','Condenser tube'],['cdRows','Condenser rows / FPI',1],['fin','Fin treatment'],['cab','Cabinet material'],['amb','Max operating ambient (°C)']]],
  ['Compressor',[['cpType','Compressor type'],['cpMake','Compressor make',1],['cpModel','Compressor model',1],['cpCc','Displacement (cc)'],['oil','Oil type'],['charge','Refrigerant charge (kg)']]],
  ['Piping & installation',[['pipe','Pipe size, liquid / gas'],['maxLen','Max pipe length (m)'],['maxEl','Max elevation (m)'],['stdLen','Standard pipe supplied (m)'],['kit','Installation kit']]],
  ['Features',[['wifi','Wi-Fi / smart control'],['conv','Convertible modes'],['sleep','Sleep mode'],['restart','Auto restart'],['clean','Self-clean'],['pm25','PM2.5 filter'],['remote','Remote type']]],
  ['Packaging & compliance',[['pack','Packaging'],['load','Loading qty, 40ft HC',1],['bis','BIS / IS 1391 compliance'],['warr','Warranty, product / compressor']]],
  ['Internal costing references',[['chRef','Chassis cost reference',1],['commonPct','Common parts share',1],['exclRef','Exclusive parts list',1],['cuKg','Copper content (kg)',1],['alKg','Aluminium content (kg)',1],['stKg','Steel content (kg)',1],['plKg','Plastic content (kg)',1],['target','Customer target price (₹/set)',1],['cpVendor','Compressor vendor & LPP ref',1],['note','Costing notes',1]]]
];

export const SEED_REQUESTS: SeedRequest[] = [
  {id:'REQ-2611-014', model:'M-DK18', received:'2026-10-02', due:'2026-10-20', status:'SENT', priority:'High', lead:'navdeep', assignee:'ritika', via:'Email from Daikin sourcing', note:'Annual refresh, 5-star variant with PM2.5 filter.'},
  {id:'REQ-2611-017', model:'M-VL18', received:'2026-10-21', due:'2026-11-14', status:'COSTING', priority:'High', lead:'mahendra', assignee:'arjun', via:'Email from Voltas sourcing', note:'Customer target ₹21,500 per set. Wants Q4 pricing.'},
  {id:'REQ-2611-019', model:'M-GD12', received:'2026-10-28', due:'2026-11-18', status:'RND', priority:'Medium', lead:'navdeep', assignee:'ritika', via:'Call from Godrej category team', note:'1.0 TR entry model, cost-down vs last year.'},
  {id:'REQ-2611-021', model:'M-LG24', received:'2026-10-30', due:'2026-11-20', status:'SUBMITTED', priority:'High', lead:'mahendra', assignee:'sana', via:'Email from LG procurement', note:'Wi-Fi + blue fin. Coastal market variant.'},
  {id:'REQ-2611-022', model:'M-HT18', received:'2026-11-06', due:'2026-11-27', status:'NEW', priority:'Medium', lead:null, assignee:null, via:'Email from Hitachi sourcing', note:'4-star with blue fin for South markets.'},
  {id:'REQ-2611-023', model:'M-PN18', received:'2026-11-09', due:'2026-11-30', status:'NEW', priority:'Low', lead:null, assignee:null, via:'Email from Panasonic', note:'Smart variant, Wi-Fi module from customer-nominated vendor.'},
  {id:'REQ-2610-008', model:'M-WP12', received:'2026-10-08', due:'2026-11-12', status:'APPROVED', priority:'Medium', lead:'navdeep', assignee:'arjun', via:'Email from Whirlpool', note:'5-star 1.0 TR, spec approved, ready for costing.'}
];
export const STATUS: Record<Status, { label: string; step: number }> = {
  NEW:{label:'New, unallocated', step:0}, ALLOCATED:{label:'Allocated to R&D', step:1}, RND:{label:'R&D filling spec', step:1}, RETURNED:{label:'Returned to R&D', step:1},
  SUBMITTED:{label:'Awaiting lead approval', step:2}, APPROVED:{label:'Spec approved', step:3}, COSTING:{label:'Costing in progress', step:4}, COSTED:{label:'Costed, ready to send', step:5}, SENT:{label:'Sent to customer', step:6}
};
export const FLOW = ['Request logged','Allocated to R&D','Spec submitted','Spec approved','Costing','Costed','Sent to customer'];

/* historical commodity snapshots for versions (2025 from AICM YoY average 9,941) */
export const SNAPS: Record<string, RateSnapshot> = {
  'Q1-2025':{CU:9350,AL:2620,FX:86.9,ST:52400,PL:1210,CP:68,RF:575},
  'Q2-2025':{CU:9620,AL:2480,FX:85.6,ST:51200,PL:1180,CP:68,RF:570},
  'Q3-2025':{CU:9880,AL:2590,FX:87.4,ST:50300,PL:1240,CP:69,RF:565},
  'Q4-2025':{CU:10900,AL:2790,FX:88.9,ST:49600,PL:1300,CP:69,RF:560},
  'Q1-2026':{CU:12840.25,AL:3080,FX:91.2,ST:47200,PL:1480,CP:70,RF:540},
  'Q2-2026':{CU:13331.63,AL:3412,FX:94.1,ST:48150,PL:1525,CP:71,RF:510},
  'Q3-2026':{CU:14101.73,AL:3241,FX:95.82,ST:46380,PL:1514,CP:72,RF:525}
};
export const SEED_VERSIONS: SeedVersion[] = [
  {model:'M-DK18', req:'REQ-2603-004', v:1, quarter:'Q2 2026', basis:'Q1-2026', on:'2026-04-06', by:'vivek', source:'Manual', status:'SENT', note:'First quote for 5-star refresh.'},
  {model:'M-DK18', req:'REQ-2606-011', v:2, quarter:'Q3 2026', basis:'Q2-2026', on:'2026-07-04', by:'pooja', source:'AICM', status:'SENT', note:'Re-priced for copper move.'},
  {model:'M-DK18', req:'REQ-2611-014', v:3, quarter:'Q4 2026', basis:'Q3-2026', on:'2026-10-16', by:'vivek', source:'AICM', status:'SENT', note:'PM2.5 filter added, panel credit applied.'},
  {model:'M-VL18', req:'REQ-2502-019', v:1, quarter:'Q2 2025', basis:'Q1-2025', on:'2025-04-11', by:'vivek', source:'Manual', status:'SENT', note:'Excel era quote, migrated.'},
  {model:'M-VL18', req:'REQ-2509-007', v:2, quarter:'Q4 2025', basis:'Q3-2025', on:'2025-10-09', by:'pooja', source:'Manual', status:'SENT', note:''},
  {model:'M-VL18', req:'REQ-2603-012', v:3, quarter:'Q2 2026', basis:'Q1-2026', on:'2026-04-14', by:'pooja', source:'AICM', status:'SENT', note:''},
  {model:'M-LG24', req:'REQ-2506-003', v:1, quarter:'Q3 2025', basis:'Q2-2025', on:'2025-07-02', by:'vivek', source:'Manual', status:'SENT', note:''},
  {model:'M-LG24', req:'REQ-2512-010', v:2, quarter:'Q1 2026', basis:'Q4-2025', on:'2026-01-08', by:'vivek', source:'Manual', status:'SENT', note:''},
  {model:'M-GD12', req:'REQ-2509-022', v:1, quarter:'Q4 2025', basis:'Q3-2025', on:'2025-10-18', by:'pooja', source:'Manual', status:'SENT', note:''},
  {model:'M-WP12', req:'REQ-2601-005', v:1, quarter:'Q1 2026', basis:'Q4-2025', on:'2026-01-12', by:'pooja', source:'Manual', status:'SENT', note:''},
  {model:'M-HT18', req:'REQ-2604-016', v:1, quarter:'Q2 2026', basis:'Q1-2026', on:'2026-04-20', by:'vivek', source:'AICM', status:'SENT', note:''}
];

/* ----- UI catalogue constants (app1.js / app2.js) ----- */
export const MODULES: { id: ModuleId; label: string }[] = [
  { id: 'home', label: 'Command centre' }, { id: 'requests', label: 'Requests' }, { id: 'spec', label: 'Spec sheets' }, { id: 'costing', label: 'Costing' },
  { id: 'commodities', label: 'Commodities' }, { id: 'simulation', label: 'Simulation' }, { id: 'bom', label: 'SAP BOM' }, { id: 'history', label: 'Quote history' },
  { id: 'library', label: 'Library' }, { id: 'admin', label: 'Admin' },
];
export const ZONE_NAME: Record<string, string> = { coil: 'Heat exchanger coil', fan: 'Fan & motor', body: 'Body mouldings', louver: 'Louvers & swing', plate: 'Mounting plate', pcb: 'Electronics', cabinet: 'Cabinet', base: 'Base & mounts', comp: 'Compressor', pipe: 'Piping & refrigerant' };
export const SIM_KEYS: [CommodityCode, string][] = [['CU', 'Copper'], ['AL', 'Aluminium'], ['FX', 'INR per USD'], ['ST', 'Steel'], ['PL', 'Resin'], ['CP', 'Compressor CIF'], ['RF', 'Refrigerant']];
export const ENGINEERS = ['ritika', 'arjun', 'sana'];
/** Rates the demo "Rates_Q4_FY27.xlsx" sheet contains. */
export const UPLOAD_SHEET: RateSnapshot = { CU: 15000, AL: 3300, FX: 95.5, ST: 47500, PL: 1560, CP: 73, RF: 530 };
export const UPLOAD_FILE = 'Rates_Q4_FY27.xlsx';
export const matColor = (m: string): string => (COLORS as Record<string, string>)[m] || '#9AA8A1';
