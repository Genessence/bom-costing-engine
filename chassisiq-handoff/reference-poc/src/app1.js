/* ===== App core, shell, home, requests, spec sheets ===== */
const APP = {user:null, mode:'aicm', wb:{}, sim:null, hist:{sel:[], q:''}, bom:null, lib:{sel:null,q:''}, spec:{showInternal:true, draft:{}}, renderToken:0};
const $ = (s,el=document)=>el.querySelector(s);
const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
const MODULES = [
  {id:'home', label:'Command centre'}, {id:'requests', label:'Requests'}, {id:'spec', label:'Spec sheets'}, {id:'costing', label:'Costing'},
  {id:'commodities', label:'Commodities'}, {id:'simulation', label:'Simulation'}, {id:'bom', label:'SAP BOM'}, {id:'history', label:'Quote history'},
  {id:'library', label:'Library'}, {id:'admin', label:'Admin'}
];
const model = id=>MODELS.find(m=>m.id===id);
const reqById = id=>DB.requests.find(r=>r.id===id);
const person = id=>PEOPLE[id]||{name:'—', tone:'#999'};
const can = mod=>ROLES[APP.user.role].modules.includes(mod);
const isRole = (...r)=>r.includes(APP.user.role);
function av(id, size=28){ const p=person(id); const ini=p.name.split(' ').map(x=>x[0]).join('').slice(0,2); return `<span class="av" style="width:${size}px;height:${size}px;background:${p.tone};font-size:${size<30?11:13}px" title="${esc(p.name)}">${ini}</span>`; }
function stPill(s){ return `<span class="st st-${s}"><i></i>${STATUS[s].label}</span>`; }
function brandDot(b){ return `<span class="mat"><i style="background:${BRAND_TONE[b]}"></i>${esc(b)}</span>`; }
function toast(msg, err){ const t=document.createElement('div'); t.className='toast'+(err?' err':''); t.innerHTML=`<i></i><span>${msg}</span>`; $('#toasts').appendChild(t); setTimeout(()=>t.remove(), 3600); }
function snapNow(){ return snapshotFrom(APP.mode, DB.manual); }
function basisLabel(){ return APP.mode==='aicm' ? 'AICM, '+QUARTER_BASIS.label : 'Manual rates'+(DB.manualFile?' from '+DB.manualFile:''); }
function loader(txt='Loading'){ return `<div class="empty"><span class="btn ghost" style="pointer-events:none"><span class="sp"></span>${txt}…</span></div>`; }

/* ---------- routing ---------- */
function route(){ const h=(location.hash||'#/home').slice(2).split('/'); return {mod:h[0]||'home', id:h[1]?decodeURIComponent(h[1]):null, sub:h[2]||null}; }
function go(h){ if(location.hash==='#/'+h) render(); else location.hash='#/'+h; }
window.addEventListener('hashchange', ()=>render());

function render(){
  if(!APP.user){ renderLogin(); return; }
  if(!$('#deck')) renderShell();
  const r = route();
  $$('.tab').forEach(t=>t.classList.toggle('on', t.dataset.mod===(r.mod==='customer'?'history':r.mod)));
  const token = ++APP.renderToken;
  const el = $('#view'); window.scrollTo(0,0);
  const mod = r.mod==='customer' ? 'history' : r.mod;
  if(!can(mod) && mod!=='home'){ el.innerHTML = lockedView(mod); return; }
  const V = {home:viewHome, requests:r.id?viewRequest:viewRequests, spec:r.id?viewSpecSheet:viewSpecList, costing:r.id?viewWorkbench:viewCostingList,
    commodities:viewCommodities, simulation:viewSimulation, bom:viewBom, history:viewHistory, customer:viewCustomer, library:viewLibrary, admin:viewAdmin}[r.mod] || viewHome;
  Promise.resolve(V(el, r, token)).catch(e=>{ if(token===APP.renderToken) el.innerHTML = `<div class="lock-note"><div class="ic">!</div><div><b>${esc(e.message)}</b><div class="small">The mock API rejected this request.</div></div></div>`; });
}
function stale(t){ return t!==APP.renderToken; }
function lockedView(mod){
  const m = MODULES.find(x=>x.id===mod);
  return `<div class="page-head"><div class="t"><h1>${m?m.label:'Restricted'}</h1></div></div>
  <div class="lock-note"><div class="ic">🔒</div><div><b>${ROLES[APP.user.role].label} accounts can't open ${m?m.label.toLowerCase():'this page'}.</b>
  <div class="small">Costing data is confidential. Access is role-based: ${esc(ROLES[APP.user.role].can.toLowerCase())}. Switch user to see this module.</div></div></div>`;
}

/* ---------- login ---------- */
function renderLogin(){
  document.body.innerHTML = `
  <div class="login">
    <div class="login-art"><div class="fins"></div>
      <div class="brand"><span class="mark"></span><div><div class="brand-name">ChassisIQ</div><div class="brand-for">Cost & specification studio, prepared for Amber Enterprises</div></div></div>
      <div class="login-hero"><h1>Every quote, traceable to the gram.</h1>
        <p>From a brand's spec request to a priced, versioned customer sheet. Chassis base cost plus exclusive parts, re-priced live as copper, aluminium and the rupee move.</p></div>
      <div class="login-stack"><div><b>${MODELS.length}</b>models in the demo</div><div><b>${DB.versions.length}</b>quote versions since 2025</div><div><b>${fmt.n(COMMODITIES.find(c=>c.code==='CU').cur)}</b>LME copper, USD/MT</div></div>
    </div>
    <div class="login-pick">
      <h2>Sign in as</h2>
      <p class="sub small" style="margin:0 0 8px">Each person sees only what their role allows. You can switch user at any time from the top bar.</p>
      ${LOGIN_CARDS.map(id=>{ const p=PEOPLE[id]; return `<button class="role-card" data-act="login" data-id="${id}">${av(id,44)}<span><b>${esc(p.name)}</b> <span class="muted small">${esc(p.title)}</span><div class="can">${esc(ROLES[p.role].can)}</div></span><span class="go">›</span></button>`; }).join('')}
      <div class="row-x small" style="margin-top:4px"><span class="muted">Also sign in as</span>${Object.keys(PEOPLE).filter(id=>!LOGIN_CARDS.includes(id)).map(id=>`<button class="chip" data-act="login" data-id="${id}" style="cursor:pointer">${esc(PEOPLE[id].name)}, ${esc(ROLES[PEOPLE[id].role].label)}</button>`).join('')}</div>
      <p class="muted small" style="margin-top:10px">Demo build. Commodity rates mirror AICM on 06 Nov 2026; chassis BOMs, prices and quotes are illustrative until Amber shares real data.</p>
    </div>
  </div>
  <div id="toasts" class="toasts"></div>`;
}

/* ---------- shell ---------- */
function renderShell(){
  const tk = COMMODITIES.map(c=>{ const ch=(c.cur-c.hist[c.hist.length-2])/c.hist[c.hist.length-2]; return `<span class="tk"><span class="nm">${esc(c.index)}</span><span class="px num">${fmt.n(c.cur, c.cur<200?2:0)}</span><span class="nm small">${c.unit}</span><span class="ch ${ch>=0?'up':'dn'}">${ch>=0?'▲':'▼'} ${Math.abs(ch*100).toFixed(1)}%</span>${spark(c.hist,56,18, ch>=0?'#F08A78':'#6EDDB4')}</span>`; }).join('');
  const u = APP.user;
  document.body.innerHTML = `
  <div class="demo-band">Demo environment. Rates mirror AICM (06 Nov 2026); BOMs, prices and quotes are illustrative.</div>
  <header class="deck" id="deck">
    <div class="deck-top">
      <div class="brand"><span class="mark"></span><div><div class="brand-name">ChassisIQ</div><div class="brand-for">for Amber Enterprises</div></div></div>
      <button class="deck-search" data-act="palette"><span>⌕</span><span>Search requests, models, quotes</span><kbd>Ctrl K</kbd></button>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="source-label">Commodity rates</span>
        <div class="source-switch" role="group" aria-label="Commodity rate source">
          <button class="aicm ${APP.mode==='aicm'?'on':''}" data-act="mode" data-v="aicm"><span class="dot"></span>AICM linked</button>
          <button class="${APP.mode==='manual'?'on':''}" data-act="mode" data-v="manual"><span class="dot"></span>Manual</button>
        </div>
      </div>
      <button class="who" data-act="switch-user">${av(u.id,30)}<span><span class="n">${esc(u.name)}</span><span class="r">${esc(ROLES[u.role].label)}</span></span><span style="color:#9DB8AC;padding-right:6px">⇄</span></button>
    </div>
    <div class="ticker"><div class="ticker-track">${tk}${tk}</div></div>
    <nav class="tabs">${MODULES.map(m=>{ const ok=can(m.id)||m.id==='home'; const cnt = m.id==='requests'? DB.requests.filter(r=>queueFor(r)).length : 0; return `<button class="tab ${ok?'':'locked'}" data-mod="${m.id}" data-act="nav">${ok?'':'🔒 '}${m.label}${cnt?`<span class="cnt">${cnt}</span>`:''}</button>`; }).join('')}</nav>
  </header>
  <main class="view" id="view"></main>
  <div id="toasts" class="toasts"></div>
  <button class="api-pill" id="apiPill" data-act="api"><i></i><span id="apiTxt">Mock API ready</span></button>
  <div class="api-panel hide" id="apiPanel"></div>`;
  updateApi();
}
function queueFor(r){ const role=APP.user.role, me=APP.user.id;
  if(role==='lead') return r.status==='NEW' || (r.status==='SUBMITTED' && r.lead===me);
  if(role==='rnd') return r.assignee===me && ['RND','ALLOCATED','RETURNED'].includes(r.status);
  if(role==='costing') return ['APPROVED','COSTING','COSTED'].includes(r.status);
  if(role==='kam') return r.status==='SENT' || r.status==='NEW';
  return false; }

function updateApi(){
  const pill=$('#apiPill'); if(!pill) return;
  pill.classList.toggle('busy', apiBusy>0);
  const last=API_LOG[0];
  $('#apiTxt').textContent = apiBusy>0 ? 'Calling API…' : last ? `${last.method} ${last.path.split('?')[0]}  ${last.status}  ${last.ms}ms` : 'Mock API ready';
  const p=$('#apiPanel'); if(p && !p.classList.contains('hide')) p.innerHTML = apiPanelHtml();
}
apiListeners.push(updateApi);
function apiPanelHtml(){ return `<div class="hd"><b style="color:#fff">API requests</b><span style="color:#8FB0A3">${API_LOG.length} calls this session, mock backend</span><span class="spacer"></span><button class="btn sm" data-act="api" style="background:transparent;color:#CFE3DA;border-color:rgba(255,255,255,.2)">Close</button></div>`+
  (API_LOG.length?API_LOG.map(l=>`<div class="api-row"><span class="m ${l.method}">${l.method}</span><span class="p" title="${esc(l.path)}">${esc(l.path)}</span><span class="s" style="${l.status>=400?'color:#F08A78':''}">${l.status}</span><span class="ms">${l.ms} ms</span></div>`).join(''):'<div class="api-row"><span></span><span class="p">No calls yet</span></div>'); }

/* ---------- actions ---------- */
const ACT = {
  login: async el=>{ const r=await api.login(el.dataset.id); APP.user=r.user; document.body.innerHTML=''; render(); toast('Signed in as '+r.user.name+', '+ROLES[r.user.role].label); },
  'switch-user': ()=>{ closeOverlay(); APP.user=null; location.hash='#/home'; render(); },
  nav: el=>go(el.dataset.mod),
  mode: el=>{ if(APP.mode===el.dataset.v) return; APP.mode=el.dataset.v; $$('.source-switch button').forEach(b=>b.classList.toggle('on', b.dataset.v===APP.mode)); toast(APP.mode==='aicm'?'Commodity rates now pulled from AICM (Q3 average)':'Manual mode: costing uses rates entered by the costing team'); render(); },
  api: ()=>{ const p=$('#apiPanel'); p.classList.toggle('hide'); if(!p.classList.contains('hide')) p.innerHTML=apiPanelHtml(); },
  go: el=>go(el.dataset.to),
  palette: ()=>openPalette(),
  reset: ()=>{ resetDB(); toast('Demo data restored to the starting point'); APP.user && renderShell(); render(); }
};
document.addEventListener('click', e=>{ const el=e.target.closest('[data-act]'); if(!el) return; const f=ACT[el.dataset.act]; if(f){ e.preventDefault(); f(el,e); } });
document.addEventListener('keydown', e=>{ if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k' && APP.user){ e.preventDefault(); openPalette(); } if(e.key==='Escape'){ closeOverlay(); } });
function closeOverlay(){ $$('.scrim,.modal-wrap').forEach(x=>x.remove()); }
function drawer(title, body, foot=''){ closeOverlay(); const w=document.createElement('div'); w.className='scrim'; w.innerHTML=`<aside class="drawer" role="dialog" aria-label="${esc(title)}"><div class="drawer-h"><h3>${title}</h3><button class="btn sm ghost" data-act="close">Close</button></div><div class="drawer-b">${body}</div>${foot?`<div class="drawer-b" style="border-top:1px solid var(--line)">${foot}</div>`:''}</aside>`; w.addEventListener('click',e=>{ if(e.target===w) closeOverlay(); }); document.body.appendChild(w); return w; }
ACT.close = ()=>closeOverlay();

function openPalette(){
  closeOverlay();
  const items = [
    ...MODULES.filter(m=>can(m.id)||m.id==='home').map(m=>({t:m.label, k:'Go to', to:m.id})),
    ...DB.requests.map(r=>({t:r.id+'  '+model(r.model).name, k:STATUS[r.status].label, to:'requests/'+r.id})),
    ...(can('history')?DB.versions.map(v=>({t:model(v.model).brand+' '+model(v.model).code+' v'+v.v+', '+v.quarter, k:'Quote '+fmt.inr(v.total), to:'history/'+v.id})):[]),
    {t:'Switch commodity rates to '+(APP.mode==='aicm'?'Manual':'AICM'), k:'Action', act:'mode'},
    {t:'Reset demo data', k:'Action', act:'reset'}
  ];
  const w=document.createElement('div'); w.className='modal-wrap';
  w.innerHTML=`<div class="palette"><input placeholder="Type a request ID, brand, model or page" aria-label="Search"><div class="res"></div></div>`;
  document.body.appendChild(w);
  const inp=$('input',w), res=$('.res',w); let sel=0, list=items;
  const draw=()=>{ res.innerHTML=list.slice(0,12).map((it,i)=>`<div class="it ${i===sel?'on':''}" data-i="${i}">${esc(it.t)}<span class="k">${esc(it.k)}</span></div>`).join('')||'<div class="empty">No matches</div>'; };
  const pick=i=>{ const it=list[i]; if(!it) return; closeOverlay(); if(it.act==='mode'){ ACT.mode({dataset:{v:APP.mode==='aicm'?'manual':'aicm'}}); } else if(it.act==='reset'){ ACT.reset(); } else go(it.to); };
  inp.addEventListener('input',()=>{ const q=inp.value.toLowerCase(); list=items.filter(i=>(i.t+' '+i.k).toLowerCase().includes(q)); sel=0; draw(); });
  inp.addEventListener('keydown',e=>{ if(e.key==='ArrowDown'){sel=Math.min(sel+1,list.length-1);draw();} if(e.key==='ArrowUp'){sel=Math.max(sel-1,0);draw();} if(e.key==='Enter') pick(sel); });
  res.addEventListener('click',e=>{ const it=e.target.closest('.it'); if(it) pick(+it.dataset.i); });
  w.addEventListener('click',e=>{ if(e.target===w) closeOverlay(); });
  draw(); inp.focus();
}

/* ---------- home ---------- */
async function viewHome(el, r, token){
  el.innerHTML = loader('Loading your workspace');
  const reqs = await api.requests(); if(stale(token)) return;
  const u=APP.user, role=u.role, snap=snapNow();
  const counts = s=>reqs.filter(x=>s.includes(x.status)).length;
  const stages = [['Logged',['NEW']],['With R&D',['ALLOCATED','RND','RETURNED']],['Awaiting approval',['SUBMITTED']],['Approved',['APPROVED']],['Costing',['COSTING']],['Ready to send',['COSTED']],['Sent',['SENT']]];
  const mine = reqs.filter(queueFor);
  const greet = {kam:'Requests you logged and what has gone back to brands.', lead:'Allocate new requests and clear specs waiting for your approval.', rnd:'Spec sheets assigned to you.', costing:'Approved specs ready for costing, and commodity moves that change your quotes.', admin:'Users, access and the audit trail.'}[role];
  const cu=COMMODITIES.find(c=>c.code==='CU');
  const showCost = isRole('costing');
  let costBlock = '';
  if(showCost){
    const rows = MODELS.map(m=>{ const c=compute(m,snap); return {m, total:c.total, cuShare:c.byMat.CU/c.material}; });
    costBlock = `<div class="panel"><div class="panel-h"><h3>Copper exposure by model</h3><span class="chip">${APP.mode==='aicm'?'AICM, Q3 avg':'Manual rates'}</span></div><div class="panel-b">
      <table class="tbl"><thead><tr><th>Model</th><th class="r">Cost per set</th><th>Copper share of material</th></tr></thead><tbody>
      ${rows.sort((a,b)=>b.cuShare-a.cuShare).map(x=>`<tr class="click" data-act="go" data-to="library/${x.m.id}"><td>${brandDot(x.m.brand)} <span class="muted small">${x.m.tr} TR, ${x.m.star}★</span></td><td class="r num">${fmt.inr(x.total)}</td><td style="width:42%"><div class="row-x"><div class="bar-track" style="flex:1"><i style="width:${(x.cuShare*100*2.2).toFixed(0)}%;background:var(--cu)"></i></div><span class="num small" style="width:44px;text-align:right">${(x.cuShare*100).toFixed(1)}%</span></div></td></tr>`).join('')}
      </tbody></table></div></div>`;
  }
  el.innerHTML = `
  <div class="page-head"><div class="t"><div class="crumbs">Wednesday, 11 November 2026</div><h1>Good morning, ${esc(u.name.split(' ')[0])}</h1><p>${greet}</p></div>
    ${isRole('kam','costing','lead')?`<button class="btn primary" data-act="new-req">Log a customer request</button>`:''}</div>
  <div class="panel" style="padding:4px;margin-bottom:16px"><div class="pipe">${stages.map(([l,s])=>{ const n=counts(s); return `<div class="stg ${s.some(x=>mine.find(m=>m.status===x))?'hot':''}"><b class="num">${n}</b><span>${l}</span></div>`; }).join('')}</div></div>
  <div class="grid g-main">
    <div class="grid" style="align-content:start">
      <div class="panel"><div class="panel-h"><h3>Needs your action</h3><span class="chip ${mine.length?'warn':'mint'}">${mine.length} open</span></div><div class="panel-b">
      ${mine.length?`<table class="tbl"><tbody>${mine.map(x=>{ const m=model(x.model); return `<tr class="click" data-act="go" data-to="requests/${x.id}"><td style="width:120px"><b class="num">${x.id}</b></td><td>${esc(m.name)}<div class="small muted">${esc(x.via)}</div></td><td>${stPill(x.status)}</td><td class="r small muted">Due ${x.due}</td></tr>`; }).join('')}</tbody></table>`:`<div class="empty">Nothing waiting on you. New requests appear here as soon as they are logged.</div>`}
      </div></div>
      ${costBlock}
    </div>
    <div class="grid" style="align-content:start">
      <div class="panel"><div class="panel-h"><h3>LME copper, quarterly average</h3><span class="chip mint"><span class="d"></span>AICM</span></div><div class="panel-b">
        ${lineChart([{name:'Copper USD/MT', values:[cu.q1,cu.q2,cu.q3,cu.cur], color:COLORS.CU}], ['Q1 avg','Q2 avg','Q3 avg','Spot 06 Nov'], {h:190, label:'LME copper quarterly average', mark:[2]})}
        <p class="small sub" style="margin:8px 0 0">Next-quarter quotes use the last quarter's average: <b class="num">${fmt.n(cu.q3,2)}</b> USD/MT, ${fmt.pct((cu.q3-cu.q2)/cu.q2)} on Q2.</p>
      </div></div>
      <div class="panel"><div class="panel-h"><h3>Recent activity</h3></div><div class="panel-b"><ul class="tl">${DB.audit.slice(0,6).map(a=>`<li><span class="b"></span><div>${av(a.who,20)} <b>${esc(person(a.who).name)}</b> ${esc(a.a.charAt(0).toLowerCase()+a.a.slice(1))}</div><div class="w">${esc(a.obj)}, ${a.t}</div></li>`).join('')}</ul></div></div>
    </div>
  </div>`;
}

/* ---------- requests ---------- */
async function viewRequests(el, r, token){
  el.innerHTML = loader('Fetching requests');
  const reqs = await api.requests(); if(stale(token)) return;
  const f = APP.reqFilter||'all';
  const list = reqs.filter(x=> f==='all' || (f==='mine'&&queueFor(x)) || (f==='open'&&x.status!=='SENT') || (f==='sent'&&x.status==='SENT'));
  el.innerHTML = `
  <div class="page-head"><div class="t"><h1>Customer requests</h1><p>Every spec request from a brand, from the moment it is logged to the priced sheet that goes back. Team leads allocate, R&D fills the spec, leads approve, costing prices it.</p></div>
    ${isRole('kam','costing','lead')?`<button class="btn primary" data-act="new-req">Log a customer request</button>`:''}</div>
  <div class="row-x" style="margin-bottom:12px"><div class="seg">${[['all','All'],['mine','Needs my action'],['open','Open'],['sent','Sent']].map(([k,l])=>`<button class="${f===k?'on':''}" data-act="req-filter" data-v="${k}">${l}</button>`).join('')}</div><span class="spacer"></span><span class="small muted">${list.length} of ${reqs.length}</span></div>
  <div class="panel"><div class="panel-b" style="padding-top:6px"><table class="tbl"><thead><tr><th>Request</th><th>Model</th><th>Chassis</th><th>Received</th><th>Team lead</th><th>R&D</th><th>Status</th><th class="r">Due</th></tr></thead><tbody>
  ${list.map(x=>{ const m=model(x.model); return `<tr class="click" data-act="go" data-to="requests/${x.id}"><td><b class="num">${x.id}</b><div class="small muted">${x.priority} priority</div></td><td>${brandDot(m.brand)}<div class="small sub">${esc(m.name.replace(m.brand+' ',''))}</div></td><td><span class="chip">${m.idu}</span> <span class="chip">${m.odu}</span></td><td class="small">${x.received}</td><td>${x.lead?av(x.lead,24):'<span class="muted small">Unassigned</span>'}</td><td>${x.assignee?av(x.assignee,24):'<span class="muted small">—</span>'}</td><td>${stPill(x.status)}</td><td class="r small">${x.due}</td></tr>`; }).join('')}
  </tbody></table></div></div>`;
}
ACT['req-filter'] = el=>{ APP.reqFilter=el.dataset.v; render(); };

ACT['new-req'] = ()=>{
  drawer('Log a customer request', `
    <div class="note">Logged requests go to the team leads (Navdeep, Mahendra) for allocation to an R&D engineer.</div>
    <div class="field"><label>Brand and model</label><select class="sel" id="nr-model">${MODELS.map(m=>`<option value="${m.id}">${esc(m.name)} (${m.code})</option>`).join('')}</select></div>
    <div class="grid g2"><div class="field"><label>Received via</label><input class="inp" id="nr-via" value="Email from brand sourcing team"></div>
    <div class="field"><label>Reply due by</label><input class="inp" type="date" id="nr-due" value="2026-12-02"></div></div>
    <div class="field"><label>Priority</label><div class="seg" id="nr-pri">${['High','Medium','Low'].map((p,i)=>`<button class="${i===1?'on':''}" data-act="seg-pick">${p}</button>`).join('')}</div></div>
    <div class="field"><label>What the customer asked for</label><textarea class="inp" id="nr-note" rows="4">Q4 pricing for the 1.5 TR inverter variant. Customer wants the brand fascia and Wi-Fi option costed separately.</textarea></div>
    <div class="upload" data-act="fake-attach" id="nr-att">Attach the customer's email or spec PDF</div>`,
    `<div class="row-x"><span class="spacer"></span><button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="nr-save">Log request</button></div>`);
};
ACT['seg-pick'] = el=>{ $$('button',el.parentElement).forEach(b=>b.classList.remove('on')); el.classList.add('on'); };
ACT['fake-attach'] = el=>{ el.innerHTML='📎 Customer_spec_request.pdf <span class="muted small">(312 KB, attached)</span>'; };
ACT['nr-save'] = async el=>{
  el.disabled=true; el.innerHTML='<span class="sp"></span>Logging';
  const data={model:$('#nr-model').value, via:$('#nr-via').value, due:$('#nr-due').value, priority:$('#nr-pri .on').textContent, note:$('#nr-note').value};
  const r = await api.createRequest(data, APP.user.id); closeOverlay(); toast('Logged '+r.id+'. Team leads have been notified.'); renderShell(); go('requests/'+r.id);
};

function flowHtml(st){ const step=STATUS[st].step; return `<div class="flow">${FLOW.map((f,i)=>`<div class="s ${i<step||st==='SENT'?'done':i===step?'now':''}"><b>${f}</b>${i===step&&st!=='SENT'?'Current step':i<step||st==='SENT'?'Done':''}</div>`).join('')}</div>`; }

async function viewRequest(el, r, token){
  el.innerHTML = loader('Opening request');
  await api.requests(); if(stale(token)) return;
  const x = reqById(r.id); if(!x){ el.innerHTML='<div class="empty">Request not found.</div>'; return; }
  const m = model(x.model), role=APP.user.role, me=APP.user.id;
  const engineers = ['ritika','arjun','sana'];
  const load = id=>DB.requests.filter(q=>q.assignee===id && ['RND','ALLOCATED','RETURNED','SUBMITTED'].includes(q.status)).length;
  let action = '';
  if(x.status==='NEW'){
    action = role==='lead' ? `<div class="panel"><div class="panel-h"><h3>Allocate to R&D</h3></div><div class="panel-b">
      <p class="small sub" style="margin-top:0">Pick the engineer who will fill the spec sheet. Current open load is shown so work stays balanced.</p>
      <div class="grid" style="gap:8px">${engineers.map((id,i)=>`<label class="role-card" style="grid-template-columns:auto 34px 1fr auto;cursor:pointer"><input type="radio" name="eng" value="${id}" ${i===0?'checked':''}>${av(id,34)}<span><b>${esc(person(id).name)}</b><div class="can">${load(id)} open spec${load(id)===1?'':'s'}</div></span><span class="chip">${load(id)<2?'Available':'Busy'}</span></label>`).join('')}</div>
      <div class="row-x" style="margin-top:12px"><span class="spacer"></span><button class="btn primary" data-act="allocate" data-id="${x.id}">Allocate request</button></div></div></div>`
      : `<div class="note">Waiting for a team lead to allocate this request. Navdeep and Mahendra have been notified.</div>`;
  } else if(['RND','ALLOCATED','RETURNED'].includes(x.status)){
    action = role==='rnd' && x.assignee===me ? `<div class="panel"><div class="panel-b row-x"><div style="flex:1"><b>Your turn: fill the spec sheet</b><div class="small sub">${x.status==='RETURNED'?'The lead returned this spec with comments. Update and resubmit.':'Enter the model specification, then submit it for approval.'}</div></div><button class="btn primary" data-act="go" data-to="spec/${x.id}">Open spec sheet</button></div></div>`
      : `<div class="note">With ${esc(person(x.assignee).name)} (R&D) to fill the spec sheet.</div>`;
  } else if(x.status==='SUBMITTED'){
    action = role==='lead' ? `<div class="panel"><div class="panel-h"><h3>Review the spec</h3></div><div class="panel-b"><p class="small sub" style="margin-top:0">Approving locks the spec for costing. Returning sends it back to ${esc(person(x.assignee).name)} with your note.</p>
      <textarea class="inp" id="dec-note" rows="2" placeholder="Note for R&D (optional when approving)"></textarea>
      <div class="row-x" style="margin-top:10px"><button class="btn" data-act="go" data-to="spec/${x.id}">Open spec sheet</button><span class="spacer"></span><button class="btn danger" data-act="decide" data-ok="0" data-id="${x.id}">Return to R&D</button><button class="btn primary" data-act="decide" data-ok="1" data-id="${x.id}">Approve spec</button></div></div></div>`
      : `<div class="note">Spec submitted. Waiting for ${esc(person(x.lead).name)} to approve.</div>`;
  } else if(['APPROVED','COSTING'].includes(x.status)){
    action = role==='costing' ? `<div class="panel"><div class="panel-b row-x"><div style="flex:1"><b>Spec approved and locked</b><div class="small sub">Open the costing workbench. Chassis ${m.idu} + ${m.odu} base cost is pulled automatically.</div></div><button class="btn primary" data-act="go" data-to="costing/${x.id}">Open costing workbench</button></div></div>` : `<div class="note">Spec approved. The costing team is pricing this model.</div>`;
  } else if(x.status==='COSTED'){
    const v = DB.versions.filter(v=>v.req===x.id).slice(-1)[0];
    action = role==='costing' && v ? `<div class="panel"><div class="panel-b row-x"><div style="flex:1"><b>Costed: ${fmt.inr(v.total)} per set (v${v.v})</b><div class="small sub">Review the customer sheet and send it from the system.</div></div><button class="btn" data-act="go" data-to="costing/${x.id}">Re-open costing</button><button class="btn primary" data-act="go" data-to="customer/${v.id}">Review & send</button></div></div>` : `<div class="note">Costed. Waiting to be sent to the customer.</div>`;
  } else if(x.status==='SENT'){
    const v = DB.versions.filter(v=>v.model===x.model && v.status==='SENT').slice(-1)[0];
    action = `<div class="panel"><div class="panel-b row-x"><div style="flex:1"><b>Sent to the customer</b><div class="small sub">${v?'v'+v.v+' went to '+esc(v.sentTo):''}</div></div>${v&&can('history')?`<button class="btn" data-act="go" data-to="customer/${v.id}">View what was sent</button>`:''}</div></div>`;
  }
  el.innerHTML = `
  <div class="page-head"><div class="t"><div class="crumbs"><a href="#/requests">Requests</a> / ${x.id}</div><h1>${esc(m.name)}</h1><p>${esc(x.note)}</p></div><div class="row-x">${stPill(x.status)}<span class="chip">${x.priority} priority</span></div></div>
  ${flowHtml(x.status)}
  <div class="grid g-main">
    <div class="grid" style="align-content:start">${action}
      <div class="panel"><div class="panel-h"><h3>Request details</h3></div><div class="panel-b"><table class="tbl"><tbody>
        <tr><td class="muted">Customer / brand</td><td>${brandDot(m.brand)}</td><td class="muted">Model code</td><td><b>${m.code}</b></td></tr>
        <tr><td class="muted">Chassis</td><td>${IDU_CHASSIS[m.idu].label}<br>${ODU_CHASSIS[m.odu].label}</td><td class="muted">Capacity</td><td>${m.tr} TR, ${m.star}-star, ISEER ${m.iseer}</td></tr>
        <tr><td class="muted">Received</td><td>${x.received}, ${esc(x.via)}</td><td class="muted">Reply due</td><td>${x.due}</td></tr>
        <tr><td class="muted">Team lead</td><td>${x.lead?av(x.lead,22)+' '+esc(person(x.lead).name):'Not allocated'}</td><td class="muted">R&D engineer</td><td>${x.assignee?av(x.assignee,22)+' '+esc(person(x.assignee).name):'—'}</td></tr>
      </tbody></table></div></div>
      ${x.specLog.length?`<div class="panel"><div class="panel-h"><h3>Spec change log</h3><span class="chip">${x.specLog.length} edits</span></div><div class="panel-b"><table class="tbl"><thead><tr><th>When</th><th>Who</th><th>Field</th><th>From</th><th>To</th></tr></thead><tbody>${x.specLog.slice().reverse().map(l=>`<tr><td class="small">${l.t}</td><td>${av(l.who,22)}</td><td>${esc(specLabel(l.k))}</td><td class="muted">${esc(l.from)}</td><td><b>${esc(l.to)}</b></td></tr>`).join('')}</tbody></table></div></div>`:''}
    </div>
    <div class="panel"><div class="panel-h"><h3>Timeline</h3></div><div class="panel-b"><ul class="tl">${x.hist.slice().reverse().map(h=>`<li><span class="b"></span><div><b>${esc(h.a)}</b></div><div class="small">${av(h.who,18)} ${esc(person(h.who).name)}${h.n?', '+esc(h.n):''}</div><div class="w">${h.t}</div></li>`).join('')}</ul></div></div>
  </div>`;
}
ACT.allocate = async el=>{ const eng=$('input[name=eng]:checked').value; el.disabled=true; el.innerHTML='<span class="sp"></span>Allocating';
  try{ await api.allocate(el.dataset.id, eng, APP.user.id); toast('Allocated to '+person(eng).name+'. They have been notified.'); renderShell(); render(); }catch(e){ toast(e.message,true); render(); } };
ACT.decide = async el=>{ const ok=el.dataset.ok==='1', note=$('#dec-note')?$('#dec-note').value:''; if(!ok && !note){ toast('Add a note so R&D knows what to change', true); $('#dec-note').focus(); return; }
  el.disabled=true; el.innerHTML='<span class="sp"></span>Saving'; await api.decide(el.dataset.id, ok, note, APP.user.id); toast(ok?'Spec approved and locked for costing':'Returned to R&D with your note'); renderShell(); render(); };

/* ---------- spec sheets ---------- */
function specLabel(k){ for(const [,rows] of SPEC_TEMPLATE) for(const r of rows) if(r[0]===k) return r[1]; return k; }
function specRows(includeInternalSection){ const out=[]; SPEC_TEMPLATE.forEach(([sec,rows])=>{ const internalSec = sec.startsWith('Internal'); if(internalSec && !includeInternalSection) return; rows.forEach(r=>out.push({sec, k:r[0], label:r[1], internal:!!r[2]||internalSec})); }); return out; }

async function viewSpecList(el, r, token){
  el.innerHTML = loader('Fetching spec sheets');
  const reqs = await api.requests(); if(stale(token)) return;
  const list = reqs.filter(x=> APP.user.role!=='rnd' || x.assignee===APP.user.id);
  el.innerHTML = `<div class="page-head"><div class="t"><h1>Spec sheets</h1><p>One spec sheet per request. Only R&D can type into it; leads approve it; costing reads it. Every edit is logged.</p></div></div>
  <div class="panel"><div class="panel-b"><table class="tbl"><thead><tr><th>Request</th><th>Model</th><th>R&D engineer</th><th>Edits</th><th>Status</th><th></th></tr></thead><tbody>
  ${list.map(x=>{ const m=model(x.model); return `<tr class="click" data-act="go" data-to="spec/${x.id}"><td><b>${x.id}</b></td><td>${esc(m.name)}</td><td>${x.assignee?av(x.assignee,22)+' '+esc(person(x.assignee).name):'<span class="muted">Not allocated</span>'}</td><td class="num">${x.specLog.length}</td><td>${stPill(x.status)}</td><td class="r"><span class="btn sm">Open</span></td></tr>`; }).join('')}
  </tbody></table></div></div>`;
}

async function viewSpecSheet(el, r, token){
  el.innerHTML = loader('Loading spec sheet');
  await api.requests(); if(stale(token)) return;
  const x = reqById(r.id), m=model(x.model), role=APP.user.role;
  const editable = role==='rnd' && x.assignee===APP.user.id && ['RND','ALLOCATED','RETURNED'].includes(x.status);
  const seeInternal = role==='costing';
  const rows = specRows(seeInternal);
  APP.spec.draft = {};
  const total = specRows(true).length, cust = specRows(true).filter(r=>!r.internal).length;
  let secs='', n=0;
  SPEC_TEMPLATE.forEach(([sec])=>{
    const rs = rows.filter(r=>r.sec===sec); if(!rs.length) return;
    secs += `<div class="spec-sec"><h4>${esc(sec)} ${sec.startsWith('Internal')?'<span class="chip warn">Costing only</span>':''}</h4>${rs.map(rw=>{ n++; return `<div class="spec-row ${rw.internal?'internal':''}"><span class="no num">${n}</span><span>${esc(rw.label)}</span><input data-k="${rw.k}" value="${esc(x.spec[rw.k])}" ${editable && !rw.k.match(/^(cuKg|alKg|stKg|plKg|chRef|commonPct|exclRef)$/)?'':'readonly'} aria-label="${esc(rw.label)}"><span class="x small ${rw.internal?'':'muted'}">${rw.internal?'Internal only':'Customer sheet'}</span></div>`; }).join('')}</div>`;
  });
  el.innerHTML = `
  <div class="page-head"><div class="t"><div class="crumbs"><a href="#/requests">Requests</a> / <a href="#/requests/${x.id}">${x.id}</a> / Spec sheet</div><h1>Spec sheet: ${esc(m.code)}</h1>
    <p>${esc(m.name)}. ${total} rows internally; ${cust} rows go to the customer. Rows marked internal are stripped automatically from the customer sheet.</p></div>
    <div class="row-x">${stPill(x.status)}
    ${editable?`<button class="btn" data-act="spec-save" data-id="${x.id}" id="specSave" disabled>Save changes</button><button class="btn primary" data-act="spec-submit" data-id="${x.id}">Submit for approval</button>`:''}
    ${role==='lead'&&x.status==='SUBMITTED'?`<button class="btn" data-act="go" data-to="requests/${x.id}">Approve or return</button>`:''}
    ${role==='costing'&&['APPROVED','COSTING','COSTED','SENT'].includes(x.status)?`<button class="btn primary" data-act="go" data-to="costing/${x.id}">Open costing</button>`:''}</div></div>
  ${!editable?`<div class="note" style="margin-bottom:12px">${role==='rnd'?'This spec is read-only: it is not assigned to you, or it has already been submitted.':'Read-only for '+ROLES[role].label+'. Only the assigned R&D engineer can edit specifications.'}</div>`:`<div class="note" style="margin-bottom:12px">Edit any field. Changed fields turn copper; saving writes each change to the audit log.</div>`}
  <div class="panel"><div class="panel-b">${secs}</div></div>`;
  if(editable) $$('.spec-row input:not([readonly])').forEach(i=>i.addEventListener('input',()=>{ const k=i.dataset.k; if(i.value!==String(x.spec[k])){ APP.spec.draft[k]=i.value; i.classList.add('changed'); } else { delete APP.spec.draft[k]; i.classList.remove('changed'); } $('#specSave').disabled=!Object.keys(APP.spec.draft).length; $('#specSave').textContent = Object.keys(APP.spec.draft).length?'Save '+Object.keys(APP.spec.draft).length+' change'+(Object.keys(APP.spec.draft).length>1?'s':''):'Save changes'; }));
}
ACT['spec-save'] = async el=>{ el.disabled=true; el.innerHTML='<span class="sp"></span>Saving'; const n=Object.keys(APP.spec.draft).length; await api.saveSpec(el.dataset.id, APP.spec.draft, APP.user.id); toast(n+' change'+(n>1?'s':'')+' saved and logged'); render(); };
ACT['spec-submit'] = async el=>{ if(Object.keys(APP.spec.draft).length) await api.saveSpec(el.dataset.id, APP.spec.draft, APP.user.id); el.disabled=true; el.innerHTML='<span class="sp"></span>Submitting'; await api.submitSpec(el.dataset.id, APP.user.id); toast('Submitted. The team lead has been notified.'); renderShell(); go('requests/'+el.dataset.id); };
