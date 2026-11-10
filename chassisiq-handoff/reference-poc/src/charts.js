/* ===== Small SVG chart kit (no dependencies). Every mark carries data-tip for the hover layer ===== */
const fmt = {
  inr:(v,d=0)=>'₹'+Number(v).toLocaleString('en-IN',{maximumFractionDigits:d, minimumFractionDigits:d}),
  n:(v,d=0)=>Number(v).toLocaleString('en-IN',{maximumFractionDigits:d, minimumFractionDigits:d}),
  pct:(v,d=1)=>(v>0?'+':'')+(v*100).toFixed(d)+'%',
  k:(v)=>Math.abs(v)>=1e7?'₹'+(v/1e7).toFixed(2)+' Cr':Math.abs(v)>=1e5?'₹'+(v/1e5).toFixed(2)+' L':fmt.inr(v)
};
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function spark(vals, w=70, h=22, color='#6EDDB4'){
  const mn=Math.min(...vals), mx=Math.max(...vals), sx=w/(vals.length-1), sy=v=>h-2-((v-mn)/((mx-mn)||1))*(h-4);
  const d=vals.map((v,i)=>(i?'L':'M')+(i*sx).toFixed(1)+' '+sy(v).toFixed(1)).join(' ');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

/* Waterfall: steps [{label, value, kind:'add'|'sub'|'total', color}] */
function waterfall(steps, opts={}){
  const W=opts.w||640, H=opts.h||250, padL=8, padB=40, padT=22;
  let run=0; const bars=steps.map(s=>{ if(s.kind==='total'){ const b={...s, y0:0, y1:s.value}; run=s.value; return b; } const y0=run; run+=s.value; return {...s, y0, y1:run}; });
  const mx=Math.max(...bars.map(b=>Math.max(b.y0,b.y1)))*1.08;
  const bw=(W-padL*2)/bars.length, gap=Math.min(14, bw*.28), sy=v=>padT+(H-padB-padT)*(1-v/mx);
  let g='';
  for(let i=0;i<4;i++){ const v=mx*i/4, y=sy(v); g+=`<line x1="0" x2="${W}" y1="${y}" y2="${y}"/>`; }
  let marks='', labels='';
  bars.forEach((b,i)=>{
    const x=padL+i*bw+gap/2, w=bw-gap, top=sy(Math.max(b.y0,b.y1)), bot=sy(Math.min(b.y0,b.y1)), hgt=Math.max(2,bot-top);
    const col=b.color || (b.kind==='total'?'#0E2E25':b.value<0?'#1A8259':'#B5622D');
    marks+=`<rect x="${x}" y="${top}" width="${w}" height="${hgt}" rx="4" fill="${col}" data-tip="<b>${esc(b.label)}</b><br>${b.kind==='total'?'':(b.value<0?'− ':'+ ')}${fmt.inr(Math.abs(b.value))}${b.kind==='total'?'':'<br>Running: '+fmt.inr(b.y1)}" style="transform-origin:${x+w/2}px ${H-padB}px;animation:grow .5s ${i*.05}s both ease-out"/>`;
    if(i<bars.length-1 && b.kind!=='total'){ const nx=padL+(i+1)*bw+gap/2; marks+=`<line x1="${x+w}" x2="${nx}" y1="${sy(b.y1)}" y2="${sy(b.y1)}" stroke="#9AA8A1" stroke-dasharray="2 3"/>`; }
    labels+=`<text class="val" x="${x+w/2}" y="${top-6}" text-anchor="middle">${fmt.k(Math.abs(b.kind==='total'?b.y1:b.value))}</text>`;
    const words=b.label.split(' '); const l1=words.slice(0,2).join(' '), l2=words.slice(2).join(' ');
    labels+=`<text class="lbl" x="${x+w/2}" y="${H-padB+16}" text-anchor="middle">${esc(l1)}</text>`+(l2?`<text class="lbl" x="${x+w/2}" y="${H-padB+30}" text-anchor="middle">${esc(l2)}</text>`:'');
  });
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Cost build-up waterfall"><style>@keyframes grow{from{transform:scaleY(0)}}@media (prefers-reduced-motion:reduce){rect{animation:none!important}}</style><g class="grid">${g}</g>${marks}${labels}</svg></div>`;
}

/* Donut: parts [{label, value, color}] */
function donut(parts, opts={}){
  const S=opts.size||180, r=S/2-10, ir=r-22, cx=S/2, cy=S/2, tot=parts.reduce((a,b)=>a+b.value,0);
  let a0=-Math.PI/2, out='';
  parts.forEach(p=>{
    const a1=a0+(p.value/tot)*Math.PI*2, large=(a1-a0)>Math.PI?1:0;
    const p1=[cx+r*Math.cos(a0), cy+r*Math.sin(a0)], p2=[cx+r*Math.cos(a1), cy+r*Math.sin(a1)], p3=[cx+ir*Math.cos(a1), cy+ir*Math.sin(a1)], p4=[cx+ir*Math.cos(a0), cy+ir*Math.sin(a0)];
    out+=`<path d="M${p1} A${r} ${r} 0 ${large} 1 ${p2} L${p3} A${ir} ${ir} 0 ${large} 0 ${p4}Z" fill="${p.color}" stroke="var(--paper)" stroke-width="2" data-tip="<b>${esc(p.label)}</b><br>${opts.unit==='kg'?fmt.n(p.value,2)+' kg':fmt.inr(p.value)} (${(p.value/tot*100).toFixed(1)}%)"/>`;
    a0=a1;
  });
  const center = opts.center ? `<text x="${cx}" y="${cy-2}" text-anchor="middle" style="font-family:var(--display);font-size:20px;font-weight:600;fill:var(--ink)">${opts.center}</text><text x="${cx}" y="${cy+16}" text-anchor="middle">${opts.centerSub||''}</text>` : '';
  return `<div class="chart" style="max-width:${S}px"><svg viewBox="0 0 ${S} ${S}" role="img" aria-label="${esc(opts.label||'Breakdown')}">${out}${center}</svg></div>`;
}

/* Line: one or more series over labels; single y-axis */
function lineChart(series, labels, opts={}){
  const W=opts.w||640, H=opts.h||220, padL=48, padR=14, padT=12, padB=26;
  const all=series.flatMap(s=>s.values).filter(v=>v!=null), mn=Math.min(...all)*.97, mx=Math.max(...all)*1.02;
  const sx=i=>padL+i*((W-padL-padR)/(labels.length-1)), sy=v=>padT+(H-padT-padB)*(1-(v-mn)/(mx-mn));
  let g='';
  for(let i=0;i<=4;i++){ const v=mn+(mx-mn)*i/4, y=sy(v); g+=`<line x1="${padL}" x2="${W-padR}" y1="${y}" y2="${y}"/><text x="${padL-8}" y="${y+4}" text-anchor="end">${fmt.n(v, v<200?1:0)}</text>`; }
  const xl=labels.map((l,i)=>`<text x="${sx(i)}" y="${H-6}" text-anchor="middle">${esc(l)}</text>`).join('');
  let paths='', dots='';
  series.forEach(s=>{
    const d=s.values.map((v,i)=>v==null?'':((i&&s.values[i-1]!=null?'L':'M')+sx(i).toFixed(1)+' '+sy(v).toFixed(1))).join(' ');
    paths+=`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" ${s.dash?'stroke-dasharray="4 4"':''}/>`;
    s.values.forEach((v,i)=>{ if(v==null) return; dots+=`<circle cx="${sx(i)}" cy="${sy(v)}" r="${(opts.mark&&opts.mark.includes(i))?5:3.2}" fill="${s.color}" stroke="var(--paper)" stroke-width="2" data-tip="<b>${esc(labels[i])}</b><br>${esc(s.name)}: ${fmt.n(v,2)}"/><circle cx="${sx(i)}" cy="${sy(v)}" r="12" fill="transparent" data-tip="<b>${esc(labels[i])}</b><br>${esc(s.name)}: ${fmt.n(v,2)}"/>`; });
  });
  const band = opts.band!=null ? `<rect x="${sx(opts.band[0])-8}" y="${padT}" width="${sx(opts.band[1])-sx(opts.band[0])+16}" height="${H-padT-padB}" fill="#36C79A" opacity=".10" rx="6"/>` : '';
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label||'Trend')}"><g class="grid">${g}</g>${band}${xl}${paths}${dots}</svg></div>`;
}

/* Diverging horizontal bars: items [{label, value, color}] value in ₹ (+ cost up) */
function divBars(items, opts={}){
  const W=opts.w||560, rowH=30, H=items.length*rowH+10, mid=W*0.55, lblW=150;
  const mx=Math.max(1,...items.map(i=>Math.abs(i.value)));
  const sc=v=>(Math.abs(v)/mx)*((W-mid)-60);
  let out=`<line x1="${mid}" x2="${mid}" y1="0" y2="${H}" stroke="#9AA8A1"/>`;
  items.forEach((it,i)=>{
    const y=i*rowH+6, w=Math.max(it.value?2:0, sc(it.value)), x=it.value>=0?mid:mid-w;
    out+=`<text class="lbl" x="${mid-sc(Math.min(0,it.value))-8 - (it.value<0?0:0)}" y="${y+15}" text-anchor="end">${esc(it.label)}</text>`;
    out+=`<rect x="${x}" y="${y+3}" width="${w}" height="16" rx="4" fill="${it.color}" data-tip="<b>${esc(it.label)}</b><br>${it.value>=0?'+':'−'}${fmt.inr(Math.abs(it.value))} per set"/>`;
    out+=`<text class="val" x="${it.value>=0?mid+w+6:mid+6}" y="${y+15}">${it.value>=0?'+':'−'}${fmt.inr(Math.abs(it.value))}</text>`;
  });
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Impact by commodity">${out}</svg></div>`;
}

/* Hover layer for every [data-tip] mark */
(function(){
  let tip;
  document.addEventListener('mousemove', e=>{
    const t = e.target.closest && e.target.closest('[data-tip]');
    if(!t){ if(tip) tip.style.display='none'; return; }
    if(!tip){ tip=document.createElement('div'); tip.className='tip'; document.body.appendChild(tip); }
    tip.innerHTML = t.getAttribute('data-tip'); tip.style.display='block';
    const x = Math.min(window.innerWidth-tip.offsetWidth-12, e.clientX+14), y = Math.max(8, e.clientY-tip.offsetHeight-10);
    tip.style.left=x+'px'; tip.style.top=y+'px';
  });
})();
