/* ===== Mock API layer: in-memory DB, persisted per browser, simulated latency + request log ===== */
const STORE_KEY = 'chassisiq-poc-v1';
let DB;
function freshDB(){
  const manual = {}; COMMODITIES.forEach(c=>manual[c.code]=c.q3);
  const requests = SEED_REQUESTS.map(r=>{
    const m = MODELS.find(x=>x.id===r.model);
    const spec = specFor(m);
    const hist = [{t:r.received+' 10:12', who:'rahul', a:'Logged request', n:r.via}];
    const st = STATUS[r.status].step;
    if(r.lead) hist.push({t:r.received+' 15:40', who:r.lead, a:'Allocated to '+PEOPLE[r.assignee].name, n:'Due '+r.due});
    if(st>=2) hist.push({t:addDays(r.received,4)+' 17:05', who:r.assignee, a:'Submitted spec sheet', n:'Spec v1'});
    if(st>=3) hist.push({t:addDays(r.received,5)+' 11:20', who:r.lead, a:'Approved spec', n:'Locked for costing'});
    if(st>=4) hist.push({t:addDays(r.received,6)+' 09:30', who:'vivek', a:'Started costing', n:'Source: AICM'});
    if(st>=6) hist.push({t:addDays(r.received,14)+' 18:10', who:'vivek', a:'Sent customer sheet', n:'v3 to sourcing@daikin (demo)'});
    return {...r, spec, specLog:[], hist, versions:[]};
  });
  const versions = SEED_VERSIONS.map((v,i)=>{
    const m = MODELS.find(x=>x.id===v.model);
    const snap = SNAPS[v.basis];
    let excl = m.excl.slice();
    if(v.model==='M-DK18' && v.v<3) excl = excl.filter(k=>k!=='PMF'&&k!=='CRD');
    if(v.model==='M-VL18' && v.v===1) excl = excl.filter(k=>k!=='CRD');
    const r = compute(m, snap, {excl});
    return {id:'VER-'+(1000+i), ...v, snap, excl, total:r.total, material:r.material, sentTo:'sourcing@'+m.brand.toLowerCase()+'.example'};
  });
  return {manual, manualFile:null, requests, versions, scenarios:[], audit:[
    {t:'2026-11-10 18:04', who:'vivek', a:'Synced commodity rates from AICM', obj:'Commodity master'},
    {t:'2026-11-10 16:30', who:'navdeep', a:'Approved spec', obj:'REQ-2610-008'},
    {t:'2026-11-09 11:15', who:'rahul', a:'Logged request', obj:'REQ-2611-023'}
  ], mails:[], lastSync:'2026-11-06 01:13'};
}
function addDays(s,n){ const d=new Date(s+'T00:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
function loadDB(){ try{ const s = localStorage.getItem(STORE_KEY); if(s){ DB = JSON.parse(s); return; } }catch(e){} DB = freshDB(); }
function saveDB(){ try{ localStorage.setItem(STORE_KEY, JSON.stringify(DB)); }catch(e){} }
function resetDB(){ DB = freshDB(); saveDB(); }
function nowStamp(){ const d=new Date(); const p=n=>String(n).padStart(2,'0'); return '2026-11-11 '+p(d.getHours())+':'+p(d.getMinutes()); }
function audit(who, a, obj){ DB.audit.unshift({t:nowStamp(), who, a, obj}); }

const API_LOG = []; let apiBusy = 0; const apiListeners = [];
function apiCall(method, path, fn, opts={}){
  apiBusy++; apiListeners.forEach(f=>f());
  const ms = opts.ms || (180 + Math.round(Math.random()*420));
  const t0 = performance.now();
  return new Promise((res, rej)=>{
    setTimeout(()=>{
      let out, status = method==='POST'?201:200;
      try{ out = fn ? fn() : null; }catch(e){ status = e.status||400; API_LOG.unshift({method, path, status, ms:Math.round(performance.now()-t0), err:e.message}); apiBusy--; apiListeners.forEach(f=>f()); rej(e); return; }
      saveDB();
      API_LOG.unshift({method, path, status, ms:Math.round(performance.now()-t0)});
      if(API_LOG.length>80) API_LOG.pop();
      apiBusy--; apiListeners.forEach(f=>f());
      res(out);
    }, ms);
  });
}
function forbid(msg){ const e = new Error(msg||'Forbidden for this role'); e.status=403; throw e; }

const api = {
  login: (uid)=>apiCall('POST','/api/auth/login', ()=>({user:PEOPLE[uid], token:'demo.'+uid})),
  requests: ()=>apiCall('GET','/api/requests', ()=>DB.requests),
  createRequest: (data, who)=>apiCall('POST','/api/requests', ()=>{
    const m = MODELS.find(x=>x.id===data.model);
    const n = String(24 + DB.requests.filter(r=>r.id.startsWith('REQ-2611')).length).padStart(3,'0');
    const r = {id:'REQ-2611-'+n, model:data.model, received:'2026-11-11', due:data.due, status:'NEW', priority:data.priority, lead:null, assignee:null, via:data.via, note:data.note, spec:specFor(m), specLog:[], hist:[{t:nowStamp(), who, a:'Logged request', n:data.via}], versions:[]};
    DB.requests.unshift(r); audit(who,'Logged request', r.id); return r;
  }),
  allocate: (id, assignee, who)=>apiCall('PATCH','/api/requests/'+id+'/allocate', ()=>{
    if(PEOPLE[who].role!=='lead') forbid('Only team leads can allocate');
    const r = DB.requests.find(x=>x.id===id); r.lead = who; r.assignee = assignee; r.status='RND';
    r.hist.push({t:nowStamp(), who, a:'Allocated to '+PEOPLE[assignee].name, n:'Due '+r.due}); audit(who,'Allocated to '+PEOPLE[assignee].name, id); return r;
  }),
  saveSpec: (id, changes, who)=>apiCall('PUT','/api/requests/'+id+'/spec', ()=>{
    if(PEOPLE[who].role!=='rnd') forbid('Only R&D can edit specifications');
    const r = DB.requests.find(x=>x.id===id);
    Object.entries(changes).forEach(([k,v])=>{ r.specLog.push({t:nowStamp(), who, k, from:r.spec[k], to:v}); r.spec[k]=v; });
    audit(who,'Edited '+Object.keys(changes).length+' spec field(s)', id); return r;
  }),
  submitSpec: (id, who)=>apiCall('POST','/api/requests/'+id+'/submit', ()=>{
    const r = DB.requests.find(x=>x.id===id); r.status='SUBMITTED'; r.hist.push({t:nowStamp(), who, a:'Submitted spec sheet', n:'Sent to '+(r.lead?PEOPLE[r.lead].name:'team lead')}); audit(who,'Submitted spec', id); return r;
  }),
  decide: (id, ok, note, who)=>apiCall('POST','/api/requests/'+id+(ok?'/approve':'/return'), ()=>{
    if(PEOPLE[who].role!=='lead') forbid('Only team leads can approve');
    const r = DB.requests.find(x=>x.id===id); r.status = ok?'APPROVED':'RETURNED';
    r.hist.push({t:nowStamp(), who, a: ok?'Approved spec':'Returned spec to R&D', n:note||(ok?'Locked for costing':'')}); audit(who, ok?'Approved spec':'Returned spec', id); return r;
  }),
  startCosting: (id, who)=>apiCall('POST','/api/costing/'+id+'/start', ()=>{
    const r = DB.requests.find(x=>x.id===id); if(r.status==='APPROVED'){ r.status='COSTING'; r.hist.push({t:nowStamp(), who, a:'Started costing', n:'Source: '+(APP.mode==='aicm'?'AICM':'Manual')}); audit(who,'Started costing', id);} return r;
  }, {ms:220}),
  chassis: (code)=>apiCall('GET','/api/chassis/'+code, ()=>code.startsWith('I')?IDU_CHASSIS[code]:ODU_CHASSIS[code], {ms:260}),
  commodities: (mode)=>apiCall('GET','/api/commodities?source='+mode, ()=>({mode, manual:DB.manual, lastSync:DB.lastSync})),
  syncAICM: (who)=>apiCall('POST','/api/integrations/aicm/sync', ()=>{ DB.lastSync = nowStamp(); audit(who,'Synced commodity rates from AICM','Commodity master'); return {synced:COMMODITIES.length}; }, {ms:1400}),
  saveManual: (vals, who)=>apiCall('PUT','/api/commodities/manual', ()=>{ Object.assign(DB.manual, vals); audit(who,'Updated manual commodity rates','Commodity master'); return DB.manual; }),
  uploadManual: (file, who)=>apiCall('POST','/api/commodities/manual/upload', ()=>{
    const v = {CU:15000, AL:3300, FX:95.5, ST:47500, PL:1560, CP:73, RF:530};
    Object.assign(DB.manual, v); DB.manualFile = file; audit(who,'Uploaded rates sheet '+file,'Commodity master'); return v;
  }, {ms:1100}),
  saveVersion: (reqId, payload, who)=>apiCall('POST','/api/costing/'+reqId+'/versions', ()=>{
    const r = DB.requests.find(x=>x.id===reqId); const prev = DB.versions.filter(v=>v.model===r.model);
    const v = {id:'VER-'+(1100+DB.versions.length), model:r.model, req:reqId, v:prev.length+1, quarter:'Q4 2026', basis:payload.basis, on:'2026-11-11', by:who, source:payload.source, status:'DRAFT', note:payload.note||'', snap:payload.snap, excl:payload.excl, total:payload.total, material:payload.material, sentTo:'sourcing@'+MODELS.find(m=>m.id===r.model).brand.toLowerCase()+'.example'};
    DB.versions.push(v); r.status='COSTED'; r.hist.push({t:nowStamp(), who, a:'Saved costing v'+v.v, n:'₹'+Math.round(v.total).toLocaleString('en-IN')+' per set, '+payload.source}); audit(who,'Saved costing v'+v.v, reqId); return v;
  }),
  sapBom: (code)=>apiCall('GET','/api/sap/bom/'+code+'?plant=1100&usage=1', ()=>MODELS.find(m=>m.code===code), {ms:500}),
  sapLpp: (code)=>apiCall('GET','/api/sap/lpp?material='+code, ()=>true, {ms:400}),
  saveScenario: (sc, who)=>apiCall('POST','/api/simulations', ()=>{ sc.id='SIM-'+(200+DB.scenarios.length); sc.by=who; sc.on=nowStamp(); DB.scenarios.unshift(sc); audit(who,'Saved simulation '+sc.name, sc.id); return sc; }),
  sendMail: (verId, to, who)=>apiCall('POST','/api/mail/send', ()=>{
    const v = DB.versions.find(x=>x.id===verId); v.status='SENT'; v.sentTo=to;
    const r = DB.requests.find(x=>x.id===v.req); if(r){ r.status='SENT'; r.hist.push({t:nowStamp(), who, a:'Sent customer sheet', n:'v'+v.v+' to '+to}); }
    DB.mails.unshift({t:nowStamp(), to, ver:verId}); audit(who,'Emailed customer sheet v'+v.v+' to '+to, v.req); return v;
  }, {ms:900}),
  audit: ()=>apiCall('GET','/api/audit?limit=50', ()=>DB.audit, {ms:200})
};
