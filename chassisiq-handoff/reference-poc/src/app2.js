/* ===== Costing, commodities, simulation, SAP BOM, history, customer sheet, library, admin ===== */
const ZONE_MAT = {coil:'CU', fan:'PL', body:'PL', louver:'PL', plate:'ST', pcb:'BO', cabinet:'ST', base:'ST', comp:'CP', pipe:'RF'};
const ZONE_NAME = {coil:'Heat exchanger coil', fan:'Fan & motor', body:'Body mouldings', louver:'Louvers & swing', plate:'Mounting plate', pcb:'Electronics', cabinet:'Cabinet', base:'Base & mounts', comp:'Compressor', pipe:'Piping & refrigerant'};
const matColor = m=>COLORS[m]||'#9AA8A1';

function unitArt(c, focus){
  const z={}; c.lines.forEach(l=>{ const k=l.unit+':'+l.zone; z[k]=(z[k]||0)+l.cost; });
  const part=(k, inner)=>{ const [u,zn]=k.split(':'); return `<g class="part ${focus===k?'on':''}" data-act="wb-zone" data-z="${k}" data-tip="<b>${u} ${ZONE_NAME[zn]}</b><br>${fmt.inr(z[k]||0)} per set<br>Click to filter parts">${inner}</g>`; };
  const fin=(x,y,w,h)=>{ let s=''; for(let i=x+4;i<x+w;i+=6) s+=`<line x1="${i}" y1="${y+2}" x2="${i}" y2="${y+h-2}" stroke="rgba(255,255,255,.35)" stroke-width="1"/>`; return s; };
  return `<svg class="unit-art ${focus?'focus':''}" viewBox="0 0 520 300" role="img" aria-label="Exploded view of indoor and outdoor unit, coloured by material">
    ${part('IDU:plate',`<rect x="70" y="6" width="380" height="7" rx="3" fill="${COLORS.ST}"/>`)}
    ${part('IDU:body',`<rect x="20" y="18" width="480" height="112" rx="22" fill="#2A4A40" stroke="#4E6E63"/>`)}
    ${part('IDU:coil',`<rect x="44" y="30" width="432" height="38" rx="6" fill="${COLORS.CU}"/>${fin(44,30,432,38)}`)}
    ${part('IDU:fan',`<rect x="62" y="76" width="350" height="24" rx="12" fill="${COLORS.PL}"/>${[...Array(14)].map((_,i)=>`<line x1="${78+i*24}" y1="79" x2="${84+i*24}" y2="97" stroke="rgba(0,0,0,.25)"/>`).join('')}`)}
    ${part('IDU:pcb',`<rect x="424" y="76" width="56" height="24" rx="4" fill="#9AA8A1"/><rect x="432" y="82" width="14" height="10" fill="#0E2E25" opacity=".5"/>`)}
    ${part('IDU:louver',`<rect x="44" y="108" width="432" height="12" rx="6" fill="#D9C27A"/>`)}
    ${part('ODU:cabinet',`<rect x="40" y="152" width="440" height="128" rx="10" fill="#2A4A40" stroke="${COLORS.ST}" stroke-width="2"/>`)}
    ${part('ODU:coil',`<rect x="52" y="162" width="22" height="108" rx="4" fill="${COLORS.CU}"/>${[...Array(16)].map((_,i)=>`<line x1="54" y1="${166+i*6.5}" x2="72" y2="${166+i*6.5}" stroke="rgba(255,255,255,.35)"/>`).join('')}`)}
    ${part('ODU:fan',`<circle cx="180" cy="216" r="52" fill="#173F35" stroke="${COLORS.PL}" stroke-width="3"/>${[0,120,240].map(a=>`<ellipse cx="180" cy="190" rx="13" ry="24" fill="${COLORS.PL}" transform="rotate(${a} 180 216)"/>`).join('')}<circle cx="180" cy="216" r="9" fill="#0E2E25"/>`)}
    ${part('ODU:comp',`<rect x="306" y="198" width="54" height="72" rx="20" fill="${COLORS.CP}"/><rect x="306" y="214" width="54" height="5" fill="rgba(255,255,255,.25)"/>`)}
    ${part('ODU:pipe',`<path d="M333 198 C333 172 392 176 404 214 L470 214" fill="none" stroke="${COLORS.RF}" stroke-width="5" stroke-linecap="round"/><path d="M360 248 L470 248" fill="none" stroke="${COLORS.CU}" stroke-width="5" stroke-linecap="round"/>`)}
    ${part('ODU:pcb',`<rect x="392" y="162" width="76" height="34" rx="4" fill="#9AA8A1"/><rect x="400" y="170" width="20" height="14" fill="#0E2E25" opacity=".5"/>`)}
    ${part('ODU:base',`<rect x="34" y="282" width="452" height="9" rx="4" fill="${COLORS.ST}"/>`)}
  </svg>`;
}

async function viewCostingList(el, r, token){
  el.innerHTML = loader('Fetching costing queue');
  const reqs = await api.requests(); if(stale(token)) return;
  const ready = reqs.filter(x=>['APPROVED','COSTING','COSTED','SENT'].includes(x.status));
  const waiting = reqs.filter(x=>!['APPROVED','COSTING','COSTED','SENT'].includes(x.status));
  const snap=snapNow();
  el.innerHTML = `<div class="page-head"><div class="t"><h1>Costing</h1><p>Costing opens once a team lead approves the spec. The chassis base cost loads from the chassis master; you add or remove the brand's exclusive parts.</p></div><span class="chip ${APP.mode==='aicm'?'mint':'warn'}"><span class="d"></span>${esc(basisLabel())}</span></div>
  <div class="panel" style="margin-bottom:16px"><div class="panel-h"><h3>Ready for costing</h3></div><div class="panel-b"><table class="tbl"><thead><tr><th>Request</th><th>Model</th><th>Chassis</th><th class="r">Estimate at current rates</th><th>Status</th><th></th></tr></thead><tbody>
  ${ready.map(x=>{ const m=model(x.model); return `<tr class="click" data-act="go" data-to="costing/${x.id}"><td><b>${x.id}</b></td><td>${esc(m.name)}</td><td><span class="chip">${m.idu}</span> <span class="chip">${m.odu}</span></td><td class="r num">${fmt.inr(compute(m,snap).total)}</td><td>${stPill(x.status)}</td><td class="r"><span class="btn sm primary">Open workbench</span></td></tr>`; }).join('')}
  </tbody></table></div></div>
  <div class="panel"><div class="panel-h"><h3>Not yet approved</h3><span class="chip">${waiting.length}</span></div><div class="panel-b"><table class="tbl"><tbody>${waiting.map(x=>`<tr><td><b>${x.id}</b></td><td>${esc(model(x.model).name)}</td><td>${stPill(x.status)}</td><td class="r small muted">Opens after lead approval</td></tr>`).join('')}</tbody></table></div></div>`;
}

async function viewWorkbench(el, r, token){
  el.innerHTML = loader('Loading chassis masters and rates');
  const x = reqById(r.id); const m = model(x.model);
  if(!['APPROVED','COSTING','COSTED','SENT'].includes(x.status)){ el.innerHTML = `<div class="page-head"><div class="t"><div class="crumbs"><a href="#/costing">Costing</a> / ${x.id}</div><h1>${esc(m.name)}</h1></div></div><div class="lock-note"><div class="ic">⏳</div><div><b>The spec isn't approved yet.</b><div class="small">Costing opens after the team lead approves the spec sheet. Current status: ${STATUS[x.status].label}.</div></div></div>`; return; }
  await Promise.all([api.chassis(m.idu), api.chassis(m.odu), api.commodities(APP.mode), api.startCosting(x.id, APP.user.id)]);
  if(stale(token)) return;
  if(APP.wb.reqId!==x.id) APP.wb = {reqId:x.id, excl:m.excl.slice(), exPrice:{}, priceMode:'lpp', zone:null, unit:'all'};
  wbRender();
}
function wbRender(){
  const el=$('#view'), w=APP.wb, x=reqById(w.reqId), m=model(x.model), snap=snapNow();
  const c = compute(m, snap, {excl:w.excl, exPrice:w.exPrice, priceMode:w.priceMode});
  const cAlt = compute(m, snap, {excl:w.excl, exPrice:w.exPrice, priceMode:w.priceMode==='lpp'?'avg':'lpp'});
  const vers = DB.versions.filter(v=>v.model===m.id).sort((a,b)=>a.v-b.v), last = vers[vers.length-1];
  const lines = c.lines.filter(l=>(!w.zone || (l.unit+':'+l.zone)===w.zone) && (w.unit==='all'||l.unit===w.unit));
  const R=c.R;
  const rateTxt = l=> l.type==='mat' ? `${fmt.n(l.kg,2)} kg × ${fmt.inr(R[l.m],1)}/kg` : l.type==='cp' ? `Landed ${fmt.inr(R.CP)} × ${ODU_CHASSIS[m.odu].cp}` : (w.priceMode==='lpp'?'LPP ':'SAP avg ')+fmt.inr(w.priceMode==='lpp'?l.lpp:l.avg);
  const steps=[{label:'Chassis common parts', value:c.common, kind:'add', color:'#22564A'},{label:'Exclusive parts', value:c.exclusive, kind:'add', color:COLORS.CU},{label:'Assembly & testing', value:c.assembly, kind:'add', color:'#7A8781'},{label:'Freight & warranty', value:c.freight+c.warranty, kind:'add', color:'#7A8781'},{label:'Contingency', value:c.contingency, kind:'add', color:'#C79A1E'},{label:'Margin', value:c.margin, kind:'add', color:'#1E9C94'},{label:'Quote per set', value:c.total, kind:'total'}];
  const wts=c.weights, catalogue=Object.keys(EXCLUSIVES).filter(k=>!w.excl.includes(k));
  const delta = last ? c.total-last.total : 0;
  el.innerHTML = `
  <div class="page-head"><div class="t"><div class="crumbs"><a href="#/costing">Costing</a> / <a href="#/requests/${x.id}">${x.id}</a></div><h1>${esc(m.name)}</h1>
    <p>${m.code}. Chassis ${IDU_CHASSIS[m.idu].label} and ${ODU_CHASSIS[m.odu].label}, priced for ${QUARTER_BASIS.quoteFor}.</p></div>
    <div class="row-x"><button class="btn" data-act="go" data-to="spec/${x.id}">View spec</button><button class="btn" data-act="go" data-to="simulation">Simulate rates</button><button class="btn primary" data-act="wb-save">Save as version ${vers.length+1}</button></div></div>
  <section class="cost-hero">
    <div class="l">
      <span class="pill ${APP.mode==='manual'?'manual':''}"><i></i>${esc(basisLabel())}</span>
      <div style="margin-top:14px;color:#9DB8AC;font-size:13px">Quote price per set (IDU + ODU)</div>
      <div class="big num" id="wbTotal">${fmt.inr(c.total)}<small>/set</small></div>
      ${last?`<div style="margin-top:8px;font-size:13px;color:${delta>0?'#F08A78':'#6EDDB4'}">${delta>0?'▲':'▼'} ${fmt.inr(Math.abs(delta))} (${fmt.pct(delta/last.total)}) vs v${last.v} sent ${last.on}, ${last.quarter}</div>`:''}
      <div class="meta">
        <div><b class="num">${fmt.inr(c.material)}</b>Material</div>
        <div><b class="num">${c.lines.length} of ${c.lines.length+c.exLines.length}</b>Parts from chassis master (${Math.round(c.lines.length/(c.lines.length+c.exLines.length)*100)}%)</div>
        <div><b class="num">${fmt.inr(c.exclusive)}</b>Exclusive (${w.excl.length} items)</div>
        <div><b class="num">${fmt.n(wts.CU,2)} kg</b>Copper per set</div>
      </div>
    </div>
    <div class="r">${unitArt(c, w.zone)}
      <div class="art-legend">${['CU','AL','PL','ST','CP','RF'].map(k=>`<span class="mat"><i style="background:${COLORS[k]}"></i>${MAT_NAME[k]}</span>`).join('')}<span class="mat"><i style="background:#9AA8A1"></i>Bought-out</span>${w.zone?`<button class="btn sm" data-act="wb-zone" data-z="" style="margin-left:auto;background:transparent;color:#CFE3DA;border-color:rgba(255,255,255,.2)">Clear filter</button>`:'<span style="margin-left:auto">Click a part to filter</span>'}</div>
    </div>
  </section>
  <div class="grid g-main" style="margin-top:16px">
    <div class="grid" style="align-content:start">
      <div class="panel"><div class="panel-h"><h3>How the price builds up</h3><span class="small muted">Hover a bar for values</span></div><div class="panel-b">${waterfall(steps,{w:680,h:260})}</div></div>
      <div class="panel"><div class="panel-h"><h3>Chassis common parts</h3>
        <div class="seg">${[['all','Both units'],['IDU','Indoor'],['ODU','Outdoor']].map(([k,l])=>`<button class="${w.unit===k?'on':''}" data-act="wb-unit" data-v="${k}">${l}</button>`).join('')}</div></div>
        <div class="panel-b"><p class="small sub" style="margin-top:0">${w.zone?'Filtered to '+esc(w.zone.split(':')[0]+' '+ZONE_NAME[w.zone.split(':')[1]])+'. ':''}Pulled from the ${m.idu} and ${m.odu} chassis masters. Material lines re-price from the commodity master; bought-outs use the latest purchase price.</p>
        <table class="tbl"><thead><tr><th>Part</th><th>Unit</th><th>Material</th><th>Basis</th><th class="r">Cost</th></tr></thead><tbody>
        ${lines.map(l=>`<tr><td><b>${esc(l.name)}</b><div class="small muted">${l.pc}</div></td><td><span class="chip">${l.unit}</span></td><td><span class="mat"><i style="background:${l.type==='bo'?'#9AA8A1':matColor(l.type==='cp'?'CP':l.m)}"></i>${l.type==='bo'?'Bought-out':MAT_NAME[l.type==='cp'?'CP':l.m]}</span></td><td class="small sub">${rateTxt(l)}</td><td class="r num">${fmt.inr(l.cost)}</td></tr>`).join('')}
        </tbody><tfoot><tr><td colspan="4">${lines.length===c.lines.length?'Chassis common parts total':'Filtered subtotal'}</td><td class="r num">${fmt.inr(lines.reduce((a,b)=>a+b.cost,0))}</td></tr></tfoot></table></div></div>
      <div class="panel"><div class="panel-h"><h3>Exclusive parts for ${esc(m.brand)}</h3><span class="chip">${w.excl.length} items</span></div><div class="panel-b">
        <p class="small sub" style="margin-top:0">Parts that differ from the common chassis. Add or remove items; bought-out prices can be edited for this quote.</p>
        <table class="tbl"><thead><tr><th>Part</th><th>Type</th><th class="r">Price</th><th class="r">Effect</th><th></th></tr></thead><tbody>
        ${c.exLines.map(e=>`<tr><td><b>${esc(e.name)}</b></td><td class="small">${e.type==='mat'?`<span class="mat"><i style="background:${matColor(e.m)}"></i>${fmt.n(e.kg,2)} kg ${MAT_NAME[e.m].toLowerCase()}</span>`:'Bought-out'}</td>
          <td class="r">${e.type==='bo'?`<input class="cell num" data-act="noop" data-ex="${e.k}" value="${Math.round(Math.abs(e.cost))}" aria-label="Price for ${esc(e.name)}">`:'<span class="small muted">From rates</span>'}</td>
          <td class="r num ${e.sign<0?'diff-dn':''}">${e.sign<0?'− ':'+ '}${fmt.inr(Math.abs(e.cost))}</td><td class="r"><button class="btn sm ghost" data-act="wb-ex-del" data-k="${e.k}" aria-label="Remove">Remove</button></td></tr>`).join('')}
        </tbody><tfoot><tr><td colspan="3">Exclusive parts net</td><td class="r num">${fmt.inr(c.exclusive)}</td><td></td></tr></tfoot></table>
        ${catalogue.length?`<div class="row-x" style="margin-top:10px"><select class="sel" id="exAdd" style="max-width:360px">${catalogue.map(k=>`<option value="${k}">${esc(EXCLUSIVES[k].name)}</option>`).join('')}</select><button class="btn" data-act="wb-ex-add">Add exclusive part</button></div>`:''}
      </div></div>
      <div class="panel"><div class="panel-h"><h3>Overheads, contingency and margin</h3></div><div class="panel-b"><table class="tbl"><tbody>
        <tr><td>Assembly & testing</td><td class="small sub">IDU ₹${OVERHEADS.assembly.IDU} + ODU ₹${OVERHEADS.assembly.ODU} per set</td><td class="r num">${fmt.inr(c.assembly)}</td></tr>
        <tr><td>Inbound freight</td><td class="small sub">${(OVERHEADS.freightPct*100).toFixed(1)}% of material</td><td class="r num">${fmt.inr(c.freight)}</td></tr>
        <tr><td>Warranty provision</td><td class="small sub">${(OVERHEADS.warrantyPct*100).toFixed(1)}% of material</td><td class="r num">${fmt.inr(c.warranty)}</td></tr>
        <tr><td>Contingency: ${esc(OVERHEADS.contingency.label)}</td><td class="small sub">₹1,00,000 ÷ ${fmt.n(OVERHEADS.contingency.lotQty)} sets = ${fmt.inr(c.contRaw)}, capped at ${(OVERHEADS.contingency.capPct*100).toFixed(1)}% of material (${fmt.inr(c.contCap)})</td><td class="r num">${fmt.inr(c.contingency)}</td></tr>
        <tr><td>Margin</td><td class="small sub">${(OVERHEADS.marginPct*100).toFixed(0)}% on cost</td><td class="r num">${fmt.inr(c.margin)}</td></tr>
      </tbody><tfoot><tr><td colspan="2">Quote price per set</td><td class="r num">${fmt.inr(c.total)}</td></tr></tfoot></table></div></div>
    </div>
    <div class="grid" style="align-content:start">
      <div class="panel"><div class="panel-h"><h3>Rates used</h3><a href="#/commodities" class="small">Commodity master</a></div><div class="panel-b"><table class="tbl"><tbody>
        ${['CU','AL','ST','PL','RF','CP'].map(k=>{ const cm=COMMODITIES.find(q=>q.code===k); return `<tr><td><span class="mat"><i style="background:${COLORS[k]}"></i>${esc(cm.name)}</span><div class="small muted">${fmt.n(snap[k], snap[k]<200?2:0)} ${cm.unit}</div></td><td class="r num"><b>${fmt.inr(R[k], k==='CP'?0:1)}</b><div class="small muted">${k==='CP'?'landed/unit':'landed/kg'}</div></td></tr>`; }).join('')}
        <tr><td>INR per USD</td><td class="r num"><b>${fmt.n(snap.FX,2)}</b></td></tr>
      </tbody></table></div></div>
      <div class="panel"><div class="panel-h"><h3>Material weight per set</h3></div><div class="panel-b" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
        ${donut(['CU','AL','ST','PL','RF'].map(k=>({label:MAT_NAME[k], value:wts[k], color:COLORS[k]})),{size:170, unit:'kg', center:fmt.n(Object.values(wts).reduce((a,b)=>a+b,0),1)+' kg', centerSub:'critical materials', label:'Material weights'})}
        <div style="flex:1;min-width:140px">${['CU','AL','ST','PL','RF'].map(k=>`<div class="row-x small" style="padding:3px 0"><span class="mat"><i style="background:${COLORS[k]}"></i>${MAT_NAME[k]}</span><span class="spacer"></span><b class="num">${fmt.n(wts[k],2)} kg</b></div>`).join('')}</div>
      </div></div>
      <div class="panel"><div class="panel-h"><h3>Bought-out price basis</h3></div><div class="panel-b">
        <div class="seg" style="margin-bottom:10px"><button class="${w.priceMode==='lpp'?'on':''}" data-act="wb-price" data-v="lpp">Latest purchase price</button><button class="${w.priceMode==='avg'?'on':''}" data-act="wb-price" data-v="avg">SAP moving average</button></div>
        <p class="small sub" style="margin:0">The SAP BOM carries a moving average that blends old cheap and new expensive buys. Quotes use LPP. Switching changes this quote by <b class="${cAlt.total>c.total?'diff-up':'diff-dn'}">${cAlt.total>c.total?'+':'−'}${fmt.inr(Math.abs(cAlt.total-c.total))}</b> per set.</p>
      </div></div>
      <div class="panel"><div class="panel-h"><h3>Previous versions</h3><a href="#/history" class="small">Quote history</a></div><div class="panel-b">
        ${vers.length?`<ul class="tl">${vers.slice().reverse().map(v=>`<li><span class="b"></span><div><b>v${v.v}</b>, ${v.quarter} <span class="num" style="float:right">${fmt.inr(v.total)}</span></div><div class="w">${v.on}, ${esc(person(v.by).name)}, ${v.source}${v.status==='DRAFT'?', draft':''}</div></li>`).join('')}</ul>`:'<div class="empty">First costing for this model.</div>'}
      </div></div>
    </div>
  </div>`;
  $$('input[data-ex]').forEach(i=>i.addEventListener('change',()=>{ const v=parseFloat(i.value); if(isNaN(v)||v<0){ toast('Enter a price of zero or more', true); i.value=Math.round(EXCLUSIVES[i.dataset.ex].price); return; } APP.wb.exPrice[i.dataset.ex]=v; wbRender(); toast('Price updated for this quote'); }));
}
ACT.noop = ()=>{};
ACT['wb-zone'] = el=>{ APP.wb.zone = el.dataset.z || null; if(APP.wb.zone) APP.wb.unit='all'; wbRender(); };
ACT['wb-unit'] = el=>{ APP.wb.unit=el.dataset.v; APP.wb.zone=null; wbRender(); };
ACT['wb-price'] = el=>{ APP.wb.priceMode=el.dataset.v; wbRender(); };
ACT['wb-ex-del'] = el=>{ APP.wb.excl = APP.wb.excl.filter(k=>k!==el.dataset.k); wbRender(); toast('Removed '+EXCLUSIVES[el.dataset.k].name.toLowerCase()); };
ACT['wb-ex-add'] = ()=>{ const k=$('#exAdd').value; APP.wb.excl.push(k); wbRender(); toast('Added '+EXCLUSIVES[k].name.toLowerCase()); };
ACT['wb-save'] = ()=>{
  const w=APP.wb, x=reqById(w.reqId), m=model(x.model), snap=snapNow(), c=compute(m,snap,{excl:w.excl, exPrice:w.exPrice, priceMode:w.priceMode});
  drawer('Save costing version', `<div class="kpi panel"><div class="l">Quote price per set</div><div class="v num">${fmt.inr(c.total)}</div><div class="f">${esc(basisLabel())}</div></div>
    <div class="note">Saving freezes the rates, exclusive parts and prices used, so this exact number can be reproduced years later.</div>
    <table class="tbl"><tbody><tr><td class="muted">Model</td><td>${esc(m.name)}</td></tr><tr><td class="muted">Request</td><td>${x.id}</td></tr><tr><td class="muted">Copper basis</td><td class="num">${fmt.n(snap.CU,2)} USD/MT</td></tr><tr><td class="muted">FX</td><td class="num">${fmt.n(snap.FX,2)}</td></tr><tr><td class="muted">Exclusive parts</td><td>${w.excl.length} items</td></tr></tbody></table>
    <div class="field"><label>Note for this version</label><textarea class="inp" id="verNote" rows="3">Q4 quote. ${APP.mode==='aicm'?'Rates from AICM Q3 average.':'Manual rates.'}</textarea></div>`,
    `<div class="row-x"><span class="spacer"></span><button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="wb-save-go">Save version</button></div>`);
};
ACT['wb-save-go'] = async el=>{
  const w=APP.wb, x=reqById(w.reqId), m=model(x.model), snap=snapNow(), c=compute(m,snap,{excl:w.excl, exPrice:w.exPrice, priceMode:w.priceMode});
  el.disabled=true; el.innerHTML='<span class="sp"></span>Saving';
  const v = await api.saveVersion(x.id, {snap, excl:w.excl.slice(), total:c.total, material:c.material, source:APP.mode==='aicm'?'AICM':'Manual', basis:APP.mode==='aicm'?'Q3-2026':'Manual', note:$('#verNote').value}, APP.user.id);
  closeOverlay(); toast('Saved v'+v.v+' at '+fmt.inr(v.total)+' per set'); renderShell(); go('customer/'+v.id);
};

/* ---------- commodities ---------- */
async function viewCommodities(el, r, token){
  el.innerHTML = loader('Fetching commodity master');
  await api.commodities(APP.mode); if(stale(token)) return;
  APP.comSel = APP.comSel || 'CU';
  const aicm = APP.mode==='aicm', snap=snapNow(), sel=COMMODITIES.find(c=>c.code===APP.comSel);
  const L = sel.code==='FX' ? null : landed(sel.code, snap);
  const sentV = DB.versions.filter(v=>v.status==='SENT').sort((a,b)=>a.on.localeCompare(b.on)), lastQ = sentV[sentV.length-1];
  const byQ = {}; sentV.forEach(v=>byQ[v.quarter]=v.snap[sel.code]); const qs=Object.keys(byQ);
  const trend = aicm ? `${lineChart([{name:sel.index, values:sel.hist, color:COLORS[sel.code]||'#465650'}], ['Nov','Jan','Feb','Mar','Apr','Jun','Jul','Sep','Oct','Nov'], {h:170, label:sel.index+' trend', band:[6,7]})}<p class="small sub" style="margin:6px 0 12px">Shaded: Q3 window used as the basis for Q4 quotes.</p>`
    : `${lineChart([{name:'Rate used in quotes', values:qs.map(q=>byQ[q]), color:COLORS[sel.code]||'#465650'}], qs.map(q=>q.replace(' 20',' \'')), {h:170, label:'Rates used in past quotes'})}<p class="small sub" style="margin:6px 0 12px">Without AICM there is no live index, so this shows the rate each past quote used.</p>`;
  el.innerHTML = `
  <div class="page-head"><div class="t"><h1>Commodity master</h1><p>${aicm?'Linked to AICM. Index prices and FX flow in from the AICM commodity page; quotes for the next quarter use the last quarter\'s average.':'Manual mode, for when AICM is not available. The costing team types rates or uploads a rates sheet; every quote records which rates it used.'}</p></div>
    <div class="row-x">${aicm?`<span class="small muted">Last sync ${DB.lastSync}</span><button class="btn primary" data-act="com-sync">Sync from AICM</button>`:`<button class="btn" data-act="com-upload">Upload rates sheet</button><button class="btn primary" data-act="com-save">Save rates</button>`}</div></div>
  <div class="grid g-main">
    <div class="panel"><div class="panel-b" style="padding-top:8px"><table class="tbl"><thead><tr><th>Commodity</th><th>Index & source</th>${aicm?'<th class="r">Spot</th><th class="r">Q1 avg</th><th class="r">Q2 avg</th>':'<th class="r">Last quote used</th>'}<th class="r">${aicm?'Q3 avg (used)':'Manual rate (used)'}</th><th class="r">Landed</th></tr></thead><tbody>
    ${COMMODITIES.map(c=>{ const lv = c.code==='FX'?null:landed(c.code,snap); const d=c.code==='FX'?0:0; return `<tr class="click ${APP.comSel===c.code?'':''}" data-act="com-sel" data-c="${c.code}" style="${APP.comSel===c.code?'background:var(--mint-wash)':''}">
      <td><span class="mat"><i style="background:${COLORS[c.code]||'#465650'}"></i><b>${esc(c.name)}</b></span><div class="small muted">${c.unit}</div></td>
      <td class="small">${esc(c.index)}<div class="muted">${aicm?'AICM: '+esc(c.src):'Entered by costing team'}</div></td>
      ${aicm?`<td class="r num">${fmt.n(c.cur, c.cur<200?2:0)}</td><td class="r num muted">${fmt.n(c.q1, c.q1<200?2:0)}</td><td class="r num muted">${fmt.n(c.q2, c.q2<200?2:0)}</td>`:`<td class="r num muted">${fmt.n(lastQ.snap[c.code], lastQ.snap[c.code]<200?2:0)}<div class="small">${lastQ.quarter}</div></td>`}
      <td class="r num">${aicm?`<b>${fmt.n(c.q3, c.q3<200?2:0)}</b>`:`<input class="cell num" data-act="noop" data-man="${c.code}" value="${DB.manual[c.code]}" aria-label="Manual rate for ${esc(c.name)}">${DB.manual[c.code]!==lastQ.snap[c.code]?`<div class="small ${DB.manual[c.code]>lastQ.snap[c.code]?'diff-up':'diff-dn'}">${fmt.pct((DB.manual[c.code]-lastQ.snap[c.code])/lastQ.snap[c.code])} vs last quote</div>`:''}`}</td>
      <td class="r num">${lv?`<b>${fmt.inr(lv.value, c.code==='CP'?0:1)}</b><div class="small muted">${lv.unit}</div>`:'<span class="muted small">FX input</span>'}</td></tr>`; }).join('')}
    </tbody></table>
    ${!aicm&&DB.manualFile?`<div class="note" style="margin-top:10px">Rates loaded from <b>${esc(DB.manualFile)}</b>. Edit any cell, then save.</div>`:''}
    </div></div>
    <div class="grid" style="align-content:start">
      <div class="panel"><div class="panel-h"><h3>${esc(sel.name)}</h3><span class="chip">${sel.structure==='import'?'Imported, duty stack':sel.structure==='lme'?'LME linked':sel.structure==='domestic'?'Domestic index':sel.structure==='polymer'?'Polymer index':sel.structure==='fx'?'Currency':'Supplier rate'}</span></div><div class="panel-b">
        ${trend}
        ${L?`<div class="formula">${L.steps.map(s=>`<div class="row-x" style="${s[3]?'opacity:.55':''}"><span>${esc(s[0])}</span><span class="spacer"></span><b class="num">${fmt.n(s[1], s[1]<500?2:0)}</b> <span class="o">${s[2]}</span></div>`).join('')}<div class="row-x" style="border-top:1px solid var(--line);margin-top:6px;padding-top:6px"><b>Landed cost</b><span class="spacer"></span><b class="num">${fmt.inr(L.value, sel.code==='CP'?0:2)}</b> <span class="o">${L.unit}</span></div></div>`:`<div class="formula">FX converts every USD-linked commodity and imported part. A 1% move in the rupee moves copper, aluminium, resin and compressor costs together.</div>`}
        ${sel.structure==='import'?`<p class="small sub">HSN ${sel.hsn}. Duty rates from the ICEGATE customs calculator; IGST is shown but not costed because it is claimed as input credit.</p>`:''}
        <p class="small muted" style="margin-bottom:0">Every commodity keeps its own working: copper is LME-linked with a tube conversion, compressors carry a customs duty stack, steel follows a domestic HRC index. Structures to be confirmed with Amber.</p>
      </div></div>
    </div>
  </div>`;
}
ACT['com-sel'] = (el,e)=>{ if(e.target.tagName==='INPUT') return; APP.comSel=el.dataset.c; render(); };
ACT['com-sync'] = async el=>{ el.disabled=true; el.innerHTML='<span class="sp"></span>Syncing from AICM'; await api.syncAICM(APP.user.id); toast(COMMODITIES.length+' rates synced from AICM. Q3 averages unchanged.'); render(); };
ACT['com-save'] = async el=>{ const vals={}; let bad=false; $$('input[data-man]').forEach(i=>{ const v=parseFloat(i.value); if(isNaN(v)||v<=0) bad=true; vals[i.dataset.man]=v; }); if(bad){ toast('Every rate needs a number above zero', true); return; } el.disabled=true; el.innerHTML='<span class="sp"></span>Saving'; await api.saveManual(vals, APP.user.id); toast('Manual rates saved. New quotes will use them.'); render(); };
ACT['com-upload'] = ()=>{ drawer('Upload rates sheet', `<p class="sub" style="margin:0">Use the costing team's rates template: one row per commodity with code, rate and unit.</p>
  <div class="upload" data-act="com-upload-go" style="padding:34px">Drop <b>Rates_Q4_FY27.xlsx</b> here, or click to choose a file</div>
  <table class="tbl"><thead><tr><th>Code</th><th>Rate in sheet</th><th>Unit</th></tr></thead><tbody>${[['CU',15000,'USD/MT'],['AL',3300,'USD/MT'],['FX',95.5,'INR/USD'],['ST',47500,'INR/MT'],['PL',1560,'USD/MT'],['CP',73,'USD/unit'],['RF',530,'INR/kg']].map(r=>`<tr><td>${r[0]}</td><td class="num">${fmt.n(r[1],r[1]<200?2:0)}</td><td class="muted">${r[2]}</td></tr>`).join('')}</tbody></table>`); };
ACT['com-upload-go'] = async el=>{ el.innerHTML='<span class="btn ghost" style="pointer-events:none"><span class="sp"></span>Reading Rates_Q4_FY27.xlsx</span>'; await api.uploadManual('Rates_Q4_FY27.xlsx', APP.user.id); closeOverlay(); toast('7 rates read from Rates_Q4_FY27.xlsx'); render(); };

/* ---------- simulation ---------- */
const SIM_KEYS = [['CU','Copper'],['AL','Aluminium'],['FX','INR per USD'],['ST','Steel'],['PL','Resin'],['CP','Compressor CIF'],['RF','Refrigerant']];
function viewSimulation(el){
  if(!APP.sim) APP.sim = {pct:{CU:0,AL:0,FX:0,ST:0,PL:0,CP:0,RF:0}, models:['M-DK18','M-VL18','M-LG24','M-GD12'], focus:'M-DK18', name:'Copper spike scenario'};
  simRender();
}
function simSnap(base){ const s={...base}; Object.entries(APP.sim.pct).forEach(([k,p])=>s[k]=base[k]*(1+p/100)); return s; }
function simRender(){
  const el=$('#view'), S=APP.sim, base=snapNow(), scen=simSnap(base), fm=model(S.focus);
  const rows = S.models.map(id=>{ const m=model(id), b=compute(m,base).total, s=compute(m,scen).total; return {m,b,s,d:s-b}; });
  const bF = compute(fm,base).total;
  const impact = SIM_KEYS.map(([k,l])=>{ const one={...base}; one[k]=base[k]*(1+S.pct[k]/100); return {label:l, value:compute(fm,one).total-bF, color:k==='FX'?'#465650':COLORS[k]}; });
  const cuL = landed('CU',base).value, cuS = landed('CU',scen).value;
  el.innerHTML = `
  <div class="page-head"><div class="t"><h1>Simulation</h1><p>Move commodity prices and see what every quote would become. Baseline is ${esc(basisLabel())}. Nothing here changes saved quotes until you save a new version.</p></div>
    <div class="row-x"><button class="btn" data-act="sim-reset">Reset to baseline</button><button class="btn primary" data-act="sim-save">Save scenario</button></div></div>
  <div class="row-x" style="margin-bottom:14px"><span class="small sub">Presets</span>
    <button class="btn sm" data-act="sim-preset" data-p="meeting">Copper to ₹1,700/kg landed</button>
    <button class="btn sm" data-act="sim-preset" data-p="rupee">Rupee weakens 3%</button>
    <button class="btn sm" data-act="sim-preset" data-p="soft">Metals soften 8%</button>
    <button class="btn sm" data-act="sim-preset" data-p="duty">Compressor CIF +10%</button></div>
  <div class="grid g-main">
    <div class="grid" style="align-content:start">
      <div class="panel"><div class="panel-h"><h3>Rate changes</h3><span class="small muted">Copper landed ${fmt.inr(cuL)}/kg → <b class="${cuS>cuL?'diff-up':cuS<cuL?'diff-dn':''}">${fmt.inr(cuS)}/kg</b></span></div><div class="panel-b">
        ${SIM_KEYS.map(([k,l])=>{ const c=COMMODITIES.find(q=>q.code===k); return `<div class="sl"><span><span class="mat"><i style="background:${k==='FX'?'#465650':COLORS[k]}"></i>${l}</span><div class="small muted num">${fmt.n(base[k],base[k]<200?2:0)} → ${fmt.n(scen[k],scen[k]<200?2:0)} ${c.unit}</div></span>
          <input type="range" min="-30" max="30" step="0.5" value="${S.pct[k]}" data-sim="${k}" aria-label="${l} change percent"><span class="val num">${S.pct[k]>0?'+':''}${S.pct[k].toFixed(1)}%</span></div>`; }).join('')}
      </div></div>
      <div class="panel"><div class="panel-h"><h3>Effect on quotes</h3><span class="small muted">Per set, IDU + ODU</span></div><div class="panel-b">
        <table class="tbl"><thead><tr><th></th><th>Model</th><th class="r">Baseline</th><th class="r">Scenario</th><th class="r">Change</th></tr></thead><tbody>
        ${MODELS.map(m=>{ const on=S.models.includes(m.id), row=rows.find(r=>r.m.id===m.id); return `<tr><td><input type="checkbox" data-act="noop" data-simm="${m.id}" ${on?'checked':''} aria-label="Include ${esc(m.name)}"></td><td>${brandDot(m.brand)} <span class="small muted">${m.tr} TR ${m.star}★</span> ${S.focus===m.id?'<span class="chip dark">In chart</span>':on?`<button class="btn sm ghost" data-act="sim-focus" data-m="${m.id}">Chart this</button>`:''}</td>
          ${row?`<td class="r num">${fmt.inr(row.b)}</td><td class="r num"><b>${fmt.inr(row.s)}</b></td><td class="r num ${row.d>0.5?'diff-up':row.d<-0.5?'diff-dn':''}">${row.d>=0?'+':'−'}${fmt.inr(Math.abs(row.d))} <span class="small">(${fmt.pct(row.d/row.b)})</span></td>`:'<td colspan="3" class="r small muted">Not in scenario</td>'}</tr>`; }).join('')}
        </tbody></table>
        <div class="note" style="margin-top:10px">Annual impact at the volumes in the demo forecast (${fmt.n(25000)} sets per model): <b class="num ${rows.reduce((a,b)=>a+b.d,0)>0?'diff-up':'diff-dn'}">${fmt.k(rows.reduce((a,b)=>a+b.d,0)*25000)}</b> across ${rows.length} models.</div>
      </div></div>
    </div>
    <div class="grid" style="align-content:start">
      <div class="panel"><div class="panel-h"><h3>Where the change comes from</h3></div><div class="panel-b"><p class="small sub" style="margin-top:0">${esc(fm.name)}: each commodity's change on its own, per set.</p>${divBars(impact,{w:520})}</div></div>
      <div class="panel"><div class="panel-h"><h3>Saved scenarios</h3></div><div class="panel-b">${DB.scenarios.length?`<table class="tbl"><tbody>${DB.scenarios.map(s=>`<tr class="click" data-act="sim-load" data-id="${s.id}"><td><b>${esc(s.name)}</b><div class="small muted">${s.on}, ${esc(person(s.by).name)}</div></td><td class="r small">${Object.entries(s.pct).filter(([,v])=>v).map(([k,v])=>k+' '+(v>0?'+':'')+v+'%').join(', ')||'No change'}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">No saved scenarios yet. Move a slider, then save.</div>'}</div></div>
    </div>
  </div>`;
  $$('input[data-sim]').forEach(i=>i.addEventListener('input',()=>{ APP.sim.pct[i.dataset.sim]=parseFloat(i.value); clearTimeout(APP.simT); APP.simT=setTimeout(simRender,60); }));
  $$('input[data-simm]').forEach(i=>i.addEventListener('change',()=>{ const id=i.dataset.simm; S.models = i.checked ? [...S.models,id] : S.models.filter(x=>x!==id); if(!S.models.length){ S.models=[id]; toast('Keep at least one model in the scenario', true); } if(!S.models.includes(S.focus)) S.focus=S.models[0]; simRender(); }));
}
ACT['sim-reset'] = ()=>{ Object.keys(APP.sim.pct).forEach(k=>APP.sim.pct[k]=0); simRender(); };
ACT['sim-focus'] = el=>{ APP.sim.focus=el.dataset.m; simRender(); };
ACT['sim-preset'] = el=>{ const p=el.dataset.p, S=APP.sim, base=snapNow(); Object.keys(S.pct).forEach(k=>S.pct[k]=0);
  if(p==='meeting'){ const c=COMMODITIES.find(q=>q.code==='CU'); const fx=base.FX; const target=(1700-c.conv)/(fx/1000*(1+c.premium)); const startIdx=(1400-c.conv)/(fx/1000*(1+c.premium)); S.pct.CU=Math.round(((target/base.CU)-1)*200)/2; S.name='Copper ₹1,700/kg'; toast('Copper set to about ₹1,700/kg landed, the case raised in the meeting'); }
  if(p==='rupee'){ S.pct.FX=3; S.name='Rupee weakens 3%'; } if(p==='soft'){ S.pct.CU=-8; S.pct.AL=-8; S.pct.ST=-8; S.name='Metals soften 8%'; } if(p==='duty'){ S.pct.CP=10; S.name='Compressor CIF +10%'; }
  simRender(); };
ACT['sim-save'] = async el=>{ el.disabled=true; el.innerHTML='<span class="sp"></span>Saving'; const sc = await api.saveScenario({name:APP.sim.name||'Scenario', pct:{...APP.sim.pct}, models:APP.sim.models.slice()}, APP.user.id); toast('Saved scenario '+sc.id); simRender(); };
ACT['sim-load'] = el=>{ const s=DB.scenarios.find(x=>x.id===el.dataset.id); APP.sim.pct={...s.pct}; APP.sim.models=s.models.slice(); APP.sim.name=s.name; simRender(); toast('Loaded '+s.name); };

/* ---------- SAP BOM explorer ---------- */
function viewBom(el){
  const b = APP.bom || {code:MODELS[0].code, state:'idle', basis:'lpp'};
  APP.bom = b;
  const m = MODELS.find(x=>x.code===b.code);
  let body='';
  if(b.state==='idle') body = `<div class="lock-note"><div class="ic">⇅</div><div><b>Enter a model code and fetch its BOM from SAP.</b><div class="small">The BOM stays in SAP where the model is developed. This pulls the breakup, latest purchase prices and commodity weights.</div></div></div>`;
  else if(b.state==='loading') body = `<div class="panel"><div class="panel-b"><b>Fetching ${esc(b.code)} from SAP S/4HANA</b><ul class="sap-steps" id="sapSteps">${['Connecting to SAP (plant 1100)','Reading material BOM, IDU + ODU','Exploding multi-level BOM','Fetching last purchase prices','Mapping parts to commodities'].map((s,i)=>`<li class="${i<b.step?'ok':i===b.step?'run':''}"><span class="k">${i<b.step?'✓':''}</span>${s}</li>`).join('')}</ul></div></div>`;
  else {
    const snap=snapNow(), cL=compute(m,snap,{priceMode:'lpp'}), cA=compute(m,snap,{priceMode:'avg'}), w=cL.weights;
    const bo = cL.lines.filter(l=>l.type==='bo');
    body = `<div class="grid g4" style="margin-bottom:16px">
      <div class="panel kpi"><div class="l">BOM lines</div><div class="v num">${cL.lines.length+cL.exLines.length}</div><div class="f">${cL.lines.length} chassis, ${cL.exLines.length} exclusive</div></div>
      <div class="panel kpi"><div class="l">Copper in this model</div><div class="v num">${fmt.n(w.CU,2)} kg</div><div class="f">Across coil, stubs and tubing</div></div>
      <div class="panel kpi"><div class="l">Material at SAP average</div><div class="v num">${fmt.inr(cA.material)}</div><div class="f">What the BOM shows</div></div>
      <div class="panel kpi"><div class="l">Material at LPP</div><div class="v num">${fmt.inr(cL.material)}</div><div class="f ${cL.material>cA.material?'diff-up':'diff-dn'}">${cL.material>cA.material?'+':'−'}${fmt.inr(Math.abs(cL.material-cA.material))} vs average</div></div></div>
    <div class="grid g-main"><div class="panel"><div class="panel-h"><h3>BOM breakup</h3><span class="small muted">${esc(m.code)}, plant 1100</span></div><div class="panel-b"><table class="tbl"><thead><tr><th>Part</th><th>Unit</th><th>Commodity</th><th class="r">Qty / weight</th><th class="r">SAP moving avg</th><th class="r">LPP</th><th class="r">Gap</th></tr></thead><tbody>
      ${cL.lines.map(l=>{ const gap = l.type==='bo' ? l.lpp-l.avg : 0; return `<tr><td><b>${esc(l.name)}</b><div class="small muted">${l.pc}</div></td><td><span class="chip">${l.unit}</span></td><td><span class="mat"><i style="background:${l.type==='bo'?'#9AA8A1':matColor(l.type==='cp'?'CP':l.m)}"></i>${l.type==='bo'?'Bought-out':MAT_NAME[l.type==='cp'?'CP':l.m]}</span></td><td class="r num">${l.type==='mat'?fmt.n(l.kg,2)+' kg':'1 no'}</td><td class="r num">${l.type==='bo'?fmt.inr(l.avg):'<span class="muted small">Rate linked</span>'}</td><td class="r num">${l.type==='bo'?fmt.inr(l.lpp):'<span class="muted small">Rate linked</span>'}</td><td class="r num ${gap>0?'diff-up':gap<0?'diff-dn':''}">${l.type==='bo'?(gap>=0?'+':'−')+fmt.inr(Math.abs(gap)):''}</td></tr>`; }).join('')}
      </tbody></table></div></div>
      <div class="grid" style="align-content:start"><div class="panel"><div class="panel-h"><h3>Critical material roll-up</h3></div><div class="panel-b" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">${donut(['CU','AL','ST','PL','RF'].map(k=>({label:MAT_NAME[k], value:w[k], color:COLORS[k]})),{size:160,unit:'kg',center:fmt.n(Object.values(w).reduce((a,b)=>a+b,0),1)+' kg',centerSub:'per set',label:'Material roll-up'})}<div style="flex:1;min-width:130px">${['CU','AL','ST','PL','RF'].map(k=>`<div class="row-x small" style="padding:3px 0"><span class="mat"><i style="background:${COLORS[k]}"></i>${MAT_NAME[k]}</span><span class="spacer"></span><b class="num">${fmt.n(w[k],2)} kg</b></div>`).join('')}</div></div></div>
      <div class="panel"><div class="panel-h"><h3>Why LPP, not the BOM price</h3></div><div class="panel-b small sub">SAP values the BOM at a moving average: a compressor bought at ₹3,000 last year and ₹5,000 now shows somewhere in between. Quotes for next quarter need today's price, so each part code is looked up in the LPP report. ${bo.filter(l=>l.lpp>l.avg).length} of ${bo.length} bought-outs are dearer at LPP.</div></div></div></div>`;
  }
  el.innerHTML = `<div class="page-head"><div class="t"><h1>SAP BOM explorer</h1><p>Type a model code to pull its BOM from SAP: no digging through hundreds of lines. Weights roll up by commodity and every part is priced at its latest purchase price.</p></div></div>
  <div class="panel" style="margin-bottom:16px"><div class="panel-b row-x"><div class="field" style="flex:1;max-width:420px"><label for="bomCode">Model code</label><input class="inp" id="bomCode" list="bomCodes" value="${esc(b.code)}"><datalist id="bomCodes">${MODELS.map(m=>`<option value="${m.code}">${esc(m.name)}</option>`).join('')}</datalist></div><button class="btn primary" data-act="bom-fetch" style="align-self:flex-end" ${b.state==='loading'?'disabled':''}>Fetch from SAP</button><span class="small muted" style="align-self:flex-end">Try ${MODELS.slice(1,4).map(m=>`<a href="#" data-act="bom-try" data-c="${m.code}">${m.code}</a>`).join(', ')}</span></div></div>
  ${body}`;
}
ACT['bom-try'] = el=>{ $('#bomCode').value=el.dataset.c; ACT['bom-fetch'](); };
ACT['bom-fetch'] = async ()=>{
  const code=$('#bomCode').value.trim().toUpperCase(); const m=MODELS.find(x=>x.code===code);
  if(!m){ toast('No BOM for '+(code||'that code')+' in SAP. Check the model code.', true); return; }
  APP.bom={code, state:'loading', step:0}; viewBom($('#view'));
  for(let i=0;i<5;i++){ APP.bom.step=i; viewBom($('#view')); if(i===1) await api.sapBom(code); else if(i===3) await api.sapLpp(code); else await new Promise(r=>setTimeout(r,380)); }
  APP.bom.state='done'; viewBom($('#view')); toast('BOM for '+code+' loaded from SAP');
};

/* ---------- quote history ---------- */
function viewHistory(el, r){
  const H=APP.hist; if(r.id && !H.sel.includes(r.id)) H.sel=[r.id];
  const q=H.q.toLowerCase();
  const list = DB.versions.slice().sort((a,b)=>b.on.localeCompare(a.on)).filter(v=>{ const m=model(v.model); return !q || (m.name+' '+m.code+' '+v.quarter+' '+v.req+' '+v.on).toLowerCase().includes(q); });
  const sel = H.sel.map(id=>DB.versions.find(v=>v.id===id)).filter(Boolean);
  let diff='';
  if(sel.length===2){
    const [a,b] = sel.sort((x,y)=>x.on.localeCompare(y.on)); const m=model(b.model);
    const same = a.model===b.model;
    const mid = same ? compute(m, b.snap, {excl:a.excl}).total : null;
    const rateEff = same ? mid-a.total : null, scopeEff = same ? b.total-mid : null;
    const added=b.excl.filter(k=>!a.excl.includes(k)), removed=a.excl.filter(k=>!b.excl.includes(k));
    diff = `<div class="panel"><div class="panel-h"><h3>Compare v${a.v} (${a.quarter}) with v${b.v} (${b.quarter})</h3></div><div class="panel-b">
      ${!same?'<div class="note">These versions are for different models. Totals and rates are compared; the change is not split into causes.</div>':''}
      <div class="grid g3" style="margin:6px 0 14px"><div><div class="small sub">${a.quarter}</div><div class="kpi" style="padding:0"><div class="v num">${fmt.inr(a.total)}</div></div></div><div><div class="small sub">${b.quarter}</div><div class="kpi" style="padding:0"><div class="v num">${fmt.inr(b.total)}</div></div></div><div><div class="small sub">Change</div><div class="kpi" style="padding:0"><div class="v num ${b.total>a.total?'diff-up':'diff-dn'}">${b.total>a.total?'+':'−'}${fmt.inr(Math.abs(b.total-a.total))}</div></div></div></div>
      ${same?`<div class="formula"><div class="row-x"><span>Commodity rates moved</span><span class="spacer"></span><b class="num ${rateEff>0?'diff-up':'diff-dn'}">${rateEff>=0?'+':'−'}${fmt.inr(Math.abs(rateEff))}</b></div><div class="row-x"><span>Scope changed (exclusive parts)</span><span class="spacer"></span><b class="num ${scopeEff>0?'diff-up':scopeEff<0?'diff-dn':''}">${scopeEff>=0?'+':'−'}${fmt.inr(Math.abs(scopeEff))}</b></div></div>`:''}
      <table class="tbl" style="margin-top:12px"><thead><tr><th>Rate</th><th class="r">v${a.v}</th><th class="r">v${b.v}</th><th class="r">Change</th></tr></thead><tbody>
      ${SIM_KEYS.map(([k,l])=>{ const d=(b.snap[k]-a.snap[k])/a.snap[k]; return `<tr><td><span class="mat"><i style="background:${k==='FX'?'#465650':COLORS[k]}"></i>${l}</span></td><td class="r num">${fmt.n(a.snap[k],a.snap[k]<200?2:0)}</td><td class="r num">${fmt.n(b.snap[k],b.snap[k]<200?2:0)}</td><td class="r num ${d>0.0005?'diff-up':d<-0.0005?'diff-dn':''}">${fmt.pct(d)}</td></tr>`; }).join('')}
      </tbody></table>
      ${added.length||removed.length?`<div class="row-x" style="margin-top:10px">${added.map(k=>`<span class="chip ${EXCLUSIVES[k].sign>0?'up':'down'}">Added: ${esc(EXCLUSIVES[k].name)}</span>`).join('')}${removed.map(k=>`<span class="chip ${EXCLUSIVES[k].sign>0?'down':'up'}">Removed: ${esc(EXCLUSIVES[k].name)}</span>`).join('')}</div>`:''}
    </div></div>`;
  } else if(sel.length===1){
    const v=sel[0], m=model(v.model);
    diff = `<div class="panel"><div class="panel-h"><h3>${esc(m.brand)} ${m.code}, v${v.v}</h3><span class="chip ${v.status==='SENT'?'dark':'warn'}">${v.status==='SENT'?'Sent':'Draft'}</span></div><div class="panel-b">
      <div class="kpi" style="padding:0 0 10px"><div class="v num">${fmt.inr(v.total)}</div><div class="f">per set, ${v.quarter}</div></div>
      <table class="tbl"><tbody><tr><td class="muted">Request</td><td>${v.req}</td></tr><tr><td class="muted">Costed by</td><td>${esc(person(v.by).name)} on ${v.on}</td></tr><tr><td class="muted">Rate source</td><td>${v.source}, basis ${v.basis.replace('-',' ')}</td></tr><tr><td class="muted">Copper used</td><td class="num">${fmt.n(v.snap.CU,2)} USD/MT</td></tr><tr><td class="muted">Sent to</td><td>${v.status==='SENT'?esc(v.sentTo):'Not sent yet'}</td></tr>${v.note?`<tr><td class="muted">Note</td><td>${esc(v.note)}</td></tr>`:''}</tbody></table>
      <div class="row-x" style="margin-top:12px"><span class="small muted">Pick a second version to compare.</span><span class="spacer"></span><button class="btn primary" data-act="go" data-to="customer/${v.id}">Customer sheet</button></div></div></div>`;
  } else diff = `<div class="lock-note"><div class="ic">⇆</div><div><b>Pick a version to see exactly what was quoted.</b><div class="small">Pick two to compare: the change is split into commodity movement and scope change.</div></div></div>`;
  el.innerHTML = `<div class="page-head"><div class="t"><h1>Quote history</h1><p>Every costing ever sent, with the rates and parts it used. Answer "what did we give whom, and why" two years later.</p></div></div>
  <div class="grid g-main"><div class="panel"><div class="panel-b">
    <input class="inp" id="histQ" placeholder="Search: Voltas, Q2 2025, REQ-2603…" value="${esc(H.q)}" style="margin-bottom:10px" aria-label="Search quote history">
    <table class="tbl"><thead><tr><th></th><th>Model</th><th>Version</th><th>Quarter</th><th>Source</th><th class="r">Quote / set</th></tr></thead><tbody>
    ${list.map(v=>{ const m=model(v.model); return `<tr class="click" data-act="hist-pick" data-id="${v.id}" style="${H.sel.includes(v.id)?'background:var(--mint-wash)':''}"><td><input type="checkbox" ${H.sel.includes(v.id)?'checked':''} tabindex="-1" aria-label="Select"></td><td>${brandDot(m.brand)} <span class="small muted">${m.code}</span></td><td>v${v.v} ${v.status==='DRAFT'?'<span class="chip warn">Draft</span>':''}</td><td class="small">${v.quarter}<div class="muted">${v.on}</div></td><td><span class="chip ${v.source==='AICM'?'mint':''}">${v.source}</span></td><td class="r num"><b>${fmt.inr(v.total)}</b></td></tr>`; }).join('')||'<tr><td colspan="6" class="empty">No quotes match. Try a brand, quarter or request ID.</td></tr>'}
    </tbody></table></div></div>
    <div>${diff}</div></div>`;
  const inp=$('#histQ'); inp.addEventListener('input',()=>{ APP.hist.q=inp.value; const pos=inp.selectionStart; viewHistory(el,{}); const n=$('#histQ'); n.focus(); n.setSelectionRange(pos,pos); });
}
ACT['hist-pick'] = el=>{ const H=APP.hist, id=el.dataset.id; if(H.sel.includes(id)) H.sel=H.sel.filter(x=>x!==id); else { H.sel.push(id); if(H.sel.length>2) H.sel.shift(); } if(location.hash.startsWith('#/history/')) history.replaceState(null,'','#/history'); viewHistory($('#view'),{}); };

/* ---------- customer sheet & send ---------- */
function viewCustomer(el, r){
  const v=DB.versions.find(x=>x.id===r.id); if(!v){ el.innerHTML='<div class="empty">Version not found.</div>'; return; }
  const m=model(v.model), req=reqById(v.req), spec = req?req.spec:specFor(m), all=specRows(true);
  const custRows=all.filter(x=>!x.internal);
  const view = APP.custView||'customer';
  const rows = view==='customer'?custRows:all;
  el.innerHTML = `<div class="page-head"><div class="t"><div class="crumbs"><a href="#/history">Quote history</a> / ${m.code} v${v.v}</div><h1>Customer sheet: ${esc(m.name)}</h1><p>Derived automatically from the internal costing sheet. The same ${all.length-custRows.length} internal rows are always removed, so the customer sheet never needs to be built by hand.</p></div>
    <div class="row-x"><div class="seg"><button class="${view==='customer'?'on':''}" data-act="cust-view" data-v="customer">Customer view, ${custRows.length} rows</button><button class="${view==='internal'?'on':''}" data-act="cust-view" data-v="internal">Internal view, ${all.length} rows</button></div></div></div>
  <div class="grid g-main"><div class="panel"><div class="panel-h"><h3>${esc(m.brand)} ${m.code}, quotation v${v.v}</h3><span class="chip">${v.quarter}</span></div><div class="panel-b">
    <div class="row-x" style="padding:10px 12px;background:var(--paper-2);border-radius:8px;margin-bottom:8px"><div><div class="small sub">Price per set, IDU + ODU, ex-works</div><div style="font-family:var(--display);font-size:26px;font-weight:600" class="num">${fmt.inr(v.total)}</div></div><span class="spacer"></span><div class="small sub" style="text-align:right">Valid for ${v.quarter}<br>Prices linked to commodity indices</div></div>
    ${rows.map((rw,i)=>`<div class="spec-row ${rw.internal?'internal':''}" style="grid-template-columns:34px 1fr 1.2fr ${view==='internal'?'110px':''}"><span class="no num">${i+1}</span><span>${esc(rw.label)}</span><span><b style="font-weight:500">${esc(spec[rw.k]||'—')}</b></span>${view==='internal'?`<span class="x small ${rw.internal?'':'muted'}">${rw.internal?'Removed for customer':'Sent'}</span>`:''}</div>`).join('')}
  </div></div>
  <div class="grid" style="align-content:start">${can('costing')?`<div class="mail"><div class="mh"><span>From</span><b>costing@ambergroupindia.com</b><span>To</span><input class="inp" id="mailTo" value="${esc(v.sentTo)}" aria-label="Recipient"><span>Subject</span><b>${esc(m.brand)} ${m.code}: quotation v${v.v} for ${v.quarter}</b></div>
    <div class="mb">Dear ${esc(m.brand)} sourcing team,

Please find attached our quotation for ${esc(m.name)} (${m.code}), valid for ${v.quarter}.

Price per set (IDU + ODU): ${fmt.inr(v.total)}, ex-works, linked to the ${v.basis==='Manual'?'agreed':'previous quarter\'s average'} copper, aluminium and USD/INR rates.

Regards,
${esc(APP.user.name)}
Costing, Amber Enterprises</div>
    <span class="attach">📄 ${m.code}_Quotation_v${v.v}.pdf <span class="muted">${custRows.length} rows, generated</span></span>
    <div style="padding:0 16px 16px" class="row-x">${v.status==='SENT'?`<span class="chip dark"><span class="d"></span>Sent to ${esc(v.sentTo)}</span><span class="spacer"></span><button class="btn" data-act="mail-send" data-id="${v.id}">Send again</button>`:`<span class="small muted">Sent from the system and logged against ${v.req}.</span><span class="spacer"></span><button class="btn primary" data-act="mail-send" data-id="${v.id}">Send to customer</button>`}</div></div>`:`<div class="note">Only the costing team can send quotations.</div>`}
    <div class="panel"><div class="panel-h"><h3>Removed for the customer</h3><span class="chip warn">${all.length-custRows.length} rows</span></div><div class="panel-b small">${all.filter(x=>x.internal).map(x=>esc(x.label)).join(', ')}</div></div>
  </div></div>`;
}
ACT['cust-view'] = el=>{ APP.custView=el.dataset.v; render(); };
ACT['mail-send'] = async el=>{ const to=$('#mailTo').value.trim(); if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)){ toast('Enter a valid customer email address', true); $('#mailTo').focus(); return; } el.disabled=true; el.innerHTML='<span class="sp"></span>Sending'; await api.sendMail(el.dataset.id, to, APP.user.id); toast('Quotation sent to '+to+' and logged'); renderShell(); render(); };

/* ---------- library ---------- */
function viewLibrary(el, r){
  const L=APP.lib; if(r.id) L.sel=r.id; const q=L.q.toLowerCase();
  const showCost = can('costing');
  const ms = MODELS.filter(m=>!q || (m.name+' '+m.code+' '+m.idu+' '+m.odu).toLowerCase().includes(q));
  const tree = BRANDS.filter(b=>ms.some(m=>m.brand===b)).map(b=>{ const bm=ms.filter(m=>m.brand===b); return `<details open><summary><b>${esc(b)}</b><span class="ct">${bm.length} model${bm.length>1?'s':''}</span></summary>
    ${[...new Set(bm.map(m=>m.series))].map(s=>`<details open><summary>${esc(s)}</summary>${bm.filter(m=>m.series===s).map(m=>`<div class="leaf" data-act="lib-sel" data-id="${m.id}" style="${L.sel===m.id?'background:var(--mint-wash)':''}"><span class="chip">${m.idu} + ${m.odu}</span>${esc(m.code)}<span class="ct">${m.tr} TR</span></div>`).join('')}</details>`).join('')}</details>`; }).join('');
  let card='<div class="lock-note"><div class="ic">▤</div><div><b>Pick a model to see its spec, chassis and quote history.</b><div class="small">Organised by customer, then series, then model. Every record lives in one place.</div></div></div>';
  if(L.sel){ const m=model(L.sel), vs=DB.versions.filter(v=>v.model===m.id).sort((a,b)=>a.v-b.v), rq=DB.requests.filter(x=>x.model===m.id);
    card = `<div class="panel"><div class="panel-h"><h3>${esc(m.name)}</h3><span class="chip">${m.code}</span></div><div class="panel-b">
      <table class="tbl"><tbody><tr><td class="muted">Customer</td><td>${brandDot(m.brand)}</td></tr><tr><td class="muted">Path</td><td class="small">${esc(m.brand)} / ${esc(m.series)} / ${m.idu} + ${m.odu} / ${m.code}</td></tr><tr><td class="muted">Chassis</td><td>${IDU_CHASSIS[m.idu].label}<br>${ODU_CHASSIS[m.odu].label}</td></tr><tr><td class="muted">Rating</td><td>${m.tr} TR, ${m.star}-star, ISEER ${m.iseer}</td></tr><tr><td class="muted">Exclusive parts</td><td class="small">${m.excl.map(k=>esc(EXCLUSIVES[k].name)).join(', ')}</td></tr></tbody></table>
      ${showCost&&vs.length?`<h3 style="margin:16px 0 6px">Quote trend</h3>${lineChart([{name:'Quote per set', values:vs.map(v=>v.total), color:'#0E2E25'}], vs.map(v=>'v'+v.v+' '+v.quarter.replace(' 20',' \'')), {h:170,label:'Quote trend'})}`:''}
      ${!showCost?'<div class="note" style="margin-top:12px">Prices are visible to the costing team only.</div>':''}
      <h3 style="margin:16px 0 6px">Requests</h3>${rq.length?rq.map(x=>`<div class="row-x" style="padding:5px 0"><a href="#/requests/${x.id}">${x.id}</a>${stPill(x.status)}<span class="spacer"></span><span class="small muted">${x.received}</span></div>`).join(''):'<div class="small muted">No open requests.</div>'}
    </div></div>`; }
  el.innerHTML = `<div class="page-head"><div class="t"><h1>Library</h1><p>All ${MODELS.length} models across ${BRANDS.length} customers, filed by customer, series and chassis so anything can be found by name.</p></div></div>
  <div class="grid g2" style="grid-template-columns:minmax(280px,.8fr) 1.2fr"><div class="panel"><div class="panel-b"><input class="inp" id="libQ" placeholder="Search models, codes, chassis" value="${esc(L.q)}" style="margin-bottom:10px" aria-label="Search library"><div class="tree">${tree||'<div class="empty">No models match.</div>'}</div></div></div><div>${card}</div></div>`;
  const inp=$('#libQ'); inp.addEventListener('input',()=>{ APP.lib.q=inp.value; const p=inp.selectionStart; viewLibrary(el,{}); const n=$('#libQ'); n.focus(); n.setSelectionRange(p,p); });
}
ACT['lib-sel'] = el=>{ APP.lib.sel=el.dataset.id; viewLibrary($('#view'),{}); };

/* ---------- admin ---------- */
async function viewAdmin(el, r, token){
  el.innerHTML = loader('Loading users and audit trail');
  const log = await api.audit(); if(stale(token)) return;
  const mods = MODULES.filter(m=>m.id!=='home');
  el.innerHTML = `<div class="page-head"><div class="t"><h1>Admin</h1><p>Who can see what. Costing data is confidential, so access is role-based and every change is logged.</p></div><button class="btn danger" data-act="reset">Reset demo data</button></div>
  <div class="grid g2">
    <div class="panel"><div class="panel-h"><h3>Users</h3><span class="chip">${Object.keys(PEOPLE).length}</span></div><div class="panel-b"><table class="tbl"><tbody>${Object.values(PEOPLE).map(p=>`<tr><td>${av(p.id,28)}</td><td><b>${esc(p.name)}</b><div class="small muted">${esc(p.title)}</div></td><td><span class="chip">${ROLES[p.role].label}</span></td><td class="r small muted">Password + SSO</td></tr>`).join('')}</tbody></table></div></div>
    <div class="panel"><div class="panel-h"><h3>Permissions by role</h3></div><div class="panel-b" style="overflow-x:auto"><table class="tbl"><thead><tr><th>Module</th>${Object.values(ROLES).map(r=>`<th style="text-align:center">${r.label}</th>`).join('')}</tr></thead><tbody>${mods.map(m=>`<tr><td>${m.label}</td>${Object.keys(ROLES).map(k=>`<td style="text-align:center">${ROLES[k].modules.includes(m.id)?'<span style="color:var(--down);font-weight:700">✓</span>':'<span class="muted">—</span>'}</td>`).join('')}</tr>`).join('')}
      <tr><td>Edit spec sheet</td>${Object.keys(ROLES).map(k=>`<td style="text-align:center">${k==='rnd'?'<span style="color:var(--down);font-weight:700">✓</span>':'<span class="muted">—</span>'}</td>`).join('')}</tr>
      <tr><td>Approve spec</td>${Object.keys(ROLES).map(k=>`<td style="text-align:center">${k==='lead'?'<span style="color:var(--down);font-weight:700">✓</span>':'<span class="muted">—</span>'}</td>`).join('')}</tr></tbody></table></div></div>
  </div>
  <div class="panel" style="margin-top:16px"><div class="panel-h"><h3>Audit trail</h3><span class="chip">${log.length} events</span></div><div class="panel-b"><table class="tbl"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Record</th></tr></thead><tbody>${log.map(a=>`<tr><td class="small num">${a.t}</td><td>${av(a.who,22)} ${esc(person(a.who).name)}</td><td>${esc(a.a)}</td><td class="small">${esc(a.obj)}</td></tr>`).join('')}</tbody></table></div></div>`;
}

/* ---------- boot ---------- */
loadDB();
render();
