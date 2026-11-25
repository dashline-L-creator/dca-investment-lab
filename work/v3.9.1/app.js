'use strict';
let LANG='zh';try{LANG=localStorage.getItem('dca-language')||'zh'}catch{}
const DATA=JSON.parse(document.getElementById('dataset').textContent), PALETTE=['#506bb7','#97712c','#227d75','#6d5dfc','#b16647','#487c9a','#a14f83'], $=id=>document.getElementById(id), pct=x=>Number.isFinite(x)?(x*100).toFixed(2)+'%':'—',money=x=>'¥'+Math.round(x).toLocaleString('zh-CN'),fmt=x=>x.toLocaleString('zh-CN');
let selectedCodes=DATA.assets.slice(0,4).map(a=>a.code);try{let stored=JSON.parse(localStorage.getItem('dca-selected-assets')||'null');if(Array.isArray(stored)&&stored.length===4&&new Set(stored).size===4&&stored.every(c=>DATA.assets.some(a=>a.code===c)))selectedCodes=stored;else{let old=localStorage.getItem('dca-omitted-asset');if(DATA.assets.slice(0,5).some(a=>a.code===old))selectedCodes=DATA.assets.slice(0,5).filter(a=>a.code!==old).map(a=>a.code)}}catch{}
let ACTIVE=DATA.assets.filter(a=>selectedCodes.includes(a.code)),COLORS=ACTIVE.map(a=>PALETTE[DATA.assets.indexOf(a)]),draftAssets=new Set(selectedCodes);
const dateIndex=new Map(DATA.dates.map((d,i)=>[d,i]));DATA.assets.forEach(a=>{a.lookup=new Map(a.samples.map(s=>[s[0],s]));a.first=a.samples[0][0]});
let scope='common',view='explore',starts=[],selected='2015-01-05',position=1000,travelTimer=null,growthTimer=null,trajectories=[],scopeData=[],statistics=[],lastFocus=null;
function quantile(a,q){let p=(a.length-1)*q,i=Math.floor(p);return a[i]+(a[Math.ceil(p)]-a[i])*(p-i)}
function stats(rows){let x=rows.map(r=>r[5]).sort((a,b)=>a-b),n=x.length,mean=x.reduce((a,b)=>a+b,0)/n;return {n,mean,median:quantile(x,.5),sd:Math.sqrt(x.reduce((a,b)=>a+(b-mean)**2,0)/n),p5:quantile(x,.05),p25:quantile(x,.25),p75:quantile(x,.75),p95:quantile(x,.95),min:x[0],max:x[n-1],positive:x.filter(v=>v>0).length/n,loss:x.filter(v=>v<0).length/n,zero:x.filter(v=>v===0).length/n,tail:x.slice(0,Math.ceil(n*.05)).reduce((a,b)=>a+b,0)/Math.ceil(n*.05),x}}
function stopTravel(){clearInterval(travelTimer);travelTimer=null;$('travelPlay').textContent='▶ 穿越起投日'}function stopGrowth(){clearInterval(growthTimer);growthTimer=null;$('growthPlay').textContent='▶ 回放这5年'}
function closest(date){let lo=0,hi=starts.length-1;while(lo<hi){let mid=Math.floor((lo+hi)/2);if(starts[mid]<date)lo=mid+1;else hi=mid}return lo}
function setScope(s){histPicked=null;stopTravel();stopGrowth();stopScan();scope=s;ACTIVE=DATA.assets.filter(a=>selectedCodes.includes(a.code));COLORS=ACTIVE.map(a=>PALETTE[DATA.assets.indexOf(a)]);swarmKey='';
document.querySelectorAll('.assetSelect').forEach(el=>{let oldCode=el.dataset.assetCode||ACTIVE[+el.value||0]?.code;el.innerHTML=ACTIVE.map((a,k)=>`<option value="${k}">${a.name}</option>`).join('');el.value=Math.max(0,ACTIVE.findIndex(a=>a.code===oldCode));el.dataset.assetCode=ACTIVE[+el.value].code});
$('cdfLegend').innerHTML=ACTIVE.map((a,k)=>`<span><i style="background:${COLORS[k]}"></i>${a.name}</span>`).join('');
const common=ACTIVE[0].samples.map(r=>r[0]).filter(d=>ACTIVE.every(a=>a.lookup.has(d))),commonSet=new Set(common);starts=s==='all'?[...new Set(ACTIVE.flatMap(a=>a.samples.map(r=>r[0])))].sort():common;scopeData=ACTIVE.map(a=>a.samples.filter(r=>s==='all'||commonSet.has(r[0])));statistics=scopeData.map(stats);
document.querySelectorAll('[data-scope]').forEach(b=>{b.classList.toggle('active',b.dataset.scope===s);b.setAttribute('aria-pressed',b.dataset.scope===s)});$('startSlider').max=starts.length-1;$('startDate').min=starts[0];$('startDate').max=starts.at(-1);$('rangeStart').textContent=starts[0];$('rangeEnd').textContent=starts.at(-1);$('scopeNote').textContent=s==='all'?ACTIVE.map((a,k)=>a.name+' '+fmt(scopeData[k].length)).join(' · ')+' 个样本':'所选四资产相同起投日 · 每类'+fmt(common.length)+'个完整样本';
setStart(closest(selected));renderStats();renderMap();drawDistribution()}
function updateAssetDraft(){let count=draftAssets.size;$('assetSelectionCount').textContent='已选 '+count+' / 4';$('applyAssets').disabled=count!==4;document.querySelectorAll('#assetOptions input').forEach(el=>{el.checked=draftAssets.has(el.value);el.closest('label').classList.toggle('is-picked',el.checked)})}
function installAssetPicker(){$('assetOptions').innerHTML=DATA.assets.map((a,k)=>`<label class="asset-option"><input type="checkbox" value="${a.code}" ${draftAssets.has(a.code)?'checked':''}><span><span class="asset-option-name"><i class="dot" style="--asset:${PALETTE[k]}" aria-hidden="true"></i>${a.name}</span><span class="code">${a.code}</span></span></label>`).join('');$('assetOptions').onchange=e=>{if(e.target.type!=='checkbox')return;if(e.target.checked)draftAssets.add(e.target.value);else draftAssets.delete(e.target.value);updateAssetDraft()};$('applyAssets').onclick=()=>{if(draftAssets.size!==4)return;selectedCodes=DATA.assets.filter(a=>draftAssets.has(a.code)).map(a=>a.code);try{localStorage.setItem('dca-selected-assets',JSON.stringify(selectedCodes))}catch{}setScope(scope)};updateAssetDraft()}
function setStart(i){stopGrowth();i=Math.max(0,Math.min(starts.length-1,+i));selected=starts[i];position=1000;$('startSlider').value=i;$('startDate').value=selected;$('startLabel').textContent=selected.replaceAll('-',' . ');$('growthSlider').value=1000;buildPaths();renderGrowth();if(view==='distribution')drawDistribution()}
function buildPaths(){const valid=ACTIVE.map(a=>a.lookup.get(selected)).filter(Boolean);const globalEnd=Math.max(...valid.map(r=>dateIndex.get(r[1])));trajectories=ACTIVE.map((a,k)=>{const r=a.lookup.get(selected);if(!r)return null;let start=dateIndex.get(selected),end=dateIndex.get(r[1]),units=0,capital=0,points=[];for(let i=start;i<=globalEnd;i++){if(i<end&&(!a.trading||a.trading[i])){units+=50/a.prices[i];capital+=50}points.push({date:DATA.dates[i],value:units*a.prices[Math.min(i,end)],capital})}if(Math.abs(points.at(-1).value-r[4])>.001||capital!==r[3])throw Error('市值校验失败：'+a.name);return {points,sample:r,k}});let path=trajectories.find(Boolean);$('growthStart').textContent=selected;$('growthEnd').textContent=DATA.dates[globalEnd];$('growthLegend').innerHTML=ACTIVE.flatMap((a,k)=>trajectories[k]?[`<span><i style="background:${COLORS[k]}"></i>${a.name}</span>`]:[]).join('')+'<span>┄ 累计投入</span>'}
function currentPoint(t){return t.points[Math.floor(position/1000*(t.points.length-1))]}
function renderGrowth(){let available=trajectories.filter(Boolean),rank=available.slice().sort((a,b)=>{let x=currentPoint(a),y=currentPoint(b);return y.value/y.capital-x.value/x.capital}),path=available[0],point=currentPoint(path);$('growthDate').textContent=point.date+' · '+(position===1000?'完整5年':'持有期回放');$('cards').innerHTML=ACTIVE.map((a,k)=>{let t=trajectories[k];if(!t)return `<article class="panel asset-card" style="--asset:${COLORS[k]}"><h3>${a.name}</h3><p class="code">${a.code}</p><div class="available">此起点尚无可用ETF交易数据</div><p class="tiny muted">最早起投：${a.first}</p></article>`;let p=currentPoint(t),r=p.value/p.capital-1;return `<article class="panel asset-card" style="--asset:${COLORS[k]}"><div class="card-title"><h3><span class="dot"></span>${a.name}</h3><span class="rank">当前第 ${rank.indexOf(t)+1} 名</span></div><div class="code">${a.code} / ${position===1000?'5年累计收益':'回放期间累计收益'}</div><div class="big ${r<0?'negative':'positive'}">${r>0?'+':''}${pct(r)}</div><div class="card-money">${money(p.value)} <span class="tiny muted">市值</span></div><p class="tiny muted">最终估值日 ${t.sample[1]} · 总投入 ${money(t.sample[3])}</p><div class="card-bottom"><span class="muted">投入 ${money(p.capital)}</span><span class="${r<0?'negative':'positive'}">盈亏 ${money(p.value-p.capital)}</span></div></article>`}).join('');$('startFacts').innerHTML=[['起投日',selected],['最终估值日',path.sample[1]],['完整投入次数',fmt(path.sample[2])+' 次'],['完整总投入',money(path.sample[3])],['回放进度',(position/10).toFixed(0)+'%']].map(([a,b])=>`<div class="stat-row"><span class="muted">${a}</span><strong>${b}</strong></div>`).join('');let best=rank[0],bp=currentPoint(best);$('insight').textContent=rank.length===1?`此起点只有${ACTIVE[best.k].name}具有可用数据；${position===1000?'完整5年':'当前回放时点'}收益为${pct(bp.value/bp.capital-1)}。`:`${position===1000?'5年结束时':'当前回放时点'}，${ACTIVE[best.k].name}的累计收益领先，为${pct(bp.value/bp.capital-1)}。`;drawGrowth()}
const charts={};function setup(id){let cv=$(id),rect=cv.getBoundingClientRect();if(!rect.width||!rect.height)return null;let dpr=window.devicePixelRatio||1;cv.width=Math.round(rect.width*dpr);cv.height=Math.round(rect.height*dpr);let ctx=cv.getContext('2d');ctx.scale(dpr,dpr);ctx.font=(rect.width<480?'11px':'13px')+' "Lab Numbers","hellofont-id-ji-xie-ti","Lab English","Lab Sans",sans-serif';return {cv,ctx,w:rect.width,h:rect.height,l:rect.width<480?52:76,r:rect.width<480?16:24,t:24,b:44}}
// Measure the actual font and label bounds; preserve endpoints and remove collisions.
function axisTickLayout(ctx,min,max,left,right,format,gap=12){
 for(let count=5;count>=2;count--){
  const ticks=Array.from({length:count},(_,i)=>{const v=min+(max-min)*i/(count-1),x=left+(right-left)*i/(count-1),label=String(format(v)),width=ctx.measureText(label).width,align=i===0?'left':i===count-1?'right':'center',start=align==='left'?x:align==='right'?x-width:x-width/2;return{v,x,label,align,start,end:start+width}});
  if(ticks.every((t,i)=>!i||t.start>=ticks[i-1].end+gap))return ticks;
 }
 // Extremely narrow charts: retain the first date rather than overlap text.
 const label=String(format(min));return[{v:min,x:left,label,align:'left',start:left,end:left+ctx.measureText(label).width}];
}

function axes(c,xmin,xmax,ymin,ymax,xformat,yformat){let {ctx,w,h,l,r,t,b}=c;let X=v=>l+(v-xmin)/(xmax-xmin||1)*(w-l-r),Y=v=>h-b-(v-ymin)/(ymax-ymin||1)*(h-b-t);ctx.lineWidth=1;ctx.textBaseline='middle';for(let i=0;i<=4;i++){let v=ymin+(ymax-ymin)*i/4,y=Y(v);ctx.strokeStyle='#c6ceda';ctx.beginPath();ctx.moveTo(l,y);ctx.lineTo(w-r,y);ctx.stroke();ctx.fillStyle='#626d80';ctx.textAlign='right';ctx.fillText(yformat(v),l-10,y)}ctx.textBaseline='top';const ticks=axisTickLayout(ctx,xmin,xmax,l,w-r,xformat);c.cv.dataset.xAxisTicks=JSON.stringify(ticks);for(const tick of ticks){ctx.textAlign=tick.align;ctx.fillText(tick.label,tick.x,h-b+14)}return Object.assign(c,{X,Y,xmin,xmax,ymin,ymax})}
function line(c,pts,color,dash=[]){let {ctx}=c;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash(dash);ctx.beginPath();pts.forEach((p,i)=>{if(i===0)ctx.moveTo(c.X(p[0]),c.Y(p[1]));else ctx.lineTo(c.X(p[0]),c.Y(p[1]))});ctx.stroke();ctx.setLineDash([])}
function drawGrowth(){let c=setup('growthChart');if(!c)return;let ts=trajectories.filter(Boolean),n=ts[0].points.length,end=Math.floor(position/1000*(n-1)),max=Math.max(...ts.flatMap(t=>t.points.map(p=>Math.max(p.value,p.capital))));axes(c,0,n-1,0,max*1.1,v=>ts[0].points[Math.min(n-1,Math.round(v))].date.slice(0,7),v=>LANG==='en'?(v/1000).toFixed(0)+'k':(v/10000).toFixed(1)+'万');let ctx=c.ctx;ctx.fillStyle='#626d80';ctx.textAlign='left';ctx.fillText(LANG==='en'?'RMB / CNY':'人民币 / 元',c.l,0);ts.forEach(t=>{let pts=t.points.slice(0,end+1);line(c,pts.map((p,i)=>[i,p.value]),COLORS[t.k]);if(pts.length){let p=pts.at(-1);ctx.fillStyle=COLORS[t.k];ctx.beginPath();ctx.arc(c.X(end),c.Y(p.value),4,0,Math.PI*2);ctx.fill()}});line(c,ts[0].points.slice(0,end+1).map((p,i)=>[i,p.capital]),'#7b8799',[5,5]);charts.growth={...c,end,ts}}
let cloudMode='3d',cloudScene=null,cloudYaw=-.48,cloudPitch=-.42,cloudZoom=1,cloudDrag=null,cloudHover=null,cloudPaintFrame=0;
function cloudProject(x,y,z,scene=cloudScene){const cy=Math.cos(cloudYaw),sy=Math.sin(cloudYaw),cp=Math.cos(cloudPitch),sp=Math.sin(cloudPitch),rx=x*cy+z*sy,rz=-x*sy+z*cy,ry=y*cp-rz*sp,depth=y*sp+rz*cp,p=4.8/(4.8+depth),scale=scene.scale*cloudZoom;return{x:scene.w*.50+rx*scale*p,y:scene.h*.40-ry*scale*p,depth,p}}
function prepareCloud(animate=false){let c=setup('histChart');if(!c)return;const rows=scopeData,values=statistics,lo=Math.min(-.03,...values.map(s=>s.min))-.02,hi=Math.max(...values.map(s=>s.max))+.02,from=Math.min(...rows.map(rs=>Date.parse(rs[0][0]+'T00:00:00Z'))),to=Math.max(...rows.map(rs=>Date.parse(rs.at(-1)[0]+'T00:00:00Z'))),key=scope+':'+ACTIVE.map(a=>a.code).join(',');let changed=cloudScene?.key!==key;cloudScene={...c,key,lo,hi,from,to,scale:Math.min(c.w*.275,c.h*.33),points:cloudRecords(rows,lo,hi,from,to),screen:[],progress:1};charts.hist=cloudScene;cloudHover=null;
 $('cloudLegend').innerHTML=ACTIVE.map((a,k)=>`<span><i style="background:${COLORS[k]}"></i>${a.name}</span>`).join('');$('histCount').textContent=fmt(cloudScene.points.length)+' 个样本';$('swarmQuantiles').innerHTML=ACTIVE.map((a,k)=>`<div><span style="color:${COLORS[k]}">${a.name}</span><strong>${pct(values[k].median)}</strong><small>中位数 P50 · n=${fmt(values[k].n)}</small></div>`).join('');
 cancelAnimationFrame(swarmFrame);if((animate||changed)&&!matchMedia('(prefers-reduced-motion: reduce)').matches){let start=performance.now(),last=0;function tick(now){let t=Math.min(1,(now-start)/950);if(now-last>28||t===1){paintCloud(1-Math.pow(1-t,3));last=now}if(t<1)swarmFrame=requestAnimationFrame(tick)}swarmFrame=requestAnimationFrame(tick)}else paintCloud(1);orbitEnsure()
}
function cloudLine(ctx,a,b,color,width=1,dash=[]){const p=cloudProject(...a),q=cloudProject(...b);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.setLineDash([])}
function cloudLabel(ctx,text,x,y,z,color='#626d80',align='center'){let p=cloudProject(x,y,z),width=ctx.measureText(text).width,w=cloudScene.w;if(align==='left')p.x=Math.min(w-width-8,Math.max(8,p.x));else if(align==='right')p.x=Math.max(width+8,Math.min(w-8,p.x));else p.x=Math.max(width/2+8,Math.min(w-width/2-8,p.x));ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(text,p.x,p.y)}
function cloudRequestPaint(){if(cloudPaintFrame)return;cloudPaintFrame=requestAnimationFrame(()=>{cloudPaintFrame=0;paintCloud(1)})}
function cloudResetView(){orbitResume();cloudYaw=-.48;cloudPitch=-.42;cloudZoom=1;cloudHover=null;$('histTip').hidden=true;cloudRequestPaint()}
function cloudSwitch(mode){cancelAnimationFrame(morphFrame);morphFrame=0;morphHolding=false;morphAmount=morphVelocity=morphTarget=0;cloudMode=mode;cancelAnimationFrame(swarmFrame);cloudHover=null;$('histTip').hidden=true;$('cloudPanel').classList.toggle('is-3d',mode==='3d');$('cloud3d').classList.toggle('active',mode==='3d');$('cloud2d').classList.toggle('active',mode==='2d');$('cloud3d').setAttribute('aria-pressed',mode==='3d');$('cloud2d').setAttribute('aria-pressed',mode==='2d');$('cloudColorNote').textContent=mode==='3d'?'颜色区分资产 · 红线为零收益 · 共用样本比例刻度':'● 红点为亏损样本';$('cloudTitle').textContent=mode==='3d'?'四资产立体直方图':'收益点阵';$('cloudCaption').textContent=mode==='3d'?'柱高表示该收益区间的样本比例；四条资产通道共享收益率与比例刻度。默认每4个百分点分箱。':'每个点都是一个真实样本。横轴为5年累计收益，纵向仅用于排开重叠。';$('histChart').setAttribute('aria-label',mode==='3d'?'四资产立体直方图：横轴收益率，山高为各资产归一化分布，深度区分资产；方向键旋转，加减键缩放，Home复位':'每个点代表一个起投日的收益分布');swarmKey='';drawDistribution()}
function installCloudControls(){$('cloud3d').onclick=()=>cloudSwitch('3d');$('cloud2d').onclick=()=>cloudSwitch('2d');$('cloudReset').onclick=cloudResetView;$('cloudZoomIn').onclick=()=>{cloudZoom=Math.min(1.8,cloudZoom+.15);cloudRequestPaint()};$('cloudZoomOut').onclick=()=>{cloudZoom=Math.max(.65,cloudZoom-.15);cloudRequestPaint()}}
function cloudHit(x,y){if(!cloudScene||cloudScene.progress<1)return null;let best=null,distance=81;for(let p of cloudScene.screen){let d=(p.x-x)**2+(p.y-y)**2;if(d<=distance){distance=d;best=p}}return best}
function installCloudPointer(){const cv=$('histChart'),oldMove=cv.onpointermove,oldLeave=cv.onpointerleave;
 cv.onpointerdown=e=>{if(cloudMode!=='3d'||e.button!==0)return;cancelAnimationFrame(swarmFrame);paintCloud(1);cloudDrag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false,id:e.pointerId};cv.setPointerCapture(e.pointerId);$('histTip').hidden=true};
 cv.onpointermove=e=>{if(cloudMode!=='3d'){oldMove?.(e);return}if(cloudDrag){let dx=e.clientX-cloudDrag.x,dy=e.clientY-cloudDrag.y;cloudYaw+=dx*.006;cloudPitch=Math.max(-.85,Math.min(.95,cloudPitch+dy*.005));cloudDrag.x=e.clientX;cloudDrag.y=e.clientY;if(Math.hypot(e.clientX-cloudDrag.startX,e.clientY-cloudDrag.startY)>4)cloudDrag.moved=true;cloudHover=null;cloudRequestPaint();return}let rect=cv.getBoundingClientRect(),hit=cloudHit(e.clientX-rect.left,e.clientY-rect.top);if(hit?.index!==cloudHover?.index||hit?.k!==cloudHover?.k){cloudHover=hit;cloudRequestPaint()}if(hit){tooltip('histTip',e,histogramTip(hit))}else $('histTip').hidden=true};
 cv.onpointerup=e=>{if(!cloudDrag)return;let click=!cloudDrag.moved;cloudDrag=null;if(cv.hasPointerCapture(e.pointerId))cv.releasePointerCapture(e.pointerId);if(click){let rect=cv.getBoundingClientRect(),hit=cloudHit(e.clientX-rect.left,e.clientY-rect.top);if(hit){$('histAsset').value=hit.k;$('histAsset').dataset.assetCode=ACTIVE[hit.k].code;histPicked={k:hit.k,index:hit.index};drawDistribution()}}};cv.onpointercancel=()=>{cloudDrag=null};cv.onpointerleave=()=>{if(cloudMode!=='3d'){oldLeave?.();return}cloudHover=null;$('histTip').hidden=true;if(!cloudDrag)cloudRequestPaint()};
 cv.addEventListener('wheel',e=>{if(cloudMode!=='3d'||!e.shiftKey)return;e.preventDefault();cloudZoom=Math.max(.65,Math.min(1.8,cloudZoom*Math.exp(-e.deltaY*.001)));cloudHover=null;$('histTip').hidden=true;cloudRequestPaint()},{passive:false});
 cv.onkeydown=e=>{if(cloudMode!=='3d')return;let handled=true;if(e.key==='ArrowLeft')cloudYaw-=.12;else if(e.key==='ArrowRight')cloudYaw+=.12;else if(e.key==='ArrowUp')cloudPitch=Math.max(-.85,cloudPitch-.1);else if(e.key==='ArrowDown')cloudPitch=Math.min(.95,cloudPitch+.1);else if(['+','=','Add'].includes(e.key))cloudZoom=Math.min(1.8,cloudZoom+.1);else if(['-','Subtract'].includes(e.key))cloudZoom=Math.max(.65,cloudZoom-.1);else if(e.key==='Home'){cloudResetView()}else handled=false;if(handled){e.preventDefault();cloudHover=null;$('histTip').hidden=true;cloudRequestPaint()}}
}

// All observations are counted once, into a common return grid for four assets.
let histBinWidth=.04,histPicked=null;
function cloudRecords(rows,lo,hi){return rows.flatMap((rs,k)=>rs.map(r=>({r,k,x:-1.08+(r[5]-lo)/(hi-lo)*2.16,y:0,z:-.72+k*.48})))}
function histogramBins(rows,width,lo,hi){const first=Math.floor(lo/width),last=Math.ceil(hi/width),count=last-first,bars=[];rows.forEach((rs,k)=>{const groups=Array.from({length:count},()=>[]);rs.forEach(r=>{const ix=Math.max(0,Math.min(count-1,Math.floor(r[5]/width+1e-10)-first));groups[ix].push(r)});groups.forEach((samples,index)=>{if(samples.length)bars.push({k,index,from:(first+index)*width,to:(first+index+1)*width,n:samples.length,p:samples.length/rs.length,rows:samples,r:samples[0]})})});return{bars,lo:first*width,hi:last*width,count}}
function histogramScene(){const c=cloudScene;if(c.bars)return;const bins=histogramBins(scopeData,histBinWidth,c.lo,c.hi);Object.assign(c,{bars:bins.bars,binLo:bins.lo,binHi:bins.hi,binCount:bins.count,zMax:Math.max(...bins.bars.map(b=>b.p))*1.12,faces:[]});c.zMax=Math.max(.01,Math.ceil(c.zMax*100)/100);for(const b of c.bars){b.x0=-1.08+(b.from-c.binLo)/(c.binHi-c.binLo)*2.16;b.x1=-1.08+(b.to-c.binLo)/(c.binHi-c.binLo)*2.16;b.height=b.p/c.zMax*1.32;b.z=-.72+b.k*.48}}
function histogramShade(hex,mix){const n=parseInt(hex.slice(1),16),rgb=[n>>16,(n>>8)&255,n&255].map(v=>Math.round(mix>=0?v+(255-v)*mix:v*(1+mix)));return`rgb(${rgb.join(',')})`}
function histogramPolygon(ctx,pts,fill,stroke){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.5;ctx.stroke()}}
function histogramAligned(ctx,text,a,b,offset,color='#4f5f77'){const p=cloudProject(...a),q=cloudProject(...b),dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy);if(len<12)return;let angle=Math.atan2(dy,dx);if(angle>Math.PI/2)angle-=Math.PI;if(angle< -Math.PI/2)angle+=Math.PI;const x=(p.x+q.x)/2-dy/len*offset,y=(p.y+q.y)/2+dx/len*offset;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,0,0);ctx.restore()}
function histogramTick(ctx,text,p,dx,dy){const q=cloudProject(...p);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#66758b';ctx.fillText(text,q.x+dx,q.y+dy)}
function paintCloud(progress=1){const c=cloudScene;if(!c)return;histogramScene();const {ctx,w,h}=c;c.progress=progress;ctx.clearRect(0,0,w,h);ctx.font='12px "Lab Numbers","Lab English","Lab Sans",sans-serif';
 const floor=[[-1.18,-.69,-.96],[1.18,-.69,-.96],[1.18,-.69,.96],[-1.18,-.69,.96]].map(p=>cloudProject(...p));histogramPolygon(ctx,floor,'#d5deea60','#bdc8d6');
 for(let j=0;j<=8;j++){const x=-1.08+j*2.16/8;cloudLine(ctx,[x,-.69,-.94],[x,-.69,.94],'#bec9d866')}
 for(let k=0;k<4;k++)cloudLine(ctx,[-1.1,-.69,-.72+k*.48],[1.1,-.69,-.72+k*.48],COLORS[k]+'44');
 const backZ=Math.cos(cloudYaw)>=0?.96:-.96,leftGridX=Math.cos(cloudYaw)>=0?-1.18:1.18;for(let j=1;j<=4;j++){let y=-.69+j*1.32/4;cloudLine(ctx,[leftGridX,y,-backZ],[leftGridX,y,backZ],'#bec9d844',.7);cloudLine(ctx,[-1.18,y,backZ],[1.18,y,backZ],'#bec9d844',.7)}
 let faces=[];for(const b of c.bars){const gap=Math.min(.008,(b.x1-b.x0)*.15),x0=b.x0+gap,x1=b.x1-gap,y0=-.68,y1=y0+b.height*progress,z0=b.z-.16,z1=b.z+.16;const v=[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]].map(p=>cloudProject(...p));const specs=[[[4,5,6,7],.30],[[0,1,5,4],.03],[[1,2,6,5],-.12],[[2,3,7,6],-.05],[[3,0,4,7],.16]];for(const [ix,light]of specs){const pts=ix.map(i=>v[i]);faces.push({b,pts,depth:pts.reduce((a,p)=>a+p.depth,0)/4,fill:histogramShade(COLORS[b.k],light)})}}
 faces.sort((a,b)=>b.depth-a.depth);c.faces=faces;for(const f of faces){const active=cloudHover?.k===f.b.k&&cloudHover?.index===f.b.index||histPicked?.k===f.b.k&&histPicked?.index===f.b.index;histogramPolygon(ctx,f.pts,active?histogramShade(COLORS[f.b.k],.38):f.fill,active?'#6253b4':'#edf1f6aa')}
 c.screen=c.bars.map(b=>({...b,...cloudProject((b.x0+b.x1)/2,-.68+b.height*progress,b.z)}));
 // The numeric axes and their titles are projected from the same 3D segments.
 const nearZ=Math.cos(cloudYaw)>=0?-.96:.96,leftX=Math.cos(cloudYaw)>=0?-1.18:1.18,origin=[leftX,-.69,nearZ],xe=[-leftX,-.69,nearZ],yo=[-leftX,-.69,nearZ],ye=[-leftX,-.69,-nearZ],ze=[leftX,.74,nearZ];for(const end of [xe,ze])cloudLine(ctx,origin,end,'#8595ad',1.3);cloudLine(ctx,yo,ye,'#8595ad',1.3);
 ctx.font=(w<550?'10':'12')+'px "Lab Numbers","Lab English","Lab Sans",sans-serif';
 for(let j=0;j<=4;j++){const v=c.binLo+(c.binHi-c.binLo)*j/4,x=-1.08+j*2.16/4;histogramTick(ctx,(v*100).toFixed(0)+'%',[x,-.69,nearZ],0,15)}
 histogramAssetNames(ctx,leftX);
 for(let j=0;j<=4;j++){const y=-.69+j*1.32/4;histogramTick(ctx,(c.zMax*100*j/4).toFixed(c.zMax<.1?1:0)+'%',[leftX,y,nearZ],-21,0);cloudLine(ctx,[leftX,y,nearZ],[leftX*.96,y,nearZ],'#8595ad')}
 ctx.font=(w<550?'11':'13')+'px "Lab English","Lab Sans",sans-serif';
 const po=cloudProject(...origin),px=cloudProject(...xe),pyo=cloudProject(...yo),py=cloudProject(...ye);
 histogramAligned(ctx,LANG==='en'?'5-year return (%)':'五年累计收益率（%）',origin,xe,(w<550?34:39)*Math.sign(px.x-po.x||1));

 histogramAligned(ctx,LANG==='en'?'Sample share (%)':'样本比例（%）',origin,ze,-51);
 const zero=-1.08-c.binLo/(c.binHi-c.binLo)*2.16;if(zero>=-1.08&&zero<=1.08)cloudLine(ctx,[zero,-.685,-.9],[zero,-.685,.9],'#ad647b99',1,[3,4]);
 ctx.textAlign='left';ctx.fillStyle='#78869b';ctx.font='10px "Lab English","Lab Sans",sans-serif';ctx.fillText(LANG==='en'?'FREQUENCY / SHARED SCALE':'样本频率 / 四资产共用刻度',16,22);ctx.textAlign='right';ctx.fillText('n = '+fmt(c.points.length),w-16,22)
}
function histogramInside(x,y,pts){let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside}return inside}
function cloudHit(x,y){if(!cloudScene||cloudScene.progress<1)return null;const faces=cloudScene.faces||[];for(let i=faces.length-1;i>=0;i--)if(histogramInside(x,y,faces[i].pts))return faces[i].b;return null}
function histogramTip(b){return`<strong>${translate(ACTIVE[b.k].name)}</strong><br>${pct(b.from)} ≤ ${LANG==='en'?'return':'收益率'} &lt; ${pct(b.to)}<br>${LANG==='en'?'Sample share':'样本比例'} ${pct(b.p)}<br>${fmt(b.n)} / ${fmt(scopeData[b.k].length)} ${LANG==='en'?'samples':'个样本'}`}
function installHistogram(){$('histBinWidth').onchange=e=>{const v=Number(e.target.value);if(![.005,.01,.02,.04,.05].includes(v))return;histBinWidth=v;histPicked=null;cloudScene=null;prepareCloud(true)};const select=$('histAsset').onchange;$('histAsset').onchange=e=>{histPicked=null;select?.(e)}}

// Each name lies on the projected baseline of its own asset lane.
function histogramAssetNames(ctx,leftX){const c=cloudScene,font=c.w<550?9:12,side=-Math.sign(leftX);ctx.font=font+'px "Lab English","Lab Sans",sans-serif';for(let k=0;k<4;k++){const z=-.72+k*.48,a=cloudProject(side*1.08,-.69,z),b=cloudProject(side*1.7,-.69,z),p=cloudProject(side*1.39,-.69,z),text=translate(ACTIVE[k].name),width=ctx.measureText(text).width;let angle=Math.atan2(b.y-a.y,b.x-a.x);if(angle>Math.PI/2)angle-=Math.PI;if(angle< -Math.PI/2)angle+=Math.PI;const ux=Math.cos(angle),uy=Math.sin(angle),hx=Math.abs(ux)*width/2+Math.abs(uy)*(font+4)/2,hy=Math.abs(uy)*width/2+Math.abs(ux)*(font+4)/2;let lo=-Infinity,hi=Infinity;for(const [center,unit,min,max]of [[p.x,ux,hx+8,c.w-hx-8],[p.y,uy,hy+32,c.h-hy-12]])if(Math.abs(unit)>.001){const t0=(min-center)/unit,t1=(max-center)/unit;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1))}const shift=lo<=hi?Math.max(lo,Math.min(hi,0)):0,x=p.x+ux*shift,y=p.y+uy*shift;cloudLine(ctx,[side*1.05,-.69,z],[side*1.7,-.69,z],COLORS[k]+'77',.8);ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle='#e2e8f1e6';ctx.fillRect(-width/2-4,-font*.7,width+8,font+5);ctx.fillStyle=COLORS[k];ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,0,0);ctx.restore()}}

// Inspired by Motion's press-to-globe transition. No network or WebGPU required.
// A damped spring interpolates only presentation coordinates, never sample data.
let morphAmount=0,morphVelocity=0,morphTarget=0,morphFrame=0,morphLast=0,morphHolding=false;
function morphPosition(p,index,count,c,amount,time=0){const v=1-2*(index+.5)/count,ring=Math.sqrt(1-v*v),a=index*2.39996323+time*.00012,r=Math.min(c.w*.3,c.h*.34),depth=Math.sin(a)*ring,scale=2.8/(2.8+depth*.55),gx=c.w/2+Math.cos(a)*ring*r*scale,gy=c.mid+v*r*scale;return{x:p.x+(gx-p.x)*amount,y:p.y+(gy-p.y)*amount,depth}}
function paintMorphSamples(c){const {ctx,points,diam,k}=c,amount=Math.max(0,Math.min(1,morphAmount)),isMorph=morphAmount>.005;const draw=points.map((p,i)=>({...p,...morphPosition(p,i,points.length,c,amount,performance.now())}));if(isMorph)draw.sort((a,b)=>b.depth-a.depth);for(const p of draw){ctx.globalAlpha=isMorph?.48+.25*(1-p.depth)/2:.78;ctx.fillStyle=p.r[5]<0?'#ad4d64':COLORS[k];ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.65,diam*.37)*(isMorph?1.15:1),0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
 if(!isMorph){for(const [p,color,radius] of [[points.find(p=>p.r[0]===selected),'#6d5dfc',7],[c.hover,'#343e50',6]])if(p){ctx.strokeStyle=color;ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.stroke()}}
 if(isMorph){ctx.fillStyle='#e0e5ecdc';ctx.fillRect(0,c.h-48,c.w,48);ctx.fillStyle='#626d80';ctx.font='12px "Lab English","Lab Sans",sans-serif';ctx.textAlign='center';ctx.fillText(LANG==='en'?'PARTICLE MORPH · RELEASE TO RESTORE DATA':'粒子变形中 · 松开回到真实收益坐标',c.w/2,c.h-22)}
}
function morphStep(dt){const acceleration=(morphTarget-morphAmount)*115-morphVelocity*19;morphVelocity+=acceleration*dt;morphAmount+=morphVelocity*dt;if(Math.abs(morphTarget-morphAmount)<.001&&Math.abs(morphVelocity)<.005){morphAmount=morphTarget;morphVelocity=0;return false}return true}
function morphTick(now){morphFrame=0;if(cloudMode!=='2d'){morphAmount=morphVelocity=morphTarget=0;return}const dt=Math.min(.032,Math.max(.001,(now-morphLast)/1000));morphLast=now;const unsettled=morphStep(dt);paintSwarm(1);$('morphState').textContent=morphAmount>.005?'粒子变形中 · 暂不读取坐标':'真实收益坐标';if(unsettled||morphHolding)morphFrame=requestAnimationFrame(morphTick)}
function setMorphHold(hold){if(cloudMode!=='2d')return;morphHolding=hold;morphTarget=hold?1:0;$('histTip').hidden=true;$('morphHold').setAttribute('aria-pressed',hold);if(matchMedia('(prefers-reduced-motion: reduce)').matches){morphAmount=morphTarget;morphVelocity=0;paintSwarm(1);$('morphState').textContent=hold?'粒子变形中 · 暂不读取坐标':'真实收益坐标';return}if(!morphFrame){morphLast=performance.now();morphFrame=requestAnimationFrame(morphTick)}}
function startSwarmMorph(animate){cancelAnimationFrame(morphFrame);morphFrame=0;morphHolding=false;morphTarget=0;morphVelocity=0;$('morphHold').setAttribute('aria-pressed',false);morphAmount=animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches?1:0;paintSwarm(1);if(morphAmount){morphLast=performance.now();morphFrame=requestAnimationFrame(morphTick)}else $('morphState').textContent='真实收益坐标'}
function installMorphControls(){const b=$('morphHold'),cv=$('histChart');b.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();b.setPointerCapture(e.pointerId);setMorphHold(true)};b.onpointerup=e=>{if(b.hasPointerCapture(e.pointerId))b.releasePointerCapture(e.pointerId);setMorphHold(false)};b.onpointercancel=()=>setMorphHold(false);b.onlostpointercapture=()=>setMorphHold(false);b.onkeydown=e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();setMorphHold(true)}};b.onkeyup=e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();setMorphHold(false)}};b.onblur=()=>setMorphHold(false);
 const down=cv.onpointerdown,up=cv.onpointerup,cancel=cv.onpointercancel,key=cv.onkeydown,move=cv.onpointermove;cv.onpointerdown=e=>{if(cloudMode==='3d')return down?.(e);if(e.button===0){cv.setPointerCapture(e.pointerId);setMorphHold(true)}};cv.onpointerup=e=>{if(cloudMode==='3d')return up?.(e);if(cv.hasPointerCapture(e.pointerId))cv.releasePointerCapture(e.pointerId);setMorphHold(false)};cv.onpointercancel=e=>{if(cloudMode==='3d')return cancel?.(e);setMorphHold(false)};cv.onpointermove=e=>{if(cloudMode==='2d'&&morphAmount>.005)return;move?.(e)};cv.onkeydown=e=>{if(cloudMode==='3d')return key?.(e);if(e.key===' '){e.preventDefault();setMorphHold(true)}};cv.onkeyup=e=>{if(cloudMode==='2d'&&e.key===' '){e.preventDefault();setMorphHold(false)}};cv.onblur=()=>{if(cloudMode==='2d')setMorphHold(false)};window.addEventListener('blur',()=>setMorphHold(false));document.addEventListener('visibilitychange',()=>{if(document.hidden)setMorphHold(false)})}

// Automatic yaw orbit, suspended until Reset after any manual camera action.
let orbitEnabled=!matchMedia('(prefers-reduced-motion: reduce)').matches,orbitVisible=false,orbitFrame=0,orbitLast=0,orbitPaint=0;
function orbitStatus(){const b=$('cloudOrbit');b.textContent=orbitEnabled?'Ⅱ 暂停环绕':'▶ 继续环绕';b.setAttribute('aria-pressed',orbitEnabled)}
function orbitStop(){orbitEnabled=false;cancelAnimationFrame(orbitFrame);orbitFrame=0;orbitStatus()}
function orbitEnsure(){orbitStatus();if(orbitEnabled&&orbitVisible&&cloudMode==='3d'&&view==='distribution'&&!document.hidden&&!orbitFrame){orbitLast=performance.now();orbitFrame=requestAnimationFrame(orbitTick)}}
function orbitTick(now){orbitFrame=0;if(!orbitEnabled||!orbitVisible||cloudMode!=='3d'||view!=='distribution'||document.hidden)return;const dt=Math.min(.05,Math.max(0,(now-orbitLast)/1000));orbitLast=now;if(cloudScene?.progress>=1&&!cloudDrag){cloudYaw=(cloudYaw+.09*dt)%(Math.PI*2);if(now-orbitPaint>=32){paintCloud(1);orbitPaint=now}}orbitFrame=requestAnimationFrame(orbitTick)}
function orbitResume(){orbitEnabled=true;orbitEnsure()}
function installOrbit(){const cv=$('histChart');new IntersectionObserver(entries=>{orbitVisible=entries[0].isIntersecting;if(orbitVisible)orbitEnsure();else{cancelAnimationFrame(orbitFrame);orbitFrame=0}},{threshold:.08}).observe(cv);document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(orbitFrame);orbitFrame=0}else orbitEnsure()});$('cloudOrbit').onclick=()=>orbitEnabled?orbitStop():orbitResume();
 const down=cv.onpointerdown,key=cv.onkeydown;cv.onpointerdown=e=>{if(cloudMode==='3d'&&e.button===0)orbitStop();down?.(e)};cv.onkeydown=e=>{if(cloudMode==='3d'&&e.key!=='Home'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','Add','-','Subtract'].includes(e.key))orbitStop();key?.(e)};cv.addEventListener('wheel',e=>{if(cloudMode==='3d'&&e.shiftKey)orbitStop()},{passive:true});for(const id of ['cloudZoomIn','cloudZoomOut']){const fn=$(id).onclick;$(id).onclick=()=>{orbitStop();fn()}}orbitStatus()}

let scanThreshold=.10,scanTimer=null,swarmFrame=null,swarmKey='',swarmScene=null;
const SCAN_C=2*Math.PI*74;
function lowerBound(x,value){let lo=0,hi=x.length;while(lo<hi){let m=(lo+hi)>>1;if(x[m]<value)lo=m+1;else hi=m}return lo}
function upperBound(x,value){let lo=0,hi=x.length;while(lo<hi){let m=(lo+hi)>>1;if(x[m]<=value)lo=m+1;else hi=m}return lo}
function stopScan(){clearInterval(scanTimer);scanTimer=null;if($('scanPlay'))$('scanPlay').textContent='▶ 自动扫描'}
function renderGauges(){const min=Math.min(-25,Math.floor(Math.min(...statistics.map(s=>s.min))*100)-1),max=Math.max(100,Math.ceil(Math.max(...statistics.map(s=>s.max))*100)+1);scanThreshold=Math.max(min/100,Math.min(max/100,scanThreshold));$('thresholdSlider').min=min;$('thresholdSlider').max=max;$('thresholdNumber').min=min;$('thresholdNumber').max=max;$('thresholdMin').textContent=min+'%';$('thresholdMax').textContent=max+'%';
 $('scanCards').innerHTML=ACTIVE.map((a,k)=>`<article class="scan-card" style="--asset:${COLORS[k]}"><h3><span class="dot"></span>${a.name}</h3><div class="ring"><svg viewBox="0 0 200 200" aria-hidden="true"><circle class="ring-guide" cx="100" cy="100" r="88"/><circle class="ring-track" cx="100" cy="100" r="74"/><circle class="ring-progress" id="ring${k}" cx="100" cy="100" r="74" style="stroke:${COLORS[k]};stroke-dasharray:${SCAN_C};stroke-dashoffset:${SCAN_C}"/></svg><div class="ring-center"><strong id="scanPct${k}">—</strong><span class="tiny muted">达到或超过门槛</span></div></div><div class="scan-count" id="scanCount${k}"></div><div class="scan-above" id="scanAbove${k}"></div></article>`).join('');updateScanner()}
function updateScanner(){let value=scanThreshold*100;$('thresholdSlider').value=value;if(document.activeElement!==$('thresholdNumber'))$('thresholdNumber').value=value.toFixed(1);$('thresholdValue').textContent=pct(scanThreshold);$('thresholdSlider').setAttribute('aria-valuetext',pct(scanThreshold));statistics.forEach((s,k)=>{let count=s.n-lowerBound(s.x,scanThreshold),p=count/s.n;$('ring'+k).style.strokeDashoffset=SCAN_C*(1-p);$('ring'+k).style.opacity=p===0?'0':'1';$('scanPct'+k).textContent=pct(p);$('scanCount'+k).textContent=fmt(count)+' / '+fmt(s.n)+' 个样本';$('scanAbove'+k).textContent='未达门槛 '+pct(1-p)});document.querySelectorAll('[data-threshold]').forEach(b=>b.classList.toggle('active',Math.abs(scanThreshold-Number(b.dataset.threshold))<1e-9))}
function setThreshold(v){stopScan();const lo=Number($('thresholdSlider').min)/100,hi=Number($('thresholdSlider').max)/100;if(!Number.isFinite(v))return;scanThreshold=Math.max(lo,Math.min(hi,v));updateScanner()}
function prepareSwarm(animate=false){if(cloudMode==='3d'){prepareCloud(animate);return}let c=setup('histChart');if(!c)return;let k=Number($('histAsset').value)||0,s=statistics[k],rows=scopeData[k],lo=Math.min(-.03,s.min-.025),hi=s.max+.025;c.l=30;c.r=22;c.t=38;c.b=50;let X=v=>c.l+(v-lo)/(hi-lo)*(c.w-c.l-c.r),mid=(c.t+c.h-c.b)/2,available=(c.h-c.b-c.t)/2-22,ordered=rows.map((r,index)=>({r,index,x:X(r[5])})).sort((a,b)=>a.x-b.x||a.index-b.index),points=[],diam=5.4;
 for(let attempt=0;attempt<14;attempt++){let lanes=[],maxLane=0;points=ordered.map(p=>{let lane=0;while(lanes[lane]!==undefined&&p.x-lanes[lane]<diam)lane++;lanes[lane]=p.x;let offset=lane===0?0:(lane%2?1:-1)*Math.ceil(lane/2);maxLane=Math.max(maxLane,Math.abs(offset));return {...p,y:mid+offset*diam}});if(maxLane*diam<=available)break;diam*=.87}
 let key=scope+':'+k,changed=swarmKey!==key;swarmKey=key;swarmScene={...c,X,lo,hi,mid,points,diam,k,s,hover:null};charts.hist=swarmScene;$('histCount').textContent=fmt(rows.length)+' 个样本';$('swarmQuantiles').innerHTML=[['P5',s.p5],['P50',s.median],['P95',s.p95]].map(([label,v])=>`<div><span>${label}</span><strong>${pct(v)}</strong></div>`).join('');cancelAnimationFrame(swarmFrame);startSwarmMorph(animate||changed)}
function paintSwarm(progress=1){if(cloudMode==='3d'){paintCloud(progress);return}const c=swarmScene;if(!c)return;const {ctx,w,h,l,r,t,b,X,lo,hi,mid,points,diam,k,s}=c;ctx.clearRect(0,0,w,h);const bottom=h-b,zero=X(0),shade=ctx.createLinearGradient(l,0,zero,0);shade.addColorStop(0,'#ad4d6418');shade.addColorStop(1,'#ad4d6405');ctx.fillStyle=shade;ctx.fillRect(l,t,Math.max(0,zero-l),bottom-t);ctx.strokeStyle='#c6ceda';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(l,bottom);ctx.lineTo(w-r,bottom);ctx.stroke();ctx.font=(rect.width<480?'11px':'13px')+' "Lab Numbers","hellofont-id-ji-xie-ti","Lab English","Lab Sans",sans-serif';ctx.fillStyle='#626d80';ctx.textBaseline='top';for(let i=0;i<=4;i++){let v=lo+(hi-lo)*i/4;ctx.textAlign=i===0?'left':i===4?'right':'center';ctx.fillText((v*100).toFixed(0)+'%',X(v),bottom+16)}ctx.setLineDash([3,5]);ctx.strokeStyle='#ad4d64';ctx.beginPath();ctx.moveTo(zero,t);ctx.lineTo(zero,bottom);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#626d80';ctx.textAlign='left';ctx.fillText(LANG==='en'?'ONE DOT = ONE START DATE':'一个点 = 一个真实起投日',l,8);
 paintMorphSamples(c);c.progress=morphAmount<.005?1:0}

function drawDistribution(){if(view!=='distribution')return;let k=Number($('histAsset').value)||0,s=statistics[k];prepareSwarm();$('tailFacts').innerHTML=[['历史亏损比例',pct(s.loss)],['最差单一样本',pct(s.min)],['5%分位数',pct(s.p5)],['最差5%样本平均收益',pct(s.tail)],['收益率中位数',pct(s.median)]].map(([a,b])=>`<div class="stat-row"><span class="muted">${a}</span><strong>${b}</strong></div>`).join('');renderGauges()}
function installDistribution(){
 installCloudControls();$('swarmReplay').onclick=()=>prepareSwarm(true);$('thresholdSlider').oninput=e=>setThreshold(Number(e.target.value)/100);$('thresholdNumber').oninput=e=>{if(e.target.value!=='')setThreshold(Number(e.target.value)/100)};$('thresholdNumber').onchange=e=>{if(e.target.value!=='')setThreshold(Number(e.target.value)/100)};$('thresholdNumber').onblur=()=>{$('thresholdNumber').value=(scanThreshold*100).toFixed(1)};document.querySelectorAll('[data-threshold]').forEach(b=>b.onclick=()=>setThreshold(Number(b.dataset.threshold)));
 $('scanPlay').onclick=()=>{if(scanTimer){stopScan();return}const lo=Number($('thresholdSlider').min)/100,hi=Number($('thresholdSlider').max)/100;if(scanThreshold>=hi)scanThreshold=lo;$('scanPlay').textContent='Ⅱ 暂停扫描';let last=performance.now();scanTimer=setInterval(()=>{let now=performance.now();scanThreshold=Math.min(hi,scanThreshold+(hi-lo)*(now-last)/14000);last=now;updateScanner();if(scanThreshold>=hi)stopScan()},70)};
 $('histChart').onpointermove=e=>{const c=swarmScene;if(!c||c.progress<1)return;let rect=e.currentTarget.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top,best=null,dist=100;for(let p of c.points){let d=(p.x-x)**2+(p.y-y)**2;if(d<dist){dist=d;best=p}}c.hover=best;paintSwarm();if(best){let q=best.r;tooltip('histTip',e,`<strong>${q[0]}</strong><br>${LANG==='en'?'5-year return':'5年累计收益'} ${pct(q[5])}<br>${LANG==='en'?'Terminal value':'期末市值'} ${money(q[4])}`)}else $('histTip').hidden=true};$('histChart').onpointerleave=()=>{$('histTip').hidden=true;if(swarmScene){swarmScene.hover=null;if(swarmScene.progress>=1)paintSwarm()}};
}

const METRICS=[['样本数','n'],['均值','mean'],['中位数 / P50','median'],['标准差（百分点）','sd'],['5%分位数','p5'],['25%分位数','p25'],['75%分位数','p75'],['95%分位数','p95'],['正收益比例','positive'],['亏损比例','loss'],['零收益比例','zero'],['最小值','min'],['最大值','max'],['最差5%均值','tail']];
function renderStats(){$('statsTable').innerHTML='<table><thead><tr><th>统计指标</th>'+ACTIVE.map((a,k)=>`<th style="color:${COLORS[k]}">${a.name}</th>`).join('')+'</tr></thead><tbody>'+METRICS.map(([label,key])=>'<tr><td>'+label+'</td>'+statistics.map(s=>'<td>'+(key==='n'?fmt(s[key]):key==='sd'?(s[key]*100).toFixed(2):pct(s[key]))+'</td>').join('')+'</tr>').join('')+'</tbody></table>'}
function renderMap(){let k=+$('mapAsset').value||0,rows=scopeData[k];if(!rows)return;let months=new Map;rows.forEach(r=>{let key=r[0].slice(0,7);if(!months.has(key))months.set(key,[]);months.get(key).push(r)});let from=+rows[0][0].slice(0,4),html='<span></span>'+Array.from({length:12},(_,i)=>`<span class="month">${i+1}月</span>`).join('');for(let y=from;y<=2021;y++){html+=`<span class="year">${y}</span>`;for(let m=1;m<=12;m++){let key=`${y}-${String(m).padStart(2,'0')}`,rs=months.get(key);if(!rs){html+='<span class="cell empty" aria-label="无样本"></span>';continue}let v=quantile(rs.map(r=>r[5]).sort((a,b)=>a-b),.5),t=v<0?Math.min(1,-v/.25):Math.min(1,v/.5),a=[224,229,236],b=v<0?[200,128,143]:[98,176,162],rgb=a.map((v,i)=>Math.round(v+(b[i]-v)*t));html+=`<button class="cell" style="background:rgb(${rgb})" data-date="${rs[0][0]}" title="${key}起投 · ${rs.length}个样本 · 5年收益中位数${pct(v)}" aria-label="${key}起投收益中位数${pct(v)}，点击查看">${(v*100).toFixed(0)}%</button>`}}$('heatmap').innerHTML=html}
function setView(v){view=v;stopTravel();stopGrowth();stopScan();document.querySelectorAll('.view').forEach(e=>e.hidden=e.id!==v);document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===v);b.setAttribute('aria-pressed',b.dataset.view===v)});requestAnimationFrame(()=>{if(v==='explore')drawGrowth();if(v==='distribution')drawDistribution()})}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));document.querySelectorAll('[data-scope]').forEach(b=>b.onclick=()=>setScope(b.dataset.scope));document.querySelectorAll('.assetSelect').forEach(s=>{s.innerHTML=ACTIVE.map((a,k)=>`<option value="${k}">${a.name}</option>`).join('');s.onchange=()=>{s.dataset.assetCode=ACTIVE[+s.value].code;drawDistribution();renderMap()}});
$('startSlider').oninput=e=>{stopTravel();setStart(e.target.value)};$('startDate').onchange=e=>{if(e.target.value){stopTravel();setStart(closest(e.target.value))}};$('growthSlider').oninput=e=>{stopTravel();stopGrowth();position=+e.target.value;renderGrowth()};$('travelPlay').onclick=()=>{if(travelTimer){stopTravel();return}stopGrowth();if(+$('startSlider').value===starts.length-1)setStart(0);$('travelPlay').textContent='Ⅱ 暂停穿越';travelTimer=setInterval(()=>{let i=+$('startSlider').value+(+$('travelSpeed').value);setStart(i);if(i>=starts.length-1)stopTravel()},110)};$('growthPlay').onclick=()=>{if(growthTimer){stopGrowth();return}stopTravel();if(position>=1000)position=0;$('growthPlay').textContent='Ⅱ 暂停回放';growthTimer=setInterval(()=>{position=Math.min(1000,position+5);$('growthSlider').value=position;renderGrowth();if(position===1000)stopGrowth()},40)};
$('worstBtn').onclick=()=>{stopTravel();let k=+$('histAsset').value||0;let r=scopeData[k].reduce((a,b)=>a[5]<b[5]?a:b);setStart(closest(r[0]))};$('bestBtn').onclick=()=>{stopTravel();let k=+$('histAsset').value||0;let r=scopeData[k].reduce((a,b)=>a[5]>b[5]?a:b);setStart(closest(r[0]))};$('resetBtn').onclick=()=>{stopTravel();setStart(closest('2015-01-05'))};$('heatmap').onclick=e=>{let b=e.target.closest('[data-date]');if(b){setStart(closest(b.dataset.date));setView('explore');window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}};
$('exportBtn').onclick=()=>{let rows=[['范围','指标',...ACTIVE.map(a=>a.name)],...METRICS.map(([label,key])=>[scope==='all'?'各自全部历史':'四资产共同区间',label,...statistics.map(s=>key==='sd'?s[key]*100:s[key])])],blob=new Blob(['\ufeff'+rows.map(r=>r.map(x=>typeof x==='string'?translate(x):x).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(LANG==='en'?'DCA_statistics_':'定投统计_')+scope+'_比例为小数.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
function openMethod(){lastFocus=document.activeElement;$('method').hidden=false;$('closeMethod').focus()}function closeMethod(){$('method').hidden=true;lastFocus?.focus()}$('methodBtn').onclick=openMethod;$('closeMethod').onclick=closeMethod;$('method').onclick=e=>{if(e.target===$('method'))closeMethod()};document.addEventListener('keydown',e=>{if(!$('method').hidden){if(e.key==='Escape')closeMethod();if(e.key==='Tab'){let els=[...$('method').querySelectorAll('button,a')],first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}});
function tooltip(id,e,html){let cv=e.currentTarget,box=cv.parentElement,rect=cv.getBoundingClientRect(),tip=$(id);tip.hidden=false;tip.innerHTML=html;tip.style.left=Math.max(2,Math.min(e.clientX-rect.left+14,box.clientWidth-tip.offsetWidth-4))+'px';tip.style.top=Math.max(2,Math.min(e.clientY-rect.top+10,box.clientHeight-tip.offsetHeight-3))+'px'}
$('growthChart').onpointermove=e=>{let c=charts.growth;if(!c)return;let x=e.clientX-e.currentTarget.getBoundingClientRect().left,i=Math.max(0,Math.min(c.end,Math.round((x-c.l)/(c.w-c.l-c.r)*(c.ts[0].points.length-1))));tooltip('growthTip',e,'<strong>'+c.ts[0].points[i].date+'</strong><br>累计投入 '+money(c.ts[0].points[i].capital)+c.ts.map(t=>`<br><span style="color:${COLORS[t.k]}">${ACTIVE[t.k].name} ${money(t.points[i].value)}</span>`).join(''))};$('growthChart').onpointerleave=()=>$('growthTip').hidden=true;
$('cdfLegend').innerHTML=ACTIVE.map((a,k)=>`<span><i style="background:${COLORS[k]}"></i>${a.name}</span>`).join('');let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(view==='explore')drawGrowth();if(view==='distribution')drawDistribution()},120)});document.addEventListener('visibilitychange',()=>{if(document.hidden){stopTravel();stopGrowth();stopScan()}});installAssetPicker();installDistribution();installCloudPointer();installMorphControls();installOrbit();installHistogram();setScope('common');
const DICT={
  "时间的复利 · 定投实验室": "The Long Game · DCA Lab",
  "时间的复利": "The Long Game",
  "/ 定投实验室": "/ DCA LAB",
  "● 历史数据 · 离线可用": "● Historical data · Offline ready",
  "研究口径 ↗": "Methodology ↗",
  "把时间，变成看得见的收益。": "Watch time turn into returns.",
  "每天50元，连续5年。穿越不同起点，观察沪深300、黄金、国债与纳指的成长轨迹。": "RMB 50 each trading day. Five years. Explore CSI 300, gold, Treasuries and Nasdaq from different starting dates.",
  "起投截止 / 估值截止": "Last start / Last valuation",
  "人民币 · 累计收益率 · 分红再投资": "RMB · Cumulative return · Distributions reinvested",
  "四资产共同区间": "Four-asset common window",
  "原三资产对照": "Original three-asset comparison",
  "各自全部历史": "Full history per asset",
  "↓ 导出统计 CSV": "↓ Export statistics CSV",
  "01 时间旅行": "01 Time travel",
  "02 收益分布": "02 Return distribution",
  "03 年月地图": "03 Calendar map",
  "选择你的起点": "CHOOSE YOUR START",
  "起投日期播放速度": "Start-date playback speed",
  "起投日期": "Start date",
  "▶ 穿越起投日": "▶ Travel through start dates",
  "Ⅱ 暂停穿越": "Ⅱ Pause travel",
  "逐日": "Daily",
  "每帧5日": "5 days / frame",
  "每帧20日": "20 days / frame",
  "选择起投交易日": "Select a starting trading day",
  "拖动滑轨 · 每个起点都是一次完整5年实验": "Drag to explore · Each start is a complete five-year experiment",
  "一笔笔投入，慢慢长大": "Small contributions. A growing portfolio.",
  "本金与市值的真实日度轨迹，曲线始终对应当前选定起投日。": "Daily contributions and market values for your selected start date.",
  "▶ 回放这5年": "▶ Replay these five years",
  "Ⅱ 暂停回放": "Ⅱ Pause replay",
  "回放持有期间进度": "Holding-period playback progress",
  "上方卡片显示回放至今的收益；回放终点才是完整5年的结果。虚线为累计投入。": "Cards show returns up to the playback date. The endpoint is the full five-year result. The dashed line shows contributions.",
  "同一个起点，不同的终点。": "One start. Different outcomes.",
  "沪深300最差起点": "Worst CSI 300 start",
  "黄金最好起点": "Best gold start",
  "回到2015年初": "Reset to early 2015",
  "极端起点按当前样本范围选择。各自全部历史中，ETF上市前显示“尚未上市”，不拼接替代数据。": "Extremes use the selected sample window. No substitute history is added before an ETF starts trading.",
  "收益落在哪里？": "Where do returns land?",
  "每一个样本，是一个起投日对应的完整5年累计收益。": "Each observation is the full five-year cumulative return for one starting date.",
  "直方图资产": "Histogram asset",
  "│ 当前起点": "│ Selected start",
  "虚线：零收益": "Dashed line: zero return",
  "看清较差的情形": "Understand the downside",
  "当前所选资产 · 历史分布": "Selected asset · Historical distribution",
  "最差5%均值取收益最低的向上取整5%样本。即使该值为正，也如实保留。": "Tail mean uses the worst ceil(N × 5%) observations. Positive values remain positive.",
  "收益率累计分布": "Cumulative return distribution",
  "横轴为收益率，纵轴为“不高于这个收益”的历史样本比例。悬停横向比较。": "X: cumulative return. Y: share of observations at or below that return. Hover to compare.",
  "全部统计，一览无余": "The full statistical picture",
  "收益率未经年化；标准差以百分点展示。表格可横向滚动。": "Returns are not annualized. Standard deviations are in percentage points. Scroll the table horizontally.",
  "找到属于不同年代的颜色": "Every era has its own color",
  "每格为该月所有起投日的5年收益率中位数。点击色块，回到该月首个可用起投日。": "Each cell shows the median five-year return for starts in that month. Click to explore the first available start.",
  "年月地图资产": "Calendar asset",
  "+50%及以上": "+50% or above",
  "颜色在−25%与+50%处截断，单元格数字和悬停提示显示真实值；空白代表没有可用样本。年份、月份均指起投时间。": "Colors are clipped at −25% and +50%; labels and tooltips show actual values. Blank cells have no samples. Years and months refer to start dates.",
  "让画面动起来，让口径保持清楚。": "Motion in the visuals. Precision in the method.",
  "关闭研究口径": "Close methodology",
  "数据、字体和图表逻辑均内置，离线可用。字体：Noto Sans SC 与 Space Grotesk，采用SIL OFL授权。": "Data, fonts and charts are embedded for offline use. Noto Sans SC and Space Grotesk are licensed under the SIL OFL.",
  "四资产相同起投日 · 每类1,812个完整样本": "Identical start dates · 1,812 complete samples per asset",
  "原三资产对照 · 每类1,812个完整样本": "Original three assets · 1,812 complete samples per asset",
  "沪深300 3,890 · 黄金 1,812 · 国债 1,894 · 纳指 1,862 个样本": "Samples: CSI 300 3,890 · Gold 1,812 · Treasury 1,894 · Nasdaq 1,862",
  "纳斯达克100ETF": "Nasdaq-100 ETF",
  "沪深300全收益": "CSI 300 Total Return",
  "5年国债ETF": "5Y Treasury ETF",
  "黄金ETF": "Gold ETF",
  "累计投入": "Contributions",
  "历史亏损比例": "Historical loss frequency",
  "最差单一样本": "Worst observation",
  "5%分位数": "5th percentile",
  "最差5%样本平均收益": "Worst 5% mean return",
  "收益率中位数": "Median return",
  "统计指标": "Statistic",
  "中位数 / P50": "Median / P50",
  "标准差（百分点）": "Std. dev. (pp)",
  "25%分位数": "25th percentile",
  "75%分位数": "75th percentile",
  "95%分位数": "95th percentile",
  "正收益比例": "Positive-return share",
  "亏损比例": "Loss frequency",
  "零收益比例": "Zero-return share",
  "最差5%均值": "Worst 5% mean",
  "最小值": "Minimum",
  "最大值": "Maximum",
  "样本数": "Sample count",
  "均值": "Mean",
  "此起点尚无可用ETF交易数据": "No ETF trading data at this start",
  "最早起投：": "First available start: ",
  "5年累计收益": "5-year cumulative return",
  "回放期间累计收益": "Return up to playback date",
  "最终估值日": "Final valuation date",
  "完整投入次数": "Total contributions",
  "完整总投入": "Total invested",
  "回放进度": "Playback progress",
  "完整5年": "Full five years",
  "持有期回放": "Holding-period replay",
  "5年结束时": "At the five-year endpoint",
  "当前回放时点": "At the playback date",
  "的累计收益领先，为": " leads with a cumulative return of ",
  "此起点只有": "Only ",
  "具有可用数据；": " has available data at this start; ",
  "收益为": " return is ",
  "当前第 ": "Rank ",
  " 名": " ",
  "总投入": "Total invested",
  "投入 ": "Invested ",
  "盈亏 ": "P/L ",
  "市值": "Market value",
  "起投日": "Start date",
  "数据截至2025-12-31": "Data through 2025-12-31",
  "原数据2026-11-24 · 纳指2026-11-25": "Original data: 2026-11-24 · Nasdaq: 2026-11-25",
  "每次投入 ¥50 · 连续5年 · 历史起投日频率不代表未来概率": "RMB 50 per contribution · Five years · Historical frequencies are not future probabilities",
  "动态背景：开": "Motion: on",
  "动态背景：关": "Motion: off",
  "个起投日": " start dates",
  "个完整样本": " complete observations",
  "个样本": " observations",
  "不高于": "at or below",
  "收益不高于 ": "Return at or below ",
  " 的比例": ": share of observations",
  "累计收益率": "Cumulative return",
  "点击查看": "Click to explore",
  "收益中位数": "Median return",
  "起投 ·": "starts ·",
  "无样本": "No samples",
  "起投": "start",
  "范围": "Window",
  "指标": "Metric",
  "定投统计": "DCA statistics",
  "至 ": "to ",
  "中证指数": "CSI Index",
  "每个标的交易日收盘投入50元，允许小数份额；累计收益率=期末市值÷总投入−1，未年化。": "Invest RMB 50 at each asset’s trading-day close, allowing fractional units. Cumulative return = terminal value / contributions − 1; not annualized.",
  "包含起投日，不含最终估值日的投入。五周年遇非交易日向前取该标的最近交易日；停牌日不投入。": "Include the start-day contribution, exclude the final valuation-day contribution. If the fifth anniversary is not a trading day, use the previous available trading close; no investment during trading suspensions.",
  "沪深300使用全收益指数H00300，自2004-12-31起，包含回溯历史；黄金采用华安黄金ETF 518880；国债采用国泰5年期国债ETF 511010。": "CSI 300 uses total-return index H00300 from 2004-12-31, including backfilled index history. Gold: HuaAn Gold ETF 518880. Treasuries: Guotai 5Y Treasury ETF 511010.",
  "纳指采用人民币交易的国泰纳斯达克100 QDII ETF 513100，自2013-05-15上市日起。人民币场内价格反映汇率、基金跟踪和场内溢价变化。": "Nasdaq uses RMB-traded Guotai Nasdaq-100 QDII ETF 513100 from its listing on 2013-05-15. Market prices include exchange-rate, tracking and market-premium effects.",
  "513100在2022-01-13按1:5拆分并停牌，当日不投入；拆分后价格乘5构建连续序列。数据中的后复权价格与该处理逐日一致，截至2025年底未发现现金分红。": "ETF 513100 split 1:5 and suspended trading on 2022-01-13. No purchase is made that day. Post-split prices are multiplied by five. The adjusted feed matches this reconstruction daily; no cash distributions were found through 2025.",
  "国债现金分红按除息日收盘即时再投资，忽略到账等待。忽略交易费用、价差；基金内部费用已反映在价格中。": "Treasury distributions are reinvested at the ex-date close, ignoring payment delay. Trading fees and spreads are ignored; internal fund expenses remain reflected in prices.",
  "四资产共同起投区间仍为2013-07-29至2020-12-31，每类1812个样本。原三资产对照仅显示原有三类资产，结果保持不变。": "The four-asset common window remains 2013-07-29 to 2020-12-31, with 1,812 observations per asset. The original three-asset comparison retains the previous results.",
  "相邻样本高度重叠，不是独立观察；历史亏损比例不代表未来概率。分布统计始终基于完整5年，回放卡片反映当前持有时点。": "Adjacent observations overlap heavily and are not independent. Historical loss frequencies do not predict future probabilities. Distributions always use full five-year outcomes; playback cards use the current holding date.",
  "回放在停牌日以前收盘价估值，不投入。若最终估值日不同，各卡片注明各自日期。最差5%均值取最低向上取整5%样本，标准差采用总体口径。": "On suspended sessions, playback carries the prior close without purchasing. Cards show individual terminal dates if they differ. Tail mean uses the worst ceil(N × 5%) observations; standard deviation uses the population convention.",
  "版本v1.0冻结保存；本版v2.0新增第四资产、双语和动态背景。本地Git记录源文件、数据和发布文件，未上传至远程服务。": "Version 1.0 is frozen. Version 2.0 adds a fourth asset, bilingual presentation and ambient motion. Local Git tracks sources, data and releases; nothing is uploaded to a remote service.",
  "数据来源：中证指数、腾讯行情、东方财富基金事件记录。纳指上市与拆分经基金管理人公告核实；截至2025-12-31，新增数据于2026-11-25下载。": "Sources: CSI Index, Tencent market prices and Eastmoney fund-event records. Nasdaq listing and split dates were checked against fund-manager announcements. Coverage ends 2025-12-31; new data was downloaded on 2026-11-25.",
  "样本范围": "Sample window",
  "数据视图": "Data views",
  "五年期间各资产市值与累计投入曲线": "Asset values and contributions over five years",
  "收益率直方图": "Return histogram",
  "三类资产累计收益率分布": "Asset cumulative return distributions",
  "中位数": "Median",
  "四资产共同起投区间仍为2013-07-29至2020-12-31，每类1812个样本。原三资产结果保持不变。": "The common window remains 2013-07-29 to 2020-12-31 with 1,812 observations per asset. The original asset results are unchanged.",
  "版本v1.0及v2.0冻结保存；本版v2.1优化字号、间距和对齐。本地Git记录源文件、数据和发布文件，未上传至远程服务。": "Versions 1.0 and 2.0 are archived. Version 2.1 improves typography, spacing and alignment. Sources, data and releases are versioned in Git.",
  "版本v1.0及v2.0冻结保存；本版v2.1优化字号、间距和对齐。Git记录源文件、数据和发布文件，并同步至私有GitHub仓库。": "Versions 1.0 and 2.0 are archived. Version 2.1 improves typography, spacing and alignment. Sources, data and releases are versioned in Git and synced to a private GitHub repository.",
  "版本v1.0、v2.0及v2.1冻结保存；本版v3.0采用Neumorphism。Git记录源文件、数据和发布文件，并同步至私有GitHub仓库。": "Versions 1.0, 2.0 and 2.1 are archived. Version 3.0 introduces Neumorphism. Sources, data and releases are versioned in Git and synced to a private GitHub repository.",
  "四类资产累计收益率分布": "Cumulative return distributions for four assets",
  "收益点阵": "Return swarm",
  "每个点都是一个真实样本。横轴为5年累计收益，纵向仅用于排开重叠。": "Every dot is a real start date. X shows the five-year return; vertical position only prevents overlap.",
  "点阵资产": "Swarm asset",
  "↻ 重播入场": "↻ Replay dots",
  "每个点代表一个起投日的收益分布": "Five-year return swarm with one dot per start date",
  "● 红点为亏损样本": "● Red dots: losing observations",
  "收益门槛扫描仪": "Return threshold scanner",
  "设定收益门槛，比较各资产“不高于该收益”的历史样本比例。": "Choose a return threshold to compare the share of historical observations at or below it.",
  "▶ 自动扫描": "▶ Auto scan",
  "Ⅱ 暂停扫描": "Ⅱ Pause scan",
  "收益门槛百分数": "Return threshold, percent",
  "调整收益门槛": "Adjust return threshold",
  "收益门槛": "Return threshold",
  "0% 保本线": "0% break-even",
  "精确输入": "Exact input",
  "向右拖动，提高收益门槛": "Drag right to increase the return threshold",
  "仪表显示样本比例，不是收益率。0%门槛包含零收益样本；全部数据仍为完整5年结果，历史频率不代表未来概率。": "Gauges show sample shares, not returns. A 0% threshold includes zero-return samples. All observations cover five full years; historical frequencies are not future probabilities.",
  "不高于门槛": "At or below threshold",
  "高于门槛 ": "Above threshold ",
  "旧版冻结保存；本版v3.1增加收益点阵和收益门槛扫描仪，保留全部样本和计算口径。": "Earlier releases are archived. Version 3.1 adds a real-sample return swarm and threshold scanner. All observations and calculation rules are preserved.",
  "重播开场": "Replay opening",
  "定投实验室开场": "DCA Lab opening",
  "跳过开场 ↗": "Skip opening ↗",
  "每天50元，连续5年。": "RMB 50 each trading day. Five years.",
  "旧版冻结保存；本版v3.3.1增加收益点阵和收益门槛扫描仪，保留全部样本和计算口径。": "Earlier releases are archived. Version 3.2 adds an original brand icon and a short opening transition. All data and calculation rules are preserved.",
  "旧版冻结保存；本版v3.3.1增加专属图标和开场过渡，保留全部样本和计算口径。": "Earlier releases are archived. Version 3.2 adds an original brand icon and a short opening transition. All data and calculation rules are preserved.",
  "旧版冻结保存；本版v3.3.1采用收细圆环的新图标和动态线场背景，保留全部样本和计算口径。": "Earlier releases are archived. Version 3.3 adds the refined A2 identity and a quiet animated line field. All data and calculation rules are preserved.",
  "恒生ETF": "Hang Seng ETF",
  "五种资产，选择四种一起看。": "Five assets. Choose four to compare.",
  "暂不展示": "Leave out",
  "选择暂不展示的资产": "Choose the asset to leave out",
  "所选四资产相同起投日 · 每类": "Same start dates for the selected four · Each has ",
  "所选资产最差起点": "Selected asset: worst start",
  "所选资产最好起点": "Selected asset: best start",
  "从沪深300、黄金、国债、纳指和恒生中，选择四种资产一起比较。": "Compare four assets chosen from CSI 300, gold, Treasuries, Nasdaq and Hang Seng.",
  "极端起点按收益分布页所选资产与当前样本范围选择。": "Extremes use the asset selected on the distribution tab and the current sample scope.",
  "数据截至2026-10-31 · 更新于2026-11-25": "Data through 2026-10-31 · Updated 2026-11-25",
  "起投截止为2021-10-31；该日为周日，最后可选交易日起点为2021-10-29。行情覆盖至2026-10-31，最后交易日为2026-10-30；每个样本均持有完整5年。": "Start cutoff: 2021-10-31 (Sunday); last selectable start: 2021-10-29. Data cutoff: 2026-10-31; last trading day: 2026-10-30. Every observation spans five full years.",
  "纳指采用人民币交易的国泰纳斯达克100 QDII ETF 513100，自2013-05-15上市日起；2022-01-13按1:5拆分并停牌，当日不投入。拆分后价格乘5构建连续序列。": "Nasdaq: RMB-traded Guotai Nasdaq-100 QDII ETF 513100, listed 2013-05-15. A 1:5 split and trading suspension occurred on 2022-01-13; no contribution that day. Multiply subsequent prices by five for continuity.",
  "恒生采用人民币交易的华夏恒生ETF 159920，自2012-10-22上市日起。2018-06-22每份分红0.076元，按除息日收盘即时再投资；场内价格反映汇率、跟踪误差和溢价。": "Hang Seng: RMB-traded ChinaAMC Hang Seng ETF 159920, listed 2012-10-22. The RMB 0.076 per-unit dividend on 2018-06-22 is reinvested at the ex-date close. Exchange prices include currency, tracking and premium effects.",
  "国债ETF现金分红均按除息日收盘即时再投资。2026年新增每份分红：3月25日0.5715元、6月25日0.8144元、9月18日0.6204元。忽略到账等待、交易费用和价差；基金内部费用已反映在价格中。": "Treasury ETF dividends are reinvested at each ex-date close. Added 2026 distributions per unit: RMB 0.5715 on March 25, 0.8144 on June 25 and 0.6204 on September 18. Ignore payment delays, fees and spreads; fund expenses are reflected in prices.",
  "每次展示所选的四种资产。共同区间取这四种资产实际可用起投日的交集；各自全部历史分别保留其全部样本，时间滑轨取起投日并集。切换资产后重新统计。": "Four selected assets are shown at a time. Common scope uses their actual start-date intersection. Full-history scope keeps all samples per asset and uses the start-date union for the slider. Changing assets recalculates the statistics.",
  "相邻样本高度重叠，不是独立观察；历史亏损比例不代表未来概率。分布统计基于完整5年，回放卡片反映当前持有时点。最差5%均值取最低向上取整5%样本，标准差采用总体口径。": "Adjacent samples overlap heavily and are not independent. Historical loss frequencies are not future probabilities. Distributions use complete five-year results; playback cards show the current holding stage. Worst-5% mean uses the lowest ceil(N × 5%) observations; standard deviation uses the population definition.",
  "数据来源：中证指数官方接口、腾讯公开行情、基金管理人分红及上市公告。数据于2026-11-25下载。旧版冻结保存，本版v3.8新增恒生资产、四选五、截止日期延长及鼠标和开场动效。": "Sources: CSI official API, Tencent market prices, and fund-manager distribution and listing announcements. Downloaded 2026-11-25. Earlier versions are archived. Version 3.4 adds Hang Seng, four-of-five selection, extended dates and new pointer/opening effects.",
  "每天50元，连续5年。穿越不同起点，从沪深300、黄金、国债、纳指和恒生中，选择四种资产一起比较。": "RMB 50 each trading day, for five years. Compare four of CSI 300, gold, Treasuries, Nasdaq and Hang Seng across historical start dates.",
  "起投截止 2021.10.31 · 估值覆盖至 2026.10.31": "Start cutoff 2021.10.31 · Valuation data through 2026.10.31",
  "10年国债ETF": "10Y Treasury ETF",
  "标普500ETF": "S&P 500 ETF",
  "七种资产，自选四种比较。": "Seven assets. Choose four to compare.",
  "勾选四种后，点击“更新对比”；共同区间会按所选资产重新计算。": "Choose four, then update the comparison. The common window is recalculated for your selection.",
  "更新对比 ↗": "Update comparison ↗",
  "已选 ": "Selected ",
  "每天50元，连续5年。穿越不同起点，从七种资产中选择四种，比较每个起投日对应的完整五年结果。": "RMB 50 each trading day, for five years. Choose four of seven assets and compare complete five-year outcomes across historical start dates.",
  "设定目标收益，查看各资产“达到或超过该收益”的历史样本比例。": "Set a target return and see the share of observations meeting or exceeding it.",
  "达到或超过门槛": "At or above target",
  "未达门槛 ": "Below target ",
  "仪表显示达标样本比例：收益率 ≥ 门槛，等于门槛也算达标；0%包含零收益样本。全部数据为完整5年结果，历史频率不代表未来概率。": "Gauges show the share with return ≥ target, including exact matches. The 0% target includes zero returns. Every result spans five full years; historical frequencies are not future probabilities.",
  "10年国债采用人民币交易的国泰上证10年期国债ETF 511260，自2017-08-24上市日起。按场内收盘价及现金分红除息日再投资计算；选入后共同区间最早从该日起开始。": "10Y Treasuries: RMB-traded Guotai 10Y Treasury ETF 511260, listed 2017-08-24. Exchange closes with ex-date dividend reinvestment. Selecting it moves the common window to 2017-08-24 or later.",
  "标普500采用人民币交易的博时标普500ETF 513500，自2014-01-15上市日起。2022-03-29按1:2拆分并停牌，当日不投入；3月30日起价格乘2构建连续序列。": "S&P 500: RMB-traded Bosera S&P 500 ETF 513500, listed 2014-01-15. A 1:2 split and suspension occurred on 2022-03-29; no contribution that day. Multiply prices from March 30 by two for continuity.",
  "门槛仪表显示达到或超过目标的样本比例，即累计收益率 ≥ 设定门槛。它是历史样本比例，不是未来达标概率。": "The target gauge shows the share with cumulative return ≥ the target. This is a historical frequency, not a future success probability.",
  "七种资产中每次展示所选的四种资产。共同区间取这四种资产实际可用起投日的交集；各自全部历史分别保留其全部样本，时间滑轨取起投日并集。切换资产后重新统计。": "Four of seven selected assets are displayed. Common scope uses their actual start-date intersection. Full-history scope keeps all samples per asset and uses the start-date union. Changing the selection recalculates the statistics.",
  "四资产收益星图": "Four-asset return cloud",
  "三维同时展示所选四种资产；每点一个真实样本。横轴为5年收益，纵轴为起投日期，深度区分资产。": "All four selected assets in 3D, one real sample per dot. X: five-year return. Y: start date. Depth: asset.",
  "三维 · 四资产": "3D · Four assets",
  "二维 · 单资产": "2D · One asset",
  "详情资产": "Detail asset",
  "拖动旋转 · Shift＋滚轮缩放 · 点击样本定位": "Drag to rotate · Shift + wheel to zoom · Click a sample to inspect",
  "复位视角": "Reset view",
  "缩小三维点阵": "Zoom out of the 3D cloud",
  "放大三维点阵": "Zoom into the 3D cloud",
  "四资产三维收益点阵：横轴收益率、纵轴起投日期、深度为资产；方向键旋转，加减键缩放，Home复位": "Four-asset 3D cloud: return, start date and asset. Arrow keys rotate, plus/minus zoom, Home resets.",
  "◉ 当前起点": "◉ Selected start",
  "点的颜色区分资产；红色参考面为零收益。": "Color identifies the asset; the red reference plane marks zero return.",
  "中位数 P50": "Median P50",
  "四资产收益山脊": "Four-asset return ridges",
  "共享收益横轴，四层山脊展示分布形状；每个粒子仍是一个真实起投样本。山高按各资产峰值归一化，不用于比较样本数量。": "Four layered distributions share one return axis. Every particle is a real sample. Heights are normalized to each asset’s peak, not comparable sample counts.",
  "颜色区分资产 · 红线为零收益 · 山高各自归一化": "Asset colours · Red = zero return · Individually normalized heights",
  "按住聚合为粒子球，松开回到真实收益分布。": "Hold to form a particle globe. Release to restore the real return distribution.",
  "◉ 按住聚合": "◉ Hold to morph",
  "真实收益坐标": "Real return coordinates",
  "粒子变形中 · 暂不读取坐标": "Morphing · Coordinate reading paused",
  "四资产收益山脊：横轴收益率，山高为各资产归一化分布，深度区分资产；方向键旋转，加减键缩放，Home复位": "Four-asset return ridges: return on x, individually normalized density on y, asset in depth. Arrow keys rotate, +/- zoom, Home resets.",
  "Ⅱ 暂停环绕": "Ⅱ Pause orbit",
  "▶ 继续环绕": "▶ Resume orbit",
  "自动环绕 · 点击或拖动后暂停 · 复位重新开始": "Auto orbit · Touch to pause · Reset to restart",
  "四资产立体直方图": "Four-asset 3D histogram",
  "X轴为五年累计收益率，Y轴区分资产，Z轴为分箱样本比例；四种资产共享坐标与刻度。默认每1个百分点分箱。": "X: five-year return. Y: asset. Z: sample share per bin. All four assets share the same axes and scale. Default bin width: 1 percentage point.",
  "四资产立体直方图：X轴累计收益率，Y轴资产类别，Z轴样本比例；方向键旋转，加减键缩放，Home复位": "Four-asset 3D histogram: X return, Y asset category, Z sample percentage. Arrow keys rotate, +/- zoom, Home resets.",
  "颜色区分资产 · 红线为零收益 · 共用样本比例刻度": "Asset colours · Red = zero return · Shared sample-share scale",
  "分箱宽度": "Bin width",
  "直方图分箱宽度": "Histogram bin width",
  "0.5 个百分点": "0.5 pp",
  "1 个百分点": "1 pp",
  "2 个百分点": "2 pp",
  "5 个百分点": "5 pp",
  "柱高 = 区间样本数 ÷ 该资产样本总数": "Height = Bin count / Asset sample count",
  "累计收益率（%）": "Cumulative return (%)",
  "资产类别（01—04）": "Asset category (01–04)",
  "样本比例（%）": "Sample share (%)",
  "市场脉搏 ↗": "Market pulse ↗",
  "市场脉搏": "Market pulse",
  "五个市场，最近一个交易日。": "Five markets. Their latest trading sessions.",
  "每60秒自动刷新 · 公开行情可能延迟": "Refresh every 60s · Public quotes may be delayed",
  "部分连接失败 · 显示最近可用行情": "Some connections failed · Last available quotes shown",
  "正在刷新…": "Refreshing…",
  "↻ 刷新行情": "↻ Refresh quotes",
  "关闭市场脉搏": "Close market pulse",
  "涨跌幅以各指数前收盘价为基准。交易日期及行情时间按各市场当地时间展示；休市显示最近交易日。开场与背景只展示行情，不参与定投研究计算。数据来源：腾讯公开行情。": "Changes are relative to the previous close. Session dates and quote timestamps use each market’s local time. Closed markets show their latest session. Background quotes are separate from the DCA research. Source: Tencent public quotes.",
  "行情来源 ↗": "Quote source ↗",
  "4 个百分点": "4 pp",
  "柱高表示该收益区间的样本比例；四条资产通道共享收益率与比例刻度。默认每4个百分点分箱。": "Height shows the sample share in each return interval. Four asset lanes share the return and frequency scales. Default bin width: 4 percentage points.",
  "四资产立体直方图：累计收益率、资产名称、样本比例；方向键旋转，加减键缩放，Home复位": "Four-asset histogram: cumulative return, asset names and sample percentage. Arrow keys rotate, +/- zoom, Home resets.",
  "六个市场，最近一个交易日。": "Six markets. Their latest trading sessions.",
  "点击任意位置进入": "Click anywhere to enter",
  "指数涨跌幅以前收盘价为基准，纽约金以前结算价为基准。指数时间按各市场当地时间，纽约金分时按北京时间展示，跨日以+1标记。休市显示最近交易日。数据来源：腾讯、东方财富公开行情。": "Indices use the previous close; COMEX Gold uses the previous settlement. Index times are local; gold intraday times are Beijing time, with +1 for the next day. Closed markets show the latest session. Sources: Tencent and Eastmoney public quotes."
}
,translationKeys=Object.keys(DICT).sort((a,b)=>b.length-a.length);const pattern=new RegExp(translationKeys.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
function translate(s){if(LANG!=='en')return s;return String(s).replace(pattern,x=>DICT[x]).replace(/(\d+)月/g,'$1').replace(/(\d+) 次/g,'$1 contributions').replace(/。/g,'.').replace(/，/g,', ').replace(/；/g,'; ').replace(/：/g,': ')}
const textMemory=new WeakMap(),attrMemory=new WeakMap();
function applyLanguage(){document.documentElement.lang=LANG==='en'?'en':'zh-CN';document.title=LANG==='en'?'The Long Game · DCA Lab v3.9.1':'时间的复利 · 定投实验室 v3.9.1';$('langBtn').textContent=LANG==='en'?'中文':'EN';let walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=walk.nextNode()){if(n.parentElement.closest('script,style,#langBtn'))continue;let m=textMemory.get(n);if(!m||n.nodeValue!==m.last)m={source:n.nodeValue,last:n.nodeValue};let v=translate(m.source);if(n.nodeValue!==v)n.nodeValue=v;m.last=v;textMemory.set(n,m)}document.querySelectorAll('[title],[aria-label]').forEach(el=>{let m=attrMemory.get(el)||{};for(const k of ['title','aria-label']){if(!el.hasAttribute(k))continue;let current=el.getAttribute(k),a=m[k];if(!a||current!==a.last)a={source:current};let v=translate(a.source);if(current!==v)el.setAttribute(k,v);a.last=v;m[k]=a}attrMemory.set(el,m)})}
let pendingLanguage=false;const observer=new MutationObserver(()=>{if(!pendingLanguage){pendingLanguage=true;requestAnimationFrame(()=>{pendingLanguage=false;applyLanguage()})}});observer.observe(document.body,{subtree:true,childList:true,characterData:true});
$('langBtn').onclick=()=>{LANG=LANG==='en'?'zh':'en';try{localStorage.setItem('dca-language',LANG)}catch{}applyLanguage();if(view==='explore')drawGrowth();if(view==='distribution')drawDistribution()};
let motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;try{let stored=localStorage.getItem('dca-motion');if(stored!==null)motion=stored==='on'}catch{}
function setMotion(){document.body.classList.toggle('motion-off',!motion);$('motionBtn').textContent=motion?'动态背景：开':'动态背景：关';$('motionBtn').setAttribute('aria-pressed',motion);applyLanguage()}
$('motionBtn').onclick=()=>{motion=!motion;try{localStorage.setItem('dca-motion',motion?'on':'off')}catch{}setMotion()};setMotion();applyLanguage();document.fonts.ready.then(()=>{if(view==='explore')drawGrowth();if(view==='distribution')drawDistribution()});

/* Adapted from ElectricLogo by David Haz / React Bits.
 * MIT + Commons Clause; full notices included with this application.
 * https://reactbits.dev/animations/electric-logo */
async function installElectricIntro(){const container=$('electricLogo');if(!container||matchMedia('(prefers-reduced-motion: reduce)').matches)return;try{
 const {Renderer,Program,Mesh,Triangle,Texture}=await import('data:text/javascript;base64,LyogZXNtLnNoIC0gb2dsQDEuMC4xMSAqLw0KZnVuY3Rpb24gb3QoaSl7bGV0IHQ9aVswXSxlPWlbMV0scj1pWzJdO3JldHVybiBNYXRoLnNxcnQodCp0K2UqZStyKnIpfWZ1bmN0aW9uIEx0KGksdCl7cmV0dXJuIGlbMF09dFswXSxpWzFdPXRbMV0saVsyXT10WzJdLGl9ZnVuY3Rpb24gcGkoaSx0LGUscil7cmV0dXJuIGlbMF09dCxpWzFdPWUsaVsyXT1yLGl9ZnVuY3Rpb24gSHQoaSx0LGUpe3JldHVybiBpWzBdPXRbMF0rZVswXSxpWzFdPXRbMV0rZVsxXSxpWzJdPXRbMl0rZVsyXSxpfWZ1bmN0aW9uIFF0KGksdCxlKXtyZXR1cm4gaVswXT10WzBdLWVbMF0saVsxXT10WzFdLWVbMV0saVsyXT10WzJdLWVbMl0saX1mdW5jdGlvbiBkaShpLHQsZSl7cmV0dXJuIGlbMF09dFswXSplWzBdLGlbMV09dFsxXSplWzFdLGlbMl09dFsyXSplWzJdLGl9ZnVuY3Rpb24gbWkoaSx0LGUpe3JldHVybiBpWzBdPXRbMF0vZVswXSxpWzFdPXRbMV0vZVsxXSxpWzJdPXRbMl0vZVsyXSxpfWZ1bmN0aW9uIFB0KGksdCxlKXtyZXR1cm4gaVswXT10WzBdKmUsaVsxXT10WzFdKmUsaVsyXT10WzJdKmUsaX1mdW5jdGlvbiBnaShpLHQpe2xldCBlPXRbMF0taVswXSxyPXRbMV0taVsxXSxzPXRbMl0taVsyXTtyZXR1cm4gTWF0aC5zcXJ0KGUqZStyKnIrcypzKX1mdW5jdGlvbiB4aShpLHQpe2xldCBlPXRbMF0taVswXSxyPXRbMV0taVsxXSxzPXRbMl0taVsyXTtyZXR1cm4gZSplK3IqcitzKnN9ZnVuY3Rpb24gS3QoaSl7bGV0IHQ9aVswXSxlPWlbMV0scj1pWzJdO3JldHVybiB0KnQrZSplK3Iqcn1mdW5jdGlvbiB5aShpLHQpe3JldHVybiBpWzBdPS10WzBdLGlbMV09LXRbMV0saVsyXT0tdFsyXSxpfWZ1bmN0aW9uIHdpKGksdCl7cmV0dXJuIGlbMF09MS90WzBdLGlbMV09MS90WzFdLGlbMl09MS90WzJdLGl9ZnVuY3Rpb24gU3QoaSx0KXtsZXQgZT10WzBdLHI9dFsxXSxzPXRbMl0sbj1lKmUrcipyK3MqcztyZXR1cm4gbj4wJiYobj0xL01hdGguc3FydChuKSksaVswXT10WzBdKm4saVsxXT10WzFdKm4saVsyXT10WzJdKm4saX1mdW5jdGlvbiBadChpLHQpe3JldHVybiBpWzBdKnRbMF0raVsxXSp0WzFdK2lbMl0qdFsyXX1mdW5jdGlvbiAkdChpLHQsZSl7bGV0IHI9dFswXSxzPXRbMV0sbj10WzJdLGE9ZVswXSxoPWVbMV0sbz1lWzJdO3JldHVybiBpWzBdPXMqby1uKmgsaVsxXT1uKmEtcipvLGlbMl09cipoLXMqYSxpfWZ1bmN0aW9uIEN0KGksdCxlLHIpe2xldCBzPXRbMF0sbj10WzFdLGE9dFsyXTtyZXR1cm4gaVswXT1zK3IqKGVbMF0tcyksaVsxXT1uK3IqKGVbMV0tbiksaVsyXT1hK3IqKGVbMl0tYSksaX1mdW5jdGlvbiBNaShpLHQsZSxyLHMpe2xldCBuPU1hdGguZXhwKC1yKnMpLGE9dFswXSxoPXRbMV0sbz10WzJdO3JldHVybiBpWzBdPWVbMF0rKGEtZVswXSkqbixpWzFdPWVbMV0rKGgtZVsxXSkqbixpWzJdPWVbMl0rKG8tZVsyXSkqbixpfWZ1bmN0aW9uIEVpKGksdCxlKXtsZXQgcj10WzBdLHM9dFsxXSxuPXRbMl0sYT1lWzNdKnIrZVs3XSpzK2VbMTFdKm4rZVsxNV07cmV0dXJuIGE9YXx8MSxpWzBdPShlWzBdKnIrZVs0XSpzK2VbOF0qbitlWzEyXSkvYSxpWzFdPShlWzFdKnIrZVs1XSpzK2VbOV0qbitlWzEzXSkvYSxpWzJdPShlWzJdKnIrZVs2XSpzK2VbMTBdKm4rZVsxNF0pL2EsaX1mdW5jdGlvbiBBaShpLHQsZSl7bGV0IHI9dFswXSxzPXRbMV0sbj10WzJdLGE9ZVszXSpyK2VbN10qcytlWzExXSpuK2VbMTVdO3JldHVybiBhPWF8fDEsaVswXT0oZVswXSpyK2VbNF0qcytlWzhdKm4pL2EsaVsxXT0oZVsxXSpyK2VbNV0qcytlWzldKm4pL2EsaVsyXT0oZVsyXSpyK2VbNl0qcytlWzEwXSpuKS9hLGl9ZnVuY3Rpb24gX2koaSx0LGUpe2xldCByPXRbMF0scz10WzFdLG49dFsyXTtyZXR1cm4gaVswXT1yKmVbMF0rcyplWzNdK24qZVs2XSxpWzFdPXIqZVsxXStzKmVbNF0rbiplWzddLGlbMl09ciplWzJdK3MqZVs1XStuKmVbOF0saX1mdW5jdGlvbiB2aShpLHQsZSl7bGV0IHI9dFswXSxzPXRbMV0sbj10WzJdLGE9ZVswXSxoPWVbMV0sbz1lWzJdLGw9ZVszXSxjPWgqbi1vKnMsZj1vKnItYSpuLHA9YSpzLWgqcix1PWgqcC1vKmYsZD1vKmMtYSpwLHg9YSpmLWgqYyxtPWwqMjtyZXR1cm4gYyo9bSxmKj1tLHAqPW0sdSo9MixkKj0yLHgqPTIsaVswXT1yK2MrdSxpWzFdPXMrZitkLGlbMl09bitwK3gsaX12YXIgYmk9ZnVuY3Rpb24oKXtsZXQgaT1bMCwwLDBdLHQ9WzAsMCwwXTtyZXR1cm4gZnVuY3Rpb24oZSxyKXtMdChpLGUpLEx0KHQsciksU3QoaSxpKSxTdCh0LHQpO2xldCBzPVp0KGksdCk7cmV0dXJuIHM+MT8wOnM8LTE/TWF0aC5QSTpNYXRoLmFjb3Mocyl9fSgpO2Z1bmN0aW9uIEZpKGksdCl7cmV0dXJuIGlbMF09PT10WzBdJiZpWzFdPT09dFsxXSYmaVsyXT09PXRbMl19dmFyIEU9Y2xhc3MgaSBleHRlbmRzIEFycmF5e2NvbnN0cnVjdG9yKHQ9MCxlPXQscj10KXtyZXR1cm4gc3VwZXIodCxlLHIpLHRoaXN9Z2V0IHgoKXtyZXR1cm4gdGhpc1swXX1nZXQgeSgpe3JldHVybiB0aGlzWzFdfWdldCB6KCl7cmV0dXJuIHRoaXNbMl19c2V0IHgodCl7dGhpc1swXT10fXNldCB5KHQpe3RoaXNbMV09dH1zZXQgeih0KXt0aGlzWzJdPXR9c2V0KHQsZT10LHI9dCl7cmV0dXJuIHQubGVuZ3RoP3RoaXMuY29weSh0KToocGkodGhpcyx0LGUsciksdGhpcyl9Y29weSh0KXtyZXR1cm4gTHQodGhpcyx0KSx0aGlzfWFkZCh0LGUpe3JldHVybiBlP0h0KHRoaXMsdCxlKTpIdCh0aGlzLHRoaXMsdCksdGhpc31zdWIodCxlKXtyZXR1cm4gZT9RdCh0aGlzLHQsZSk6UXQodGhpcyx0aGlzLHQpLHRoaXN9bXVsdGlwbHkodCl7cmV0dXJuIHQubGVuZ3RoP2RpKHRoaXMsdGhpcyx0KTpQdCh0aGlzLHRoaXMsdCksdGhpc31kaXZpZGUodCl7cmV0dXJuIHQubGVuZ3RoP21pKHRoaXMsdGhpcyx0KTpQdCh0aGlzLHRoaXMsMS90KSx0aGlzfWludmVyc2UodD10aGlzKXtyZXR1cm4gd2kodGhpcyx0KSx0aGlzfWxlbigpe3JldHVybiBvdCh0aGlzKX1kaXN0YW5jZSh0KXtyZXR1cm4gdD9naSh0aGlzLHQpOm90KHRoaXMpfXNxdWFyZWRMZW4oKXtyZXR1cm4gS3QodGhpcyl9c3F1YXJlZERpc3RhbmNlKHQpe3JldHVybiB0P3hpKHRoaXMsdCk6S3QodGhpcyl9bmVnYXRlKHQ9dGhpcyl7cmV0dXJuIHlpKHRoaXMsdCksdGhpc31jcm9zcyh0LGUpe3JldHVybiBlPyR0KHRoaXMsdCxlKTokdCh0aGlzLHRoaXMsdCksdGhpc31zY2FsZSh0KXtyZXR1cm4gUHQodGhpcyx0aGlzLHQpLHRoaXN9bm9ybWFsaXplKCl7cmV0dXJuIFN0KHRoaXMsdGhpcyksdGhpc31kb3QodCl7cmV0dXJuIFp0KHRoaXMsdCl9ZXF1YWxzKHQpe3JldHVybiBGaSh0aGlzLHQpfWFwcGx5TWF0cml4Myh0KXtyZXR1cm4gX2kodGhpcyx0aGlzLHQpLHRoaXN9YXBwbHlNYXRyaXg0KHQpe3JldHVybiBFaSh0aGlzLHRoaXMsdCksdGhpc31zY2FsZVJvdGF0ZU1hdHJpeDQodCl7cmV0dXJuIEFpKHRoaXMsdGhpcyx0KSx0aGlzfWFwcGx5UXVhdGVybmlvbih0KXtyZXR1cm4gdmkodGhpcyx0aGlzLHQpLHRoaXN9YW5nbGUodCl7cmV0dXJuIGJpKHRoaXMsdCl9bGVycCh0LGUpe3JldHVybiBDdCh0aGlzLHRoaXMsdCxlKSx0aGlzfXNtb290aExlcnAodCxlLHIpe3JldHVybiBNaSh0aGlzLHRoaXMsdCxlLHIpLHRoaXN9Y2xvbmUoKXtyZXR1cm4gbmV3IGkodGhpc1swXSx0aGlzWzFdLHRoaXNbMl0pfWZyb21BcnJheSh0LGU9MCl7cmV0dXJuIHRoaXNbMF09dFtlXSx0aGlzWzFdPXRbZSsxXSx0aGlzWzJdPXRbZSsyXSx0aGlzfXRvQXJyYXkodD1bXSxlPTApe3JldHVybiB0W2VdPXRoaXNbMF0sdFtlKzFdPXRoaXNbMV0sdFtlKzJdPXRoaXNbMl0sdH10cmFuc2Zvcm1EaXJlY3Rpb24odCl7bGV0IGU9dGhpc1swXSxyPXRoaXNbMV0scz10aGlzWzJdO3JldHVybiB0aGlzWzBdPXRbMF0qZSt0WzRdKnIrdFs4XSpzLHRoaXNbMV09dFsxXSplK3RbNV0qcit0WzldKnMsdGhpc1syXT10WzJdKmUrdFs2XSpyK3RbMTBdKnMsdGhpcy5ub3JtYWxpemUoKX19O3ZhciBSaT1uZXcgRSxtcz0xLGdzPTEsemk9ITEsTz1jbGFzc3tjb25zdHJ1Y3Rvcih0LGU9e30pe3QuY2FudmFzfHxjb25zb2xlLmVycm9yKCJnbCBub3QgcGFzc2VkIGFzIGZpcnN0IGFyZ3VtZW50IHRvIEdlb21ldHJ5IiksdGhpcy5nbD10LHRoaXMuYXR0cmlidXRlcz1lLHRoaXMuaWQ9bXMrKyx0aGlzLlZBT3M9e30sdGhpcy5kcmF3UmFuZ2U9e3N0YXJ0OjAsY291bnQ6MH0sdGhpcy5pbnN0YW5jZWRDb3VudD0wLHRoaXMuZ2wucmVuZGVyZXIuYmluZFZlcnRleEFycmF5KG51bGwpLHRoaXMuZ2wucmVuZGVyZXIuY3VycmVudEdlb21ldHJ5PW51bGwsdGhpcy5nbFN0YXRlPXRoaXMuZ2wucmVuZGVyZXIuc3RhdGU7Zm9yKGxldCByIGluIGUpdGhpcy5hZGRBdHRyaWJ1dGUocixlW3JdKX1hZGRBdHRyaWJ1dGUodCxlKXtpZih0aGlzLmF0dHJpYnV0ZXNbdF09ZSxlLmlkPWdzKyssZS5zaXplPWUuc2l6ZXx8MSxlLnR5cGU9ZS50eXBlfHwoZS5kYXRhLmNvbnN0cnVjdG9yPT09RmxvYXQzMkFycmF5P3RoaXMuZ2wuRkxPQVQ6ZS5kYXRhLmNvbnN0cnVjdG9yPT09VWludDE2QXJyYXk/dGhpcy5nbC5VTlNJR05FRF9TSE9SVDp0aGlzLmdsLlVOU0lHTkVEX0lOVCksZS50YXJnZXQ9dD09PSJpbmRleCI/dGhpcy5nbC5FTEVNRU5UX0FSUkFZX0JVRkZFUjp0aGlzLmdsLkFSUkFZX0JVRkZFUixlLm5vcm1hbGl6ZWQ9ZS5ub3JtYWxpemVkfHwhMSxlLnN0cmlkZT1lLnN0cmlkZXx8MCxlLm9mZnNldD1lLm9mZnNldHx8MCxlLmNvdW50PWUuY291bnR8fChlLnN0cmlkZT9lLmRhdGEuYnl0ZUxlbmd0aC9lLnN0cmlkZTplLmRhdGEubGVuZ3RoL2Uuc2l6ZSksZS5kaXZpc29yPWUuaW5zdGFuY2VkfHwwLGUubmVlZHNVcGRhdGU9ITEsZS51c2FnZT1lLnVzYWdlfHx0aGlzLmdsLlNUQVRJQ19EUkFXLGUuYnVmZmVyfHx0aGlzLnVwZGF0ZUF0dHJpYnV0ZShlKSxlLmRpdmlzb3Ipe2lmKHRoaXMuaXNJbnN0YW5jZWQ9ITAsdGhpcy5pbnN0YW5jZWRDb3VudCYmdGhpcy5pbnN0YW5jZWRDb3VudCE9PWUuY291bnQqZS5kaXZpc29yKXJldHVybiBjb25zb2xlLndhcm4oImdlb21ldHJ5IGhhcyBtdWx0aXBsZSBpbnN0YW5jZWQgYnVmZmVycyBvZiBkaWZmZXJlbnQgbGVuZ3RoIiksdGhpcy5pbnN0YW5jZWRDb3VudD1NYXRoLm1pbih0aGlzLmluc3RhbmNlZENvdW50LGUuY291bnQqZS5kaXZpc29yKTt0aGlzLmluc3RhbmNlZENvdW50PWUuY291bnQqZS5kaXZpc29yfWVsc2UgdD09PSJpbmRleCI/dGhpcy5kcmF3UmFuZ2UuY291bnQ9ZS5jb3VudDp0aGlzLmF0dHJpYnV0ZXMuaW5kZXh8fCh0aGlzLmRyYXdSYW5nZS5jb3VudD1NYXRoLm1heCh0aGlzLmRyYXdSYW5nZS5jb3VudCxlLmNvdW50KSl9dXBkYXRlQXR0cmlidXRlKHQpe2xldCBlPSF0LmJ1ZmZlcjtlJiYodC5idWZmZXI9dGhpcy5nbC5jcmVhdGVCdWZmZXIoKSksdGhpcy5nbFN0YXRlLmJvdW5kQnVmZmVyIT09dC5idWZmZXImJih0aGlzLmdsLmJpbmRCdWZmZXIodC50YXJnZXQsdC5idWZmZXIpLHRoaXMuZ2xTdGF0ZS5ib3VuZEJ1ZmZlcj10LmJ1ZmZlciksZT90aGlzLmdsLmJ1ZmZlckRhdGEodC50YXJnZXQsdC5kYXRhLHQudXNhZ2UpOnRoaXMuZ2wuYnVmZmVyU3ViRGF0YSh0LnRhcmdldCwwLHQuZGF0YSksdC5uZWVkc1VwZGF0ZT0hMX1zZXRJbmRleCh0KXt0aGlzLmFkZEF0dHJpYnV0ZSgiaW5kZXgiLHQpfXNldERyYXdSYW5nZSh0LGUpe3RoaXMuZHJhd1JhbmdlLnN0YXJ0PXQsdGhpcy5kcmF3UmFuZ2UuY291bnQ9ZX1zZXRJbnN0YW5jZWRDb3VudCh0KXt0aGlzLmluc3RhbmNlZENvdW50PXR9Y3JlYXRlVkFPKHQpe3RoaXMuVkFPc1t0LmF0dHJpYnV0ZU9yZGVyXT10aGlzLmdsLnJlbmRlcmVyLmNyZWF0ZVZlcnRleEFycmF5KCksdGhpcy5nbC5yZW5kZXJlci5iaW5kVmVydGV4QXJyYXkodGhpcy5WQU9zW3QuYXR0cmlidXRlT3JkZXJdKSx0aGlzLmJpbmRBdHRyaWJ1dGVzKHQpfWJpbmRBdHRyaWJ1dGVzKHQpe3QuYXR0cmlidXRlTG9jYXRpb25zLmZvckVhY2goKGUse25hbWU6cix0eXBlOnN9KT0+e2lmKCF0aGlzLmF0dHJpYnV0ZXNbcl0pe2NvbnNvbGUud2FybihgYWN0aXZlIGF0dHJpYnV0ZSAke3J9IG5vdCBiZWluZyBzdXBwbGllZGApO3JldHVybn1sZXQgbj10aGlzLmF0dHJpYnV0ZXNbcl07dGhpcy5nbC5iaW5kQnVmZmVyKG4udGFyZ2V0LG4uYnVmZmVyKSx0aGlzLmdsU3RhdGUuYm91bmRCdWZmZXI9bi5idWZmZXI7bGV0IGE9MTtzPT09MzU2NzQmJihhPTIpLHM9PT0zNTY3NSYmKGE9Mykscz09PTM1Njc2JiYoYT00KTtsZXQgaD1uLnNpemUvYSxvPWE9PT0xPzA6YSphKjQsbD1hPT09MT8wOmEqNDtmb3IobGV0IGM9MDtjPGE7YysrKXRoaXMuZ2wudmVydGV4QXR0cmliUG9pbnRlcihlK2MsaCxuLnR5cGUsbi5ub3JtYWxpemVkLG4uc3RyaWRlK28sbi5vZmZzZXQrYypsKSx0aGlzLmdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KGUrYyksdGhpcy5nbC5yZW5kZXJlci52ZXJ0ZXhBdHRyaWJEaXZpc29yKGUrYyxuLmRpdmlzb3IpfSksdGhpcy5hdHRyaWJ1dGVzLmluZGV4JiZ0aGlzLmdsLmJpbmRCdWZmZXIodGhpcy5nbC5FTEVNRU5UX0FSUkFZX0JVRkZFUix0aGlzLmF0dHJpYnV0ZXMuaW5kZXguYnVmZmVyKX1kcmF3KHtwcm9ncmFtOnQsbW9kZTplPXRoaXMuZ2wuVFJJQU5HTEVTfSl7dGhpcy5nbC5yZW5kZXJlci5jdXJyZW50R2VvbWV0cnkhPT1gJHt0aGlzLmlkfV8ke3QuYXR0cmlidXRlT3JkZXJ9YCYmKHRoaXMuVkFPc1t0LmF0dHJpYnV0ZU9yZGVyXXx8dGhpcy5jcmVhdGVWQU8odCksdGhpcy5nbC5yZW5kZXJlci5iaW5kVmVydGV4QXJyYXkodGhpcy5WQU9zW3QuYXR0cmlidXRlT3JkZXJdKSx0aGlzLmdsLnJlbmRlcmVyLmN1cnJlbnRHZW9tZXRyeT1gJHt0aGlzLmlkfV8ke3QuYXR0cmlidXRlT3JkZXJ9YCksdC5hdHRyaWJ1dGVMb2NhdGlvbnMuZm9yRWFjaCgocyx7bmFtZTpufSk9PntsZXQgYT10aGlzLmF0dHJpYnV0ZXNbbl07YS5uZWVkc1VwZGF0ZSYmdGhpcy51cGRhdGVBdHRyaWJ1dGUoYSl9KTtsZXQgcj0yO3RoaXMuYXR0cmlidXRlcy5pbmRleD8udHlwZT09PXRoaXMuZ2wuVU5TSUdORURfSU5UJiYocj00KSx0aGlzLmlzSW5zdGFuY2VkP3RoaXMuYXR0cmlidXRlcy5pbmRleD90aGlzLmdsLnJlbmRlcmVyLmRyYXdFbGVtZW50c0luc3RhbmNlZChlLHRoaXMuZHJhd1JhbmdlLmNvdW50LHRoaXMuYXR0cmlidXRlcy5pbmRleC50eXBlLHRoaXMuYXR0cmlidXRlcy5pbmRleC5vZmZzZXQrdGhpcy5kcmF3UmFuZ2Uuc3RhcnQqcix0aGlzLmluc3RhbmNlZENvdW50KTp0aGlzLmdsLnJlbmRlcmVyLmRyYXdBcnJheXNJbnN0YW5jZWQoZSx0aGlzLmRyYXdSYW5nZS5zdGFydCx0aGlzLmRyYXdSYW5nZS5jb3VudCx0aGlzLmluc3RhbmNlZENvdW50KTp0aGlzLmF0dHJpYnV0ZXMuaW5kZXg/dGhpcy5nbC5kcmF3RWxlbWVudHMoZSx0aGlzLmRyYXdSYW5nZS5jb3VudCx0aGlzLmF0dHJpYnV0ZXMuaW5kZXgudHlwZSx0aGlzLmF0dHJpYnV0ZXMuaW5kZXgub2Zmc2V0K3RoaXMuZHJhd1JhbmdlLnN0YXJ0KnIpOnRoaXMuZ2wuZHJhd0FycmF5cyhlLHRoaXMuZHJhd1JhbmdlLnN0YXJ0LHRoaXMuZHJhd1JhbmdlLmNvdW50KX1nZXRQb3NpdGlvbigpe2xldCB0PXRoaXMuYXR0cmlidXRlcy5wb3NpdGlvbjtpZih0LmRhdGEpcmV0dXJuIHQ7aWYoIXppKXJldHVybiBjb25zb2xlLndhcm4oIk5vIHBvc2l0aW9uIGJ1ZmZlciBkYXRhIGZvdW5kIHRvIGNvbXB1dGUgYm91bmRzIiksemk9ITB9Y29tcHV0ZUJvdW5kaW5nQm94KHQpe3R8fCh0PXRoaXMuZ2V0UG9zaXRpb24oKSk7bGV0IGU9dC5kYXRhLHI9dC5zaXplO3RoaXMuYm91bmRzfHwodGhpcy5ib3VuZHM9e21pbjpuZXcgRSxtYXg6bmV3IEUsY2VudGVyOm5ldyBFLHNjYWxlOm5ldyBFLHJhZGl1czoxLzB9KTtsZXQgcz10aGlzLmJvdW5kcy5taW4sbj10aGlzLmJvdW5kcy5tYXgsYT10aGlzLmJvdW5kcy5jZW50ZXIsaD10aGlzLmJvdW5kcy5zY2FsZTtzLnNldCgxLzApLG4uc2V0KC0xLzApO2ZvcihsZXQgbz0wLGw9ZS5sZW5ndGg7bzxsO28rPXIpe2xldCBjPWVbb10sZj1lW28rMV0scD1lW28rMl07cy54PU1hdGgubWluKGMscy54KSxzLnk9TWF0aC5taW4oZixzLnkpLHMuej1NYXRoLm1pbihwLHMueiksbi54PU1hdGgubWF4KGMsbi54KSxuLnk9TWF0aC5tYXgoZixuLnkpLG4uej1NYXRoLm1heChwLG4ueil9aC5zdWIobixzKSxhLmFkZChzLG4pLmRpdmlkZSgyKX1jb21wdXRlQm91bmRpbmdTcGhlcmUodCl7dHx8KHQ9dGhpcy5nZXRQb3NpdGlvbigpKTtsZXQgZT10LmRhdGEscj10LnNpemU7dGhpcy5ib3VuZHN8fHRoaXMuY29tcHV0ZUJvdW5kaW5nQm94KHQpO2xldCBzPTA7Zm9yKGxldCBuPTAsYT1lLmxlbmd0aDtuPGE7bis9cilSaS5mcm9tQXJyYXkoZSxuKSxzPU1hdGgubWF4KHMsdGhpcy5ib3VuZHMuY2VudGVyLnNxdWFyZWREaXN0YW5jZShSaSkpO3RoaXMuYm91bmRzLnJhZGl1cz1NYXRoLnNxcnQocyl9cmVtb3ZlKCl7Zm9yKGxldCB0IGluIHRoaXMuVkFPcyl0aGlzLmdsLnJlbmRlcmVyLmRlbGV0ZVZlcnRleEFycmF5KHRoaXMuVkFPc1t0XSksZGVsZXRlIHRoaXMuVkFPc1t0XTtmb3IobGV0IHQgaW4gdGhpcy5hdHRyaWJ1dGVzKXRoaXMuZ2wuZGVsZXRlQnVmZmVyKHRoaXMuYXR0cmlidXRlc1t0XS5idWZmZXIpLGRlbGV0ZSB0aGlzLmF0dHJpYnV0ZXNbdF19fTt2YXIgeHM9MSxMaT17fSxVPWNsYXNze2NvbnN0cnVjdG9yKHQse3ZlcnRleDplLGZyYWdtZW50OnIsdW5pZm9ybXM6cz17fSx0cmFuc3BhcmVudDpuPSExLGN1bGxGYWNlOmE9dC5CQUNLLGZyb250RmFjZTpoPXQuQ0NXLGRlcHRoVGVzdDpvPSEwLGRlcHRoV3JpdGU6bD0hMCxkZXB0aEZ1bmM6Yz10LkxFUVVBTH09e30pe3QuY2FudmFzfHxjb25zb2xlLmVycm9yKCJnbCBub3QgcGFzc2VkIGFzIGZpcnN0IGFyZ3VtZW50IHRvIFByb2dyYW0iKSx0aGlzLmdsPXQsdGhpcy51bmlmb3Jtcz1zLHRoaXMuaWQ9eHMrKyxlfHxjb25zb2xlLndhcm4oInZlcnRleCBzaGFkZXIgbm90IHN1cHBsaWVkIikscnx8Y29uc29sZS53YXJuKCJmcmFnbWVudCBzaGFkZXIgbm90IHN1cHBsaWVkIiksdGhpcy50cmFuc3BhcmVudD1uLHRoaXMuY3VsbEZhY2U9YSx0aGlzLmZyb250RmFjZT1oLHRoaXMuZGVwdGhUZXN0PW8sdGhpcy5kZXB0aFdyaXRlPWwsdGhpcy5kZXB0aEZ1bmM9Yyx0aGlzLmJsZW5kRnVuYz17fSx0aGlzLmJsZW5kRXF1YXRpb249e30sdGhpcy5zdGVuY2lsRnVuYz17fSx0aGlzLnN0ZW5jaWxPcD17fSx0aGlzLnRyYW5zcGFyZW50JiYhdGhpcy5ibGVuZEZ1bmMuc3JjJiYodGhpcy5nbC5yZW5kZXJlci5wcmVtdWx0aXBsaWVkQWxwaGE/dGhpcy5zZXRCbGVuZEZ1bmModGhpcy5nbC5PTkUsdGhpcy5nbC5PTkVfTUlOVVNfU1JDX0FMUEhBKTp0aGlzLnNldEJsZW5kRnVuYyh0aGlzLmdsLlNSQ19BTFBIQSx0aGlzLmdsLk9ORV9NSU5VU19TUkNfQUxQSEEpKSx0aGlzLnZlcnRleFNoYWRlcj10LmNyZWF0ZVNoYWRlcih0LlZFUlRFWF9TSEFERVIpLHRoaXMuZnJhZ21lbnRTaGFkZXI9dC5jcmVhdGVTaGFkZXIodC5GUkFHTUVOVF9TSEFERVIpLHRoaXMucHJvZ3JhbT10LmNyZWF0ZVByb2dyYW0oKSx0LmF0dGFjaFNoYWRlcih0aGlzLnByb2dyYW0sdGhpcy52ZXJ0ZXhTaGFkZXIpLHQuYXR0YWNoU2hhZGVyKHRoaXMucHJvZ3JhbSx0aGlzLmZyYWdtZW50U2hhZGVyKSx0aGlzLnNldFNoYWRlcnMoe3ZlcnRleDplLGZyYWdtZW50OnJ9KX1zZXRTaGFkZXJzKHt2ZXJ0ZXg6dCxmcmFnbWVudDplfSl7aWYodCYmKHRoaXMuZ2wuc2hhZGVyU291cmNlKHRoaXMudmVydGV4U2hhZGVyLHQpLHRoaXMuZ2wuY29tcGlsZVNoYWRlcih0aGlzLnZlcnRleFNoYWRlciksdGhpcy5nbC5nZXRTaGFkZXJJbmZvTG9nKHRoaXMudmVydGV4U2hhZGVyKSE9PSIiJiZjb25zb2xlLndhcm4oYCR7dGhpcy5nbC5nZXRTaGFkZXJJbmZvTG9nKHRoaXMudmVydGV4U2hhZGVyKX0NClZlcnRleCBTaGFkZXINCiR7U2kodCl9YCkpLGUmJih0aGlzLmdsLnNoYWRlclNvdXJjZSh0aGlzLmZyYWdtZW50U2hhZGVyLGUpLHRoaXMuZ2wuY29tcGlsZVNoYWRlcih0aGlzLmZyYWdtZW50U2hhZGVyKSx0aGlzLmdsLmdldFNoYWRlckluZm9Mb2codGhpcy5mcmFnbWVudFNoYWRlcikhPT0iIiYmY29uc29sZS53YXJuKGAke3RoaXMuZ2wuZ2V0U2hhZGVySW5mb0xvZyh0aGlzLmZyYWdtZW50U2hhZGVyKX0NCkZyYWdtZW50IFNoYWRlcg0KJHtTaShlKX1gKSksdGhpcy5nbC5saW5rUHJvZ3JhbSh0aGlzLnByb2dyYW0pLCF0aGlzLmdsLmdldFByb2dyYW1QYXJhbWV0ZXIodGhpcy5wcm9ncmFtLHRoaXMuZ2wuTElOS19TVEFUVVMpKXJldHVybiBjb25zb2xlLndhcm4odGhpcy5nbC5nZXRQcm9ncmFtSW5mb0xvZyh0aGlzLnByb2dyYW0pKTt0aGlzLnVuaWZvcm1Mb2NhdGlvbnM9bmV3IE1hcDtsZXQgcj10aGlzLmdsLmdldFByb2dyYW1QYXJhbWV0ZXIodGhpcy5wcm9ncmFtLHRoaXMuZ2wuQUNUSVZFX1VOSUZPUk1TKTtmb3IobGV0IGE9MDthPHI7YSsrKXtsZXQgaD10aGlzLmdsLmdldEFjdGl2ZVVuaWZvcm0odGhpcy5wcm9ncmFtLGEpO3RoaXMudW5pZm9ybUxvY2F0aW9ucy5zZXQoaCx0aGlzLmdsLmdldFVuaWZvcm1Mb2NhdGlvbih0aGlzLnByb2dyYW0saC5uYW1lKSk7bGV0IG89aC5uYW1lLm1hdGNoKC8oXHcrKS9nKTtoLnVuaWZvcm1OYW1lPW9bMF0saC5uYW1lQ29tcG9uZW50cz1vLnNsaWNlKDEpfXRoaXMuYXR0cmlidXRlTG9jYXRpb25zPW5ldyBNYXA7bGV0IHM9W10sbj10aGlzLmdsLmdldFByb2dyYW1QYXJhbWV0ZXIodGhpcy5wcm9ncmFtLHRoaXMuZ2wuQUNUSVZFX0FUVFJJQlVURVMpO2ZvcihsZXQgYT0wO2E8bjthKyspe2xldCBoPXRoaXMuZ2wuZ2V0QWN0aXZlQXR0cmliKHRoaXMucHJvZ3JhbSxhKSxvPXRoaXMuZ2wuZ2V0QXR0cmliTG9jYXRpb24odGhpcy5wcm9ncmFtLGgubmFtZSk7byE9PS0xJiYoc1tvXT1oLm5hbWUsdGhpcy5hdHRyaWJ1dGVMb2NhdGlvbnMuc2V0KGgsbykpfXRoaXMuYXR0cmlidXRlT3JkZXI9cy5qb2luKCIiKX1zZXRCbGVuZEZ1bmModCxlLHIscyl7dGhpcy5ibGVuZEZ1bmMuc3JjPXQsdGhpcy5ibGVuZEZ1bmMuZHN0PWUsdGhpcy5ibGVuZEZ1bmMuc3JjQWxwaGE9cix0aGlzLmJsZW5kRnVuYy5kc3RBbHBoYT1zLHQmJih0aGlzLnRyYW5zcGFyZW50PSEwKX1zZXRCbGVuZEVxdWF0aW9uKHQsZSl7dGhpcy5ibGVuZEVxdWF0aW9uLm1vZGVSR0I9dCx0aGlzLmJsZW5kRXF1YXRpb24ubW9kZUFscGhhPWV9c2V0U3RlbmNpbEZ1bmModCxlLHIpe3RoaXMuc3RlbmNpbFJlZj1lLHRoaXMuc3RlbmNpbEZ1bmMuZnVuYz10LHRoaXMuc3RlbmNpbEZ1bmMucmVmPWUsdGhpcy5zdGVuY2lsRnVuYy5tYXNrPXJ9c2V0U3RlbmNpbE9wKHQsZSxyKXt0aGlzLnN0ZW5jaWxPcC5zdGVuY2lsRmFpbD10LHRoaXMuc3RlbmNpbE9wLmRlcHRoRmFpbD1lLHRoaXMuc3RlbmNpbE9wLmRlcHRoUGFzcz1yfWFwcGx5U3RhdGUoKXt0aGlzLmRlcHRoVGVzdD90aGlzLmdsLnJlbmRlcmVyLmVuYWJsZSh0aGlzLmdsLkRFUFRIX1RFU1QpOnRoaXMuZ2wucmVuZGVyZXIuZGlzYWJsZSh0aGlzLmdsLkRFUFRIX1RFU1QpLHRoaXMuY3VsbEZhY2U/dGhpcy5nbC5yZW5kZXJlci5lbmFibGUodGhpcy5nbC5DVUxMX0ZBQ0UpOnRoaXMuZ2wucmVuZGVyZXIuZGlzYWJsZSh0aGlzLmdsLkNVTExfRkFDRSksdGhpcy5ibGVuZEZ1bmMuc3JjP3RoaXMuZ2wucmVuZGVyZXIuZW5hYmxlKHRoaXMuZ2wuQkxFTkQpOnRoaXMuZ2wucmVuZGVyZXIuZGlzYWJsZSh0aGlzLmdsLkJMRU5EKSx0aGlzLmN1bGxGYWNlJiZ0aGlzLmdsLnJlbmRlcmVyLnNldEN1bGxGYWNlKHRoaXMuY3VsbEZhY2UpLHRoaXMuZ2wucmVuZGVyZXIuc2V0RnJvbnRGYWNlKHRoaXMuZnJvbnRGYWNlKSx0aGlzLmdsLnJlbmRlcmVyLnNldERlcHRoTWFzayh0aGlzLmRlcHRoV3JpdGUpLHRoaXMuZ2wucmVuZGVyZXIuc2V0RGVwdGhGdW5jKHRoaXMuZGVwdGhGdW5jKSx0aGlzLmJsZW5kRnVuYy5zcmMmJnRoaXMuZ2wucmVuZGVyZXIuc2V0QmxlbmRGdW5jKHRoaXMuYmxlbmRGdW5jLnNyYyx0aGlzLmJsZW5kRnVuYy5kc3QsdGhpcy5ibGVuZEZ1bmMuc3JjQWxwaGEsdGhpcy5ibGVuZEZ1bmMuZHN0QWxwaGEpLHRoaXMuZ2wucmVuZGVyZXIuc2V0QmxlbmRFcXVhdGlvbih0aGlzLmJsZW5kRXF1YXRpb24ubW9kZVJHQix0aGlzLmJsZW5kRXF1YXRpb24ubW9kZUFscGhhKSx0aGlzLnN0ZW5jaWxGdW5jLmZ1bmN8fHRoaXMuc3RlbmNpbE9wLnN0ZW5jaWxGYWlsP3RoaXMuZ2wucmVuZGVyZXIuZW5hYmxlKHRoaXMuZ2wuU1RFTkNJTF9URVNUKTp0aGlzLmdsLnJlbmRlcmVyLmRpc2FibGUodGhpcy5nbC5TVEVOQ0lMX1RFU1QpLHRoaXMuZ2wucmVuZGVyZXIuc2V0U3RlbmNpbEZ1bmModGhpcy5zdGVuY2lsRnVuYy5mdW5jLHRoaXMuc3RlbmNpbEZ1bmMucmVmLHRoaXMuc3RlbmNpbEZ1bmMubWFzayksdGhpcy5nbC5yZW5kZXJlci5zZXRTdGVuY2lsT3AodGhpcy5zdGVuY2lsT3Auc3RlbmNpbEZhaWwsdGhpcy5zdGVuY2lsT3AuZGVwdGhGYWlsLHRoaXMuc3RlbmNpbE9wLmRlcHRoUGFzcyl9dXNlKHtmbGlwRmFjZXM6dD0hMX09e30pe2xldCBlPS0xO3RoaXMuZ2wucmVuZGVyZXIuc3RhdGUuY3VycmVudFByb2dyYW09PT10aGlzLmlkfHwodGhpcy5nbC51c2VQcm9ncmFtKHRoaXMucHJvZ3JhbSksdGhpcy5nbC5yZW5kZXJlci5zdGF0ZS5jdXJyZW50UHJvZ3JhbT10aGlzLmlkKSx0aGlzLnVuaWZvcm1Mb2NhdGlvbnMuZm9yRWFjaCgocyxuKT0+e2xldCBhPXRoaXMudW5pZm9ybXNbbi51bmlmb3JtTmFtZV07Zm9yKGxldCBoIG9mIG4ubmFtZUNvbXBvbmVudHMpe2lmKCFhKWJyZWFrO2lmKGggaW4gYSlhPWFbaF07ZWxzZXtpZihBcnJheS5pc0FycmF5KGEudmFsdWUpKWJyZWFrO2E9dm9pZCAwO2JyZWFrfX1pZighYSlyZXR1cm4gUGkoYEFjdGl2ZSB1bmlmb3JtICR7bi5uYW1lfSBoYXMgbm90IGJlZW4gc3VwcGxpZWRgKTtpZihhJiZhLnZhbHVlPT09dm9pZCAwKXJldHVybiBQaShgJHtuLm5hbWV9IHVuaWZvcm0gaXMgbWlzc2luZyBhIHZhbHVlIHBhcmFtZXRlcmApO2lmKGEudmFsdWUudGV4dHVyZSlyZXR1cm4gZT1lKzEsYS52YWx1ZS51cGRhdGUoZSksSnQodGhpcy5nbCxuLnR5cGUscyxlKTtpZihhLnZhbHVlLmxlbmd0aCYmYS52YWx1ZVswXS50ZXh0dXJlKXtsZXQgaD1bXTtyZXR1cm4gYS52YWx1ZS5mb3JFYWNoKG89PntlPWUrMSxvLnVwZGF0ZShlKSxoLnB1c2goZSl9KSxKdCh0aGlzLmdsLG4udHlwZSxzLGgpfUp0KHRoaXMuZ2wsbi50eXBlLHMsYS52YWx1ZSl9KSx0aGlzLmFwcGx5U3RhdGUoKSx0JiZ0aGlzLmdsLnJlbmRlcmVyLnNldEZyb250RmFjZSh0aGlzLmZyb250RmFjZT09PXRoaXMuZ2wuQ0NXP3RoaXMuZ2wuQ1c6dGhpcy5nbC5DQ1cpfXJlbW92ZSgpe3RoaXMuZ2wuZGVsZXRlUHJvZ3JhbSh0aGlzLnByb2dyYW0pfX07ZnVuY3Rpb24gSnQoaSx0LGUscil7cj1yLmxlbmd0aD95cyhyKTpyO2xldCBzPWkucmVuZGVyZXIuc3RhdGUudW5pZm9ybUxvY2F0aW9ucy5nZXQoZSk7aWYoci5sZW5ndGgpaWYocz09PXZvaWQgMHx8cy5sZW5ndGghPT1yLmxlbmd0aClpLnJlbmRlcmVyLnN0YXRlLnVuaWZvcm1Mb2NhdGlvbnMuc2V0KGUsci5zbGljZSgwKSk7ZWxzZXtpZih3cyhzLHIpKXJldHVybjtzLnNldD9zLnNldChyKTpNcyhzLHIpLGkucmVuZGVyZXIuc3RhdGUudW5pZm9ybUxvY2F0aW9ucy5zZXQoZSxzKX1lbHNle2lmKHM9PT1yKXJldHVybjtpLnJlbmRlcmVyLnN0YXRlLnVuaWZvcm1Mb2NhdGlvbnMuc2V0KGUscil9c3dpdGNoKHQpe2Nhc2UgNTEyNjpyZXR1cm4gci5sZW5ndGg/aS51bmlmb3JtMWZ2KGUscik6aS51bmlmb3JtMWYoZSxyKTtjYXNlIDM1NjY0OnJldHVybiBpLnVuaWZvcm0yZnYoZSxyKTtjYXNlIDM1NjY1OnJldHVybiBpLnVuaWZvcm0zZnYoZSxyKTtjYXNlIDM1NjY2OnJldHVybiBpLnVuaWZvcm00ZnYoZSxyKTtjYXNlIDM1NjcwOmNhc2UgNTEyNDpjYXNlIDM1Njc4OmNhc2UgMzYzMDY6Y2FzZSAzNTY4MDpjYXNlIDM2Mjg5OnJldHVybiByLmxlbmd0aD9pLnVuaWZvcm0xaXYoZSxyKTppLnVuaWZvcm0xaShlLHIpO2Nhc2UgMzU2NzE6Y2FzZSAzNTY2NzpyZXR1cm4gaS51bmlmb3JtMml2KGUscik7Y2FzZSAzNTY3MjpjYXNlIDM1NjY4OnJldHVybiBpLnVuaWZvcm0zaXYoZSxyKTtjYXNlIDM1NjczOmNhc2UgMzU2Njk6cmV0dXJuIGkudW5pZm9ybTRpdihlLHIpO2Nhc2UgMzU2NzQ6cmV0dXJuIGkudW5pZm9ybU1hdHJpeDJmdihlLCExLHIpO2Nhc2UgMzU2NzU6cmV0dXJuIGkudW5pZm9ybU1hdHJpeDNmdihlLCExLHIpO2Nhc2UgMzU2NzY6cmV0dXJuIGkudW5pZm9ybU1hdHJpeDRmdihlLCExLHIpfX1mdW5jdGlvbiBTaShpKXtsZXQgdD1pLnNwbGl0KGANCmApO2ZvcihsZXQgZT0wO2U8dC5sZW5ndGg7ZSsrKXRbZV09ZSsxKyI6ICIrdFtlXTtyZXR1cm4gdC5qb2luKGANCmApfWZ1bmN0aW9uIHlzKGkpe2xldCB0PWkubGVuZ3RoLGU9aVswXS5sZW5ndGg7aWYoZT09PXZvaWQgMClyZXR1cm4gaTtsZXQgcj10KmUscz1MaVtyXTtzfHwoTGlbcl09cz1uZXcgRmxvYXQzMkFycmF5KHIpKTtmb3IobGV0IG49MDtuPHQ7bisrKXMuc2V0KGlbbl0sbiplKTtyZXR1cm4gc31mdW5jdGlvbiB3cyhpLHQpe2lmKGkubGVuZ3RoIT09dC5sZW5ndGgpcmV0dXJuITE7Zm9yKGxldCBlPTAscj1pLmxlbmd0aDtlPHI7ZSsrKWlmKGlbZV0hPT10W2VdKXJldHVybiExO3JldHVybiEwfWZ1bmN0aW9uIE1zKGksdCl7Zm9yKGxldCBlPTAscj1pLmxlbmd0aDtlPHI7ZSsrKWlbZV09dFtlXX12YXIgdGU9MDtmdW5jdGlvbiBQaShpKXt0ZT4xMDB8fChjb25zb2xlLndhcm4oaSksdGUrKyx0ZT4xMDAmJmNvbnNvbGUud2FybigiTW9yZSB0aGFuIDEwMCBwcm9ncmFtIHdhcm5pbmdzIC0gc3RvcHBpbmcgbG9ncy4iKSl9dmFyIGVlPW5ldyBFLEVzPTEsaWU9Y2xhc3N7Y29uc3RydWN0b3Ioe2NhbnZhczp0PWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoImNhbnZhcyIpLHdpZHRoOmU9MzAwLGhlaWdodDpyPTE1MCxkcHI6cz0xLGFscGhhOm49ITEsZGVwdGg6YT0hMCxzdGVuY2lsOmg9ITEsYW50aWFsaWFzOm89ITEscHJlbXVsdGlwbGllZEFscGhhOmw9ITEscHJlc2VydmVEcmF3aW5nQnVmZmVyOmM9ITEscG93ZXJQcmVmZXJlbmNlOmY9ImRlZmF1bHQiLGF1dG9DbGVhcjpwPSEwLHdlYmdsOnU9Mn09e30pe2xldCBkPXthbHBoYTpuLGRlcHRoOmEsc3RlbmNpbDpoLGFudGlhbGlhczpvLHByZW11bHRpcGxpZWRBbHBoYTpsLHByZXNlcnZlRHJhd2luZ0J1ZmZlcjpjLHBvd2VyUHJlZmVyZW5jZTpmfTt0aGlzLmRwcj1zLHRoaXMuYWxwaGE9bix0aGlzLmNvbG9yPSEwLHRoaXMuZGVwdGg9YSx0aGlzLnN0ZW5jaWw9aCx0aGlzLnByZW11bHRpcGxpZWRBbHBoYT1sLHRoaXMuYXV0b0NsZWFyPXAsdGhpcy5pZD1FcysrLHU9PT0yJiYodGhpcy5nbD10LmdldENvbnRleHQoIndlYmdsMiIsZCkpLHRoaXMuaXNXZWJnbDI9ISF0aGlzLmdsLHRoaXMuZ2x8fCh0aGlzLmdsPXQuZ2V0Q29udGV4dCgid2ViZ2wiLGQpKSx0aGlzLmdsfHxjb25zb2xlLmVycm9yKCJ1bmFibGUgdG8gY3JlYXRlIHdlYmdsIGNvbnRleHQiKSx0aGlzLmdsLnJlbmRlcmVyPXRoaXMsdGhpcy5zZXRTaXplKGUsciksdGhpcy5zdGF0ZT17fSx0aGlzLnN0YXRlLmJsZW5kRnVuYz17c3JjOnRoaXMuZ2wuT05FLGRzdDp0aGlzLmdsLlpFUk99LHRoaXMuc3RhdGUuYmxlbmRFcXVhdGlvbj17bW9kZVJHQjp0aGlzLmdsLkZVTkNfQUREfSx0aGlzLnN0YXRlLmN1bGxGYWNlPSExLHRoaXMuc3RhdGUuZnJvbnRGYWNlPXRoaXMuZ2wuQ0NXLHRoaXMuc3RhdGUuZGVwdGhNYXNrPSEwLHRoaXMuc3RhdGUuZGVwdGhGdW5jPXRoaXMuZ2wuTEVRVUFMLHRoaXMuc3RhdGUucHJlbXVsdGlwbHlBbHBoYT0hMSx0aGlzLnN0YXRlLmZsaXBZPSExLHRoaXMuc3RhdGUudW5wYWNrQWxpZ25tZW50PTQsdGhpcy5zdGF0ZS5mcmFtZWJ1ZmZlcj1udWxsLHRoaXMuc3RhdGUudmlld3BvcnQ9e3g6MCx5OjAsd2lkdGg6bnVsbCxoZWlnaHQ6bnVsbH0sdGhpcy5zdGF0ZS50ZXh0dXJlVW5pdHM9W10sdGhpcy5zdGF0ZS5hY3RpdmVUZXh0dXJlVW5pdD0wLHRoaXMuc3RhdGUuYm91bmRCdWZmZXI9bnVsbCx0aGlzLnN0YXRlLnVuaWZvcm1Mb2NhdGlvbnM9bmV3IE1hcCx0aGlzLnN0YXRlLmN1cnJlbnRQcm9ncmFtPW51bGwsdGhpcy5leHRlbnNpb25zPXt9LHRoaXMuaXNXZWJnbDI/KHRoaXMuZ2V0RXh0ZW5zaW9uKCJFWFRfY29sb3JfYnVmZmVyX2Zsb2F0IiksdGhpcy5nZXRFeHRlbnNpb24oIk9FU190ZXh0dXJlX2Zsb2F0X2xpbmVhciIpKToodGhpcy5nZXRFeHRlbnNpb24oIk9FU190ZXh0dXJlX2Zsb2F0IiksdGhpcy5nZXRFeHRlbnNpb24oIk9FU190ZXh0dXJlX2Zsb2F0X2xpbmVhciIpLHRoaXMuZ2V0RXh0ZW5zaW9uKCJPRVNfdGV4dHVyZV9oYWxmX2Zsb2F0IiksdGhpcy5nZXRFeHRlbnNpb24oIk9FU190ZXh0dXJlX2hhbGZfZmxvYXRfbGluZWFyIiksdGhpcy5nZXRFeHRlbnNpb24oIk9FU19lbGVtZW50X2luZGV4X3VpbnQiKSx0aGlzLmdldEV4dGVuc2lvbigiT0VTX3N0YW5kYXJkX2Rlcml2YXRpdmVzIiksdGhpcy5nZXRFeHRlbnNpb24oIkVYVF9zUkdCIiksdGhpcy5nZXRFeHRlbnNpb24oIldFQkdMX2RlcHRoX3RleHR1cmUiKSx0aGlzLmdldEV4dGVuc2lvbigiV0VCR0xfZHJhd19idWZmZXJzIikpLHRoaXMuZ2V0RXh0ZW5zaW9uKCJXRUJHTF9jb21wcmVzc2VkX3RleHR1cmVfYXN0YyIpLHRoaXMuZ2V0RXh0ZW5zaW9uKCJFWFRfdGV4dHVyZV9jb21wcmVzc2lvbl9icHRjIiksdGhpcy5nZXRFeHRlbnNpb24oIldFQkdMX2NvbXByZXNzZWRfdGV4dHVyZV9zM3RjIiksdGhpcy5nZXRFeHRlbnNpb24oIldFQkdMX2NvbXByZXNzZWRfdGV4dHVyZV9ldGMxIiksdGhpcy5nZXRFeHRlbnNpb24oIldFQkdMX2NvbXByZXNzZWRfdGV4dHVyZV9wdnJ0YyIpLHRoaXMuZ2V0RXh0ZW5zaW9uKCJXRUJLSVRfV0VCR0xfY29tcHJlc3NlZF90ZXh0dXJlX3B2cnRjIiksdGhpcy52ZXJ0ZXhBdHRyaWJEaXZpc29yPXRoaXMuZ2V0RXh0ZW5zaW9uKCJBTkdMRV9pbnN0YW5jZWRfYXJyYXlzIiwidmVydGV4QXR0cmliRGl2aXNvciIsInZlcnRleEF0dHJpYkRpdmlzb3JBTkdMRSIpLHRoaXMuZHJhd0FycmF5c0luc3RhbmNlZD10aGlzLmdldEV4dGVuc2lvbigiQU5HTEVfaW5zdGFuY2VkX2FycmF5cyIsImRyYXdBcnJheXNJbnN0YW5jZWQiLCJkcmF3QXJyYXlzSW5zdGFuY2VkQU5HTEUiKSx0aGlzLmRyYXdFbGVtZW50c0luc3RhbmNlZD10aGlzLmdldEV4dGVuc2lvbigiQU5HTEVfaW5zdGFuY2VkX2FycmF5cyIsImRyYXdFbGVtZW50c0luc3RhbmNlZCIsImRyYXdFbGVtZW50c0luc3RhbmNlZEFOR0xFIiksdGhpcy5jcmVhdGVWZXJ0ZXhBcnJheT10aGlzLmdldEV4dGVuc2lvbigiT0VTX3ZlcnRleF9hcnJheV9vYmplY3QiLCJjcmVhdGVWZXJ0ZXhBcnJheSIsImNyZWF0ZVZlcnRleEFycmF5T0VTIiksdGhpcy5iaW5kVmVydGV4QXJyYXk9dGhpcy5nZXRFeHRlbnNpb24oIk9FU192ZXJ0ZXhfYXJyYXlfb2JqZWN0IiwiYmluZFZlcnRleEFycmF5IiwiYmluZFZlcnRleEFycmF5T0VTIiksdGhpcy5kZWxldGVWZXJ0ZXhBcnJheT10aGlzLmdldEV4dGVuc2lvbigiT0VTX3ZlcnRleF9hcnJheV9vYmplY3QiLCJkZWxldGVWZXJ0ZXhBcnJheSIsImRlbGV0ZVZlcnRleEFycmF5T0VTIiksdGhpcy5kcmF3QnVmZmVycz10aGlzLmdldEV4dGVuc2lvbigiV0VCR0xfZHJhd19idWZmZXJzIiwiZHJhd0J1ZmZlcnMiLCJkcmF3QnVmZmVyc1dFQkdMIiksdGhpcy5wYXJhbWV0ZXJzPXt9LHRoaXMucGFyYW1ldGVycy5tYXhUZXh0dXJlVW5pdHM9dGhpcy5nbC5nZXRQYXJhbWV0ZXIodGhpcy5nbC5NQVhfQ09NQklORURfVEVYVFVSRV9JTUFHRV9VTklUUyksdGhpcy5wYXJhbWV0ZXJzLm1heEFuaXNvdHJvcHk9dGhpcy5nZXRFeHRlbnNpb24oIkVYVF90ZXh0dXJlX2ZpbHRlcl9hbmlzb3Ryb3BpYyIpP3RoaXMuZ2wuZ2V0UGFyYW1ldGVyKHRoaXMuZ2V0RXh0ZW5zaW9uKCJFWFRfdGV4dHVyZV9maWx0ZXJfYW5pc290cm9waWMiKS5NQVhfVEVYVFVSRV9NQVhfQU5JU09UUk9QWV9FWFQpOjB9c2V0U2l6ZSh0LGUpe3RoaXMud2lkdGg9dCx0aGlzLmhlaWdodD1lLHRoaXMuZ2wuY2FudmFzLndpZHRoPXQqdGhpcy5kcHIsdGhpcy5nbC5jYW52YXMuaGVpZ2h0PWUqdGhpcy5kcHIsdGhpcy5nbC5jYW52YXMuc3R5bGUmJk9iamVjdC5hc3NpZ24odGhpcy5nbC5jYW52YXMuc3R5bGUse3dpZHRoOnQrInB4IixoZWlnaHQ6ZSsicHgifSl9c2V0Vmlld3BvcnQodCxlLHI9MCxzPTApe3RoaXMuc3RhdGUudmlld3BvcnQud2lkdGg9PT10JiZ0aGlzLnN0YXRlLnZpZXdwb3J0LmhlaWdodD09PWV8fCh0aGlzLnN0YXRlLnZpZXdwb3J0LndpZHRoPXQsdGhpcy5zdGF0ZS52aWV3cG9ydC5oZWlnaHQ9ZSx0aGlzLnN0YXRlLnZpZXdwb3J0Lng9cix0aGlzLnN0YXRlLnZpZXdwb3J0Lnk9cyx0aGlzLmdsLnZpZXdwb3J0KHIscyx0LGUpKX1zZXRTY2lzc29yKHQsZSxyPTAscz0wKXt0aGlzLmdsLnNjaXNzb3IocixzLHQsZSl9ZW5hYmxlKHQpe3RoaXMuc3RhdGVbdF0hPT0hMCYmKHRoaXMuZ2wuZW5hYmxlKHQpLHRoaXMuc3RhdGVbdF09ITApfWRpc2FibGUodCl7dGhpcy5zdGF0ZVt0XSE9PSExJiYodGhpcy5nbC5kaXNhYmxlKHQpLHRoaXMuc3RhdGVbdF09ITEpfXNldEJsZW5kRnVuYyh0LGUscixzKXt0aGlzLnN0YXRlLmJsZW5kRnVuYy5zcmM9PT10JiZ0aGlzLnN0YXRlLmJsZW5kRnVuYy5kc3Q9PT1lJiZ0aGlzLnN0YXRlLmJsZW5kRnVuYy5zcmNBbHBoYT09PXImJnRoaXMuc3RhdGUuYmxlbmRGdW5jLmRzdEFscGhhPT09c3x8KHRoaXMuc3RhdGUuYmxlbmRGdW5jLnNyYz10LHRoaXMuc3RhdGUuYmxlbmRGdW5jLmRzdD1lLHRoaXMuc3RhdGUuYmxlbmRGdW5jLnNyY0FscGhhPXIsdGhpcy5zdGF0ZS5ibGVuZEZ1bmMuZHN0QWxwaGE9cyxyIT09dm9pZCAwP3RoaXMuZ2wuYmxlbmRGdW5jU2VwYXJhdGUodCxlLHIscyk6dGhpcy5nbC5ibGVuZEZ1bmModCxlKSl9c2V0QmxlbmRFcXVhdGlvbih0LGUpe3Q9dHx8dGhpcy5nbC5GVU5DX0FERCwhKHRoaXMuc3RhdGUuYmxlbmRFcXVhdGlvbi5tb2RlUkdCPT09dCYmdGhpcy5zdGF0ZS5ibGVuZEVxdWF0aW9uLm1vZGVBbHBoYT09PWUpJiYodGhpcy5zdGF0ZS5ibGVuZEVxdWF0aW9uLm1vZGVSR0I9dCx0aGlzLnN0YXRlLmJsZW5kRXF1YXRpb24ubW9kZUFscGhhPWUsZSE9PXZvaWQgMD90aGlzLmdsLmJsZW5kRXF1YXRpb25TZXBhcmF0ZSh0LGUpOnRoaXMuZ2wuYmxlbmRFcXVhdGlvbih0KSl9c2V0Q3VsbEZhY2UodCl7dGhpcy5zdGF0ZS5jdWxsRmFjZSE9PXQmJih0aGlzLnN0YXRlLmN1bGxGYWNlPXQsdGhpcy5nbC5jdWxsRmFjZSh0KSl9c2V0RnJvbnRGYWNlKHQpe3RoaXMuc3RhdGUuZnJvbnRGYWNlIT09dCYmKHRoaXMuc3RhdGUuZnJvbnRGYWNlPXQsdGhpcy5nbC5mcm9udEZhY2UodCkpfXNldERlcHRoTWFzayh0KXt0aGlzLnN0YXRlLmRlcHRoTWFzayE9PXQmJih0aGlzLnN0YXRlLmRlcHRoTWFzaz10LHRoaXMuZ2wuZGVwdGhNYXNrKHQpKX1zZXREZXB0aEZ1bmModCl7dGhpcy5zdGF0ZS5kZXB0aEZ1bmMhPT10JiYodGhpcy5zdGF0ZS5kZXB0aEZ1bmM9dCx0aGlzLmdsLmRlcHRoRnVuYyh0KSl9c2V0U3RlbmNpbE1hc2sodCl7dGhpcy5zdGF0ZS5zdGVuY2lsTWFzayE9PXQmJih0aGlzLnN0YXRlLnN0ZW5jaWxNYXNrPXQsdGhpcy5nbC5zdGVuY2lsTWFzayh0KSl9c2V0U3RlbmNpbEZ1bmModCxlLHIpe3RoaXMuc3RhdGUuc3RlbmNpbEZ1bmM9PT10JiZ0aGlzLnN0YXRlLnN0ZW5jaWxSZWY9PT1lJiZ0aGlzLnN0YXRlLnN0ZW5jaWxGdW5jTWFzaz09PXJ8fCh0aGlzLnN0YXRlLnN0ZW5jaWxGdW5jPXR8fHRoaXMuZ2wuQUxXQVlTLHRoaXMuc3RhdGUuc3RlbmNpbFJlZj1lfHwwLHRoaXMuc3RhdGUuc3RlbmNpbEZ1bmNNYXNrPXJ8fDAsdGhpcy5nbC5zdGVuY2lsRnVuYyh0fHx0aGlzLmdsLkFMV0FZUyxlfHwwLHJ8fDApKX1zZXRTdGVuY2lsT3AodCxlLHIpe3RoaXMuc3RhdGUuc3RlbmNpbEZhaWw9PT10JiZ0aGlzLnN0YXRlLnN0ZW5jaWxEZXB0aEZhaWw9PT1lJiZ0aGlzLnN0YXRlLnN0ZW5jaWxEZXB0aFBhc3M9PT1yfHwodGhpcy5zdGF0ZS5zdGVuY2lsRmFpbD10LHRoaXMuc3RhdGUuc3RlbmNpbERlcHRoRmFpbD1lLHRoaXMuc3RhdGUuc3RlbmNpbERlcHRoUGFzcz1yLHRoaXMuZ2wuc3RlbmNpbE9wKHQsZSxyKSl9YWN0aXZlVGV4dHVyZSh0KXt0aGlzLnN0YXRlLmFjdGl2ZVRleHR1cmVVbml0IT09dCYmKHRoaXMuc3RhdGUuYWN0aXZlVGV4dHVyZVVuaXQ9dCx0aGlzLmdsLmFjdGl2ZVRleHR1cmUodGhpcy5nbC5URVhUVVJFMCt0KSl9YmluZEZyYW1lYnVmZmVyKHt0YXJnZXQ6dD10aGlzLmdsLkZSQU1FQlVGRkVSLGJ1ZmZlcjplPW51bGx9PXt9KXt0aGlzLnN0YXRlLmZyYW1lYnVmZmVyIT09ZSYmKHRoaXMuc3RhdGUuZnJhbWVidWZmZXI9ZSx0aGlzLmdsLmJpbmRGcmFtZWJ1ZmZlcih0LGUpKX1nZXRFeHRlbnNpb24odCxlLHIpe3JldHVybiBlJiZ0aGlzLmdsW2VdP3RoaXMuZ2xbZV0uYmluZCh0aGlzLmdsKToodGhpcy5leHRlbnNpb25zW3RdfHwodGhpcy5leHRlbnNpb25zW3RdPXRoaXMuZ2wuZ2V0RXh0ZW5zaW9uKHQpKSxlP3RoaXMuZXh0ZW5zaW9uc1t0XT90aGlzLmV4dGVuc2lvbnNbdF1bcl0uYmluZCh0aGlzLmV4dGVuc2lvbnNbdF0pOm51bGw6dGhpcy5leHRlbnNpb25zW3RdKX1zb3J0T3BhcXVlKHQsZSl7cmV0dXJuIHQucmVuZGVyT3JkZXIhPT1lLnJlbmRlck9yZGVyP3QucmVuZGVyT3JkZXItZS5yZW5kZXJPcmRlcjp0LnByb2dyYW0uaWQhPT1lLnByb2dyYW0uaWQ/dC5wcm9ncmFtLmlkLWUucHJvZ3JhbS5pZDp0LnpEZXB0aCE9PWUuekRlcHRoP3QuekRlcHRoLWUuekRlcHRoOmUuaWQtdC5pZH1zb3J0VHJhbnNwYXJlbnQodCxlKXtyZXR1cm4gdC5yZW5kZXJPcmRlciE9PWUucmVuZGVyT3JkZXI/dC5yZW5kZXJPcmRlci1lLnJlbmRlck9yZGVyOnQuekRlcHRoIT09ZS56RGVwdGg/ZS56RGVwdGgtdC56RGVwdGg6ZS5pZC10LmlkfXNvcnRVSSh0LGUpe3JldHVybiB0LnJlbmRlck9yZGVyIT09ZS5yZW5kZXJPcmRlcj90LnJlbmRlck9yZGVyLWUucmVuZGVyT3JkZXI6dC5wcm9ncmFtLmlkIT09ZS5wcm9ncmFtLmlkP3QucHJvZ3JhbS5pZC1lLnByb2dyYW0uaWQ6ZS5pZC10LmlkfWdldFJlbmRlckxpc3Qoe3NjZW5lOnQsY2FtZXJhOmUsZnJ1c3R1bUN1bGw6cixzb3J0OnN9KXtsZXQgbj1bXTtpZihlJiZyJiZlLnVwZGF0ZUZydXN0dW0oKSx0LnRyYXZlcnNlKGE9PntpZighYS52aXNpYmxlKXJldHVybiEwO2EuZHJhdyYmKHImJmEuZnJ1c3R1bUN1bGxlZCYmZSYmIWUuZnJ1c3R1bUludGVyc2VjdHNNZXNoKGEpfHxuLnB1c2goYSkpfSkscyl7bGV0IGE9W10saD1bXSxvPVtdO24uZm9yRWFjaChsPT57bC5wcm9ncmFtLnRyYW5zcGFyZW50P2wucHJvZ3JhbS5kZXB0aFRlc3Q/aC5wdXNoKGwpOm8ucHVzaChsKTphLnB1c2gobCksbC56RGVwdGg9MCwhKGwucmVuZGVyT3JkZXIhPT0wfHwhbC5wcm9ncmFtLmRlcHRoVGVzdHx8IWUpJiYobC53b3JsZE1hdHJpeC5nZXRUcmFuc2xhdGlvbihlZSksZWUuYXBwbHlNYXRyaXg0KGUucHJvamVjdGlvblZpZXdNYXRyaXgpLGwuekRlcHRoPWVlLnopfSksYS5zb3J0KHRoaXMuc29ydE9wYXF1ZSksaC5zb3J0KHRoaXMuc29ydFRyYW5zcGFyZW50KSxvLnNvcnQodGhpcy5zb3J0VUkpLG49YS5jb25jYXQoaCxvKX1yZXR1cm4gbn1yZW5kZXIoe3NjZW5lOnQsY2FtZXJhOmUsdGFyZ2V0OnI9bnVsbCx1cGRhdGU6cz0hMCxzb3J0Om49ITAsZnJ1c3R1bUN1bGw6YT0hMCxjbGVhcjpofSl7cj09PW51bGw/KHRoaXMuYmluZEZyYW1lYnVmZmVyKCksdGhpcy5zZXRWaWV3cG9ydCh0aGlzLndpZHRoKnRoaXMuZHByLHRoaXMuaGVpZ2h0KnRoaXMuZHByKSk6KHRoaXMuYmluZEZyYW1lYnVmZmVyKHIpLHRoaXMuc2V0Vmlld3BvcnQoci53aWR0aCxyLmhlaWdodCkpLChofHx0aGlzLmF1dG9DbGVhciYmaCE9PSExKSYmKHRoaXMuZGVwdGgmJighcnx8ci5kZXB0aCkmJih0aGlzLmVuYWJsZSh0aGlzLmdsLkRFUFRIX1RFU1QpLHRoaXMuc2V0RGVwdGhNYXNrKCEwKSksKHRoaXMuc3RlbmNpbHx8IXJ8fHIuc3RlbmNpbCkmJih0aGlzLmVuYWJsZSh0aGlzLmdsLlNURU5DSUxfVEVTVCksdGhpcy5zZXRTdGVuY2lsTWFzaygyNTUpKSx0aGlzLmdsLmNsZWFyKCh0aGlzLmNvbG9yP3RoaXMuZ2wuQ09MT1JfQlVGRkVSX0JJVDowKXwodGhpcy5kZXB0aD90aGlzLmdsLkRFUFRIX0JVRkZFUl9CSVQ6MCl8KHRoaXMuc3RlbmNpbD90aGlzLmdsLlNURU5DSUxfQlVGRkVSX0JJVDowKSkpLHMmJnQudXBkYXRlTWF0cml4V29ybGQoKSxlJiZlLnVwZGF0ZU1hdHJpeFdvcmxkKCksdGhpcy5nZXRSZW5kZXJMaXN0KHtzY2VuZTp0LGNhbWVyYTplLGZydXN0dW1DdWxsOmEsc29ydDpufSkuZm9yRWFjaChsPT57bC5kcmF3KHtjYW1lcmE6ZX0pfSl9fTtmdW5jdGlvbiBOdChpLHQpe3JldHVybiBpWzBdPXRbMF0saVsxXT10WzFdLGlbMl09dFsyXSxpWzNdPXRbM10saX1mdW5jdGlvbiBJdChpLHQsZSxyLHMpe3JldHVybiBpWzBdPXQsaVsxXT1lLGlbMl09cixpWzNdPXMsaX1mdW5jdGlvbiByZShpLHQsZSl7cmV0dXJuIGlbMF09dFswXSplLGlbMV09dFsxXSplLGlbMl09dFsyXSplLGlbM109dFszXSplLGl9ZnVuY3Rpb24gT3QoaSx0KXtsZXQgZT10WzBdLHI9dFsxXSxzPXRbMl0sbj10WzNdLGE9ZSplK3IqcitzKnMrbipuO3JldHVybiBhPjAmJihhPTEvTWF0aC5zcXJ0KGEpKSxpWzBdPWUqYSxpWzFdPXIqYSxpWzJdPXMqYSxpWzNdPW4qYSxpfWZ1bmN0aW9uIER0KGksdCl7cmV0dXJuIGlbMF0qdFswXStpWzFdKnRbMV0raVsyXSp0WzJdK2lbM10qdFszXX1mdW5jdGlvbiBOaShpKXtyZXR1cm4gaVswXT0wLGlbMV09MCxpWzJdPTAsaVszXT0xLGl9ZnVuY3Rpb24gSWkoaSx0LGUpe2U9ZSouNTtsZXQgcj1NYXRoLnNpbihlKTtyZXR1cm4gaVswXT1yKnRbMF0saVsxXT1yKnRbMV0saVsyXT1yKnRbMl0saVszXT1NYXRoLmNvcyhlKSxpfWZ1bmN0aW9uIHNlKGksdCxlKXtsZXQgcj10WzBdLHM9dFsxXSxuPXRbMl0sYT10WzNdLGg9ZVswXSxvPWVbMV0sbD1lWzJdLGM9ZVszXTtyZXR1cm4gaVswXT1yKmMrYSpoK3MqbC1uKm8saVsxXT1zKmMrYSpvK24qaC1yKmwsaVsyXT1uKmMrYSpsK3Iqby1zKmgsaVszXT1hKmMtcipoLXMqby1uKmwsaX1mdW5jdGlvbiBPaShpLHQsZSl7ZSo9LjU7bGV0IHI9dFswXSxzPXRbMV0sbj10WzJdLGE9dFszXSxoPU1hdGguc2luKGUpLG89TWF0aC5jb3MoZSk7cmV0dXJuIGlbMF09cipvK2EqaCxpWzFdPXMqbytuKmgsaVsyXT1uKm8tcypoLGlbM109YSpvLXIqaCxpfWZ1bmN0aW9uIERpKGksdCxlKXtlKj0uNTtsZXQgcj10WzBdLHM9dFsxXSxuPXRbMl0sYT10WzNdLGg9TWF0aC5zaW4oZSksbz1NYXRoLmNvcyhlKTtyZXR1cm4gaVswXT1yKm8tbipoLGlbMV09cypvK2EqaCxpWzJdPW4qbytyKmgsaVszXT1hKm8tcypoLGl9ZnVuY3Rpb24gQmkoaSx0LGUpe2UqPS41O2xldCByPXRbMF0scz10WzFdLG49dFsyXSxhPXRbM10saD1NYXRoLnNpbihlKSxvPU1hdGguY29zKGUpO3JldHVybiBpWzBdPXIqbytzKmgsaVsxXT1zKm8tcipoLGlbMl09bipvK2EqaCxpWzNdPWEqby1uKmgsaX1mdW5jdGlvbiBWaShpLHQsZSxyKXtsZXQgcz10WzBdLG49dFsxXSxhPXRbMl0saD10WzNdLG89ZVswXSxsPWVbMV0sYz1lWzJdLGY9ZVszXSxwLHUsZCx4LG07cmV0dXJuIHU9cypvK24qbCthKmMraCpmLHU8MCYmKHU9LXUsbz0tbyxsPS1sLGM9LWMsZj0tZiksMS11PjFlLTY/KHA9TWF0aC5hY29zKHUpLGQ9TWF0aC5zaW4ocCkseD1NYXRoLnNpbigoMS1yKSpwKS9kLG09TWF0aC5zaW4ocipwKS9kKTooeD0xLXIsbT1yKSxpWzBdPXgqcyttKm8saVsxXT14Km4rbSpsLGlbMl09eCphK20qYyxpWzNdPXgqaCttKmYsaX1mdW5jdGlvbiBVaShpLHQpe2xldCBlPXRbMF0scj10WzFdLHM9dFsyXSxuPXRbM10sYT1lKmUrcipyK3MqcytuKm4saD1hPzEvYTowO3JldHVybiBpWzBdPS1lKmgsaVsxXT0tcipoLGlbMl09LXMqaCxpWzNdPW4qaCxpfWZ1bmN0aW9uIGtpKGksdCl7cmV0dXJuIGlbMF09LXRbMF0saVsxXT0tdFsxXSxpWzJdPS10WzJdLGlbM109dFszXSxpfWZ1bmN0aW9uIEdpKGksdCl7bGV0IGU9dFswXSt0WzRdK3RbOF0scjtpZihlPjApcj1NYXRoLnNxcnQoZSsxKSxpWzNdPS41KnIscj0uNS9yLGlbMF09KHRbNV0tdFs3XSkqcixpWzFdPSh0WzZdLXRbMl0pKnIsaVsyXT0odFsxXS10WzNdKSpyO2Vsc2V7bGV0IHM9MDt0WzRdPnRbMF0mJihzPTEpLHRbOF0+dFtzKjMrc10mJihzPTIpO2xldCBuPShzKzEpJTMsYT0ocysyKSUzO3I9TWF0aC5zcXJ0KHRbcyozK3NdLXRbbiozK25dLXRbYSozK2FdKzEpLGlbc109LjUqcixyPS41L3IsaVszXT0odFtuKjMrYV0tdFthKjMrbl0pKnIsaVtuXT0odFtuKjMrc10rdFtzKjMrbl0pKnIsaVthXT0odFthKjMrc10rdFtzKjMrYV0pKnJ9cmV0dXJuIGl9ZnVuY3Rpb24gWGkoaSx0LGU9IllYWiIpe2xldCByPU1hdGguc2luKHRbMF0qLjUpLHM9TWF0aC5jb3ModFswXSouNSksbj1NYXRoLnNpbih0WzFdKi41KSxhPU1hdGguY29zKHRbMV0qLjUpLGg9TWF0aC5zaW4odFsyXSouNSksbz1NYXRoLmNvcyh0WzJdKi41KTtyZXR1cm4gZT09PSJYWVoiPyhpWzBdPXIqYSpvK3MqbipoLGlbMV09cypuKm8tciphKmgsaVsyXT1zKmEqaCtyKm4qbyxpWzNdPXMqYSpvLXIqbipoKTplPT09IllYWiI/KGlbMF09ciphKm8rcypuKmgsaVsxXT1zKm4qby1yKmEqaCxpWzJdPXMqYSpoLXIqbipvLGlbM109cyphKm8rcipuKmgpOmU9PT0iWlhZIj8oaVswXT1yKmEqby1zKm4qaCxpWzFdPXMqbipvK3IqYSpoLGlbMl09cyphKmgrcipuKm8saVszXT1zKmEqby1yKm4qaCk6ZT09PSJaWVgiPyhpWzBdPXIqYSpvLXMqbipoLGlbMV09cypuKm8rciphKmgsaVsyXT1zKmEqaC1yKm4qbyxpWzNdPXMqYSpvK3IqbipoKTplPT09IllaWCI/KGlbMF09ciphKm8rcypuKmgsaVsxXT1zKm4qbytyKmEqaCxpWzJdPXMqYSpoLXIqbipvLGlbM109cyphKm8tcipuKmgpOmU9PT0iWFpZIiYmKGlbMF09ciphKm8tcypuKmgsaVsxXT1zKm4qby1yKmEqaCxpWzJdPXMqYSpoK3IqbipvLGlbM109cyphKm8rcipuKmgpLGl9dmFyIFdpPU50LHFpPUl0O3ZhciBZaT1EdDt2YXIgamk9T3Q7dmFyIEs9Y2xhc3MgZXh0ZW5kcyBBcnJheXtjb25zdHJ1Y3Rvcih0PTAsZT0wLHI9MCxzPTEpe3N1cGVyKHQsZSxyLHMpLHRoaXMub25DaGFuZ2U9KCk9Pnt9LHRoaXMuX3RhcmdldD10aGlzO2xldCBuPVsiMCIsIjEiLCIyIiwiMyJdO3JldHVybiBuZXcgUHJveHkodGhpcyx7c2V0KGEsaCl7bGV0IG89UmVmbGVjdC5zZXQoLi4uYXJndW1lbnRzKTtyZXR1cm4gbyYmbi5pbmNsdWRlcyhoKSYmYS5vbkNoYW5nZSgpLG99fSl9Z2V0IHgoKXtyZXR1cm4gdGhpc1swXX1nZXQgeSgpe3JldHVybiB0aGlzWzFdfWdldCB6KCl7cmV0dXJuIHRoaXNbMl19Z2V0IHcoKXtyZXR1cm4gdGhpc1szXX1zZXQgeCh0KXt0aGlzLl90YXJnZXRbMF09dCx0aGlzLm9uQ2hhbmdlKCl9c2V0IHkodCl7dGhpcy5fdGFyZ2V0WzFdPXQsdGhpcy5vbkNoYW5nZSgpfXNldCB6KHQpe3RoaXMuX3RhcmdldFsyXT10LHRoaXMub25DaGFuZ2UoKX1zZXQgdyh0KXt0aGlzLl90YXJnZXRbM109dCx0aGlzLm9uQ2hhbmdlKCl9aWRlbnRpdHkoKXtyZXR1cm4gTmkodGhpcy5fdGFyZ2V0KSx0aGlzLm9uQ2hhbmdlKCksdGhpc31zZXQodCxlLHIscyl7cmV0dXJuIHQubGVuZ3RoP3RoaXMuY29weSh0KToocWkodGhpcy5fdGFyZ2V0LHQsZSxyLHMpLHRoaXMub25DaGFuZ2UoKSx0aGlzKX1yb3RhdGVYKHQpe3JldHVybiBPaSh0aGlzLl90YXJnZXQsdGhpcy5fdGFyZ2V0LHQpLHRoaXMub25DaGFuZ2UoKSx0aGlzfXJvdGF0ZVkodCl7cmV0dXJuIERpKHRoaXMuX3RhcmdldCx0aGlzLl90YXJnZXQsdCksdGhpcy5vbkNoYW5nZSgpLHRoaXN9cm90YXRlWih0KXtyZXR1cm4gQmkodGhpcy5fdGFyZ2V0LHRoaXMuX3RhcmdldCx0KSx0aGlzLm9uQ2hhbmdlKCksdGhpc31pbnZlcnNlKHQ9dGhpcy5fdGFyZ2V0KXtyZXR1cm4gVWkodGhpcy5fdGFyZ2V0LHQpLHRoaXMub25DaGFuZ2UoKSx0aGlzfWNvbmp1Z2F0ZSh0PXRoaXMuX3RhcmdldCl7cmV0dXJuIGtpKHRoaXMuX3RhcmdldCx0KSx0aGlzLm9uQ2hhbmdlKCksdGhpc31jb3B5KHQpe3JldHVybiBXaSh0aGlzLl90YXJnZXQsdCksdGhpcy5vbkNoYW5nZSgpLHRoaXN9bm9ybWFsaXplKHQ9dGhpcy5fdGFyZ2V0KXtyZXR1cm4gamkodGhpcy5fdGFyZ2V0LHQpLHRoaXMub25DaGFuZ2UoKSx0aGlzfW11bHRpcGx5KHQsZSl7cmV0dXJuIGU/c2UodGhpcy5fdGFyZ2V0LHQsZSk6c2UodGhpcy5fdGFyZ2V0LHRoaXMuX3RhcmdldCx0KSx0aGlzLm9uQ2hhbmdlKCksdGhpc31kb3QodCl7cmV0dXJuIFlpKHRoaXMuX3RhcmdldCx0KX1mcm9tTWF0cml4Myh0KXtyZXR1cm4gR2kodGhpcy5fdGFyZ2V0LHQpLHRoaXMub25DaGFuZ2UoKSx0aGlzfWZyb21FdWxlcih0LGUpe3JldHVybiBYaSh0aGlzLl90YXJnZXQsdCx0Lm9yZGVyKSxlfHx0aGlzLm9uQ2hhbmdlKCksdGhpc31mcm9tQXhpc0FuZ2xlKHQsZSl7cmV0dXJuIElpKHRoaXMuX3RhcmdldCx0LGUpLHRoaXMub25DaGFuZ2UoKSx0aGlzfXNsZXJwKHQsZSl7cmV0dXJuIFZpKHRoaXMuX3RhcmdldCx0aGlzLl90YXJnZXQsdCxlKSx0aGlzLm9uQ2hhbmdlKCksdGhpc31mcm9tQXJyYXkodCxlPTApe3JldHVybiB0aGlzLl90YXJnZXRbMF09dFtlXSx0aGlzLl90YXJnZXRbMV09dFtlKzFdLHRoaXMuX3RhcmdldFsyXT10W2UrMl0sdGhpcy5fdGFyZ2V0WzNdPXRbZSszXSx0aGlzLm9uQ2hhbmdlKCksdGhpc310b0FycmF5KHQ9W10sZT0wKXtyZXR1cm4gdFtlXT10aGlzWzBdLHRbZSsxXT10aGlzWzFdLHRbZSsyXT10aGlzWzJdLHRbZSszXT10aGlzWzNdLHR9fTt2YXIgX3M9MWUtNjtmdW5jdGlvbiBIaShpLHQpe3JldHVybiBpWzBdPXRbMF0saVsxXT10WzFdLGlbMl09dFsyXSxpWzNdPXRbM10saVs0XT10WzRdLGlbNV09dFs1XSxpWzZdPXRbNl0saVs3XT10WzddLGlbOF09dFs4XSxpWzldPXRbOV0saVsxMF09dFsxMF0saVsxMV09dFsxMV0saVsxMl09dFsxMl0saVsxM109dFsxM10saVsxNF09dFsxNF0saVsxNV09dFsxNV0saX1mdW5jdGlvbiBRaShpLHQsZSxyLHMsbixhLGgsbyxsLGMsZixwLHUsZCx4LG0pe3JldHVybiBpWzBdPXQsaVsxXT1lLGlbMl09cixpWzNdPXMsaVs0XT1uLGlbNV09YSxpWzZdPWgsaVs3XT1vLGlbOF09bCxpWzldPWMsaVsxMF09ZixpWzExXT1wLGlbMTJdPXUsaVsxM109ZCxpWzE0XT14LGlbMTVdPW0saX1mdW5jdGlvbiBLaShpKXtyZXR1cm4gaVswXT0xLGlbMV09MCxpWzJdPTAsaVszXT0wLGlbNF09MCxpWzVdPTEsaVs2XT0wLGlbN109MCxpWzhdPTAsaVs5XT0wLGlbMTBdPTEsaVsxMV09MCxpWzEyXT0wLGlbMTNdPTAsaVsxNF09MCxpWzE1XT0xLGl9ZnVuY3Rpb24gWmkoaSx0KXtsZXQgZT10WzBdLHI9dFsxXSxzPXRbMl0sbj10WzNdLGE9dFs0XSxoPXRbNV0sbz10WzZdLGw9dFs3XSxjPXRbOF0sZj10WzldLHA9dFsxMF0sdT10WzExXSxkPXRbMTJdLHg9dFsxM10sbT10WzE0XSxnPXRbMTVdLEE9ZSpoLXIqYSx3PWUqby1zKmEsXz1lKmwtbiphLE09cipvLXMqaCx5PXIqbC1uKmgsYj1zKmwtbipvLHo9Yyp4LWYqZCxSPWMqbS1wKmQsdj1jKmctdSpkLEw9ZiptLXAqeCxUPWYqZy11KngsUz1wKmctdSptLEY9QSpTLXcqVCtfKkwrTSp2LXkqUitiKno7cmV0dXJuIEY/KEY9MS9GLGlbMF09KGgqUy1vKlQrbCpMKSpGLGlbMV09KHMqVC1yKlMtbipMKSpGLGlbMl09KHgqYi1tKnkrZypNKSpGLGlbM109KHAqeS1mKmItdSpNKSpGLGlbNF09KG8qdi1hKlMtbCpSKSpGLGlbNV09KGUqUy1zKnYrbipSKSpGLGlbNl09KG0qXy1kKmItZyp3KSpGLGlbN109KGMqYi1wKl8rdSp3KSpGLGlbOF09KGEqVC1oKnYrbCp6KSpGLGlbOV09KHIqdi1lKlQtbip6KSpGLGlbMTBdPShkKnkteCpfK2cqQSkqRixpWzExXT0oZipfLWMqeS11KkEpKkYsaVsxMl09KGgqUi1hKkwtbyp6KSpGLGlbMTNdPShlKkwtcipSK3MqeikqRixpWzE0XT0oeCp3LWQqTS1tKkEpKkYsaVsxNV09KGMqTS1mKncrcCpBKSpGLGkpOm51bGx9ZnVuY3Rpb24gbmUoaSl7bGV0IHQ9aVswXSxlPWlbMV0scj1pWzJdLHM9aVszXSxuPWlbNF0sYT1pWzVdLGg9aVs2XSxvPWlbN10sbD1pWzhdLGM9aVs5XSxmPWlbMTBdLHA9aVsxMV0sdT1pWzEyXSxkPWlbMTNdLHg9aVsxNF0sbT1pWzE1XSxnPXQqYS1lKm4sQT10KmgtcipuLHc9dCpvLXMqbixfPWUqaC1yKmEsTT1lKm8tcyphLHk9cipvLXMqaCxiPWwqZC1jKnUsej1sKngtZip1LFI9bCptLXAqdSx2PWMqeC1mKmQsTD1jKm0tcCpkLFQ9ZiptLXAqeDtyZXR1cm4gZypULUEqTCt3KnYrXypSLU0qeit5KmJ9ZnVuY3Rpb24gYWUoaSx0LGUpe2xldCByPXRbMF0scz10WzFdLG49dFsyXSxhPXRbM10saD10WzRdLG89dFs1XSxsPXRbNl0sYz10WzddLGY9dFs4XSxwPXRbOV0sdT10WzEwXSxkPXRbMTFdLHg9dFsxMl0sbT10WzEzXSxnPXRbMTRdLEE9dFsxNV0sdz1lWzBdLF89ZVsxXSxNPWVbMl0seT1lWzNdO3JldHVybiBpWzBdPXcqcitfKmgrTSpmK3kqeCxpWzFdPXcqcytfKm8rTSpwK3kqbSxpWzJdPXcqbitfKmwrTSp1K3kqZyxpWzNdPXcqYStfKmMrTSpkK3kqQSx3PWVbNF0sXz1lWzVdLE09ZVs2XSx5PWVbN10saVs0XT13KnIrXypoK00qZit5KngsaVs1XT13KnMrXypvK00qcCt5Km0saVs2XT13Km4rXypsK00qdSt5KmcsaVs3XT13KmErXypjK00qZCt5KkEsdz1lWzhdLF89ZVs5XSxNPWVbMTBdLHk9ZVsxMV0saVs4XT13KnIrXypoK00qZit5KngsaVs5XT13KnMrXypvK00qcCt5Km0saVsxMF09dypuK18qbCtNKnUreSpnLGlbMTFdPXcqYStfKmMrTSpkK3kqQSx3PWVbMTJdLF89ZVsxM10sTT1lWzE0XSx5PWVbMTVdLGlbMTJdPXcqcitfKmgrTSpmK3kqeCxpWzEzXT13KnMrXypvK00qcCt5Km0saVsxNF09dypuK18qbCtNKnUreSpnLGlbMTVdPXcqYStfKmMrTSpkK3kqQSxpfWZ1bmN0aW9uICRpKGksdCxlKXtsZXQgcj1lWzBdLHM9ZVsxXSxuPWVbMl0sYSxoLG8sbCxjLGYscCx1LGQseCxtLGc7cmV0dXJuIHQ9PT1pPyhpWzEyXT10WzBdKnIrdFs0XSpzK3RbOF0qbit0WzEyXSxpWzEzXT10WzFdKnIrdFs1XSpzK3RbOV0qbit0WzEzXSxpWzE0XT10WzJdKnIrdFs2XSpzK3RbMTBdKm4rdFsxNF0saVsxNV09dFszXSpyK3RbN10qcyt0WzExXSpuK3RbMTVdKTooYT10WzBdLGg9dFsxXSxvPXRbMl0sbD10WzNdLGM9dFs0XSxmPXRbNV0scD10WzZdLHU9dFs3XSxkPXRbOF0seD10WzldLG09dFsxMF0sZz10WzExXSxpWzBdPWEsaVsxXT1oLGlbMl09byxpWzNdPWwsaVs0XT1jLGlbNV09ZixpWzZdPXAsaVs3XT11LGlbOF09ZCxpWzldPXgsaVsxMF09bSxpWzExXT1nLGlbMTJdPWEqcitjKnMrZCpuK3RbMTJdLGlbMTNdPWgqcitmKnMreCpuK3RbMTNdLGlbMTRdPW8qcitwKnMrbSpuK3RbMTRdLGlbMTVdPWwqcit1KnMrZypuK3RbMTVdKSxpfWZ1bmN0aW9uIEppKGksdCxlKXtsZXQgcj1lWzBdLHM9ZVsxXSxuPWVbMl07cmV0dXJuIGlbMF09dFswXSpyLGlbMV09dFsxXSpyLGlbMl09dFsyXSpyLGlbM109dFszXSpyLGlbNF09dFs0XSpzLGlbNV09dFs1XSpzLGlbNl09dFs2XSpzLGlbN109dFs3XSpzLGlbOF09dFs4XSpuLGlbOV09dFs5XSpuLGlbMTBdPXRbMTBdKm4saVsxMV09dFsxMV0qbixpWzEyXT10WzEyXSxpWzEzXT10WzEzXSxpWzE0XT10WzE0XSxpWzE1XT10WzE1XSxpfWZ1bmN0aW9uIHRyKGksdCxlLHIpe2xldCBzPXJbMF0sbj1yWzFdLGE9clsyXSxoPU1hdGguaHlwb3QocyxuLGEpLG8sbCxjLGYscCx1LGQseCxtLGcsQSx3LF8sTSx5LGIseixSLHYsTCxULFMsRixDO3JldHVybiBNYXRoLmFicyhoKTxfcz9udWxsOihoPTEvaCxzKj1oLG4qPWgsYSo9aCxvPU1hdGguc2luKGUpLGw9TWF0aC5jb3MoZSksYz0xLWwsZj10WzBdLHA9dFsxXSx1PXRbMl0sZD10WzNdLHg9dFs0XSxtPXRbNV0sZz10WzZdLEE9dFs3XSx3PXRbOF0sXz10WzldLE09dFsxMF0seT10WzExXSxiPXMqcypjK2wsej1uKnMqYythKm8sUj1hKnMqYy1uKm8sdj1zKm4qYy1hKm8sTD1uKm4qYytsLFQ9YSpuKmMrcypvLFM9cyphKmMrbipvLEY9biphKmMtcypvLEM9YSphKmMrbCxpWzBdPWYqYit4KnordypSLGlbMV09cCpiK20qeitfKlIsaVsyXT11KmIrZyp6K00qUixpWzNdPWQqYitBKnoreSpSLGlbNF09Zip2K3gqTCt3KlQsaVs1XT1wKnYrbSpMK18qVCxpWzZdPXUqditnKkwrTSpULGlbN109ZCp2K0EqTCt5KlQsaVs4XT1mKlMreCpGK3cqQyxpWzldPXAqUyttKkYrXypDLGlbMTBdPXUqUytnKkYrTSpDLGlbMTFdPWQqUytBKkYreSpDLHQhPT1pJiYoaVsxMl09dFsxMl0saVsxM109dFsxM10saVsxNF09dFsxNF0saVsxNV09dFsxNV0pLGkpfWZ1bmN0aW9uIGVyKGksdCl7cmV0dXJuIGlbMF09dFsxMl0saVsxXT10WzEzXSxpWzJdPXRbMTRdLGl9ZnVuY3Rpb24gb2UoaSx0KXtsZXQgZT10WzBdLHI9dFsxXSxzPXRbMl0sbj10WzRdLGE9dFs1XSxoPXRbNl0sbz10WzhdLGw9dFs5XSxjPXRbMTBdO3JldHVybiBpWzBdPU1hdGguaHlwb3QoZSxyLHMpLGlbMV09TWF0aC5oeXBvdChuLGEsaCksaVsyXT1NYXRoLmh5cG90KG8sbCxjKSxpfWZ1bmN0aW9uIGlyKGkpe2xldCB0PWlbMF0sZT1pWzFdLHI9aVsyXSxzPWlbNF0sbj1pWzVdLGE9aVs2XSxoPWlbOF0sbz1pWzldLGw9aVsxMF0sYz10KnQrZSplK3IqcixmPXMqcytuKm4rYSphLHA9aCpoK28qbytsKmw7cmV0dXJuIE1hdGguc3FydChNYXRoLm1heChjLGYscCkpfXZhciBoZT1mdW5jdGlvbigpe2xldCBpPVsxLDEsMV07cmV0dXJuIGZ1bmN0aW9uKHQsZSl7bGV0IHI9aTtvZShyLGUpO2xldCBzPTEvclswXSxuPTEvclsxXSxhPTEvclsyXSxoPWVbMF0qcyxvPWVbMV0qbixsPWVbMl0qYSxjPWVbNF0qcyxmPWVbNV0qbixwPWVbNl0qYSx1PWVbOF0qcyxkPWVbOV0qbix4PWVbMTBdKmEsbT1oK2YreCxnPTA7cmV0dXJuIG0+MD8oZz1NYXRoLnNxcnQobSsxKSoyLHRbM109LjI1KmcsdFswXT0ocC1kKS9nLHRbMV09KHUtbCkvZyx0WzJdPShvLWMpL2cpOmg+ZiYmaD54PyhnPU1hdGguc3FydCgxK2gtZi14KSoyLHRbM109KHAtZCkvZyx0WzBdPS4yNSpnLHRbMV09KG8rYykvZyx0WzJdPSh1K2wpL2cpOmY+eD8oZz1NYXRoLnNxcnQoMStmLWgteCkqMix0WzNdPSh1LWwpL2csdFswXT0obytjKS9nLHRbMV09LjI1KmcsdFsyXT0ocCtkKS9nKTooZz1NYXRoLnNxcnQoMSt4LWgtZikqMix0WzNdPShvLWMpL2csdFswXT0odStsKS9nLHRbMV09KHArZCkvZyx0WzJdPS4yNSpnKSx0fX0oKTtmdW5jdGlvbiBycihpLHQsZSxyKXtsZXQgcz1vdChbaVswXSxpWzFdLGlbMl1dKSxuPW90KFtpWzRdLGlbNV0saVs2XV0pLGE9b3QoW2lbOF0saVs5XSxpWzEwXV0pO25lKGkpPDAmJihzPS1zKSxlWzBdPWlbMTJdLGVbMV09aVsxM10sZVsyXT1pWzE0XTtsZXQgbz1pLnNsaWNlKCksbD0xL3MsYz0xL24sZj0xL2E7b1swXSo9bCxvWzFdKj1sLG9bMl0qPWwsb1s0XSo9YyxvWzVdKj1jLG9bNl0qPWMsb1s4XSo9ZixvWzldKj1mLG9bMTBdKj1mLGhlKHQsbyksclswXT1zLHJbMV09bixyWzJdPWF9ZnVuY3Rpb24gc3IoaSx0LGUscil7bGV0IHM9aSxuPXRbMF0sYT10WzFdLGg9dFsyXSxvPXRbM10sbD1uK24sYz1hK2EsZj1oK2gscD1uKmwsdT1uKmMsZD1uKmYseD1hKmMsbT1hKmYsZz1oKmYsQT1vKmwsdz1vKmMsXz1vKmYsTT1yWzBdLHk9clsxXSxiPXJbMl07cmV0dXJuIHNbMF09KDEtKHgrZykpKk0sc1sxXT0odStfKSpNLHNbMl09KGQtdykqTSxzWzNdPTAsc1s0XT0odS1fKSp5LHNbNV09KDEtKHArZykpKnksc1s2XT0obStBKSp5LHNbN109MCxzWzhdPShkK3cpKmIsc1s5XT0obS1BKSpiLHNbMTBdPSgxLShwK3gpKSpiLHNbMTFdPTAsc1sxMl09ZVswXSxzWzEzXT1lWzFdLHNbMTRdPWVbMl0sc1sxNV09MSxzfWZ1bmN0aW9uIG5yKGksdCl7bGV0IGU9dFswXSxyPXRbMV0scz10WzJdLG49dFszXSxhPWUrZSxoPXIrcixvPXMrcyxsPWUqYSxjPXIqYSxmPXIqaCxwPXMqYSx1PXMqaCxkPXMqbyx4PW4qYSxtPW4qaCxnPW4qbztyZXR1cm4gaVswXT0xLWYtZCxpWzFdPWMrZyxpWzJdPXAtbSxpWzNdPTAsaVs0XT1jLWcsaVs1XT0xLWwtZCxpWzZdPXUreCxpWzddPTAsaVs4XT1wK20saVs5XT11LXgsaVsxMF09MS1sLWYsaVsxMV09MCxpWzEyXT0wLGlbMTNdPTAsaVsxNF09MCxpWzE1XT0xLGl9ZnVuY3Rpb24gYXIoaSx0LGUscixzKXtsZXQgbj0xL01hdGgudGFuKHQvMiksYT0xLyhyLXMpO3JldHVybiBpWzBdPW4vZSxpWzFdPTAsaVsyXT0wLGlbM109MCxpWzRdPTAsaVs1XT1uLGlbNl09MCxpWzddPTAsaVs4XT0wLGlbOV09MCxpWzEwXT0ocytyKSphLGlbMTFdPS0xLGlbMTJdPTAsaVsxM109MCxpWzE0XT0yKnMqciphLGlbMTVdPTAsaX1mdW5jdGlvbiBvcihpLHQsZSxyLHMsbixhKXtsZXQgaD0xLyh0LWUpLG89MS8oci1zKSxsPTEvKG4tYSk7cmV0dXJuIGlbMF09LTIqaCxpWzFdPTAsaVsyXT0wLGlbM109MCxpWzRdPTAsaVs1XT0tMipvLGlbNl09MCxpWzddPTAsaVs4XT0wLGlbOV09MCxpWzEwXT0yKmwsaVsxMV09MCxpWzEyXT0odCtlKSpoLGlbMTNdPShzK3IpKm8saVsxNF09KGErbikqbCxpWzE1XT0xLGl9ZnVuY3Rpb24gaHIoaSx0LGUscil7bGV0IHM9dFswXSxuPXRbMV0sYT10WzJdLGg9clswXSxvPXJbMV0sbD1yWzJdLGM9cy1lWzBdLGY9bi1lWzFdLHA9YS1lWzJdLHU9YypjK2YqZitwKnA7dT09PTA/cD0xOih1PTEvTWF0aC5zcXJ0KHUpLGMqPXUsZio9dSxwKj11KTtsZXQgZD1vKnAtbCpmLHg9bCpjLWgqcCxtPWgqZi1vKmM7cmV0dXJuIHU9ZCpkK3gqeCttKm0sdT09PTAmJihsP2grPTFlLTY6bz9sKz0xZS02Om8rPTFlLTYsZD1vKnAtbCpmLHg9bCpjLWgqcCxtPWgqZi1vKmMsdT1kKmQreCp4K20qbSksdT0xL01hdGguc3FydCh1KSxkKj11LHgqPXUsbSo9dSxpWzBdPWQsaVsxXT14LGlbMl09bSxpWzNdPTAsaVs0XT1mKm0tcCp4LGlbNV09cCpkLWMqbSxpWzZdPWMqeC1mKmQsaVs3XT0wLGlbOF09YyxpWzldPWYsaVsxMF09cCxpWzExXT0wLGlbMTJdPXMsaVsxM109bixpWzE0XT1hLGlbMTVdPTEsaX1mdW5jdGlvbiBsZShpLHQsZSl7cmV0dXJuIGlbMF09dFswXStlWzBdLGlbMV09dFsxXStlWzFdLGlbMl09dFsyXStlWzJdLGlbM109dFszXStlWzNdLGlbNF09dFs0XStlWzRdLGlbNV09dFs1XStlWzVdLGlbNl09dFs2XStlWzZdLGlbN109dFs3XStlWzddLGlbOF09dFs4XStlWzhdLGlbOV09dFs5XStlWzldLGlbMTBdPXRbMTBdK2VbMTBdLGlbMTFdPXRbMTFdK2VbMTFdLGlbMTJdPXRbMTJdK2VbMTJdLGlbMTNdPXRbMTNdK2VbMTNdLGlbMTRdPXRbMTRdK2VbMTRdLGlbMTVdPXRbMTVdK2VbMTVdLGl9ZnVuY3Rpb24gY2UoaSx0LGUpe3JldHVybiBpWzBdPXRbMF0tZVswXSxpWzFdPXRbMV0tZVsxXSxpWzJdPXRbMl0tZVsyXSxpWzNdPXRbM10tZVszXSxpWzRdPXRbNF0tZVs0XSxpWzVdPXRbNV0tZVs1XSxpWzZdPXRbNl0tZVs2XSxpWzddPXRbN10tZVs3XSxpWzhdPXRbOF0tZVs4XSxpWzldPXRbOV0tZVs5XSxpWzEwXT10WzEwXS1lWzEwXSxpWzExXT10WzExXS1lWzExXSxpWzEyXT10WzEyXS1lWzEyXSxpWzEzXT10WzEzXS1lWzEzXSxpWzE0XT10WzE0XS1lWzE0XSxpWzE1XT10WzE1XS1lWzE1XSxpfWZ1bmN0aW9uIGxyKGksdCxlKXtyZXR1cm4gaVswXT10WzBdKmUsaVsxXT10WzFdKmUsaVsyXT10WzJdKmUsaVszXT10WzNdKmUsaVs0XT10WzRdKmUsaVs1XT10WzVdKmUsaVs2XT10WzZdKmUsaVs3XT10WzddKmUsaVs4XT10WzhdKmUsaVs5XT10WzldKmUsaVsxMF09dFsxMF0qZSxpWzExXT10WzExXSplLGlbMTJdPXRbMTJdKmUsaVsxM109dFsxM10qZSxpWzE0XT10WzE0XSplLGlbMTVdPXRbMTVdKmUsaX12YXIgVj1jbGFzcyBleHRlbmRzIEFycmF5e2NvbnN0cnVjdG9yKHQ9MSxlPTAscj0wLHM9MCxuPTAsYT0xLGg9MCxvPTAsbD0wLGM9MCxmPTEscD0wLHU9MCxkPTAseD0wLG09MSl7cmV0dXJuIHN1cGVyKHQsZSxyLHMsbixhLGgsbyxsLGMsZixwLHUsZCx4LG0pLHRoaXN9Z2V0IHgoKXtyZXR1cm4gdGhpc1sxMl19Z2V0IHkoKXtyZXR1cm4gdGhpc1sxM119Z2V0IHooKXtyZXR1cm4gdGhpc1sxNF19Z2V0IHcoKXtyZXR1cm4gdGhpc1sxNV19c2V0IHgodCl7dGhpc1sxMl09dH1zZXQgeSh0KXt0aGlzWzEzXT10fXNldCB6KHQpe3RoaXNbMTRdPXR9c2V0IHcodCl7dGhpc1sxNV09dH1zZXQodCxlLHIscyxuLGEsaCxvLGwsYyxmLHAsdSxkLHgsbSl7cmV0dXJuIHQubGVuZ3RoP3RoaXMuY29weSh0KTooUWkodGhpcyx0LGUscixzLG4sYSxoLG8sbCxjLGYscCx1LGQseCxtKSx0aGlzKX10cmFuc2xhdGUodCxlPXRoaXMpe3JldHVybiAkaSh0aGlzLGUsdCksdGhpc31yb3RhdGUodCxlLHI9dGhpcyl7cmV0dXJuIHRyKHRoaXMscix0LGUpLHRoaXN9c2NhbGUodCxlPXRoaXMpe3JldHVybiBKaSh0aGlzLGUsdHlwZW9mIHQ9PSJudW1iZXIiP1t0LHQsdF06dCksdGhpc31hZGQodCxlKXtyZXR1cm4gZT9sZSh0aGlzLHQsZSk6bGUodGhpcyx0aGlzLHQpLHRoaXN9c3ViKHQsZSl7cmV0dXJuIGU/Y2UodGhpcyx0LGUpOmNlKHRoaXMsdGhpcyx0KSx0aGlzfW11bHRpcGx5KHQsZSl7cmV0dXJuIHQubGVuZ3RoP2U/YWUodGhpcyx0LGUpOmFlKHRoaXMsdGhpcyx0KTpscih0aGlzLHRoaXMsdCksdGhpc31pZGVudGl0eSgpe3JldHVybiBLaSh0aGlzKSx0aGlzfWNvcHkodCl7cmV0dXJuIEhpKHRoaXMsdCksdGhpc31mcm9tUGVyc3BlY3RpdmUoe2Zvdjp0LGFzcGVjdDplLG5lYXI6cixmYXI6c309e30pe3JldHVybiBhcih0aGlzLHQsZSxyLHMpLHRoaXN9ZnJvbU9ydGhvZ29uYWwoe2xlZnQ6dCxyaWdodDplLGJvdHRvbTpyLHRvcDpzLG5lYXI6bixmYXI6YX0pe3JldHVybiBvcih0aGlzLHQsZSxyLHMsbixhKSx0aGlzfWZyb21RdWF0ZXJuaW9uKHQpe3JldHVybiBucih0aGlzLHQpLHRoaXN9c2V0UG9zaXRpb24odCl7cmV0dXJuIHRoaXMueD10WzBdLHRoaXMueT10WzFdLHRoaXMuej10WzJdLHRoaXN9aW52ZXJzZSh0PXRoaXMpe3JldHVybiBaaSh0aGlzLHQpLHRoaXN9Y29tcG9zZSh0LGUscil7cmV0dXJuIHNyKHRoaXMsdCxlLHIpLHRoaXN9ZGVjb21wb3NlKHQsZSxyKXtyZXR1cm4gcnIodGhpcyx0LGUsciksdGhpc31nZXRSb3RhdGlvbih0KXtyZXR1cm4gaGUodCx0aGlzKSx0aGlzfWdldFRyYW5zbGF0aW9uKHQpe3JldHVybiBlcih0LHRoaXMpLHRoaXN9Z2V0U2NhbGluZyh0KXtyZXR1cm4gb2UodCx0aGlzKSx0aGlzfWdldE1heFNjYWxlT25BeGlzKCl7cmV0dXJuIGlyKHRoaXMpfWxvb2tBdCh0LGUscil7cmV0dXJuIGhyKHRoaXMsdCxlLHIpLHRoaXN9ZGV0ZXJtaW5hbnQoKXtyZXR1cm4gbmUodGhpcyl9ZnJvbUFycmF5KHQsZT0wKXtyZXR1cm4gdGhpc1swXT10W2VdLHRoaXNbMV09dFtlKzFdLHRoaXNbMl09dFtlKzJdLHRoaXNbM109dFtlKzNdLHRoaXNbNF09dFtlKzRdLHRoaXNbNV09dFtlKzVdLHRoaXNbNl09dFtlKzZdLHRoaXNbN109dFtlKzddLHRoaXNbOF09dFtlKzhdLHRoaXNbOV09dFtlKzldLHRoaXNbMTBdPXRbZSsxMF0sdGhpc1sxMV09dFtlKzExXSx0aGlzWzEyXT10W2UrMTJdLHRoaXNbMTNdPXRbZSsxM10sdGhpc1sxNF09dFtlKzE0XSx0aGlzWzE1XT10W2UrMTVdLHRoaXN9dG9BcnJheSh0PVtdLGU9MCl7cmV0dXJuIHRbZV09dGhpc1swXSx0W2UrMV09dGhpc1sxXSx0W2UrMl09dGhpc1syXSx0W2UrM109dGhpc1szXSx0W2UrNF09dGhpc1s0XSx0W2UrNV09dGhpc1s1XSx0W2UrNl09dGhpc1s2XSx0W2UrN109dGhpc1s3XSx0W2UrOF09dGhpc1s4XSx0W2UrOV09dGhpc1s5XSx0W2UrMTBdPXRoaXNbMTBdLHRbZSsxMV09dGhpc1sxMV0sdFtlKzEyXT10aGlzWzEyXSx0W2UrMTNdPXRoaXNbMTNdLHRbZSsxNF09dGhpc1sxNF0sdFtlKzE1XT10aGlzWzE1XSx0fX07ZnVuY3Rpb24gY3IoaSx0LGU9IllYWiIpe3JldHVybiBlPT09IlhZWiI/KGlbMV09TWF0aC5hc2luKE1hdGgubWluKE1hdGgubWF4KHRbOF0sLTEpLDEpKSxNYXRoLmFicyh0WzhdKTwuOTk5OTk/KGlbMF09TWF0aC5hdGFuMigtdFs5XSx0WzEwXSksaVsyXT1NYXRoLmF0YW4yKC10WzRdLHRbMF0pKTooaVswXT1NYXRoLmF0YW4yKHRbNl0sdFs1XSksaVsyXT0wKSk6ZT09PSJZWFoiPyhpWzBdPU1hdGguYXNpbigtTWF0aC5taW4oTWF0aC5tYXgodFs5XSwtMSksMSkpLE1hdGguYWJzKHRbOV0pPC45OTk5OT8oaVsxXT1NYXRoLmF0YW4yKHRbOF0sdFsxMF0pLGlbMl09TWF0aC5hdGFuMih0WzFdLHRbNV0pKTooaVsxXT1NYXRoLmF0YW4yKC10WzJdLHRbMF0pLGlbMl09MCkpOmU9PT0iWlhZIj8oaVswXT1NYXRoLmFzaW4oTWF0aC5taW4oTWF0aC5tYXgodFs2XSwtMSksMSkpLE1hdGguYWJzKHRbNl0pPC45OTk5OT8oaVsxXT1NYXRoLmF0YW4yKC10WzJdLHRbMTBdKSxpWzJdPU1hdGguYXRhbjIoLXRbNF0sdFs1XSkpOihpWzFdPTAsaVsyXT1NYXRoLmF0YW4yKHRbMV0sdFswXSkpKTplPT09IlpZWCI/KGlbMV09TWF0aC5hc2luKC1NYXRoLm1pbihNYXRoLm1heCh0WzJdLC0xKSwxKSksTWF0aC5hYnModFsyXSk8Ljk5OTk5PyhpWzBdPU1hdGguYXRhbjIodFs2XSx0WzEwXSksaVsyXT1NYXRoLmF0YW4yKHRbMV0sdFswXSkpOihpWzBdPTAsaVsyXT1NYXRoLmF0YW4yKC10WzRdLHRbNV0pKSk6ZT09PSJZWlgiPyhpWzJdPU1hdGguYXNpbihNYXRoLm1pbihNYXRoLm1heCh0WzFdLC0xKSwxKSksTWF0aC5hYnModFsxXSk8Ljk5OTk5PyhpWzBdPU1hdGguYXRhbjIoLXRbOV0sdFs1XSksaVsxXT1NYXRoLmF0YW4yKC10WzJdLHRbMF0pKTooaVswXT0wLGlbMV09TWF0aC5hdGFuMih0WzhdLHRbMTBdKSkpOmU9PT0iWFpZIiYmKGlbMl09TWF0aC5hc2luKC1NYXRoLm1pbihNYXRoLm1heCh0WzRdLC0xKSwxKSksTWF0aC5hYnModFs0XSk8Ljk5OTk5PyhpWzBdPU1hdGguYXRhbjIodFs2XSx0WzVdKSxpWzFdPU1hdGguYXRhbjIodFs4XSx0WzBdKSk6KGlbMF09TWF0aC5hdGFuMigtdFs5XSx0WzEwXSksaVsxXT0wKSksaX12YXIgZnI9bmV3IFYseHQ9Y2xhc3MgZXh0ZW5kcyBBcnJheXtjb25zdHJ1Y3Rvcih0PTAsZT10LHI9dCxzPSJZWFoiKXtzdXBlcih0LGUsciksdGhpcy5vcmRlcj1zLHRoaXMub25DaGFuZ2U9KCk9Pnt9LHRoaXMuX3RhcmdldD10aGlzO2xldCBuPVsiMCIsIjEiLCIyIl07cmV0dXJuIG5ldyBQcm94eSh0aGlzLHtzZXQoYSxoKXtsZXQgbz1SZWZsZWN0LnNldCguLi5hcmd1bWVudHMpO3JldHVybiBvJiZuLmluY2x1ZGVzKGgpJiZhLm9uQ2hhbmdlKCksb319KX1nZXQgeCgpe3JldHVybiB0aGlzWzBdfWdldCB5KCl7cmV0dXJuIHRoaXNbMV19Z2V0IHooKXtyZXR1cm4gdGhpc1syXX1zZXQgeCh0KXt0aGlzLl90YXJnZXRbMF09dCx0aGlzLm9uQ2hhbmdlKCl9c2V0IHkodCl7dGhpcy5fdGFyZ2V0WzFdPXQsdGhpcy5vbkNoYW5nZSgpfXNldCB6KHQpe3RoaXMuX3RhcmdldFsyXT10LHRoaXMub25DaGFuZ2UoKX1zZXQodCxlPXQscj10KXtyZXR1cm4gdC5sZW5ndGg/dGhpcy5jb3B5KHQpOih0aGlzLl90YXJnZXRbMF09dCx0aGlzLl90YXJnZXRbMV09ZSx0aGlzLl90YXJnZXRbMl09cix0aGlzLm9uQ2hhbmdlKCksdGhpcyl9Y29weSh0KXtyZXR1cm4gdGhpcy5fdGFyZ2V0WzBdPXRbMF0sdGhpcy5fdGFyZ2V0WzFdPXRbMV0sdGhpcy5fdGFyZ2V0WzJdPXRbMl0sdGhpcy5vbkNoYW5nZSgpLHRoaXN9cmVvcmRlcih0KXtyZXR1cm4gdGhpcy5fdGFyZ2V0Lm9yZGVyPXQsdGhpcy5vbkNoYW5nZSgpLHRoaXN9ZnJvbVJvdGF0aW9uTWF0cml4KHQsZT10aGlzLm9yZGVyKXtyZXR1cm4gY3IodGhpcy5fdGFyZ2V0LHQsZSksdGhpcy5vbkNoYW5nZSgpLHRoaXN9ZnJvbVF1YXRlcm5pb24odCxlPXRoaXMub3JkZXIscil7cmV0dXJuIGZyLmZyb21RdWF0ZXJuaW9uKHQpLHRoaXMuX3RhcmdldC5mcm9tUm90YXRpb25NYXRyaXgoZnIsZSkscnx8dGhpcy5vbkNoYW5nZSgpLHRoaXN9ZnJvbUFycmF5KHQsZT0wKXtyZXR1cm4gdGhpcy5fdGFyZ2V0WzBdPXRbZV0sdGhpcy5fdGFyZ2V0WzFdPXRbZSsxXSx0aGlzLl90YXJnZXRbMl09dFtlKzJdLHRoaXN9dG9BcnJheSh0PVtdLGU9MCl7cmV0dXJuIHRbZV09dGhpc1swXSx0W2UrMV09dGhpc1sxXSx0W2UrMl09dGhpc1syXSx0fX07dmFyIEg9Y2xhc3N7Y29uc3RydWN0b3IoKXt0aGlzLnBhcmVudD1udWxsLHRoaXMuY2hpbGRyZW49W10sdGhpcy52aXNpYmxlPSEwLHRoaXMubWF0cml4PW5ldyBWLHRoaXMud29ybGRNYXRyaXg9bmV3IFYsdGhpcy5tYXRyaXhBdXRvVXBkYXRlPSEwLHRoaXMud29ybGRNYXRyaXhOZWVkc1VwZGF0ZT0hMSx0aGlzLnBvc2l0aW9uPW5ldyBFLHRoaXMucXVhdGVybmlvbj1uZXcgSyx0aGlzLnNjYWxlPW5ldyBFKDEpLHRoaXMucm90YXRpb249bmV3IHh0LHRoaXMudXA9bmV3IEUoMCwxLDApLHRoaXMucm90YXRpb24uX3RhcmdldC5vbkNoYW5nZT0oKT0+dGhpcy5xdWF0ZXJuaW9uLmZyb21FdWxlcih0aGlzLnJvdGF0aW9uLCEwKSx0aGlzLnF1YXRlcm5pb24uX3RhcmdldC5vbkNoYW5nZT0oKT0+dGhpcy5yb3RhdGlvbi5mcm9tUXVhdGVybmlvbih0aGlzLnF1YXRlcm5pb24sdm9pZCAwLCEwKX1zZXRQYXJlbnQodCxlPSEwKXt0aGlzLnBhcmVudCYmdCE9PXRoaXMucGFyZW50JiZ0aGlzLnBhcmVudC5yZW1vdmVDaGlsZCh0aGlzLCExKSx0aGlzLnBhcmVudD10LGUmJnQmJnQuYWRkQ2hpbGQodGhpcywhMSl9YWRkQ2hpbGQodCxlPSEwKXt+dGhpcy5jaGlsZHJlbi5pbmRleE9mKHQpfHx0aGlzLmNoaWxkcmVuLnB1c2godCksZSYmdC5zZXRQYXJlbnQodGhpcywhMSl9cmVtb3ZlQ2hpbGQodCxlPSEwKXt+dGhpcy5jaGlsZHJlbi5pbmRleE9mKHQpJiZ0aGlzLmNoaWxkcmVuLnNwbGljZSh0aGlzLmNoaWxkcmVuLmluZGV4T2YodCksMSksZSYmdC5zZXRQYXJlbnQobnVsbCwhMSl9dXBkYXRlTWF0cml4V29ybGQodCl7dGhpcy5tYXRyaXhBdXRvVXBkYXRlJiZ0aGlzLnVwZGF0ZU1hdHJpeCgpLCh0aGlzLndvcmxkTWF0cml4TmVlZHNVcGRhdGV8fHQpJiYodGhpcy5wYXJlbnQ9PT1udWxsP3RoaXMud29ybGRNYXRyaXguY29weSh0aGlzLm1hdHJpeCk6dGhpcy53b3JsZE1hdHJpeC5tdWx0aXBseSh0aGlzLnBhcmVudC53b3JsZE1hdHJpeCx0aGlzLm1hdHJpeCksdGhpcy53b3JsZE1hdHJpeE5lZWRzVXBkYXRlPSExLHQ9ITApO2ZvcihsZXQgZT0wLHI9dGhpcy5jaGlsZHJlbi5sZW5ndGg7ZTxyO2UrKyl0aGlzLmNoaWxkcmVuW2VdLnVwZGF0ZU1hdHJpeFdvcmxkKHQpfXVwZGF0ZU1hdHJpeCgpe3RoaXMubWF0cml4LmNvbXBvc2UodGhpcy5xdWF0ZXJuaW9uLHRoaXMucG9zaXRpb24sdGhpcy5zY2FsZSksdGhpcy53b3JsZE1hdHJpeE5lZWRzVXBkYXRlPSEwfXRyYXZlcnNlKHQpe2lmKCF0KHRoaXMpKWZvcihsZXQgZT0wLHI9dGhpcy5jaGlsZHJlbi5sZW5ndGg7ZTxyO2UrKyl0aGlzLmNoaWxkcmVuW2VdLnRyYXZlcnNlKHQpfWRlY29tcG9zZSgpe3RoaXMubWF0cml4LmRlY29tcG9zZSh0aGlzLnF1YXRlcm5pb24uX3RhcmdldCx0aGlzLnBvc2l0aW9uLHRoaXMuc2NhbGUpLHRoaXMucm90YXRpb24uZnJvbVF1YXRlcm5pb24odGhpcy5xdWF0ZXJuaW9uKX1sb29rQXQodCxlPSExKXtlP3RoaXMubWF0cml4Lmxvb2tBdCh0aGlzLnBvc2l0aW9uLHQsdGhpcy51cCk6dGhpcy5tYXRyaXgubG9va0F0KHQsdGhpcy5wb3NpdGlvbix0aGlzLnVwKSx0aGlzLm1hdHJpeC5nZXRSb3RhdGlvbih0aGlzLnF1YXRlcm5pb24uX3RhcmdldCksdGhpcy5yb3RhdGlvbi5mcm9tUXVhdGVybmlvbih0aGlzLnF1YXRlcm5pb24pfX07dmFyIEZzPW5ldyBWLFRzPW5ldyBFLFJzPW5ldyBFLGh0PWNsYXNzIGV4dGVuZHMgSHtjb25zdHJ1Y3Rvcih0LHtuZWFyOmU9LjEsZmFyOnI9MTAwLGZvdjpzPTQ1LGFzcGVjdDpuPTEsbGVmdDphLHJpZ2h0OmgsYm90dG9tOm8sdG9wOmwsem9vbTpjPTF9PXt9KXtzdXBlcigpLE9iamVjdC5hc3NpZ24odGhpcyx7bmVhcjplLGZhcjpyLGZvdjpzLGFzcGVjdDpuLGxlZnQ6YSxyaWdodDpoLGJvdHRvbTpvLHRvcDpsLHpvb206Y30pLHRoaXMucHJvamVjdGlvbk1hdHJpeD1uZXcgVix0aGlzLnZpZXdNYXRyaXg9bmV3IFYsdGhpcy5wcm9qZWN0aW9uVmlld01hdHJpeD1uZXcgVix0aGlzLndvcmxkUG9zaXRpb249bmV3IEUsdGhpcy50eXBlPWF8fGg/Im9ydGhvZ3JhcGhpYyI6InBlcnNwZWN0aXZlIix0aGlzLnR5cGU9PT0ib3J0aG9ncmFwaGljIj90aGlzLm9ydGhvZ3JhcGhpYygpOnRoaXMucGVyc3BlY3RpdmUoKX1wZXJzcGVjdGl2ZSh7bmVhcjp0PXRoaXMubmVhcixmYXI6ZT10aGlzLmZhcixmb3Y6cj10aGlzLmZvdixhc3BlY3Q6cz10aGlzLmFzcGVjdH09e30pe3JldHVybiBPYmplY3QuYXNzaWduKHRoaXMse25lYXI6dCxmYXI6ZSxmb3Y6cixhc3BlY3Q6c30pLHRoaXMucHJvamVjdGlvbk1hdHJpeC5mcm9tUGVyc3BlY3RpdmUoe2ZvdjpyKihNYXRoLlBJLzE4MCksYXNwZWN0OnMsbmVhcjp0LGZhcjplfSksdGhpcy50eXBlPSJwZXJzcGVjdGl2ZSIsdGhpc31vcnRob2dyYXBoaWMoe25lYXI6dD10aGlzLm5lYXIsZmFyOmU9dGhpcy5mYXIsbGVmdDpyPXRoaXMubGVmdHx8LTEscmlnaHQ6cz10aGlzLnJpZ2h0fHwxLGJvdHRvbTpuPXRoaXMuYm90dG9tfHwtMSx0b3A6YT10aGlzLnRvcHx8MSx6b29tOmg9dGhpcy56b29tfT17fSl7cmV0dXJuIE9iamVjdC5hc3NpZ24odGhpcyx7bmVhcjp0LGZhcjplLGxlZnQ6cixyaWdodDpzLGJvdHRvbTpuLHRvcDphLHpvb206aH0pLHIvPWgscy89aCxuLz1oLGEvPWgsdGhpcy5wcm9qZWN0aW9uTWF0cml4LmZyb21PcnRob2dvbmFsKHtsZWZ0OnIscmlnaHQ6cyxib3R0b206bix0b3A6YSxuZWFyOnQsZmFyOmV9KSx0aGlzLnR5cGU9Im9ydGhvZ3JhcGhpYyIsdGhpc311cGRhdGVNYXRyaXhXb3JsZCgpe3JldHVybiBzdXBlci51cGRhdGVNYXRyaXhXb3JsZCgpLHRoaXMudmlld01hdHJpeC5pbnZlcnNlKHRoaXMud29ybGRNYXRyaXgpLHRoaXMud29ybGRNYXRyaXguZ2V0VHJhbnNsYXRpb24odGhpcy53b3JsZFBvc2l0aW9uKSx0aGlzLnByb2plY3Rpb25WaWV3TWF0cml4Lm11bHRpcGx5KHRoaXMucHJvamVjdGlvbk1hdHJpeCx0aGlzLnZpZXdNYXRyaXgpLHRoaXN9dXBkYXRlUHJvamVjdGlvbk1hdHJpeCgpe3JldHVybiB0aGlzLnR5cGU9PT0icGVyc3BlY3RpdmUiP3RoaXMucGVyc3BlY3RpdmUoKTp0aGlzLm9ydGhvZ3JhcGhpYygpfWxvb2tBdCh0KXtyZXR1cm4gc3VwZXIubG9va0F0KHQsITApLHRoaXN9cHJvamVjdCh0KXtyZXR1cm4gdC5hcHBseU1hdHJpeDQodGhpcy52aWV3TWF0cml4KSx0LmFwcGx5TWF0cml4NCh0aGlzLnByb2plY3Rpb25NYXRyaXgpLHRoaXN9dW5wcm9qZWN0KHQpe3JldHVybiB0LmFwcGx5TWF0cml4NChGcy5pbnZlcnNlKHRoaXMucHJvamVjdGlvbk1hdHJpeCkpLHQuYXBwbHlNYXRyaXg0KHRoaXMud29ybGRNYXRyaXgpLHRoaXN9dXBkYXRlRnJ1c3R1bSgpe3RoaXMuZnJ1c3R1bXx8KHRoaXMuZnJ1c3R1bT1bbmV3IEUsbmV3IEUsbmV3IEUsbmV3IEUsbmV3IEUsbmV3IEVdKTtsZXQgdD10aGlzLnByb2plY3Rpb25WaWV3TWF0cml4O3RoaXMuZnJ1c3R1bVswXS5zZXQodFszXS10WzBdLHRbN10tdFs0XSx0WzExXS10WzhdKS5jb25zdGFudD10WzE1XS10WzEyXSx0aGlzLmZydXN0dW1bMV0uc2V0KHRbM10rdFswXSx0WzddK3RbNF0sdFsxMV0rdFs4XSkuY29uc3RhbnQ9dFsxNV0rdFsxMl0sdGhpcy5mcnVzdHVtWzJdLnNldCh0WzNdK3RbMV0sdFs3XSt0WzVdLHRbMTFdK3RbOV0pLmNvbnN0YW50PXRbMTVdK3RbMTNdLHRoaXMuZnJ1c3R1bVszXS5zZXQodFszXS10WzFdLHRbN10tdFs1XSx0WzExXS10WzldKS5jb25zdGFudD10WzE1XS10WzEzXSx0aGlzLmZydXN0dW1bNF0uc2V0KHRbM10tdFsyXSx0WzddLXRbNl0sdFsxMV0tdFsxMF0pLmNvbnN0YW50PXRbMTVdLXRbMTRdLHRoaXMuZnJ1c3R1bVs1XS5zZXQodFszXSt0WzJdLHRbN10rdFs2XSx0WzExXSt0WzEwXSkuY29uc3RhbnQ9dFsxNV0rdFsxNF07Zm9yKGxldCBlPTA7ZTw2O2UrKyl7bGV0IHI9MS90aGlzLmZydXN0dW1bZV0uZGlzdGFuY2UoKTt0aGlzLmZydXN0dW1bZV0ubXVsdGlwbHkociksdGhpcy5mcnVzdHVtW2VdLmNvbnN0YW50Kj1yfX1mcnVzdHVtSW50ZXJzZWN0c01lc2godCxlPXQud29ybGRNYXRyaXgpe2lmKCF0Lmdlb21ldHJ5LmF0dHJpYnV0ZXMucG9zaXRpb258fCgoIXQuZ2VvbWV0cnkuYm91bmRzfHx0Lmdlb21ldHJ5LmJvdW5kcy5yYWRpdXM9PT0xLzApJiZ0Lmdlb21ldHJ5LmNvbXB1dGVCb3VuZGluZ1NwaGVyZSgpLCF0Lmdlb21ldHJ5LmJvdW5kcykpcmV0dXJuITA7bGV0IHI9VHM7ci5jb3B5KHQuZ2VvbWV0cnkuYm91bmRzLmNlbnRlciksci5hcHBseU1hdHJpeDQoZSk7bGV0IHM9dC5nZW9tZXRyeS5ib3VuZHMucmFkaXVzKmUuZ2V0TWF4U2NhbGVPbkF4aXMoKTtyZXR1cm4gdGhpcy5mcnVzdHVtSW50ZXJzZWN0c1NwaGVyZShyLHMpfWZydXN0dW1JbnRlcnNlY3RzU3BoZXJlKHQsZSl7bGV0IHI9UnM7Zm9yKGxldCBzPTA7czw2O3MrKyl7bGV0IG49dGhpcy5mcnVzdHVtW3NdO2lmKHIuY29weShuKS5kb3QodCkrbi5jb25zdGFudDwtZSlyZXR1cm4hMX1yZXR1cm4hMH19O2Z1bmN0aW9uIHVyKGksdCl7cmV0dXJuIGlbMF09dFswXSxpWzFdPXRbMV0saVsyXT10WzJdLGlbM109dFs0XSxpWzRdPXRbNV0saVs1XT10WzZdLGlbNl09dFs4XSxpWzddPXRbOV0saVs4XT10WzEwXSxpfWZ1bmN0aW9uIHByKGksdCl7bGV0IGU9dFswXSxyPXRbMV0scz10WzJdLG49dFszXSxhPWUrZSxoPXIrcixvPXMrcyxsPWUqYSxjPXIqYSxmPXIqaCxwPXMqYSx1PXMqaCxkPXMqbyx4PW4qYSxtPW4qaCxnPW4qbztyZXR1cm4gaVswXT0xLWYtZCxpWzNdPWMtZyxpWzZdPXArbSxpWzFdPWMrZyxpWzRdPTEtbC1kLGlbN109dS14LGlbMl09cC1tLGlbNV09dSt4LGlbOF09MS1sLWYsaX1mdW5jdGlvbiBkcihpLHQpe3JldHVybiBpWzBdPXRbMF0saVsxXT10WzFdLGlbMl09dFsyXSxpWzNdPXRbM10saVs0XT10WzRdLGlbNV09dFs1XSxpWzZdPXRbNl0saVs3XT10WzddLGlbOF09dFs4XSxpfWZ1bmN0aW9uIG1yKGksdCxlLHIscyxuLGEsaCxvLGwpe3JldHVybiBpWzBdPXQsaVsxXT1lLGlbMl09cixpWzNdPXMsaVs0XT1uLGlbNV09YSxpWzZdPWgsaVs3XT1vLGlbOF09bCxpfWZ1bmN0aW9uIGdyKGkpe3JldHVybiBpWzBdPTEsaVsxXT0wLGlbMl09MCxpWzNdPTAsaVs0XT0xLGlbNV09MCxpWzZdPTAsaVs3XT0wLGlbOF09MSxpfWZ1bmN0aW9uIHhyKGksdCl7bGV0IGU9dFswXSxyPXRbMV0scz10WzJdLG49dFszXSxhPXRbNF0saD10WzVdLG89dFs2XSxsPXRbN10sYz10WzhdLGY9YyphLWgqbCxwPS1jKm4raCpvLHU9bCpuLWEqbyxkPWUqZityKnArcyp1O3JldHVybiBkPyhkPTEvZCxpWzBdPWYqZCxpWzFdPSgtYypyK3MqbCkqZCxpWzJdPShoKnItcyphKSpkLGlbM109cCpkLGlbNF09KGMqZS1zKm8pKmQsaVs1XT0oLWgqZStzKm4pKmQsaVs2XT11KmQsaVs3XT0oLWwqZStyKm8pKmQsaVs4XT0oYSplLXIqbikqZCxpKTpudWxsfWZ1bmN0aW9uIGZlKGksdCxlKXtsZXQgcj10WzBdLHM9dFsxXSxuPXRbMl0sYT10WzNdLGg9dFs0XSxvPXRbNV0sbD10WzZdLGM9dFs3XSxmPXRbOF0scD1lWzBdLHU9ZVsxXSxkPWVbMl0seD1lWzNdLG09ZVs0XSxnPWVbNV0sQT1lWzZdLHc9ZVs3XSxfPWVbOF07cmV0dXJuIGlbMF09cCpyK3UqYStkKmwsaVsxXT1wKnMrdSpoK2QqYyxpWzJdPXAqbit1Km8rZCpmLGlbM109eCpyK20qYStnKmwsaVs0XT14KnMrbSpoK2cqYyxpWzVdPXgqbittKm8rZypmLGlbNl09QSpyK3cqYStfKmwsaVs3XT1BKnMrdypoK18qYyxpWzhdPUEqbit3Km8rXypmLGl9ZnVuY3Rpb24geXIoaSx0LGUpe2xldCByPXRbMF0scz10WzFdLG49dFsyXSxhPXRbM10saD10WzRdLG89dFs1XSxsPXRbNl0sYz10WzddLGY9dFs4XSxwPWVbMF0sdT1lWzFdO3JldHVybiBpWzBdPXIsaVsxXT1zLGlbMl09bixpWzNdPWEsaVs0XT1oLGlbNV09byxpWzZdPXAqcit1KmErbCxpWzddPXAqcyt1KmgrYyxpWzhdPXAqbit1Km8rZixpfWZ1bmN0aW9uIHdyKGksdCxlKXtsZXQgcj10WzBdLHM9dFsxXSxuPXRbMl0sYT10WzNdLGg9dFs0XSxvPXRbNV0sbD10WzZdLGM9dFs3XSxmPXRbOF0scD1NYXRoLnNpbihlKSx1PU1hdGguY29zKGUpO3JldHVybiBpWzBdPXUqcitwKmEsaVsxXT11KnMrcCpoLGlbMl09dSpuK3AqbyxpWzNdPXUqYS1wKnIsaVs0XT11KmgtcCpzLGlbNV09dSpvLXAqbixpWzZdPWwsaVs3XT1jLGlbOF09ZixpfWZ1bmN0aW9uIE1yKGksdCxlKXtsZXQgcj1lWzBdLHM9ZVsxXTtyZXR1cm4gaVswXT1yKnRbMF0saVsxXT1yKnRbMV0saVsyXT1yKnRbMl0saVszXT1zKnRbM10saVs0XT1zKnRbNF0saVs1XT1zKnRbNV0saVs2XT10WzZdLGlbN109dFs3XSxpWzhdPXRbOF0saX1mdW5jdGlvbiBFcihpLHQpe2xldCBlPXRbMF0scj10WzFdLHM9dFsyXSxuPXRbM10sYT10WzRdLGg9dFs1XSxvPXRbNl0sbD10WzddLGM9dFs4XSxmPXRbOV0scD10WzEwXSx1PXRbMTFdLGQ9dFsxMl0seD10WzEzXSxtPXRbMTRdLGc9dFsxNV0sQT1lKmgtciphLHc9ZSpvLXMqYSxfPWUqbC1uKmEsTT1yKm8tcypoLHk9cipsLW4qaCxiPXMqbC1uKm8sej1jKngtZipkLFI9YyptLXAqZCx2PWMqZy11KmQsTD1mKm0tcCp4LFQ9ZipnLXUqeCxTPXAqZy11Km0sRj1BKlMtdypUK18qTCtNKnYteSpSK2IqejtyZXR1cm4gRj8oRj0xL0YsaVswXT0oaCpTLW8qVCtsKkwpKkYsaVsxXT0obyp2LWEqUy1sKlIpKkYsaVsyXT0oYSpULWgqditsKnopKkYsaVszXT0ocypULXIqUy1uKkwpKkYsaVs0XT0oZSpTLXMqdituKlIpKkYsaVs1XT0ocip2LWUqVC1uKnopKkYsaVs2XT0oeCpiLW0qeStnKk0pKkYsaVs3XT0obSpfLWQqYi1nKncpKkYsaVs4XT0oZCp5LXgqXytnKkEpKkYsaSk6bnVsbH12YXIgZXQ9Y2xhc3MgZXh0ZW5kcyBBcnJheXtjb25zdHJ1Y3Rvcih0PTEsZT0wLHI9MCxzPTAsbj0xLGE9MCxoPTAsbz0wLGw9MSl7cmV0dXJuIHN1cGVyKHQsZSxyLHMsbixhLGgsbyxsKSx0aGlzfXNldCh0LGUscixzLG4sYSxoLG8sbCl7cmV0dXJuIHQubGVuZ3RoP3RoaXMuY29weSh0KToobXIodGhpcyx0LGUscixzLG4sYSxoLG8sbCksdGhpcyl9dHJhbnNsYXRlKHQsZT10aGlzKXtyZXR1cm4geXIodGhpcyxlLHQpLHRoaXN9cm90YXRlKHQsZT10aGlzKXtyZXR1cm4gd3IodGhpcyxlLHQpLHRoaXN9c2NhbGUodCxlPXRoaXMpe3JldHVybiBNcih0aGlzLGUsdCksdGhpc31tdWx0aXBseSh0LGUpe3JldHVybiBlP2ZlKHRoaXMsdCxlKTpmZSh0aGlzLHRoaXMsdCksdGhpc31pZGVudGl0eSgpe3JldHVybiBncih0aGlzKSx0aGlzfWNvcHkodCl7cmV0dXJuIGRyKHRoaXMsdCksdGhpc31mcm9tTWF0cml4NCh0KXtyZXR1cm4gdXIodGhpcyx0KSx0aGlzfWZyb21RdWF0ZXJuaW9uKHQpe3JldHVybiBwcih0aGlzLHQpLHRoaXN9ZnJvbUJhc2lzKHQsZSxyKXtyZXR1cm4gdGhpcy5zZXQodFswXSx0WzFdLHRbMl0sZVswXSxlWzFdLGVbMl0sclswXSxyWzFdLHJbMl0pLHRoaXN9aW52ZXJzZSh0PXRoaXMpe3JldHVybiB4cih0aGlzLHQpLHRoaXN9Z2V0Tm9ybWFsTWF0cml4KHQpe3JldHVybiBFcih0aGlzLHQpLHRoaXN9fTt2YXIgTHM9MCxEPWNsYXNzIGV4dGVuZHMgSHtjb25zdHJ1Y3Rvcih0LHtnZW9tZXRyeTplLHByb2dyYW06cixtb2RlOnM9dC5UUklBTkdMRVMsZnJ1c3R1bUN1bGxlZDpuPSEwLHJlbmRlck9yZGVyOmE9MH09e30pe3N1cGVyKCksdC5jYW52YXN8fGNvbnNvbGUuZXJyb3IoImdsIG5vdCBwYXNzZWQgYXMgZmlyc3QgYXJndW1lbnQgdG8gTWVzaCIpLHRoaXMuZ2w9dCx0aGlzLmlkPUxzKyssdGhpcy5nZW9tZXRyeT1lLHRoaXMucHJvZ3JhbT1yLHRoaXMubW9kZT1zLHRoaXMuZnJ1c3R1bUN1bGxlZD1uLHRoaXMucmVuZGVyT3JkZXI9YSx0aGlzLm1vZGVsVmlld01hdHJpeD1uZXcgVix0aGlzLm5vcm1hbE1hdHJpeD1uZXcgZXQsdGhpcy5iZWZvcmVSZW5kZXJDYWxsYmFja3M9W10sdGhpcy5hZnRlclJlbmRlckNhbGxiYWNrcz1bXX1vbkJlZm9yZVJlbmRlcih0KXtyZXR1cm4gdGhpcy5iZWZvcmVSZW5kZXJDYWxsYmFja3MucHVzaCh0KSx0aGlzfW9uQWZ0ZXJSZW5kZXIodCl7cmV0dXJuIHRoaXMuYWZ0ZXJSZW5kZXJDYWxsYmFja3MucHVzaCh0KSx0aGlzfWRyYXcoe2NhbWVyYTp0fT17fSl7dCYmKHRoaXMucHJvZ3JhbS51bmlmb3Jtcy5tb2RlbE1hdHJpeHx8T2JqZWN0LmFzc2lnbih0aGlzLnByb2dyYW0udW5pZm9ybXMse21vZGVsTWF0cml4Ont2YWx1ZTpudWxsfSx2aWV3TWF0cml4Ont2YWx1ZTpudWxsfSxtb2RlbFZpZXdNYXRyaXg6e3ZhbHVlOm51bGx9LG5vcm1hbE1hdHJpeDp7dmFsdWU6bnVsbH0scHJvamVjdGlvbk1hdHJpeDp7dmFsdWU6bnVsbH0sY2FtZXJhUG9zaXRpb246e3ZhbHVlOm51bGx9fSksdGhpcy5wcm9ncmFtLnVuaWZvcm1zLnByb2plY3Rpb25NYXRyaXgudmFsdWU9dC5wcm9qZWN0aW9uTWF0cml4LHRoaXMucHJvZ3JhbS51bmlmb3Jtcy5jYW1lcmFQb3NpdGlvbi52YWx1ZT10LndvcmxkUG9zaXRpb24sdGhpcy5wcm9ncmFtLnVuaWZvcm1zLnZpZXdNYXRyaXgudmFsdWU9dC52aWV3TWF0cml4LHRoaXMubW9kZWxWaWV3TWF0cml4Lm11bHRpcGx5KHQudmlld01hdHJpeCx0aGlzLndvcmxkTWF0cml4KSx0aGlzLm5vcm1hbE1hdHJpeC5nZXROb3JtYWxNYXRyaXgodGhpcy5tb2RlbFZpZXdNYXRyaXgpLHRoaXMucHJvZ3JhbS51bmlmb3Jtcy5tb2RlbE1hdHJpeC52YWx1ZT10aGlzLndvcmxkTWF0cml4LHRoaXMucHJvZ3JhbS51bmlmb3Jtcy5tb2RlbFZpZXdNYXRyaXgudmFsdWU9dGhpcy5tb2RlbFZpZXdNYXRyaXgsdGhpcy5wcm9ncmFtLnVuaWZvcm1zLm5vcm1hbE1hdHJpeC52YWx1ZT10aGlzLm5vcm1hbE1hdHJpeCksdGhpcy5iZWZvcmVSZW5kZXJDYWxsYmFja3MuZm9yRWFjaChyPT5yJiZyKHttZXNoOnRoaXMsY2FtZXJhOnR9KSk7bGV0IGU9dGhpcy5wcm9ncmFtLmN1bGxGYWNlJiZ0aGlzLndvcmxkTWF0cml4LmRldGVybWluYW50KCk8MDt0aGlzLnByb2dyYW0udXNlKHtmbGlwRmFjZXM6ZX0pLHRoaXMuZ2VvbWV0cnkuZHJhdyh7bW9kZTp0aGlzLm1vZGUscHJvZ3JhbTp0aGlzLnByb2dyYW19KSx0aGlzLmFmdGVyUmVuZGVyQ2FsbGJhY2tzLmZvckVhY2gocj0+ciYmcih7bWVzaDp0aGlzLGNhbWVyYTp0fSkpfX07dmFyIEFyPW5ldyBVaW50OEFycmF5KDQpO2Z1bmN0aW9uIF9yKGkpe3JldHVybihpJmktMSk9PT0wfXZhciBTcz0xLEc9Y2xhc3N7Y29uc3RydWN0b3IodCx7aW1hZ2U6ZSx0YXJnZXQ6cj10LlRFWFRVUkVfMkQsdHlwZTpzPXQuVU5TSUdORURfQllURSxmb3JtYXQ6bj10LlJHQkEsaW50ZXJuYWxGb3JtYXQ6YT1uLHdyYXBTOmg9dC5DTEFNUF9UT19FREdFLHdyYXBUOm89dC5DTEFNUF9UT19FREdFLHdyYXBSOmw9dC5DTEFNUF9UT19FREdFLGdlbmVyYXRlTWlwbWFwczpjPXI9PT0odC5URVhUVVJFXzJEfHx0LlRFWFRVUkVfQ1VCRV9NQVApLG1pbkZpbHRlcjpmPWM/dC5ORUFSRVNUX01JUE1BUF9MSU5FQVI6dC5MSU5FQVIsbWFnRmlsdGVyOnA9dC5MSU5FQVIscHJlbXVsdGlwbHlBbHBoYTp1PSExLHVucGFja0FsaWdubWVudDpkPTQsZmxpcFk6eD1yPT0odC5URVhUVVJFXzJEfHx0LlRFWFRVUkVfM0QpLGFuaXNvdHJvcHk6bT0wLGxldmVsOmc9MCx3aWR0aDpBLGhlaWdodDp3PUEsbGVuZ3RoOl89MX09e30pe3RoaXMuZ2w9dCx0aGlzLmlkPVNzKyssdGhpcy5pbWFnZT1lLHRoaXMudGFyZ2V0PXIsdGhpcy50eXBlPXMsdGhpcy5mb3JtYXQ9bix0aGlzLmludGVybmFsRm9ybWF0PWEsdGhpcy5taW5GaWx0ZXI9Zix0aGlzLm1hZ0ZpbHRlcj1wLHRoaXMud3JhcFM9aCx0aGlzLndyYXBUPW8sdGhpcy53cmFwUj1sLHRoaXMuZ2VuZXJhdGVNaXBtYXBzPWMsdGhpcy5wcmVtdWx0aXBseUFscGhhPXUsdGhpcy51bnBhY2tBbGlnbm1lbnQ9ZCx0aGlzLmZsaXBZPXgsdGhpcy5hbmlzb3Ryb3B5PU1hdGgubWluKG0sdGhpcy5nbC5yZW5kZXJlci5wYXJhbWV0ZXJzLm1heEFuaXNvdHJvcHkpLHRoaXMubGV2ZWw9Zyx0aGlzLndpZHRoPUEsdGhpcy5oZWlnaHQ9dyx0aGlzLmxlbmd0aD1fLHRoaXMudGV4dHVyZT10aGlzLmdsLmNyZWF0ZVRleHR1cmUoKSx0aGlzLnN0b3JlPXtpbWFnZTpudWxsfSx0aGlzLmdsU3RhdGU9dGhpcy5nbC5yZW5kZXJlci5zdGF0ZSx0aGlzLnN0YXRlPXt9LHRoaXMuc3RhdGUubWluRmlsdGVyPXRoaXMuZ2wuTkVBUkVTVF9NSVBNQVBfTElORUFSLHRoaXMuc3RhdGUubWFnRmlsdGVyPXRoaXMuZ2wuTElORUFSLHRoaXMuc3RhdGUud3JhcFM9dGhpcy5nbC5SRVBFQVQsdGhpcy5zdGF0ZS53cmFwVD10aGlzLmdsLlJFUEVBVCx0aGlzLnN0YXRlLmFuaXNvdHJvcHk9MH1iaW5kKCl7dGhpcy5nbFN0YXRlLnRleHR1cmVVbml0c1t0aGlzLmdsU3RhdGUuYWN0aXZlVGV4dHVyZVVuaXRdIT09dGhpcy5pZCYmKHRoaXMuZ2wuYmluZFRleHR1cmUodGhpcy50YXJnZXQsdGhpcy50ZXh0dXJlKSx0aGlzLmdsU3RhdGUudGV4dHVyZVVuaXRzW3RoaXMuZ2xTdGF0ZS5hY3RpdmVUZXh0dXJlVW5pdF09dGhpcy5pZCl9dXBkYXRlKHQ9MCl7bGV0IGU9ISh0aGlzLmltYWdlPT09dGhpcy5zdG9yZS5pbWFnZSYmIXRoaXMubmVlZHNVcGRhdGUpO2lmKChlfHx0aGlzLmdsU3RhdGUudGV4dHVyZVVuaXRzW3RdIT09dGhpcy5pZCkmJih0aGlzLmdsLnJlbmRlcmVyLmFjdGl2ZVRleHR1cmUodCksdGhpcy5iaW5kKCkpLCEhZSl7aWYodGhpcy5uZWVkc1VwZGF0ZT0hMSx0aGlzLmZsaXBZIT09dGhpcy5nbFN0YXRlLmZsaXBZJiYodGhpcy5nbC5waXhlbFN0b3JlaSh0aGlzLmdsLlVOUEFDS19GTElQX1lfV0VCR0wsdGhpcy5mbGlwWSksdGhpcy5nbFN0YXRlLmZsaXBZPXRoaXMuZmxpcFkpLHRoaXMucHJlbXVsdGlwbHlBbHBoYSE9PXRoaXMuZ2xTdGF0ZS5wcmVtdWx0aXBseUFscGhhJiYodGhpcy5nbC5waXhlbFN0b3JlaSh0aGlzLmdsLlVOUEFDS19QUkVNVUxUSVBMWV9BTFBIQV9XRUJHTCx0aGlzLnByZW11bHRpcGx5QWxwaGEpLHRoaXMuZ2xTdGF0ZS5wcmVtdWx0aXBseUFscGhhPXRoaXMucHJlbXVsdGlwbHlBbHBoYSksdGhpcy51bnBhY2tBbGlnbm1lbnQhPT10aGlzLmdsU3RhdGUudW5wYWNrQWxpZ25tZW50JiYodGhpcy5nbC5waXhlbFN0b3JlaSh0aGlzLmdsLlVOUEFDS19BTElHTk1FTlQsdGhpcy51bnBhY2tBbGlnbm1lbnQpLHRoaXMuZ2xTdGF0ZS51bnBhY2tBbGlnbm1lbnQ9dGhpcy51bnBhY2tBbGlnbm1lbnQpLHRoaXMubWluRmlsdGVyIT09dGhpcy5zdGF0ZS5taW5GaWx0ZXImJih0aGlzLmdsLnRleFBhcmFtZXRlcmkodGhpcy50YXJnZXQsdGhpcy5nbC5URVhUVVJFX01JTl9GSUxURVIsdGhpcy5taW5GaWx0ZXIpLHRoaXMuc3RhdGUubWluRmlsdGVyPXRoaXMubWluRmlsdGVyKSx0aGlzLm1hZ0ZpbHRlciE9PXRoaXMuc3RhdGUubWFnRmlsdGVyJiYodGhpcy5nbC50ZXhQYXJhbWV0ZXJpKHRoaXMudGFyZ2V0LHRoaXMuZ2wuVEVYVFVSRV9NQUdfRklMVEVSLHRoaXMubWFnRmlsdGVyKSx0aGlzLnN0YXRlLm1hZ0ZpbHRlcj10aGlzLm1hZ0ZpbHRlciksdGhpcy53cmFwUyE9PXRoaXMuc3RhdGUud3JhcFMmJih0aGlzLmdsLnRleFBhcmFtZXRlcmkodGhpcy50YXJnZXQsdGhpcy5nbC5URVhUVVJFX1dSQVBfUyx0aGlzLndyYXBTKSx0aGlzLnN0YXRlLndyYXBTPXRoaXMud3JhcFMpLHRoaXMud3JhcFQhPT10aGlzLnN0YXRlLndyYXBUJiYodGhpcy5nbC50ZXhQYXJhbWV0ZXJpKHRoaXMudGFyZ2V0LHRoaXMuZ2wuVEVYVFVSRV9XUkFQX1QsdGhpcy53cmFwVCksdGhpcy5zdGF0ZS53cmFwVD10aGlzLndyYXBUKSx0aGlzLndyYXBSIT09dGhpcy5zdGF0ZS53cmFwUiYmKHRoaXMuZ2wudGV4UGFyYW1ldGVyaSh0aGlzLnRhcmdldCx0aGlzLmdsLlRFWFRVUkVfV1JBUF9SLHRoaXMud3JhcFIpLHRoaXMuc3RhdGUud3JhcFI9dGhpcy53cmFwUiksdGhpcy5hbmlzb3Ryb3B5JiZ0aGlzLmFuaXNvdHJvcHkhPT10aGlzLnN0YXRlLmFuaXNvdHJvcHkmJih0aGlzLmdsLnRleFBhcmFtZXRlcmYodGhpcy50YXJnZXQsdGhpcy5nbC5yZW5kZXJlci5nZXRFeHRlbnNpb24oIkVYVF90ZXh0dXJlX2ZpbHRlcl9hbmlzb3Ryb3BpYyIpLlRFWFRVUkVfTUFYX0FOSVNPVFJPUFlfRVhULHRoaXMuYW5pc290cm9weSksdGhpcy5zdGF0ZS5hbmlzb3Ryb3B5PXRoaXMuYW5pc290cm9weSksdGhpcy5pbWFnZSl7aWYodGhpcy5pbWFnZS53aWR0aCYmKHRoaXMud2lkdGg9dGhpcy5pbWFnZS53aWR0aCx0aGlzLmhlaWdodD10aGlzLmltYWdlLmhlaWdodCksdGhpcy50YXJnZXQ9PT10aGlzLmdsLlRFWFRVUkVfQ1VCRV9NQVApZm9yKGxldCByPTA7cjw2O3IrKyl0aGlzLmdsLnRleEltYWdlMkQodGhpcy5nbC5URVhUVVJFX0NVQkVfTUFQX1BPU0lUSVZFX1grcix0aGlzLmxldmVsLHRoaXMuaW50ZXJuYWxGb3JtYXQsdGhpcy5mb3JtYXQsdGhpcy50eXBlLHRoaXMuaW1hZ2Vbcl0pO2Vsc2UgaWYoQXJyYXlCdWZmZXIuaXNWaWV3KHRoaXMuaW1hZ2UpKXRoaXMudGFyZ2V0PT09dGhpcy5nbC5URVhUVVJFXzJEP3RoaXMuZ2wudGV4SW1hZ2UyRCh0aGlzLnRhcmdldCx0aGlzLmxldmVsLHRoaXMuaW50ZXJuYWxGb3JtYXQsdGhpcy53aWR0aCx0aGlzLmhlaWdodCwwLHRoaXMuZm9ybWF0LHRoaXMudHlwZSx0aGlzLmltYWdlKToodGhpcy50YXJnZXQ9PT10aGlzLmdsLlRFWFRVUkVfMkRfQVJSQVl8fHRoaXMudGFyZ2V0PT09dGhpcy5nbC5URVhUVVJFXzNEKSYmdGhpcy5nbC50ZXhJbWFnZTNEKHRoaXMudGFyZ2V0LHRoaXMubGV2ZWwsdGhpcy5pbnRlcm5hbEZvcm1hdCx0aGlzLndpZHRoLHRoaXMuaGVpZ2h0LHRoaXMubGVuZ3RoLDAsdGhpcy5mb3JtYXQsdGhpcy50eXBlLHRoaXMuaW1hZ2UpO2Vsc2UgaWYodGhpcy5pbWFnZS5pc0NvbXByZXNzZWRUZXh0dXJlKWZvcihsZXQgcj0wO3I8dGhpcy5pbWFnZS5sZW5ndGg7cisrKXRoaXMuZ2wuY29tcHJlc3NlZFRleEltYWdlMkQodGhpcy50YXJnZXQscix0aGlzLmludGVybmFsRm9ybWF0LHRoaXMuaW1hZ2Vbcl0ud2lkdGgsdGhpcy5pbWFnZVtyXS5oZWlnaHQsMCx0aGlzLmltYWdlW3JdLmRhdGEpO2Vsc2UgdGhpcy50YXJnZXQ9PT10aGlzLmdsLlRFWFRVUkVfMkQ/dGhpcy5nbC50ZXhJbWFnZTJEKHRoaXMudGFyZ2V0LHRoaXMubGV2ZWwsdGhpcy5pbnRlcm5hbEZvcm1hdCx0aGlzLmZvcm1hdCx0aGlzLnR5cGUsdGhpcy5pbWFnZSk6dGhpcy5nbC50ZXhJbWFnZTNEKHRoaXMudGFyZ2V0LHRoaXMubGV2ZWwsdGhpcy5pbnRlcm5hbEZvcm1hdCx0aGlzLndpZHRoLHRoaXMuaGVpZ2h0LHRoaXMubGVuZ3RoLDAsdGhpcy5mb3JtYXQsdGhpcy50eXBlLHRoaXMuaW1hZ2UpO3RoaXMuZ2VuZXJhdGVNaXBtYXBzJiYoIXRoaXMuZ2wucmVuZGVyZXIuaXNXZWJnbDImJighX3IodGhpcy5pbWFnZS53aWR0aCl8fCFfcih0aGlzLmltYWdlLmhlaWdodCkpPyh0aGlzLmdlbmVyYXRlTWlwbWFwcz0hMSx0aGlzLndyYXBTPXRoaXMud3JhcFQ9dGhpcy5nbC5DTEFNUF9UT19FREdFLHRoaXMubWluRmlsdGVyPXRoaXMuZ2wuTElORUFSKTp0aGlzLmdsLmdlbmVyYXRlTWlwbWFwKHRoaXMudGFyZ2V0KSksdGhpcy5vblVwZGF0ZSYmdGhpcy5vblVwZGF0ZSgpfWVsc2UgaWYodGhpcy50YXJnZXQ9PT10aGlzLmdsLlRFWFRVUkVfQ1VCRV9NQVApZm9yKGxldCByPTA7cjw2O3IrKyl0aGlzLmdsLnRleEltYWdlMkQodGhpcy5nbC5URVhUVVJFX0NVQkVfTUFQX1BPU0lUSVZFX1grciwwLHRoaXMuZ2wuUkdCQSwxLDEsMCx0aGlzLmdsLlJHQkEsdGhpcy5nbC5VTlNJR05FRF9CWVRFLEFyKTtlbHNlIHRoaXMud2lkdGg/dGhpcy50YXJnZXQ9PT10aGlzLmdsLlRFWFRVUkVfMkQ/dGhpcy5nbC50ZXhJbWFnZTJEKHRoaXMudGFyZ2V0LHRoaXMubGV2ZWwsdGhpcy5pbnRlcm5hbEZvcm1hdCx0aGlzLndpZHRoLHRoaXMuaGVpZ2h0LDAsdGhpcy5mb3JtYXQsdGhpcy50eXBlLG51bGwpOnRoaXMuZ2wudGV4SW1hZ2UzRCh0aGlzLnRhcmdldCx0aGlzLmxldmVsLHRoaXMuaW50ZXJuYWxGb3JtYXQsdGhpcy53aWR0aCx0aGlzLmhlaWdodCx0aGlzLmxlbmd0aCwwLHRoaXMuZm9ybWF0LHRoaXMudHlwZSxudWxsKTp0aGlzLmdsLnRleEltYWdlMkQodGhpcy50YXJnZXQsMCx0aGlzLmdsLlJHQkEsMSwxLDAsdGhpcy5nbC5SR0JBLHRoaXMuZ2wuVU5TSUdORURfQllURSxBcik7dGhpcy5zdG9yZS5pbWFnZT10aGlzLmltYWdlfX19O3ZhciBqPWNsYXNze2NvbnN0cnVjdG9yKHQse3dpZHRoOmU9dC5jYW52YXMud2lkdGgsaGVpZ2h0OnI9dC5jYW52YXMuaGVpZ2h0LHRhcmdldDpzPXQuRlJBTUVCVUZGRVIsY29sb3I6bj0xLGRlcHRoOmE9ITAsc3RlbmNpbDpoPSExLGRlcHRoVGV4dHVyZTpvPSExLHdyYXBTOmw9dC5DTEFNUF9UT19FREdFLHdyYXBUOmM9dC5DTEFNUF9UT19FREdFLHdyYXBSOmY9dC5DTEFNUF9UT19FREdFLG1pbkZpbHRlcjpwPXQuTElORUFSLG1hZ0ZpbHRlcjp1PXAsdHlwZTpkPXQuVU5TSUdORURfQllURSxmb3JtYXQ6eD10LlJHQkEsaW50ZXJuYWxGb3JtYXQ6bT14LHVucGFja0FsaWdubWVudDpnLHByZW11bHRpcGx5QWxwaGE6QX09e30pe3RoaXMuZ2w9dCx0aGlzLndpZHRoPWUsdGhpcy5oZWlnaHQ9cix0aGlzLmRlcHRoPWEsdGhpcy5zdGVuY2lsPWgsdGhpcy5idWZmZXI9dGhpcy5nbC5jcmVhdGVGcmFtZWJ1ZmZlcigpLHRoaXMudGFyZ2V0PXMsdGhpcy5nbC5yZW5kZXJlci5iaW5kRnJhbWVidWZmZXIodGhpcyksdGhpcy50ZXh0dXJlcz1bXTtsZXQgdz1bXTtmb3IobGV0IF89MDtfPG47XysrKXRoaXMudGV4dHVyZXMucHVzaChuZXcgRyh0LHt3aWR0aDplLGhlaWdodDpyLHdyYXBTOmwsd3JhcFQ6Yyx3cmFwUjpmLG1pbkZpbHRlcjpwLG1hZ0ZpbHRlcjp1LHR5cGU6ZCxmb3JtYXQ6eCxpbnRlcm5hbEZvcm1hdDptLHVucGFja0FsaWdubWVudDpnLHByZW11bHRpcGx5QWxwaGE6QSxmbGlwWTohMSxnZW5lcmF0ZU1pcG1hcHM6ITF9KSksdGhpcy50ZXh0dXJlc1tfXS51cGRhdGUoKSx0aGlzLmdsLmZyYW1lYnVmZmVyVGV4dHVyZTJEKHRoaXMudGFyZ2V0LHRoaXMuZ2wuQ09MT1JfQVRUQUNITUVOVDArXyx0aGlzLmdsLlRFWFRVUkVfMkQsdGhpcy50ZXh0dXJlc1tfXS50ZXh0dXJlLDApLHcucHVzaCh0aGlzLmdsLkNPTE9SX0FUVEFDSE1FTlQwK18pO3cubGVuZ3RoPjEmJnRoaXMuZ2wucmVuZGVyZXIuZHJhd0J1ZmZlcnModyksdGhpcy50ZXh0dXJlPXRoaXMudGV4dHVyZXNbMF0sbyYmKHRoaXMuZ2wucmVuZGVyZXIuaXNXZWJnbDJ8fHRoaXMuZ2wucmVuZGVyZXIuZ2V0RXh0ZW5zaW9uKCJXRUJHTF9kZXB0aF90ZXh0dXJlIikpPyh0aGlzLmRlcHRoVGV4dHVyZT1uZXcgRyh0LHt3aWR0aDplLGhlaWdodDpyLG1pbkZpbHRlcjp0aGlzLmdsLk5FQVJFU1QsbWFnRmlsdGVyOnRoaXMuZ2wuTkVBUkVTVCxmb3JtYXQ6dGhpcy5zdGVuY2lsP3RoaXMuZ2wuREVQVEhfU1RFTkNJTDp0aGlzLmdsLkRFUFRIX0NPTVBPTkVOVCxpbnRlcm5hbEZvcm1hdDp0LnJlbmRlcmVyLmlzV2ViZ2wyP3RoaXMuc3RlbmNpbD90aGlzLmdsLkRFUFRIMjRfU1RFTkNJTDg6dGhpcy5nbC5ERVBUSF9DT01QT05FTlQxNjp0aGlzLmdsLkRFUFRIX0NPTVBPTkVOVCx0eXBlOnRoaXMuc3RlbmNpbD90aGlzLmdsLlVOU0lHTkVEX0lOVF8yNF84OnRoaXMuZ2wuVU5TSUdORURfSU5UfSksdGhpcy5kZXB0aFRleHR1cmUudXBkYXRlKCksdGhpcy5nbC5mcmFtZWJ1ZmZlclRleHR1cmUyRCh0aGlzLnRhcmdldCx0aGlzLnN0ZW5jaWw/dGhpcy5nbC5ERVBUSF9TVEVOQ0lMX0FUVEFDSE1FTlQ6dGhpcy5nbC5ERVBUSF9BVFRBQ0hNRU5ULHRoaXMuZ2wuVEVYVFVSRV8yRCx0aGlzLmRlcHRoVGV4dHVyZS50ZXh0dXJlLDApKTooYSYmIWgmJih0aGlzLmRlcHRoQnVmZmVyPXRoaXMuZ2wuY3JlYXRlUmVuZGVyYnVmZmVyKCksdGhpcy5nbC5iaW5kUmVuZGVyYnVmZmVyKHRoaXMuZ2wuUkVOREVSQlVGRkVSLHRoaXMuZGVwdGhCdWZmZXIpLHRoaXMuZ2wucmVuZGVyYnVmZmVyU3RvcmFnZSh0aGlzLmdsLlJFTkRFUkJVRkZFUix0aGlzLmdsLkRFUFRIX0NPTVBPTkVOVDE2LGUsciksdGhpcy5nbC5mcmFtZWJ1ZmZlclJlbmRlcmJ1ZmZlcih0aGlzLnRhcmdldCx0aGlzLmdsLkRFUFRIX0FUVEFDSE1FTlQsdGhpcy5nbC5SRU5ERVJCVUZGRVIsdGhpcy5kZXB0aEJ1ZmZlcikpLGgmJiFhJiYodGhpcy5zdGVuY2lsQnVmZmVyPXRoaXMuZ2wuY3JlYXRlUmVuZGVyYnVmZmVyKCksdGhpcy5nbC5iaW5kUmVuZGVyYnVmZmVyKHRoaXMuZ2wuUkVOREVSQlVGRkVSLHRoaXMuc3RlbmNpbEJ1ZmZlciksdGhpcy5nbC5yZW5kZXJidWZmZXJTdG9yYWdlKHRoaXMuZ2wuUkVOREVSQlVGRkVSLHRoaXMuZ2wuU1RFTkNJTF9JTkRFWDgsZSxyKSx0aGlzLmdsLmZyYW1lYnVmZmVyUmVuZGVyYnVmZmVyKHRoaXMudGFyZ2V0LHRoaXMuZ2wuU1RFTkNJTF9BVFRBQ0hNRU5ULHRoaXMuZ2wuUkVOREVSQlVGRkVSLHRoaXMuc3RlbmNpbEJ1ZmZlcikpLGEmJmgmJih0aGlzLmRlcHRoU3RlbmNpbEJ1ZmZlcj10aGlzLmdsLmNyZWF0ZVJlbmRlcmJ1ZmZlcigpLHRoaXMuZ2wuYmluZFJlbmRlcmJ1ZmZlcih0aGlzLmdsLlJFTkRFUkJVRkZFUix0aGlzLmRlcHRoU3RlbmNpbEJ1ZmZlciksdGhpcy5nbC5yZW5kZXJidWZmZXJTdG9yYWdlKHRoaXMuZ2wuUkVOREVSQlVGRkVSLHRoaXMuZ2wuREVQVEhfU1RFTkNJTCxlLHIpLHRoaXMuZ2wuZnJhbWVidWZmZXJSZW5kZXJidWZmZXIodGhpcy50YXJnZXQsdGhpcy5nbC5ERVBUSF9TVEVOQ0lMX0FUVEFDSE1FTlQsdGhpcy5nbC5SRU5ERVJCVUZGRVIsdGhpcy5kZXB0aFN0ZW5jaWxCdWZmZXIpKSksdGhpcy5nbC5yZW5kZXJlci5iaW5kRnJhbWVidWZmZXIoe3RhcmdldDp0aGlzLnRhcmdldH0pfXNldFNpemUodCxlKXtpZighKHRoaXMud2lkdGg9PT10JiZ0aGlzLmhlaWdodD09PWUpKXt0aGlzLndpZHRoPXQsdGhpcy5oZWlnaHQ9ZSx0aGlzLmdsLnJlbmRlcmVyLmJpbmRGcmFtZWJ1ZmZlcih0aGlzKTtmb3IobGV0IHI9MDtyPHRoaXMudGV4dHVyZXMubGVuZ3RoO3IrKyl0aGlzLnRleHR1cmVzW3JdLndpZHRoPXQsdGhpcy50ZXh0dXJlc1tyXS5oZWlnaHQ9ZSx0aGlzLnRleHR1cmVzW3JdLm5lZWRzVXBkYXRlPSEwLHRoaXMudGV4dHVyZXNbcl0udXBkYXRlKCksdGhpcy5nbC5mcmFtZWJ1ZmZlclRleHR1cmUyRCh0aGlzLnRhcmdldCx0aGlzLmdsLkNPTE9SX0FUVEFDSE1FTlQwK3IsdGhpcy5nbC5URVhUVVJFXzJELHRoaXMudGV4dHVyZXNbcl0udGV4dHVyZSwwKTt0aGlzLmRlcHRoVGV4dHVyZT8odGhpcy5kZXB0aFRleHR1cmUud2lkdGg9dCx0aGlzLmRlcHRoVGV4dHVyZS5oZWlnaHQ9ZSx0aGlzLmRlcHRoVGV4dHVyZS5uZWVkc1VwZGF0ZT0hMCx0aGlzLmRlcHRoVGV4dHVyZS51cGRhdGUoKSx0aGlzLmdsLmZyYW1lYnVmZmVyVGV4dHVyZTJEKHRoaXMudGFyZ2V0LHRoaXMuZ2wuREVQVEhfQVRUQUNITUVOVCx0aGlzLmdsLlRFWFRVUkVfMkQsdGhpcy5kZXB0aFRleHR1cmUudGV4dHVyZSwwKSk6KHRoaXMuZGVwdGhCdWZmZXImJih0aGlzLmdsLmJpbmRSZW5kZXJidWZmZXIodGhpcy5nbC5SRU5ERVJCVUZGRVIsdGhpcy5kZXB0aEJ1ZmZlciksdGhpcy5nbC5yZW5kZXJidWZmZXJTdG9yYWdlKHRoaXMuZ2wuUkVOREVSQlVGRkVSLHRoaXMuZ2wuREVQVEhfQ09NUE9ORU5UMTYsdCxlKSksdGhpcy5zdGVuY2lsQnVmZmVyJiYodGhpcy5nbC5iaW5kUmVuZGVyYnVmZmVyKHRoaXMuZ2wuUkVOREVSQlVGRkVSLHRoaXMuc3RlbmNpbEJ1ZmZlciksdGhpcy5nbC5yZW5kZXJidWZmZXJTdG9yYWdlKHRoaXMuZ2wuUkVOREVSQlVGRkVSLHRoaXMuZ2wuU1RFTkNJTF9JTkRFWDgsdCxlKSksdGhpcy5kZXB0aFN0ZW5jaWxCdWZmZXImJih0aGlzLmdsLmJpbmRSZW5kZXJidWZmZXIodGhpcy5nbC5SRU5ERVJCVUZGRVIsdGhpcy5kZXB0aFN0ZW5jaWxCdWZmZXIpLHRoaXMuZ2wucmVuZGVyYnVmZmVyU3RvcmFnZSh0aGlzLmdsLlJFTkRFUkJVRkZFUix0aGlzLmdsLkRFUFRIX1NURU5DSUwsdCxlKSkpLHRoaXMuZ2wucmVuZGVyZXIuYmluZEZyYW1lYnVmZmVyKHt0YXJnZXQ6dGhpcy50YXJnZXR9KX19fTt2YXIgdnI9e2JsYWNrOiIjMDAwMDAwIix3aGl0ZToiI2ZmZmZmZiIscmVkOiIjZmYwMDAwIixncmVlbjoiIzAwZmYwMCIsYmx1ZToiIzAwMDBmZiIsZnVjaHNpYToiI2ZmMDBmZiIsY3lhbjoiIzAwZmZmZiIseWVsbG93OiIjZmZmZjAwIixvcmFuZ2U6IiNmZjgwMDAifTtmdW5jdGlvbiBicihpKXtpLmxlbmd0aD09PTQmJihpPWlbMF0raVsxXStpWzFdK2lbMl0raVsyXStpWzNdK2lbM10pO2xldCB0PS9eIz8oW2EtZlxkXXsyfSkoW2EtZlxkXXsyfSkoW2EtZlxkXXsyfSkkL2kuZXhlYyhpKTtyZXR1cm4gdHx8Y29uc29sZS53YXJuKGBVbmFibGUgdG8gY29udmVydCBoZXggc3RyaW5nICR7aX0gdG8gcmdiIHZhbHVlc2ApLFtwYXJzZUludCh0WzFdLDE2KS8yNTUscGFyc2VJbnQodFsyXSwxNikvMjU1LHBhcnNlSW50KHRbM10sMTYpLzI1NV19ZnVuY3Rpb24gUHMoaSl7cmV0dXJuIGk9cGFyc2VJbnQoaSksWyhpPj4xNiYyNTUpLzI1NSwoaT4+OCYyNTUpLzI1NSwoaSYyNTUpLzI1NV19ZnVuY3Rpb24gdWUoaSl7cmV0dXJuIGk9PT12b2lkIDA/WzAsMCwwXTphcmd1bWVudHMubGVuZ3RoPT09Mz9hcmd1bWVudHM6aXNOYU4oaSk/aVswXT09PSIjIj9icihpKTp2cltpLnRvTG93ZXJDYXNlKCldP2JyKHZyW2kudG9Mb3dlckNhc2UoKV0pOihjb25zb2xlLndhcm4oIkNvbG9yIGZvcm1hdCBub3QgcmVjb2duaXNlZCIpLFswLDAsMF0pOlBzKGkpfXZhciBsdD1jbGFzcyBleHRlbmRzIEFycmF5e2NvbnN0cnVjdG9yKHQpe3JldHVybiBBcnJheS5pc0FycmF5KHQpP3N1cGVyKC4uLnQpOnN1cGVyKC4uLnVlKC4uLmFyZ3VtZW50cykpfWdldCByKCl7cmV0dXJuIHRoaXNbMF19Z2V0IGcoKXtyZXR1cm4gdGhpc1sxXX1nZXQgYigpe3JldHVybiB0aGlzWzJdfXNldCByKHQpe3RoaXNbMF09dH1zZXQgZyh0KXt0aGlzWzFdPXR9c2V0IGIodCl7dGhpc1syXT10fXNldCh0KXtyZXR1cm4gQXJyYXkuaXNBcnJheSh0KT90aGlzLmNvcHkodCk6dGhpcy5jb3B5KHVlKC4uLmFyZ3VtZW50cykpfWNvcHkodCl7cmV0dXJuIHRoaXNbMF09dFswXSx0aGlzWzFdPXRbMV0sdGhpc1syXT10WzJdLHRoaXN9fTtmdW5jdGlvbiBGcihpLHQpe3JldHVybiBpWzBdPXRbMF0saVsxXT10WzFdLGl9ZnVuY3Rpb24gVHIoaSx0LGUpe3JldHVybiBpWzBdPXQsaVsxXT1lLGl9ZnVuY3Rpb24gcGUoaSx0LGUpe3JldHVybiBpWzBdPXRbMF0rZVswXSxpWzFdPXRbMV0rZVsxXSxpfWZ1bmN0aW9uIGRlKGksdCxlKXtyZXR1cm4gaVswXT10WzBdLWVbMF0saVsxXT10WzFdLWVbMV0saX1mdW5jdGlvbiBScihpLHQsZSl7cmV0dXJuIGlbMF09dFswXSplWzBdLGlbMV09dFsxXSplWzFdLGl9ZnVuY3Rpb24genIoaSx0LGUpe3JldHVybiBpWzBdPXRbMF0vZVswXSxpWzFdPXRbMV0vZVsxXSxpfWZ1bmN0aW9uIEJ0KGksdCxlKXtyZXR1cm4gaVswXT10WzBdKmUsaVsxXT10WzFdKmUsaX1mdW5jdGlvbiBMcihpLHQpe3ZhciBlPXRbMF0taVswXSxyPXRbMV0taVsxXTtyZXR1cm4gTWF0aC5zcXJ0KGUqZStyKnIpfWZ1bmN0aW9uIFNyKGksdCl7dmFyIGU9dFswXS1pWzBdLHI9dFsxXS1pWzFdO3JldHVybiBlKmUrcipyfWZ1bmN0aW9uIG1lKGkpe3ZhciB0PWlbMF0sZT1pWzFdO3JldHVybiBNYXRoLnNxcnQodCp0K2UqZSl9ZnVuY3Rpb24gUHIoaSl7dmFyIHQ9aVswXSxlPWlbMV07cmV0dXJuIHQqdCtlKmV9ZnVuY3Rpb24gQ3IoaSx0KXtyZXR1cm4gaVswXT0tdFswXSxpWzFdPS10WzFdLGl9ZnVuY3Rpb24gTnIoaSx0KXtyZXR1cm4gaVswXT0xL3RbMF0saVsxXT0xL3RbMV0saX1mdW5jdGlvbiBJcihpLHQpe3ZhciBlPXRbMF0scj10WzFdLHM9ZSplK3IqcjtyZXR1cm4gcz4wJiYocz0xL01hdGguc3FydChzKSksaVswXT10WzBdKnMsaVsxXT10WzFdKnMsaX1mdW5jdGlvbiBPcihpLHQpe3JldHVybiBpWzBdKnRbMF0raVsxXSp0WzFdfWZ1bmN0aW9uIGdlKGksdCl7cmV0dXJuIGlbMF0qdFsxXS1pWzFdKnRbMF19ZnVuY3Rpb24gRHIoaSx0LGUscil7dmFyIHM9dFswXSxuPXRbMV07cmV0dXJuIGlbMF09cytyKihlWzBdLXMpLGlbMV09bityKihlWzFdLW4pLGl9ZnVuY3Rpb24gQnIoaSx0LGUscixzKXtsZXQgbj1NYXRoLmV4cCgtcipzKSxhPXRbMF0saD10WzFdO3JldHVybiBpWzBdPWVbMF0rKGEtZVswXSkqbixpWzFdPWVbMV0rKGgtZVsxXSkqbixpfWZ1bmN0aW9uIFZyKGksdCxlKXt2YXIgcj10WzBdLHM9dFsxXTtyZXR1cm4gaVswXT1lWzBdKnIrZVszXSpzK2VbNl0saVsxXT1lWzFdKnIrZVs0XSpzK2VbN10saX1mdW5jdGlvbiBVcihpLHQsZSl7bGV0IHI9dFswXSxzPXRbMV07cmV0dXJuIGlbMF09ZVswXSpyK2VbNF0qcytlWzEyXSxpWzFdPWVbMV0qcitlWzVdKnMrZVsxM10saX1mdW5jdGlvbiBrcihpLHQpe3JldHVybiBpWzBdPT09dFswXSYmaVsxXT09PXRbMV19dmFyIFg9Y2xhc3MgaSBleHRlbmRzIEFycmF5e2NvbnN0cnVjdG9yKHQ9MCxlPXQpe3JldHVybiBzdXBlcih0LGUpLHRoaXN9Z2V0IHgoKXtyZXR1cm4gdGhpc1swXX1nZXQgeSgpe3JldHVybiB0aGlzWzFdfXNldCB4KHQpe3RoaXNbMF09dH1zZXQgeSh0KXt0aGlzWzFdPXR9c2V0KHQsZT10KXtyZXR1cm4gdC5sZW5ndGg/dGhpcy5jb3B5KHQpOihUcih0aGlzLHQsZSksdGhpcyl9Y29weSh0KXtyZXR1cm4gRnIodGhpcyx0KSx0aGlzfWFkZCh0LGUpe3JldHVybiBlP3BlKHRoaXMsdCxlKTpwZSh0aGlzLHRoaXMsdCksdGhpc31zdWIodCxlKXtyZXR1cm4gZT9kZSh0aGlzLHQsZSk6ZGUodGhpcyx0aGlzLHQpLHRoaXN9bXVsdGlwbHkodCl7cmV0dXJuIHQubGVuZ3RoP1JyKHRoaXMsdGhpcyx0KTpCdCh0aGlzLHRoaXMsdCksdGhpc31kaXZpZGUodCl7cmV0dXJuIHQubGVuZ3RoP3pyKHRoaXMsdGhpcyx0KTpCdCh0aGlzLHRoaXMsMS90KSx0aGlzfWludmVyc2UodD10aGlzKXtyZXR1cm4gTnIodGhpcyx0KSx0aGlzfWxlbigpe3JldHVybiBtZSh0aGlzKX1kaXN0YW5jZSh0KXtyZXR1cm4gdD9Mcih0aGlzLHQpOm1lKHRoaXMpfXNxdWFyZWRMZW4oKXtyZXR1cm4gdGhpcy5zcXVhcmVkRGlzdGFuY2UoKX1zcXVhcmVkRGlzdGFuY2UodCl7cmV0dXJuIHQ/U3IodGhpcyx0KTpQcih0aGlzKX1uZWdhdGUodD10aGlzKXtyZXR1cm4gQ3IodGhpcyx0KSx0aGlzfWNyb3NzKHQsZSl7cmV0dXJuIGU/Z2UodCxlKTpnZSh0aGlzLHQpfXNjYWxlKHQpe3JldHVybiBCdCh0aGlzLHRoaXMsdCksdGhpc31ub3JtYWxpemUoKXtyZXR1cm4gSXIodGhpcyx0aGlzKSx0aGlzfWRvdCh0KXtyZXR1cm4gT3IodGhpcyx0KX1lcXVhbHModCl7cmV0dXJuIGtyKHRoaXMsdCl9YXBwbHlNYXRyaXgzKHQpe3JldHVybiBWcih0aGlzLHRoaXMsdCksdGhpc31hcHBseU1hdHJpeDQodCl7cmV0dXJuIFVyKHRoaXMsdGhpcyx0KSx0aGlzfWxlcnAodCxlKXtyZXR1cm4gRHIodGhpcyx0aGlzLHQsZSksdGhpc31zbW9vdGhMZXJwKHQsZSxyKXtyZXR1cm4gQnIodGhpcyx0aGlzLHQsZSxyKSx0aGlzfWNsb25lKCl7cmV0dXJuIG5ldyBpKHRoaXNbMF0sdGhpc1sxXSl9ZnJvbUFycmF5KHQsZT0wKXtyZXR1cm4gdGhpc1swXT10W2VdLHRoaXNbMV09dFtlKzFdLHRoaXN9dG9BcnJheSh0PVtdLGU9MCl7cmV0dXJuIHRbZV09dGhpc1swXSx0W2UrMV09dGhpc1sxXSx0fX07dmFyIHl0PWNsYXNzIGV4dGVuZHMgQXJyYXl7Y29uc3RydWN0b3IodD0wLGU9dCxyPXQscz10KXtyZXR1cm4gc3VwZXIodCxlLHIscyksdGhpc31nZXQgeCgpe3JldHVybiB0aGlzWzBdfWdldCB5KCl7cmV0dXJuIHRoaXNbMV19Z2V0IHooKXtyZXR1cm4gdGhpc1syXX1nZXQgdygpe3JldHVybiB0aGlzWzNdfXNldCB4KHQpe3RoaXNbMF09dH1zZXQgeSh0KXt0aGlzWzFdPXR9c2V0IHoodCl7dGhpc1syXT10fXNldCB3KHQpe3RoaXNbM109dH1zZXQodCxlPXQscj10LHM9dCl7cmV0dXJuIHQubGVuZ3RoP3RoaXMuY29weSh0KTooSXQodGhpcyx0LGUscixzKSx0aGlzKX1jb3B5KHQpe3JldHVybiBOdCh0aGlzLHQpLHRoaXN9bm9ybWFsaXplKCl7cmV0dXJuIE90KHRoaXMsdGhpcyksdGhpc31tdWx0aXBseSh0KXtyZXR1cm4gcmUodGhpcyx0aGlzLHQpLHRoaXN9ZG90KHQpe3JldHVybiBEdCh0aGlzLHQpfWZyb21BcnJheSh0LGU9MCl7cmV0dXJuIHRoaXNbMF09dFtlXSx0aGlzWzFdPXRbZSsxXSx0aGlzWzJdPXRbZSsyXSx0aGlzWzNdPXRbZSszXSx0aGlzfXRvQXJyYXkodD1bXSxlPTApe3JldHVybiB0W2VdPXRoaXNbMF0sdFtlKzFdPXRoaXNbMV0sdFtlKzJdPXRoaXNbMl0sdFtlKzNdPXRoaXNbM10sdH19O3ZhciB0dD1jbGFzcyBpIGV4dGVuZHMgT3tjb25zdHJ1Y3Rvcih0LHt3aWR0aDplPTEsaGVpZ2h0OnI9MSx3aWR0aFNlZ21lbnRzOnM9MSxoZWlnaHRTZWdtZW50czpuPTEsYXR0cmlidXRlczphPXt9fT17fSl7bGV0IGg9cyxvPW4sbD0oaCsxKSoobysxKSxjPWgqbyo2LGY9bmV3IEZsb2F0MzJBcnJheShsKjMpLHA9bmV3IEZsb2F0MzJBcnJheShsKjMpLHU9bmV3IEZsb2F0MzJBcnJheShsKjIpLGQ9Yz42NTUzNj9uZXcgVWludDMyQXJyYXkoYyk6bmV3IFVpbnQxNkFycmF5KGMpO2kuYnVpbGRQbGFuZShmLHAsdSxkLGUsciwwLGgsbyksT2JqZWN0LmFzc2lnbihhLHtwb3NpdGlvbjp7c2l6ZTozLGRhdGE6Zn0sbm9ybWFsOntzaXplOjMsZGF0YTpwfSx1djp7c2l6ZToyLGRhdGE6dX0saW5kZXg6e2RhdGE6ZH19KSxzdXBlcih0LGEpfXN0YXRpYyBidWlsZFBsYW5lKHQsZSxyLHMsbixhLGgsbyxsLGM9MCxmPTEscD0yLHU9MSxkPS0xLHg9MCxtPTApe2xldCBnPXgsQT1uL28sdz1hL2w7Zm9yKGxldCBfPTA7Xzw9bDtfKyspe2xldCBNPV8qdy1hLzI7Zm9yKGxldCB5PTA7eTw9bzt5KysseCsrKXtsZXQgYj15KkEtbi8yO2lmKHRbeCozK2NdPWIqdSx0W3gqMytmXT1NKmQsdFt4KjMrcF09aC8yLGVbeCozK2NdPTAsZVt4KjMrZl09MCxlW3gqMytwXT1oPj0wPzE6LTEsclt4KjJdPXkvbyxyW3gqMisxXT0xLV8vbCxfPT09bHx8eT09PW8pY29udGludWU7bGV0IHo9Zyt5K18qKG8rMSksUj1nK3krKF8rMSkqKG8rMSksdj1nK3krKF8rMSkqKG8rMSkrMSxMPWcreStfKihvKzEpKzE7c1ttKjZdPXosc1ttKjYrMV09UixzW20qNisyXT1MLHNbbSo2KzNdPVIsc1ttKjYrNF09dixzW20qNis1XT1MLG0rK319fX07dmFyIHhlPWNsYXNzIGV4dGVuZHMgT3tjb25zdHJ1Y3Rvcih0LHt3aWR0aDplPTEsaGVpZ2h0OnI9MSxkZXB0aDpzPTEsd2lkdGhTZWdtZW50czpuPTEsaGVpZ2h0U2VnbWVudHM6YT0xLGRlcHRoU2VnbWVudHM6aD0xLGF0dHJpYnV0ZXM6bz17fX09e30pe2xldCBsPW4sYz1hLGY9aCxwPShsKzEpKihjKzEpKjIrKGwrMSkqKGYrMSkqMisoYysxKSooZisxKSoyLHU9KGwqYyoyK2wqZioyK2MqZioyKSo2LGQ9bmV3IEZsb2F0MzJBcnJheShwKjMpLHg9bmV3IEZsb2F0MzJBcnJheShwKjMpLG09bmV3IEZsb2F0MzJBcnJheShwKjIpLGc9cD42NTUzNj9uZXcgVWludDMyQXJyYXkodSk6bmV3IFVpbnQxNkFycmF5KHUpLEE9MCx3PTA7dHQuYnVpbGRQbGFuZShkLHgsbSxnLHMscixlLGYsYywyLDEsMCwtMSwtMSxBLHcpLEErPShmKzEpKihjKzEpLHcrPWYqYyx0dC5idWlsZFBsYW5lKGQseCxtLGcscyxyLC1lLGYsYywyLDEsMCwxLC0xLEEsdyksQSs9KGYrMSkqKGMrMSksdys9ZipjLHR0LmJ1aWxkUGxhbmUoZCx4LG0sZyxlLHMscixmLGwsMCwyLDEsMSwxLEEsdyksQSs9KGwrMSkqKGYrMSksdys9bCpmLHR0LmJ1aWxkUGxhbmUoZCx4LG0sZyxlLHMsLXIsZixsLDAsMiwxLDEsLTEsQSx3KSxBKz0obCsxKSooZisxKSx3Kz1sKmYsdHQuYnVpbGRQbGFuZShkLHgsbSxnLGUsciwtcyxsLGMsMCwxLDIsLTEsLTEsQSx3KSxBKz0obCsxKSooYysxKSx3Kz1sKmMsdHQuYnVpbGRQbGFuZShkLHgsbSxnLGUscixzLGwsYywwLDEsMiwxLC0xLEEsdyksT2JqZWN0LmFzc2lnbihvLHtwb3NpdGlvbjp7c2l6ZTozLGRhdGE6ZH0sbm9ybWFsOntzaXplOjMsZGF0YTp4fSx1djp7c2l6ZToyLGRhdGE6bX0saW5kZXg6e2RhdGE6Z319KSxzdXBlcih0LG8pfX07dmFyIHllPWNsYXNzIGV4dGVuZHMgT3tjb25zdHJ1Y3Rvcih0LHtyYWRpdXM6ZT0uNSx3aWR0aFNlZ21lbnRzOnI9MTYsaGVpZ2h0U2VnbWVudHM6cz1NYXRoLmNlaWwociouNSkscGhpU3RhcnQ6bj0wLHBoaUxlbmd0aDphPU1hdGguUEkqMix0aGV0YVN0YXJ0Omg9MCx0aGV0YUxlbmd0aDpvPU1hdGguUEksYXR0cmlidXRlczpsPXt9fT17fSl7bGV0IGM9cixmPXMscD1uLHU9YSxkPWgseD1vLG09KGMrMSkqKGYrMSksZz1jKmYqNixBPW5ldyBGbG9hdDMyQXJyYXkobSozKSx3PW5ldyBGbG9hdDMyQXJyYXkobSozKSxfPW5ldyBGbG9hdDMyQXJyYXkobSoyKSxNPW0+NjU1MzY/bmV3IFVpbnQzMkFycmF5KGcpOm5ldyBVaW50MTZBcnJheShnKSx5PTAsYj0wLHo9MCxSPWQreCx2PVtdLEw9bmV3IEU7Zm9yKGxldCBUPTA7VDw9ZjtUKyspe2xldCBTPVtdLEY9VC9mO2ZvcihsZXQgQz0wO0M8PWM7QysrLHkrKyl7bGV0IE49Qy9jLEI9LWUqTWF0aC5jb3MocCtOKnUpKk1hdGguc2luKGQrRip4KSxJPWUqTWF0aC5jb3MoZCtGKngpLFc9ZSpNYXRoLnNpbihwK04qdSkqTWF0aC5zaW4oZCtGKngpO0FbeSozXT1CLEFbeSozKzFdPUksQVt5KjMrMl09VyxMLnNldChCLEksVykubm9ybWFsaXplKCksd1t5KjNdPUwueCx3W3kqMysxXT1MLnksd1t5KjMrMl09TC56LF9beSoyXT1OLF9beSoyKzFdPTEtRixTLnB1c2goYisrKX12LnB1c2goUyl9Zm9yKGxldCBUPTA7VDxmO1QrKylmb3IobGV0IFM9MDtTPGM7UysrKXtsZXQgRj12W1RdW1MrMV0sQz12W1RdW1NdLE49dltUKzFdW1NdLEI9dltUKzFdW1MrMV07KFQhPT0wfHxkPjApJiYoTVt6KjNdPUYsTVt6KjMrMV09QyxNW3oqMysyXT1CLHorKyksKFQhPT1mLTF8fFI8TWF0aC5QSSkmJihNW3oqM109QyxNW3oqMysxXT1OLE1beiozKzJdPUIseisrKX1PYmplY3QuYXNzaWduKGwse3Bvc2l0aW9uOntzaXplOjMsZGF0YTpBfSxub3JtYWw6e3NpemU6MyxkYXRhOnd9LHV2OntzaXplOjIsZGF0YTpffSxpbmRleDp7ZGF0YTpNfX0pLHN1cGVyKHQsbCl9fTt2YXIgd2U9Y2xhc3MgZXh0ZW5kcyBPe2NvbnN0cnVjdG9yKHQse3JhZGl1c1RvcDplPS41LHJhZGl1c0JvdHRvbTpyPS41LGhlaWdodDpzPTEscmFkaWFsU2VnbWVudHM6bj04LGhlaWdodFNlZ21lbnRzOmE9MSxvcGVuRW5kZWQ6aD0hMSx0aGV0YVN0YXJ0Om89MCx0aGV0YUxlbmd0aDpsPU1hdGguUEkqMixhdHRyaWJ1dGVzOmM9e319PXt9KXtsZXQgZj1uLHA9YSx1PW8sZD1sLHg9aD8wOnImJmU/MjoxLG09KGYrMSkqKHArMSt4KSt4LGc9ZipwKjYreCpmKjMsQT1uZXcgRmxvYXQzMkFycmF5KG0qMyksdz1uZXcgRmxvYXQzMkFycmF5KG0qMyksXz1uZXcgRmxvYXQzMkFycmF5KG0qMiksTT1tPjY1NTM2P25ldyBVaW50MzJBcnJheShnKTpuZXcgVWludDE2QXJyYXkoZykseT0wLGI9MCx6PVtdO1IoKSxofHwoZSYmdighMCksciYmdighMSkpO2Z1bmN0aW9uIFIoKXtsZXQgTCxULFM9bmV3IEUsRj0oci1lKS9zO2ZvcihUPTA7VDw9cDtUKyspe2xldCBDPVtdLE49VC9wLEI9Tiooci1lKStlO2ZvcihMPTA7TDw9ZjtMKyspe2xldCBJPUwvZixXPUkqZCt1LFE9TWF0aC5zaW4oVyksSj1NYXRoLmNvcyhXKTtBLnNldChbQipRLCguNS1OKSpzLEIqSl0seSozKSxTLnNldChRLEYsSikubm9ybWFsaXplKCksdy5zZXQoW1MueCxTLnksUy56XSx5KjMpLF8uc2V0KFtJLDEtTl0seSoyKSxDLnB1c2goeSsrKX16LnB1c2goQyl9Zm9yKEw9MDtMPGY7TCsrKWZvcihUPTA7VDxwO1QrKyl7bGV0IEM9eltUXVtMXSxOPXpbVCsxXVtMXSxCPXpbVCsxXVtMKzFdLEk9eltUXVtMKzFdO00uc2V0KFtDLE4sSSxOLEIsSV0sYiozKSxiKz0yfX1mdW5jdGlvbiB2KEwpe2xldCBULFM9TD09PSEwP2U6cixGPUw9PT0hMD8xOi0xLEM9eTtmb3IoQS5zZXQoWzAsLjUqcypGLDBdLHkqMyksdy5zZXQoWzAsRiwwXSx5KjMpLF8uc2V0KFsuNSwuNV0seSoyKSx5KyssVD0wO1Q8PWY7VCsrKXtsZXQgQj1UL2YqZCt1LEk9TWF0aC5jb3MoQiksVz1NYXRoLnNpbihCKTtBLnNldChbUypXLC41KnMqRixTKkldLHkqMyksdy5zZXQoWzAsRiwwXSx5KjMpLF8uc2V0KFtJKi41Ky41LFcqLjUqRisuNV0seSoyKSx5Kyt9Zm9yKFQ9MDtUPGY7VCsrKXtsZXQgTj1DK1QrMTtMP00uc2V0KFtOLE4rMSxDXSxiKjMpOk0uc2V0KFtOKzEsTixDXSxiKjMpLGIrK319T2JqZWN0LmFzc2lnbihjLHtwb3NpdGlvbjp7c2l6ZTozLGRhdGE6QX0sbm9ybWFsOntzaXplOjMsZGF0YTp3fSx1djp7c2l6ZToyLGRhdGE6X30saW5kZXg6e2RhdGE6TX19KSxzdXBlcih0LGMpfX07dmFyIGl0PWNsYXNzIGV4dGVuZHMgT3tjb25zdHJ1Y3Rvcih0LHthdHRyaWJ1dGVzOmU9e319PXt9KXtPYmplY3QuYXNzaWduKGUse3Bvc2l0aW9uOntzaXplOjIsZGF0YTpuZXcgRmxvYXQzMkFycmF5KFstMSwtMSwzLC0xLC0xLDNdKX0sdXY6e3NpemU6MixkYXRhOm5ldyBGbG9hdDMyQXJyYXkoWzAsMCwyLDAsMCwyXSl9fSksc3VwZXIodCxlKX19O3ZhciBNZT1jbGFzcyBleHRlbmRzIE97Y29uc3RydWN0b3IodCx7cmFkaXVzOmU9LjUsdHViZTpyPS4yLHJhZGlhbFNlZ21lbnRzOnM9OCx0dWJ1bGFyU2VnbWVudHM6bj02LGFyYzphPU1hdGguUEkqMixhdHRyaWJ1dGVzOmg9e319PXt9KXtsZXQgbz0ocysxKSoobisxKSxsPXMqbio2LGM9bmV3IEZsb2F0MzJBcnJheShvKjMpLGY9bmV3IEZsb2F0MzJBcnJheShvKjMpLHA9bmV3IEZsb2F0MzJBcnJheShvKjIpLHU9bz42NTUzNj9uZXcgVWludDMyQXJyYXkobCk6bmV3IFVpbnQxNkFycmF5KGwpLGQ9bmV3IEUseD1uZXcgRSxtPW5ldyBFLGc9MDtmb3IobGV0IEE9MDtBPD1zO0ErKylmb3IobGV0IHc9MDt3PD1uO3crKyxnKyspe2xldCBfPXcvbiphLE09QS9zKk1hdGguUEkqMjt4Lng9KGUrcipNYXRoLmNvcyhNKSkqTWF0aC5jb3MoXykseC55PShlK3IqTWF0aC5jb3MoTSkpKk1hdGguc2luKF8pLHguej1yKk1hdGguc2luKE0pLGMuc2V0KFt4LngseC55LHguel0sZyozKSxkLng9ZSpNYXRoLmNvcyhfKSxkLnk9ZSpNYXRoLnNpbihfKSxtLnN1Yih4LGQpLm5vcm1hbGl6ZSgpLGYuc2V0KFttLngsbS55LG0uel0sZyozKSxwLnNldChbdy9uLEEvc10sZyoyKX1nPTA7Zm9yKGxldCBBPTE7QTw9cztBKyspZm9yKGxldCB3PTE7dzw9bjt3KyssZysrKXtsZXQgXz0obisxKSpBK3ctMSxNPShuKzEpKihBLTEpK3ctMSx5PShuKzEpKihBLTEpK3csYj0obisxKSpBK3c7dS5zZXQoW18sTSxiLE0seSxiXSxnKjYpfU9iamVjdC5hc3NpZ24oaCx7cG9zaXRpb246e3NpemU6MyxkYXRhOmN9LG5vcm1hbDp7c2l6ZTozLGRhdGE6Zn0sdXY6e3NpemU6MixkYXRhOnB9LGluZGV4OntkYXRhOnV9fSksc3VwZXIodCxoKX19O3ZhciBxPXtOT05FOi0xLFJPVEFURTowLERPTExZOjEsUEFOOjIsRE9MTFlfUEFOOjN9LHN0PW5ldyBFLFo9bmV3IFgsJD1uZXcgWDtmdW5jdGlvbiBJcyhpLHtlbGVtZW50OnQ9ZG9jdW1lbnQsZW5hYmxlZDplPSEwLHRhcmdldDpyPW5ldyBFLGVhc2U6cz0uMjUsaW5lcnRpYTpuPS44NSxlbmFibGVSb3RhdGU6YT0hMCxyb3RhdGVTcGVlZDpoPS4xLGF1dG9Sb3RhdGU6bz0hMSxhdXRvUm90YXRlU3BlZWQ6bD0xLGVuYWJsZVpvb206Yz0hMCx6b29tU3BlZWQ6Zj0xLHpvb21TdHlsZTpwPSJkb2xseSIsZW5hYmxlUGFuOnU9ITAscGFuU3BlZWQ6ZD0uMSxtaW5Qb2xhckFuZ2xlOng9MCxtYXhQb2xhckFuZ2xlOm09TWF0aC5QSSxtaW5BemltdXRoQW5nbGU6Zz0tMS8wLG1heEF6aW11dGhBbmdsZTpBPTEvMCxtaW5EaXN0YW5jZTp3PTAsbWF4RGlzdGFuY2U6Xz0xLzB9PXt9KXt0aGlzLmVuYWJsZWQ9ZSx0aGlzLnRhcmdldD1yLHRoaXMuem9vbVN0eWxlPXAscz1zfHwxLG49bnx8MCx0aGlzLm1pbkRpc3RhbmNlPXcsdGhpcy5tYXhEaXN0YW5jZT1fO2xldCBNPXtyYWRpdXM6MSxwaGk6MCx0aGV0YTowfSx5PXtyYWRpdXM6MSxwaGk6MCx0aGV0YTowfSxiPXtyYWRpdXM6MSxwaGk6MCx0aGV0YTowfSx6PW5ldyBFLFI9bmV3IEU7Ui5jb3B5KGkucG9zaXRpb24pLnN1Yih0aGlzLnRhcmdldCksYi5yYWRpdXM9eS5yYWRpdXM9Ui5kaXN0YW5jZSgpLGIudGhldGE9eS50aGV0YT1NYXRoLmF0YW4yKFIueCxSLnopLGIucGhpPXkucGhpPU1hdGguYWNvcyhNYXRoLm1pbihNYXRoLm1heChSLnkveS5yYWRpdXMsLTEpLDEpKSx0aGlzLm9mZnNldD1SLHRoaXMudXBkYXRlPSgpPT57byYmVygpLHkucmFkaXVzKj1NLnJhZGl1cyx5LnRoZXRhKz1NLnRoZXRhLHkucGhpKz1NLnBoaSx5LnRoZXRhPU1hdGgubWF4KGcsTWF0aC5taW4oQSx5LnRoZXRhKSkseS5waGk9TWF0aC5tYXgoeCxNYXRoLm1pbihtLHkucGhpKSkseS5yYWRpdXM9TWF0aC5tYXgodGhpcy5taW5EaXN0YW5jZSxNYXRoLm1pbih0aGlzLm1heERpc3RhbmNlLHkucmFkaXVzKSksYi5waGkrPSh5LnBoaS1iLnBoaSkqcyxiLnRoZXRhKz0oeS50aGV0YS1iLnRoZXRhKSpzLGIucmFkaXVzKz0oeS5yYWRpdXMtYi5yYWRpdXMpKnMsdGhpcy50YXJnZXQuYWRkKHopO2xldCBQPWIucmFkaXVzKk1hdGguc2luKE1hdGgubWF4KDFlLTYsYi5waGkpKTtSLng9UCpNYXRoLnNpbihiLnRoZXRhKSxSLnk9Yi5yYWRpdXMqTWF0aC5jb3MoYi5waGkpLFIuej1QKk1hdGguY29zKGIudGhldGEpLGkucG9zaXRpb24uY29weSh0aGlzLnRhcmdldCkuYWRkKFIpLGkubG9va0F0KHRoaXMudGFyZ2V0KSxNLnRoZXRhKj1uLE0ucGhpKj1uLHoubXVsdGlwbHkobiksTS5yYWRpdXM9MX0sdGhpcy5mb3JjZVBvc2l0aW9uPSgpPT57Ui5jb3B5KGkucG9zaXRpb24pLnN1Yih0aGlzLnRhcmdldCksYi5yYWRpdXM9eS5yYWRpdXM9Ui5kaXN0YW5jZSgpLGIudGhldGE9eS50aGV0YT1NYXRoLmF0YW4yKFIueCxSLnopLGIucGhpPXkucGhpPU1hdGguYWNvcyhNYXRoLm1pbihNYXRoLm1heChSLnkveS5yYWRpdXMsLTEpLDEpKSxpLmxvb2tBdCh0aGlzLnRhcmdldCl9O2xldCB2PW5ldyBYLEw9bmV3IFgsVD1uZXcgWCxTPXEuTk9ORTt0aGlzLm1vdXNlQnV0dG9ucz17T1JCSVQ6MCxaT09NOjEsUEFOOjJ9O2Z1bmN0aW9uIEYoKXtyZXR1cm4gTWF0aC5wb3coLjk1LGYpfWZ1bmN0aW9uIEMoUCxrKXtzdC5zZXQoa1swXSxrWzFdLGtbMl0pLHN0Lm11bHRpcGx5KC1QKSx6LmFkZChzdCl9ZnVuY3Rpb24gTihQLGspe3N0LnNldChrWzRdLGtbNV0sa1s2XSksc3QubXVsdGlwbHkoUCksei5hZGQoc3QpfWxldCBCPShQLGspPT57bGV0IFk9dD09PWRvY3VtZW50P2RvY3VtZW50LmJvZHk6dDtzdC5jb3B5KGkucG9zaXRpb24pLnN1Yih0aGlzLnRhcmdldCk7bGV0IGF0PXN0LmRpc3RhbmNlKCk7YXQqPU1hdGgudGFuKChpLmZvdnx8NDUpLzIqTWF0aC5QSS8xODApLEMoMipQKmF0L1kuY2xpZW50SGVpZ2h0LGkubWF0cml4KSxOKDIqayphdC9ZLmNsaWVudEhlaWdodCxpLm1hdHJpeCl9LEk9UD0+e3RoaXMuem9vbVN0eWxlPT09ImRvbGx5Ij9NLnJhZGl1cy89UDooaS5mb3YvPVAsaS50eXBlPT09Im9ydGhvZ3JhcGhpYyI/aS5vcnRob2dyYXBoaWMoKTppLnBlcnNwZWN0aXZlKCkpfTtmdW5jdGlvbiBXKCl7bGV0IFA9MipNYXRoLlBJLzYwLzYwKmw7TS50aGV0YS09UH1mdW5jdGlvbiBRKFAsayl7Wi5zZXQoUCxrKSwkLnN1YihaLHYpLm11bHRpcGx5KGgpO2xldCBZPXQ9PT1kb2N1bWVudD9kb2N1bWVudC5ib2R5OnQ7TS50aGV0YS09MipNYXRoLlBJKiQueC9ZLmNsaWVudEhlaWdodCxNLnBoaS09MipNYXRoLlBJKiQueS9ZLmNsaWVudEhlaWdodCx2LmNvcHkoWil9ZnVuY3Rpb24gSihQKXtaLnNldChQLmNsaWVudFgsUC5jbGllbnRZKSwkLnN1YihaLFQpLCQueT4wP0koRigpKTokLnk8MCYmSSgxL0YoKSksVC5jb3B5KFopfWZ1bmN0aW9uIG50KFAsayl7Wi5zZXQoUCxrKSwkLnN1YihaLEwpLm11bHRpcGx5KGQpLEIoJC54LCQueSksTC5jb3B5KFopfWZ1bmN0aW9uIHVzKFApe2lmKGMpe2xldCBrPVAudG91Y2hlc1swXS5wYWdlWC1QLnRvdWNoZXNbMV0ucGFnZVgsWT1QLnRvdWNoZXNbMF0ucGFnZVktUC50b3VjaGVzWzFdLnBhZ2VZLGF0PU1hdGguc3FydChrKmsrWSpZKTtULnNldCgwLGF0KX1pZih1KXtsZXQgaz0uNSooUC50b3VjaGVzWzBdLnBhZ2VYK1AudG91Y2hlc1sxXS5wYWdlWCksWT0uNSooUC50b3VjaGVzWzBdLnBhZ2VZK1AudG91Y2hlc1sxXS5wYWdlWSk7TC5zZXQoayxZKX19ZnVuY3Rpb24gcHMoUCl7aWYoYyl7bGV0IGs9UC50b3VjaGVzWzBdLnBhZ2VYLVAudG91Y2hlc1sxXS5wYWdlWCxZPVAudG91Y2hlc1swXS5wYWdlWS1QLnRvdWNoZXNbMV0ucGFnZVksYXQ9TWF0aC5zcXJ0KGsqaytZKlkpO1ouc2V0KDAsYXQpLCQuc2V0KDAsTWF0aC5wb3coWi55L1QueSxmKSksSSgkLnkpLFQuY29weShaKX1pZih1KXtsZXQgaz0uNSooUC50b3VjaGVzWzBdLnBhZ2VYK1AudG91Y2hlc1sxXS5wYWdlWCksWT0uNSooUC50b3VjaGVzWzBdLnBhZ2VZK1AudG91Y2hlc1sxXS5wYWdlWSk7bnQoayxZKX19bGV0IG9pPVA9PntpZih0aGlzLmVuYWJsZWQpe3N3aXRjaChQLmJ1dHRvbil7Y2FzZSB0aGlzLm1vdXNlQnV0dG9ucy5PUkJJVDppZihhPT09ITEpcmV0dXJuO3Yuc2V0KFAuY2xpZW50WCxQLmNsaWVudFkpLFM9cS5ST1RBVEU7YnJlYWs7Y2FzZSB0aGlzLm1vdXNlQnV0dG9ucy5aT09NOmlmKGM9PT0hMSlyZXR1cm47VC5zZXQoUC5jbGllbnRYLFAuY2xpZW50WSksUz1xLkRPTExZO2JyZWFrO2Nhc2UgdGhpcy5tb3VzZUJ1dHRvbnMuUEFOOmlmKHU9PT0hMSlyZXR1cm47TC5zZXQoUC5jbGllbnRYLFAuY2xpZW50WSksUz1xLlBBTjticmVha31TIT09cS5OT05FJiYod2luZG93LmFkZEV2ZW50TGlzdGVuZXIoIm1vdXNlbW92ZSIsWXQsITEpLHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCJtb3VzZXVwIixqdCwhMSkpfX0sWXQ9UD0+e2lmKHRoaXMuZW5hYmxlZClzd2l0Y2goUyl7Y2FzZSBxLlJPVEFURTppZihhPT09ITEpcmV0dXJuO1EoUC5jbGllbnRYLFAuY2xpZW50WSk7YnJlYWs7Y2FzZSBxLkRPTExZOmlmKGM9PT0hMSlyZXR1cm47SihQKTticmVhaztjYXNlIHEuUEFOOmlmKHU9PT0hMSlyZXR1cm47bnQoUC5jbGllbnRYLFAuY2xpZW50WSk7YnJlYWt9fSxqdD0oKT0+e3dpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCJtb3VzZW1vdmUiLFl0LCExKSx3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigibW91c2V1cCIsanQsITEpLFM9cS5OT05FfSxoaT1QPT57IXRoaXMuZW5hYmxlZHx8IWN8fFMhPT1xLk5PTkUmJlMhPT1xLlJPVEFURXx8KFAuc3RvcFByb3BhZ2F0aW9uKCksUC5wcmV2ZW50RGVmYXVsdCgpLFAuZGVsdGFZPDA/SSgxL0YoKSk6UC5kZWx0YVk+MCYmSShGKCkpKX0sbGk9UD0+e2lmKHRoaXMuZW5hYmxlZClzd2l0Y2goUC5wcmV2ZW50RGVmYXVsdCgpLFAudG91Y2hlcy5sZW5ndGgpe2Nhc2UgMTppZihhPT09ITEpcmV0dXJuO3Yuc2V0KFAudG91Y2hlc1swXS5wYWdlWCxQLnRvdWNoZXNbMF0ucGFnZVkpLFM9cS5ST1RBVEU7YnJlYWs7Y2FzZSAyOmlmKGM9PT0hMSYmdT09PSExKXJldHVybjt1cyhQKSxTPXEuRE9MTFlfUEFOO2JyZWFrO2RlZmF1bHQ6Uz1xLk5PTkV9fSxjaT1QPT57aWYodGhpcy5lbmFibGVkKXN3aXRjaChQLnByZXZlbnREZWZhdWx0KCksUC5zdG9wUHJvcGFnYXRpb24oKSxQLnRvdWNoZXMubGVuZ3RoKXtjYXNlIDE6aWYoYT09PSExKXJldHVybjtRKFAudG91Y2hlc1swXS5wYWdlWCxQLnRvdWNoZXNbMF0ucGFnZVkpO2JyZWFrO2Nhc2UgMjppZihjPT09ITEmJnU9PT0hMSlyZXR1cm47cHMoUCk7YnJlYWs7ZGVmYXVsdDpTPXEuTk9ORX19LGZpPSgpPT57dGhpcy5lbmFibGVkJiYoUz1xLk5PTkUpfSx1aT1QPT57dGhpcy5lbmFibGVkJiZQLnByZXZlbnREZWZhdWx0KCl9O2Z1bmN0aW9uIGRzKCl7dC5hZGRFdmVudExpc3RlbmVyKCJjb250ZXh0bWVudSIsdWksITEpLHQuYWRkRXZlbnRMaXN0ZW5lcigibW91c2Vkb3duIixvaSwhMSksdC5hZGRFdmVudExpc3RlbmVyKCJ3aGVlbCIsaGkse3Bhc3NpdmU6ITF9KSx0LmFkZEV2ZW50TGlzdGVuZXIoInRvdWNoc3RhcnQiLGxpLHtwYXNzaXZlOiExfSksdC5hZGRFdmVudExpc3RlbmVyKCJ0b3VjaGVuZCIsZmksITEpLHQuYWRkRXZlbnRMaXN0ZW5lcigidG91Y2htb3ZlIixjaSx7cGFzc2l2ZTohMX0pfXRoaXMucmVtb3ZlPWZ1bmN0aW9uKCl7dC5yZW1vdmVFdmVudExpc3RlbmVyKCJjb250ZXh0bWVudSIsdWkpLHQucmVtb3ZlRXZlbnRMaXN0ZW5lcigibW91c2Vkb3duIixvaSksdC5yZW1vdmVFdmVudExpc3RlbmVyKCJ3aGVlbCIsaGkpLHQucmVtb3ZlRXZlbnRMaXN0ZW5lcigidG91Y2hzdGFydCIsbGkpLHQucmVtb3ZlRXZlbnRMaXN0ZW5lcigidG91Y2hlbmQiLGZpKSx0LnJlbW92ZUV2ZW50TGlzdGVuZXIoInRvdWNobW92ZSIsY2kpLHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCJtb3VzZW1vdmUiLFl0KSx3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigibW91c2V1cCIsanQpfSxkcygpfXZhciBPcz1uZXcgWCxEcz1uZXcgWCxCcz1uZXcgWCxFZT1uZXcgRSxHcj1uZXcgRSxYcj1uZXcgRSxWcz1uZXcgRSxVcz1uZXcgRSxrcz1uZXcgRSxXcj1uZXcgRSxBZT1uZXcgRSxxcj1uZXcgRSxZcj1uZXcgRSxHcz1uZXcgRSxqcj1uZXcgVixfZT1jbGFzc3tjb25zdHJ1Y3Rvcigpe3RoaXMub3JpZ2luPW5ldyBFLHRoaXMuZGlyZWN0aW9uPW5ldyBFfWNhc3RNb3VzZSh0LGU9WzAsMF0pe2lmKHQudHlwZT09PSJvcnRob2dyYXBoaWMiKXtsZXR7bGVmdDpyLHJpZ2h0OnMsYm90dG9tOm4sdG9wOmEsem9vbTpofT10LG89ci9oKyhzLXIpL2gqKGVbMF0qLjUrLjUpLGw9bi9oKyhhLW4pL2gqKGVbMV0qLjUrLjUpO3RoaXMub3JpZ2luLnNldChvLGwsMCksdGhpcy5vcmlnaW4uYXBwbHlNYXRyaXg0KHQud29ybGRNYXRyaXgpLHRoaXMuZGlyZWN0aW9uLng9LXQud29ybGRNYXRyaXhbOF0sdGhpcy5kaXJlY3Rpb24ueT0tdC53b3JsZE1hdHJpeFs5XSx0aGlzLmRpcmVjdGlvbi56PS10LndvcmxkTWF0cml4WzEwXX1lbHNlIHQud29ybGRNYXRyaXguZ2V0VHJhbnNsYXRpb24odGhpcy5vcmlnaW4pLHRoaXMuZGlyZWN0aW9uLnNldChlWzBdLGVbMV0sLjUpLHQudW5wcm9qZWN0KHRoaXMuZGlyZWN0aW9uKSx0aGlzLmRpcmVjdGlvbi5zdWIodGhpcy5vcmlnaW4pLm5vcm1hbGl6ZSgpfWludGVyc2VjdEJvdW5kcyh0LHttYXhEaXN0YW5jZTplLG91dHB1dDpyPVtdfT17fSl7QXJyYXkuaXNBcnJheSh0KXx8KHQ9W3RdKTtsZXQgcz1qcixuPUVlLGE9R3IsaD1yO3JldHVybiBoLmxlbmd0aD0wLHQuZm9yRWFjaChvPT57KCFvLmdlb21ldHJ5LmJvdW5kc3x8by5nZW9tZXRyeS5ib3VuZHMucmFkaXVzPT09MS8wKSYmby5nZW9tZXRyeS5jb21wdXRlQm91bmRpbmdTcGhlcmUoKTtsZXQgbD1vLmdlb21ldHJ5LmJvdW5kcztzLmludmVyc2Uoby53b3JsZE1hdHJpeCk7bGV0IGM7aWYoZSYmKGEuY29weSh0aGlzLmRpcmVjdGlvbikuc2NhbGVSb3RhdGVNYXRyaXg0KHMpLGM9ZSphLmxlbigpKSxuLmNvcHkodGhpcy5vcmlnaW4pLmFwcGx5TWF0cml4NChzKSxhLmNvcHkodGhpcy5kaXJlY3Rpb24pLnRyYW5zZm9ybURpcmVjdGlvbihzKSxlJiZuLmRpc3RhbmNlKGwuY2VudGVyKS1sLnJhZGl1cz5jKXJldHVybjtsZXQgZj0wO2lmKG8uZ2VvbWV0cnkucmF5Y2FzdD09PSJzcGhlcmUiKXtpZihuLmRpc3RhbmNlKGwuY2VudGVyKT5sLnJhZGl1cyYmKGY9dGhpcy5pbnRlcnNlY3RTcGhlcmUobCxuLGEpLCFmKSlyZXR1cm59ZWxzZSBpZigobi54PGwubWluLnh8fG4ueD5sLm1heC54fHxuLnk8bC5taW4ueXx8bi55PmwubWF4Lnl8fG4uejxsLm1pbi56fHxuLno+bC5tYXgueikmJihmPXRoaXMuaW50ZXJzZWN0Qm94KGwsbixhKSwhZikpcmV0dXJuO2UmJmY+Y3x8KG8uaGl0fHwoby5oaXQ9e2xvY2FsUG9pbnQ6bmV3IEUscG9pbnQ6bmV3IEV9KSxvLmhpdC5sb2NhbFBvaW50LmNvcHkoYSkubXVsdGlwbHkoZikuYWRkKG4pLG8uaGl0LnBvaW50LmNvcHkoby5oaXQubG9jYWxQb2ludCkuYXBwbHlNYXRyaXg0KG8ud29ybGRNYXRyaXgpLG8uaGl0LmRpc3RhbmNlPW8uaGl0LnBvaW50LmRpc3RhbmNlKHRoaXMub3JpZ2luKSxoLnB1c2gobykpfSksaC5zb3J0KChvLGwpPT5vLmhpdC5kaXN0YW5jZS1sLmhpdC5kaXN0YW5jZSksaH1pbnRlcnNlY3RNZXNoZXModCx7Y3VsbEZhY2U6ZT0hMCxtYXhEaXN0YW5jZTpyLGluY2x1ZGVVVjpzPSEwLGluY2x1ZGVOb3JtYWw6bj0hMCxvdXRwdXQ6YT1bXX09e30pe2xldCBoPXRoaXMuaW50ZXJzZWN0Qm91bmRzKHQse21heERpc3RhbmNlOnIsb3V0cHV0OmF9KTtpZighaC5sZW5ndGgpcmV0dXJuIGg7bGV0IG89anIsbD1FZSxjPUdyLGY9WHIscD1Wcyx1PVVzLGQ9a3MseD1XcixtPUFlLGc9T3MsQT1Ecyx3PUJzO2ZvcihsZXQgXz1oLmxlbmd0aC0xO18+PTA7Xy0tKXtsZXQgTT1oW19dO28uaW52ZXJzZShNLndvcmxkTWF0cml4KTtsZXQgeTtyJiYoYy5jb3B5KHRoaXMuZGlyZWN0aW9uKS5zY2FsZVJvdGF0ZU1hdHJpeDQobykseT1yKmMubGVuKCkpLGwuY29weSh0aGlzLm9yaWdpbikuYXBwbHlNYXRyaXg0KG8pLGMuY29weSh0aGlzLmRpcmVjdGlvbikudHJhbnNmb3JtRGlyZWN0aW9uKG8pO2xldCBiPTAseixSLHYsTD1NLmdlb21ldHJ5LFQ9TC5hdHRyaWJ1dGVzLFM9VC5pbmRleCxGPVQucG9zaXRpb24sQz1NYXRoLm1heCgwLEwuZHJhd1JhbmdlLnN0YXJ0KSxOPU1hdGgubWluKFM/Uy5jb3VudDpGLmNvdW50LEwuZHJhd1JhbmdlLnN0YXJ0K0wuZHJhd1JhbmdlLmNvdW50KSxCPUYuc2l6ZTtmb3IobGV0IEk9QztJPE47SSs9Myl7bGV0IFc9Uz9TLmRhdGFbSV06SSxRPVM/Uy5kYXRhW0krMV06SSsxLEo9Uz9TLmRhdGFbSSsyXTpJKzI7Zi5mcm9tQXJyYXkoRi5kYXRhLFcqQikscC5mcm9tQXJyYXkoRi5kYXRhLFEqQiksdS5mcm9tQXJyYXkoRi5kYXRhLEoqQik7bGV0IG50PXRoaXMuaW50ZXJzZWN0VHJpYW5nbGUoZixwLHUsZSxsLGMseCk7bnQmJihyJiZudD55fHwoIWJ8fG50PGIpJiYoYj1udCx6PVcsUj1RLHY9SixkLmNvcHkoeCkpKX1ifHxoLnNwbGljZShfLDEpLE0uaGl0LmxvY2FsUG9pbnQuY29weShjKS5tdWx0aXBseShiKS5hZGQobCksTS5oaXQucG9pbnQuY29weShNLmhpdC5sb2NhbFBvaW50KS5hcHBseU1hdHJpeDQoTS53b3JsZE1hdHJpeCksTS5oaXQuZGlzdGFuY2U9TS5oaXQucG9pbnQuZGlzdGFuY2UodGhpcy5vcmlnaW4pLE0uaGl0LmZhY2VOb3JtYWx8fChNLmhpdC5sb2NhbEZhY2VOb3JtYWw9bmV3IEUsTS5oaXQuZmFjZU5vcm1hbD1uZXcgRSxNLmhpdC51dj1uZXcgWCxNLmhpdC5sb2NhbE5vcm1hbD1uZXcgRSxNLmhpdC5ub3JtYWw9bmV3IEUpLE0uaGl0LmxvY2FsRmFjZU5vcm1hbC5jb3B5KGQpLE0uaGl0LmZhY2VOb3JtYWwuY29weShNLmhpdC5sb2NhbEZhY2VOb3JtYWwpLnRyYW5zZm9ybURpcmVjdGlvbihNLndvcmxkTWF0cml4KSwoc3x8bikmJihmLmZyb21BcnJheShGLmRhdGEseiozKSxwLmZyb21BcnJheShGLmRhdGEsUiozKSx1LmZyb21BcnJheShGLmRhdGEsdiozKSx0aGlzLmdldEJhcnljb29yZChNLmhpdC5sb2NhbFBvaW50LGYscCx1LG0pKSxzJiZULnV2JiYoZy5mcm9tQXJyYXkoVC51di5kYXRhLHoqMiksQS5mcm9tQXJyYXkoVC51di5kYXRhLFIqMiksdy5mcm9tQXJyYXkoVC51di5kYXRhLHYqMiksTS5oaXQudXYuc2V0KGcueCptLngrQS54Km0ueSt3LngqbS56LGcueSptLngrQS55Km0ueSt3LnkqbS56KSksbiYmVC5ub3JtYWwmJihmLmZyb21BcnJheShULm5vcm1hbC5kYXRhLHoqMykscC5mcm9tQXJyYXkoVC5ub3JtYWwuZGF0YSxSKjMpLHUuZnJvbUFycmF5KFQubm9ybWFsLmRhdGEsdiozKSxNLmhpdC5sb2NhbE5vcm1hbC5zZXQoZi54Km0ueCtwLngqbS55K3UueCptLnosZi55Km0ueCtwLnkqbS55K3UueSptLnosZi56Km0ueCtwLnoqbS55K3UueiptLnopLE0uaGl0Lm5vcm1hbC5jb3B5KE0uaGl0LmxvY2FsTm9ybWFsKS50cmFuc2Zvcm1EaXJlY3Rpb24oTS53b3JsZE1hdHJpeCkpfXJldHVybiBoLnNvcnQoKF8sTSk9Pl8uaGl0LmRpc3RhbmNlLU0uaGl0LmRpc3RhbmNlKSxofWludGVyc2VjdFBsYW5lKHQsZT10aGlzLm9yaWdpbixyPXRoaXMuZGlyZWN0aW9uKXtsZXQgcz1FZTtzLnN1Yih0Lm9yaWdpbixlKTtsZXQgbj1zLmRvdCh0Lm5vcm1hbCksYT1yLmRvdCh0Lm5vcm1hbCk7aWYoYT09MClyZXR1cm4gMDtsZXQgaD1uL2E7cmV0dXJuIGg8PTA/MDplLmFkZChyLnNjYWxlKGgpKX1pbnRlcnNlY3RTcGhlcmUodCxlPXRoaXMub3JpZ2luLHI9dGhpcy5kaXJlY3Rpb24pe2xldCBzPVhyO3Muc3ViKHQuY2VudGVyLGUpO2xldCBuPXMuZG90KHIpLGE9cy5kb3QocyktbipuLGg9dC5yYWRpdXMqdC5yYWRpdXM7aWYoYT5oKXJldHVybiAwO2xldCBvPU1hdGguc3FydChoLWEpLGw9bi1vLGM9bitvO3JldHVybiBsPDAmJmM8MD8wOmw8MD9jOmx9aW50ZXJzZWN0Qm94KHQsZT10aGlzLm9yaWdpbixyPXRoaXMuZGlyZWN0aW9uKXtsZXQgcyxuLGEsaCxvLGwsYz0xL3IueCxmPTEvci55LHA9MS9yLnosdT10Lm1pbixkPXQubWF4O3JldHVybiBzPSgoYz49MD91Lng6ZC54KS1lLngpKmMsbj0oKGM+PTA/ZC54OnUueCktZS54KSpjLGE9KChmPj0wP3UueTpkLnkpLWUueSkqZixoPSgoZj49MD9kLnk6dS55KS1lLnkpKmYscz5ofHxhPm58fChhPnMmJihzPWEpLGg8biYmKG49aCksbz0oKHA+PTA/dS56OmQueiktZS56KSpwLGw9KChwPj0wP2Quejp1LnopLWUueikqcCxzPmx8fG8+bil8fChvPnMmJihzPW8pLGw8biYmKG49bCksbjwwKT8wOnM+PTA/czpufWludGVyc2VjdFRyaWFuZ2xlKHQsZSxyLHM9ITAsbj10aGlzLm9yaWdpbixhPXRoaXMuZGlyZWN0aW9uLGg9V3Ipe2xldCBvPUFlLGw9cXIsYz1ZcjtvLnN1YihlLHQpLGwuc3ViKHIsdCksaC5jcm9zcyhvLGwpO2xldCBmPWEuZG90KGgpO2lmKCFmKXJldHVybiAwO2xldCBwO2lmKGY+MCl7aWYocylyZXR1cm4gMDtwPTF9ZWxzZSBwPS0xLGY9LWY7Yy5zdWIobix0KTtsZXQgdT1wKmEuZG90KGwuY3Jvc3MoYyxsKSk7aWYodTwwKXJldHVybiAwO2xldCBkPXAqYS5kb3Qoby5jcm9zcyhjKSk7aWYoZDwwfHx1K2Q+ZilyZXR1cm4gMDtsZXQgeD0tcCpjLmRvdChoKTtyZXR1cm4geDwwPzA6eC9mfWdldEJhcnljb29yZCh0LGUscixzLG49QWUpe2xldCBhPXFyLGg9WXIsbz1HczthLnN1YihzLGUpLGguc3ViKHIsZSksby5zdWIodCxlKTtsZXQgbD1hLmRvdChhKSxjPWEuZG90KGgpLGY9YS5kb3QobykscD1oLmRvdChoKSx1PWguZG90KG8pLGQ9bCpwLWMqYztpZihkPT09MClyZXR1cm4gbi5zZXQoLTIsLTEsLTEpO2xldCB4PTEvZCxtPShwKmYtYyp1KSp4LGc9KGwqdS1jKmYpKng7cmV0dXJuIG4uc2V0KDEtbS1nLGcsbSl9fTt2YXIgdmU9ImNhdG11bGxyb20iLGJlPSJjdWJpY2JlemllciIsWnI9InF1YWRyYXRpY2JlemllciIsY3Q9bmV3IEUsZnQ9bmV3IEUsVnQ9bmV3IEUsSHI9bmV3IEU7ZnVuY3Rpb24gWHMoaSx0LGU9LjE2OCxyPS4xNjgpe2lmKHQ8MT9jdC5zdWIoaVsxXSxpWzBdKS5zY2FsZShlKS5hZGQoaVswXSk6Y3Quc3ViKGlbdCsxXSxpW3QtMV0pLnNjYWxlKGUpLmFkZChpW3RdKSx0PmkubGVuZ3RoLTMpe2xldCBzPWkubGVuZ3RoLTE7ZnQuc3ViKGlbcy0xXSxpW3NdKS5zY2FsZShyKS5hZGQoaVtzXSl9ZWxzZSBmdC5zdWIoaVt0XSxpW3QrMl0pLnNjYWxlKHIpLmFkZChpW3QrMV0pO3JldHVybltjdC5jbG9uZSgpLGZ0LmNsb25lKCldfWZ1bmN0aW9uIFFyKGksdCxlLHIpe2xldCBzPTEtaTtjdC5jb3B5KHQpLnNjYWxlKHMqKjIpLGZ0LmNvcHkoZSkuc2NhbGUoMipzKmkpLFZ0LmNvcHkocikuc2NhbGUoaSoqMik7bGV0IG49bmV3IEU7cmV0dXJuIG4uYWRkKGN0LGZ0KS5hZGQoVnQpLG59ZnVuY3Rpb24gS3IoaSx0LGUscixzKXtsZXQgbj0xLWk7Y3QuY29weSh0KS5zY2FsZShuKiozKSxmdC5jb3B5KGUpLnNjYWxlKDMqbioqMippKSxWdC5jb3B5KHIpLnNjYWxlKDMqbippKioyKSxIci5jb3B5KHMpLnNjYWxlKGkqKjMpO2xldCBhPW5ldyBFO3JldHVybiBhLmFkZChjdCxmdCkuYWRkKFZ0KS5hZGQoSHIpLGF9dmFyIGR0PWNsYXNzIGl7Y29uc3RydWN0b3Ioe3BvaW50czp0PVtuZXcgRSgwLDAsMCksbmV3IEUoMCwxLDApLG5ldyBFKDEsMSwwKSxuZXcgRSgxLDAsMCldLGRpdmlzaW9uczplPTEyLHR5cGU6cj12ZX09e30pe3RoaXMucG9pbnRzPXQsdGhpcy5kaXZpc2lvbnM9ZSx0aGlzLnR5cGU9cn1fZ2V0UXVhZHJhdGljQmV6aWVyUG9pbnRzKHQ9dGhpcy5kaXZpc2lvbnMpe2xldCBlPVtdLHI9dGhpcy5wb2ludHMubGVuZ3RoO2lmKHI8MylyZXR1cm4gY29uc29sZS53YXJuKCJOb3QgZW5vdWdoIHBvaW50cyBwcm92aWRlZC4iKSxbXTtsZXQgcz10aGlzLnBvaW50c1swXSxuPXRoaXMucG9pbnRzWzFdLGE9dGhpcy5wb2ludHNbMl07Zm9yKGxldCBvPTA7bzw9dDtvKyspe2xldCBsPVFyKG8vdCxzLG4sYSk7ZS5wdXNoKGwpfWxldCBoPTM7Zm9yKDtyLWg+MDspe3MuY29weShhKSxuPWEuc2NhbGUoMikuc3ViKG4pLGE9dGhpcy5wb2ludHNbaF07Zm9yKGxldCBvPTE7bzw9dDtvKyspe2xldCBsPVFyKG8vdCxzLG4sYSk7ZS5wdXNoKGwpfWgrK31yZXR1cm4gZX1fZ2V0Q3ViaWNCZXppZXJQb2ludHModD10aGlzLmRpdmlzaW9ucyl7bGV0IGU9W10scj10aGlzLnBvaW50cy5sZW5ndGg7aWYocjw0KXJldHVybiBjb25zb2xlLndhcm4oIk5vdCBlbm91Z2ggcG9pbnRzIHByb3ZpZGVkLiIpLFtdO2xldCBzPXRoaXMucG9pbnRzWzBdLG49dGhpcy5wb2ludHNbMV0sYT10aGlzLnBvaW50c1syXSxoPXRoaXMucG9pbnRzWzNdO2ZvcihsZXQgbD0wO2w8PXQ7bCsrKXtsZXQgYz1LcihsL3QscyxuLGEsaCk7ZS5wdXNoKGMpfWxldCBvPTQ7Zm9yKDtyLW8+MTspe3MuY29weShoKSxuPWguc2NhbGUoMikuc3ViKGEpLGE9dGhpcy5wb2ludHNbb10saD10aGlzLnBvaW50c1tvKzFdO2ZvcihsZXQgbD0xO2w8PXQ7bCsrKXtsZXQgYz1LcihsL3QscyxuLGEsaCk7ZS5wdXNoKGMpfW8rPTJ9cmV0dXJuIGV9X2dldENhdG11bGxSb21Qb2ludHModD10aGlzLmRpdmlzaW9ucyxlPS4xNjgscj0uMTY4KXtsZXQgcz1bXTtpZih0aGlzLnBvaW50cy5sZW5ndGg8PTIpcmV0dXJuIHRoaXMucG9pbnRzO2xldCBhO3JldHVybiB0aGlzLnBvaW50cy5mb3JFYWNoKChoLG8pPT57aWYobz09PTApYT1oO2Vsc2V7bGV0W2wsY109WHModGhpcy5wb2ludHMsby0xLGUsciksZj1uZXcgaSh7cG9pbnRzOlthLGwsYyxoXSx0eXBlOmJlfSk7cy5wb3AoKSxzLnB1c2goLi4uZi5nZXRQb2ludHModCkpLGE9aH19KSxzfWdldFBvaW50cyh0PXRoaXMuZGl2aXNpb25zLGU9LjE2OCxyPS4xNjgpe2xldCBzPXRoaXMudHlwZTtyZXR1cm4gcz09PVpyP3RoaXMuX2dldFF1YWRyYXRpY0JlemllclBvaW50cyh0KTpzPT09YmU/dGhpcy5fZ2V0Q3ViaWNCZXppZXJQb2ludHModCk6cz09PXZlP3RoaXMuX2dldENhdG11bGxSb21Qb2ludHModCxlLHIpOnRoaXMucG9pbnRzfX07ZHQuQ0FUTVVMTFJPTT12ZTtkdC5DVUJJQ0JFWklFUj1iZTtkdC5RVUFEUkFUSUNCRVpJRVI9WnI7dmFyIHJ0PWNsYXNze2NvbnN0cnVjdG9yKCl7dGhpcy5fbGVuPS0xLHRoaXMudGlsdFN0YXJ0PTAsdGhpcy50aWx0RW5kPTB9Z2V0TGVuZ3RoKCl7cmV0dXJuIHRoaXMuX2xlbjwwJiZ0aGlzLnVwZGF0ZUxlbmd0aCgpLHRoaXMuX2xlbn1nZXRUaWx0QXQodCl7cmV0dXJuIHRoaXMudGlsdFN0YXJ0KigxLXQpKnRoaXMudGlsdEVuZCp0fWNsb25lKCl7cmV0dXJuIG5ldyB0aGlzLmNvbnN0cnVjdG9yKCkuY29weSh0aGlzKX1jb3B5KHQpe3JldHVybiB0aGlzLl9sZW49dC5fbGVuLHRoaXMudGlsdFN0YXJ0PXQudGlsdFN0YXJ0LHRoaXMudGlsdEVuZD10LnRpbHRFbmQsdGhpc319O3ZhciBtdD1bLS4wNjQwNTY4OTI4NjI2MDU2MywuMDY0MDU2ODkyODYyNjA1NjMsLS4xOTExMTg4Njc0NzM2MTYzLC4xOTExMTg4Njc0NzM2MTYzLC0uMzE1MDQyNjc5Njk2MTYzNCwuMzE1MDQyNjc5Njk2MTYzNCwtLjQzMzc5MzUwNzYyNjA0NTEsLjQzMzc5MzUwNzYyNjA0NTEsLS41NDU0MjE0NzEzODg4Mzk2LC41NDU0MjE0NzEzODg4Mzk2LC0uNjQ4MDkzNjUxOTM2OTc1NSwuNjQ4MDkzNjUxOTM2OTc1NSwtLjc0MDEyNDE5MTU3ODU1NDQsLjc0MDEyNDE5MTU3ODU1NDQsLS44MjAwMDE5ODU5NzM5MDMsLjgyMDAwMTk4NTk3MzkwMywtLjg4NjQxNTUyNzAwNDQwMTEsLjg4NjQxNTUyNzAwNDQwMTEsLS45MzgyNzQ1NTIwMDI3MzI4LC45MzgyNzQ1NTIwMDI3MzI4LC0uOTc0NzI4NTU1OTcxMzA5NSwuOTc0NzI4NTU1OTcxMzA5NSwtLjk5NTE4NzIxOTk5NzAyMTMsLjk5NTE4NzIxOTk5NzAyMTNdLFV0PVsuMTI3OTM4MTk1MzQ2NzUyMTYsLjEyNzkzODE5NTM0Njc1MjE2LC4xMjU4Mzc0NTYzNDY4MjgzLC4xMjU4Mzc0NTYzNDY4MjgzLC4xMjE2NzA0NzI5Mjc4MDMzOSwuMTIxNjcwNDcyOTI3ODAzMzksLjExNTUwNTY2ODA1MzcyNTYsLjExNTUwNTY2ODA1MzcyNTYsLjEwNzQ0NDI3MDExNTk2NTYzLC4xMDc0NDQyNzAxMTU5NjU2MywuMDk3NjE4NjUyMTA0MTEzODgsLjA5NzYxODY1MjEwNDExMzg4LC4wODYxOTAxNjE1MzE5NTMyNywuMDg2MTkwMTYxNTMxOTUzMjcsLjA3MzM0NjQ4MTQxMTA4MDMsLjA3MzM0NjQ4MTQxMTA4MDMsLjA1OTI5ODU4NDkxNTQzNjc4LC4wNTkyOTg1ODQ5MTU0MzY3OCwuMDQ0Mjc3NDM4ODE3NDE5ODEsLjA0NDI3NzQzODgxNzQxOTgxLC4wMjg1MzEzODg2Mjg5MzM2NjMsLjAyODUzMTM4ODYyODkzMzY2MywuMDEyMzQxMjI5Nzk5OTg3MiwuMDEyMzQxMjI5Nzk5OTg3Ml0sJHI9aT0+aSpNYXRoLlBJLzE4MCxKcj1pPT4xODAqaS9NYXRoLlBJLGt0PShpLHQsZSk9Pk1hdGgubWF4KHQsTWF0aC5taW4oaSxlKSk7ZnVuY3Rpb24gdHMoaSx0LGUscil7bGV0IHM9dFswXSxuPXRbMV0sYT10WzJdLGg9MS1yO3JldHVybiBpWzBdPXMqcypoK3IsaVsxXT1uKnMqaCthKmUsaVsyXT1hKnMqaC1uKmUsaVszXT0wLGlbNF09cypuKmgtYSplLGlbNV09bipuKmgrcixpWzZdPWEqbipoK3MqZSxpWzddPTAsaVs4XT1zKmEqaCtuKmUsaVs5XT1uKmEqaC1zKmUsaVsxMF09YSphKmgrcixpWzExXT0wLGlbMTJdPTAsaVsxM109MCxpWzE0XT0wLGlbMTVdPTEsaX1mdW5jdGlvbiBGZShpLHQsZSxyPXQscz1lKXtsZXQgbj1NYXRoLnNpbihpKSxhPU1hdGguY29zKGkpLGg9YSp0LngrbiplLngsbz1hKnQueStuKmUueSxsPWEqdC56K24qZS56LGM9YSplLngtbip0LngsZj1hKmUueS1uKnQueSxwPWEqZS56LW4qdC56O3Iuc2V0KGgsbyxsKSxzLnNldChjLGYscCl9dmFyIFdzPW5ldyBFO2Z1bmN0aW9uIFRlKGksdCxlLHIscyl7bGV0IG49MS1pO3JldHVybiBuKm4qbip0KzMqbipuKmkqZSszKm4qaSppKnIraSppKmkqc31mdW5jdGlvbiBSZShpLHQsZSxyLHMpe2xldCBuPTEtaTtyZXR1cm4gMypuKm4qKGUtdCkrNipuKmkqKHItZSkrMyppKmkqKHMtcil9dmFyIHd0PWNsYXNzIGV4dGVuZHMgcnR7Y29uc3RydWN0b3IodCxlLHIscyxuPTAsYT0wKXtzdXBlcigpLHRoaXMucDA9dCx0aGlzLnAxPWUsdGhpcy5wMj1yLHRoaXMucDM9cyx0aGlzLnRpbHRTdGFydD1uLHRoaXMudGlsdEVuZD1hLHRoaXMuX2xlbj0tMX11cGRhdGVMZW5ndGgoKXtsZXQgZT1tdC5sZW5ndGgscj0wO2ZvcihsZXQgcz0wLG47czxlO3MrKyluPS41Km10W3NdKy41LHIrPVV0W3NdKnRoaXMuZ2V0RGVyaXZhdGl2ZUF0KG4sV3MpLmxlbigpO3RoaXMuX2xlbj0uNSpyfWdldFBvaW50QXQodCxlPW5ldyBFKXtyZXR1cm4gZS54PVRlKHQsdGhpcy5wMC54LHRoaXMucDEueCx0aGlzLnAyLngsdGhpcy5wMy54KSxlLnk9VGUodCx0aGlzLnAwLnksdGhpcy5wMS55LHRoaXMucDIueSx0aGlzLnAzLnkpLGUuej1UZSh0LHRoaXMucDAueix0aGlzLnAxLnosdGhpcy5wMi56LHRoaXMucDMueiksZX1nZXREZXJpdmF0aXZlQXQodCxlPW5ldyBFKXtyZXR1cm4gZS54PVJlKHQsdGhpcy5wMC54LHRoaXMucDEueCx0aGlzLnAyLngsdGhpcy5wMy54KSxlLnk9UmUodCx0aGlzLnAwLnksdGhpcy5wMS55LHRoaXMucDIueSx0aGlzLnAzLnkpLGUuej1SZSh0LHRoaXMucDAueix0aGlzLnAxLnosdGhpcy5wMi56LHRoaXMucDMueiksZX1nZXRUYW5nZW50QXQodCxlPW5ldyBFKXtyZXR1cm4gdGhpcy5nZXREZXJpdmF0aXZlQXQodCxlKS5ub3JtYWxpemUoKX1sYXN0UG9pbnQoKXtyZXR1cm4gdGhpcy5wM319O3ZhciBxcz1uZXcgRTtmdW5jdGlvbiB6ZShpLHQsZSxyKXtsZXQgcz0xLWk7cmV0dXJuIHMqcyp0KzIqcyppKmUraSppKnJ9ZnVuY3Rpb24gTGUoaSx0LGUscil7cmV0dXJuIDIqKDEtaSkqKGUtdCkrMippKihyLWUpfXZhciBNdD1jbGFzcyBleHRlbmRzIHJ0e2NvbnN0cnVjdG9yKHQsZSxyLHM9MCxuPTApe3N1cGVyKCksdGhpcy5wMD10LHRoaXMucDE9ZSx0aGlzLnAyPXIsdGhpcy50aWx0U3RhcnQ9cyx0aGlzLnRpbHRFbmQ9bix0aGlzLl9sZW49LTF9dXBkYXRlTGVuZ3RoKCl7bGV0IGU9bXQubGVuZ3RoLHI9MDtmb3IobGV0IHM9MCxuO3M8ZTtzKyspbj0uNSptdFtzXSsuNSxyKz1VdFtzXSp0aGlzLmdldERlcml2YXRpdmVBdChuLHFzKS5sZW4oKTt0aGlzLl9sZW49LjUqcn1nZXRQb2ludEF0KHQsZT1uZXcgRSl7cmV0dXJuIGUueD16ZSh0LHRoaXMucDAueCx0aGlzLnAxLngsdGhpcy5wMi54KSxlLnk9emUodCx0aGlzLnAwLnksdGhpcy5wMS55LHRoaXMucDIueSksZS56PXplKHQsdGhpcy5wMC56LHRoaXMucDEueix0aGlzLnAyLnopLGV9Z2V0RGVyaXZhdGl2ZUF0KHQsZT1uZXcgRSl7cmV0dXJuIGUueD1MZSh0LHRoaXMucDAueCx0aGlzLnAxLngsdGhpcy5wMi54KSxlLnk9TGUodCx0aGlzLnAwLnksdGhpcy5wMS55LHRoaXMucDIueSksZS56PUxlKHQsdGhpcy5wMC56LHRoaXMucDEueix0aGlzLnAyLnopLGV9Z2V0VGFuZ2VudEF0KHQsZT1uZXcgRSl7cmV0dXJuIHRoaXMuZ2V0RGVyaXZhdGl2ZUF0KHQsZSkubm9ybWFsaXplKCl9bGFzdFBvaW50KCl7cmV0dXJuIHRoaXMucDJ9fTt2YXIgWXM9bmV3IEUsRXQ9Y2xhc3MgZXh0ZW5kcyBydHtjb25zdHJ1Y3Rvcih0LGUscj0wLHM9MCl7c3VwZXIoKSx0aGlzLnAwPXQsdGhpcy5wMT1lLHRoaXMudGlsdFN0YXJ0PXIsdGhpcy50aWx0RW5kPXMsdGhpcy5fbGVuPS0xfXVwZGF0ZUxlbmd0aCgpe3RoaXMuX2xlbj1Zcy5zdWIodGhpcy5wMSx0aGlzLnAwKS5sZW4oKX1nZXRQb2ludEF0KHQsZT1uZXcgRSl7cmV0dXJuIEN0KGUsdGhpcy5wMCx0aGlzLnAxLHQpLGV9Z2V0VGFuZ2VudEF0KHQsZT1uZXcgRSl7cmV0dXJuIGUuc3ViKHRoaXMucDEsdGhpcy5wMCkubm9ybWFsaXplKCl9bGFzdFBvaW50KCl7cmV0dXJuIHRoaXMucDF9fTt2YXIgdXQ9bmV3IEUsZXM9bmV3IFY7ZnVuY3Rpb24ganMoaSx0KXtpZih0aGlzW2ldPT1udWxsKXRocm93IG5ldyBFcnJvcih0KX12YXIgU2U9Y2xhc3N7Y29uc3RydWN0b3IoKXt0aGlzLl9zZWdtZW50cz1bXSx0aGlzLl9sZW5ndGhPZmZzZXRzPW51bGwsdGhpcy5fdG90YWxMZW5ndGg9LTEsdGhpcy5fbGFzdFBvaW50PW51bGwsdGhpcy5fbGFzdFRpbHQ9MCx0aGlzLl9hc3NlcnRMYXN0UG9pbnQ9anMuYmluZCh0aGlzLCJfbGFzdFBvaW50IiwiQ2FuYHQgZ2V0IHByZXZpb3VzIHBvaW50IG9mIGN1cnZlLiBEaWQgeW91IGZvcmdldCBtb3ZlVG8gY29tbWFuZD8iKSx0aGlzLnRpbHRGdW5jdGlvbj1udWxsfW1vdmVUbyh0LGU9MCl7dGhpcy5fdG90YWxMZW5ndGg9LTEsdGhpcy5fbGFzdFBvaW50PXQsdGhpcy5fbGFzdFRpbHQ9ZX1iZXppZXJDdXJ2ZVRvKHQsZSxyLHM9MCl7dGhpcy5fYXNzZXJ0TGFzdFBvaW50KCk7bGV0IG49bmV3IHd0KHRoaXMuX2xhc3RQb2ludCx0LGUscix0aGlzLl9sYXN0VGlsdCxzKTtyZXR1cm4gdGhpcy5hZGRTZWdtZW50KG4pLHRoaXN9cXVhZHJhdGljQ3VydmVUbyh0LGUscj0wKXt0aGlzLl9hc3NlcnRMYXN0UG9pbnQoKTtsZXQgcz1uZXcgTXQodGhpcy5fbGFzdFBvaW50LHQsZSx0aGlzLl9sYXN0VGlsdCxyKTtyZXR1cm4gdGhpcy5hZGRTZWdtZW50KHMpLHRoaXN9bGluZVRvKHQsZT0wKXt0aGlzLl9hc3NlcnRMYXN0UG9pbnQoKTtsZXQgcj1uZXcgRXQodGhpcy5fbGFzdFBvaW50LHQsdGhpcy5fbGFzdFRpbHQsZSk7cmV0dXJuIHRoaXMuYWRkU2VnbWVudChyKSx0aGlzfWFkZFNlZ21lbnQodCl7cmV0dXJuIHRoaXMuX3RvdGFsTGVuZ3RoPS0xLHRoaXMuX2xhc3RQb2ludD10Lmxhc3RQb2ludCgpLHRoaXMuX2xhc3RUaWx0PXQudGlsdEVuZCx0aGlzLl9zZWdtZW50cy5wdXNoKHQpLHRoaXN9Z2V0U2VnbWVudHMoKXtyZXR1cm4gdGhpcy5fc2VnbWVudHN9dXBkYXRlTGVuZ3RoKCl7bGV0IHQ9dGhpcy5fc2VnbWVudHMubGVuZ3RoO3RoaXMuX2xlbmd0aE9mZnNldHM9bmV3IEFycmF5KHQpO2xldCBlPTA7Zm9yKGxldCByPTA7cjx0O3IrKyl0aGlzLl9sZW5ndGhPZmZzZXRzW3JdPWUsZSs9dGhpcy5fc2VnbWVudHNbcl0uZ2V0TGVuZ3RoKCk7dGhpcy5fdG90YWxMZW5ndGg9ZX1nZXRMZW5ndGgoKXtyZXR1cm4gdGhpcy5fdG90YWxMZW5ndGg8MCYmdGhpcy51cGRhdGVMZW5ndGgoKSx0aGlzLl90b3RhbExlbmd0aH1maW5kU2VnbWVudEluZGV4QXRMZW5ndGgodCl7bGV0IGU9dGhpcy5nZXRMZW5ndGgoKTtpZih0PD0wKXJldHVyblswLDBdO2lmKHQ+PWUpcmV0dXJuW3RoaXMuX3NlZ21lbnRzLmxlbmd0aC0xLDFdO2xldCByPTAscz10aGlzLl9sZW5ndGhPZmZzZXRzLmxlbmd0aC0xLG49LTEsYTtmb3IoO3I8PXM7KWlmKGE9TWF0aC5jZWlsKChyK3MpLzIpLGE9PT0wfHxhPT09dGhpcy5fbGVuZ3RoT2Zmc2V0cy5sZW5ndGgtMXx8dD49dGhpcy5fbGVuZ3RoT2Zmc2V0c1thXSYmdDx0aGlzLl9sZW5ndGhPZmZzZXRzW2ErMV0pe249YTticmVha31lbHNlIHQ8dGhpcy5fbGVuZ3RoT2Zmc2V0c1thXT9zPWEtMTpyPWErMTtsZXQgbz10aGlzLl9zZWdtZW50c1tuXS5nZXRMZW5ndGgoKSxsPSh0LXRoaXMuX2xlbmd0aE9mZnNldHNbbl0pL287cmV0dXJuW24sbF19Z2V0UG9pbnRBdExlbmd0aCh0LGU9bmV3IEUpe2xldFtyLHNdPXRoaXMuZmluZFNlZ21lbnRJbmRleEF0TGVuZ3RoKHQpO3JldHVybiB0aGlzLl9zZWdtZW50c1tyXS5nZXRQb2ludEF0KHMsZSl9Z2V0UG9pbnRBdCh0LGU9bmV3IEUpe2xldCByPXRoaXMuZ2V0TGVuZ3RoKCk7cmV0dXJuIHRoaXMuZ2V0UG9pbnRBdExlbmd0aCh0KnIsZSl9Z2V0VGFuZ2VudEF0TGVuZ3RoKHQsZT1uZXcgRSl7bGV0W3Isc109dGhpcy5maW5kU2VnbWVudEluZGV4QXRMZW5ndGgodCk7cmV0dXJuIHRoaXMuX3NlZ21lbnRzW3JdLmdldFRhbmdlbnRBdChzLGUpfWdldFRhbmdlbnRBdCh0LGU9bmV3IEUpe2xldCByPXRoaXMuZ2V0TGVuZ3RoKCk7cmV0dXJuIHRoaXMuZ2V0VGFuZ2VudEF0TGVuZ3RoKHQqcixlKX1nZXRUaWx0QXRMZW5ndGgodCl7bGV0W2Uscl09dGhpcy5maW5kU2VnbWVudEluZGV4QXRMZW5ndGgodCk7cmV0dXJuIHRoaXMuX3NlZ21lbnRzW2VdLmdldFRpbHRBdChyKX1nZXRUaWx0QXQodCl7bGV0IGU9dGhpcy5nZXRMZW5ndGgoKTtyZXR1cm4gdGhpcy5nZXRUaWx0QXRMZW5ndGgodCplKX1nZXRQb2ludHModD02NCl7bGV0IGU9bmV3IEFycmF5KHQrMSk7Zm9yKGxldCByPTA7cjw9dDtyKyspZVtyXT10aGlzLmdldFBvaW50QXQoci90KTtyZXR1cm4gZX1jb21wdXRlRnJlbmV0RnJhbWVzKHQ9NjQsZT0hMSl7bGV0IHI9bmV3IEFycmF5KHQrMSkscz1uZXcgQXJyYXkodCsxKSxuPXRoaXMudGlsdEZ1bmN0aW9uPz8odT0+dSksYT10aGlzLmdldExlbmd0aCgpO2ZvcihsZXQgdT0wO3U8PXQ7dSsrKXtsZXRbZCx4XT10aGlzLmZpbmRTZWdtZW50SW5kZXhBdExlbmd0aChhKnUvdCksbT10aGlzLl9zZWdtZW50c1tkXTtyW3VdPW0uZ2V0VGFuZ2VudEF0KHgpLHNbdV09bihtLmdldFRpbHRBdCh4KSx1L3QsdGhpcyl9bGV0IGg9TWF0aC5hYnMoclswXS54KSxvPU1hdGguYWJzKHJbMF0ueSksbD1NYXRoLmFicyhyWzBdLnopLGM9bmV3IEU7aDxvJiZoPGw/Yy5zZXQoMSwwLDApOm88aCYmbzxsP2Muc2V0KDAsMSwwKTpjLnNldCgwLDAsMSk7bGV0IGY9bmV3IEFycmF5KHQrMSkscD1uZXcgQXJyYXkodCsxKTtmWzBdPW5ldyBFLHBbMF09bmV3IEUsdXQuY3Jvc3MoclswXSxjKS5ub3JtYWxpemUoKSxmWzBdLmNyb3NzKHJbMF0sdXQpLHBbMF0uY3Jvc3MoclswXSxmWzBdKTtmb3IobGV0IHU9MTt1PHIubGVuZ3RoO3UrKyl7Zlt1XT1mW3UtMV0uY2xvbmUoKSxwW3VdPW5ldyBFLHV0LmNyb3NzKHJbdS0xXSxyW3VdKTtsZXQgZD11dC5sZW4oKTtpZihkPk51bWJlci5FUFNJTE9OKXt1dC5zY2FsZSgxL2QpO2xldCB4PWt0KHJbdS0xXS5kb3Qoclt1XSksLTEsMSksbT1rdChkLC0xLDEpO3RzKGVzLHV0LG0seCksZlt1XS5hcHBseU1hdHJpeDQoZXMpfXBbdV0uY3Jvc3Moclt1XSxmW3VdKX1mb3IobGV0IHU9MDt1PHMubGVuZ3RoO3UrKylGZSgkcihzW3VdKSxmW3VdLHBbdV0pO2lmKGU9PT0hMCl7bGV0IHU9ZltmLmxlbmd0aC0xXSxkPU1hdGguYWNvcyhrdChmWzBdLmRvdCh1KSwtMSwxKSkvKGYubGVuZ3RoLTEpO3JbMF0uZG90KHV0LmNyb3NzKGZbMF0sdSkpPjAmJihkPS1kKTtmb3IobGV0IHg9MTt4PGYubGVuZ3RoLTE7eCsrKXtsZXQgbT1kKng7RmUobSxmW3hdLHBbeF0pLHNbeF0rPUpyKG0pfWZbZi5sZW5ndGgtMV09ZlswXS5jbG9uZSgpLHBbcC5sZW5ndGgtMV09cFswXS5jbG9uZSgpfXJldHVybnt0YW5nZW50czpyLG5vcm1hbHM6ZixiaW5vcm1hbHM6cCx0aWx0czpzfX19O3ZhciBHdD1uZXcgRSxwdD1uZXcgRSxQZT1uZXcgWCxYdD1uZXcgRSxDZT1jbGFzcyBleHRlbmRzIE97Y29uc3RydWN0b3IodCx7cGF0aDplLHJhZGl1czpyPTEsdHVidWxhclNlZ21lbnRzOnM9NjQscmFkaWFsU2VnbWVudHM6bj04LGNsb3NlZDphPSExLGF0dHJpYnV0ZXM6aD17fX09e30pe3N1cGVyKHQsaCksdGhpcy5wYXRoPWUsdGhpcy5yYWRpdXM9cix0aGlzLnR1YnVsYXJTZWdtZW50cz1zLHRoaXMucmFkaWFsU2VnbWVudHM9bix0aGlzLmNsb3NlZD1hLHRoaXMuZnJlbmV0RnJhbWVzPWUuY29tcHV0ZUZyZW5ldEZyYW1lcyhzLGEpO2xldCBvPShzKzEpKihuKzEpLGw9cypuKjY7dGhpcy5wb3NpdGlvbnM9bmV3IEZsb2F0MzJBcnJheShvKjMpLHRoaXMubm9ybWFscz1uZXcgRmxvYXQzMkFycmF5KG8qMyksdGhpcy51dnM9bmV3IEZsb2F0MzJBcnJheShvKjIpLHRoaXMuaW5kaWNlcz1vPjY1NTM2P25ldyBVaW50MzJBcnJheShsKTpuZXcgVWludDE2QXJyYXkobCksdGhpcy5fZ2VuZXJhdGVBdHRyaWJ1dGVzKCksdGhpcy5fZ2VuZXJhdGVJbmRpY2VzKCksdGhpcy5hZGRBdHRyaWJ1dGUoInBvc2l0aW9uIix7c2l6ZTozLGRhdGE6dGhpcy5wb3NpdGlvbnN9KSx0aGlzLmFkZEF0dHJpYnV0ZSgibm9ybWFsIix7c2l6ZTozLGRhdGE6dGhpcy5ub3JtYWxzfSksdGhpcy5hZGRBdHRyaWJ1dGUoInV2Iix7c2l6ZToyLGRhdGE6dGhpcy51dnN9KSx0aGlzLnNldEluZGV4KHtkYXRhOnRoaXMuaW5kaWNlc30pfV9nZW5lcmF0ZUF0dHJpYnV0ZXMoKXtmb3IobGV0IHQ9MDt0PD10aGlzLnR1YnVsYXJTZWdtZW50czt0Kyspe2xldCBlPXQ7dD09PXRoaXMudHVidWxhclNlZ21lbnRzJiYoZT10aGlzLmNsb3NlZD8wOnRoaXMudHVidWxhclNlZ21lbnRzKSx0aGlzLnBhdGguZ2V0UG9pbnRBdChlL3RoaXMudHVidWxhclNlZ21lbnRzLFh0KTtsZXQgcj10aGlzLmZyZW5ldEZyYW1lcy5ub3JtYWxzW2VdLHM9dGhpcy5mcmVuZXRGcmFtZXMuYmlub3JtYWxzW2VdO2ZvcihsZXQgbj0wO248PXRoaXMucmFkaWFsU2VnbWVudHM7bisrKXtsZXQgYT1uL3RoaXMucmFkaWFsU2VnbWVudHMqTWF0aC5QSSoyLGg9TWF0aC5zaW4oYSksbz0tTWF0aC5jb3MoYSksbD10Kih0aGlzLnJhZGlhbFNlZ21lbnRzKzEpK247cHQueD1vKnIueCtoKnMueCxwdC55PW8qci55K2gqcy55LHB0Lno9bypyLnoraCpzLnosdGhpcy5ub3JtYWxzLnNldChwdCxsKjMpLEd0Lng9WHQueCt0aGlzLnJhZGl1cypwdC54LEd0Lnk9WHQueSt0aGlzLnJhZGl1cypwdC55LEd0Lno9WHQueit0aGlzLnJhZGl1cypwdC56LHRoaXMucG9zaXRpb25zLnNldChHdCxsKjMpLFBlLng9dC90aGlzLnR1YnVsYXJTZWdtZW50cyxQZS55PW4vdGhpcy5yYWRpYWxTZWdtZW50cyx0aGlzLnV2cy5zZXQoUGUsbCoyKX19fV9nZW5lcmF0ZUluZGljZXMoKXtmb3IobGV0IHQ9MTt0PD10aGlzLnR1YnVsYXJTZWdtZW50czt0KyspZm9yKGxldCBlPTE7ZTw9dGhpcy5yYWRpYWxTZWdtZW50cztlKyspe2xldCByPSh0aGlzLnJhZGlhbFNlZ21lbnRzKzEpKih0LTEpKyhlLTEpLHM9KHRoaXMucmFkaWFsU2VnbWVudHMrMSkqdCsoZS0xKSxuPSh0aGlzLnJhZGlhbFNlZ21lbnRzKzEpKnQrZSxhPSh0aGlzLnJhZGlhbFNlZ21lbnRzKzEpKih0LTEpK2UsaD0odC0xKSp0aGlzLnJhZGlhbFNlZ21lbnRzKyhlLTEpO3RoaXMuaW5kaWNlcy5zZXQoW3IscyxhLHMsbixhXSxoKjYpfX19O3ZhciBOZT1jbGFzc3tjb25zdHJ1Y3Rvcih0LHt3aWR0aDplLGhlaWdodDpyLGRwcjpzLHdyYXBTOm49dC5DTEFNUF9UT19FREdFLHdyYXBUOmE9dC5DTEFNUF9UT19FREdFLG1pbkZpbHRlcjpoPXQuTElORUFSLG1hZ0ZpbHRlcjpvPXQuTElORUFSLGdlb21ldHJ5Omw9bmV3IGl0KHQpLHRhcmdldE9ubHk6Yz1udWxsLGRlcHRoOmY9ITB9PXt9KXt0aGlzLmdsPXQsdGhpcy5wYXNzZXM9W10sdGhpcy5nZW9tZXRyeT1sLHRoaXMudW5pZm9ybT17dmFsdWU6bnVsbH0sdGhpcy50YXJnZXRPbmx5PWMscyYmKHRoaXMuZHByPXMpLGUmJih0aGlzLndpZHRoPWUpLHImJih0aGlzLmhlaWdodD1yKSxzPXRoaXMuZHByfHx0aGlzLmdsLnJlbmRlcmVyLmRwcix0aGlzLnJlc29sdXRpb25XaWR0aD1NYXRoLmZsb29yKHRoaXMud2lkdGh8fHRoaXMuZ2wucmVuZGVyZXIud2lkdGgqcyksdGhpcy5yZXNvbHV0aW9uSGVpZ2h0PU1hdGguZmxvb3IodGhpcy5oZWlnaHR8fHRoaXMuZ2wucmVuZGVyZXIuaGVpZ2h0KnMpO2xldCBwPXtkcHI6dGhpcy5kcHIsd2lkdGg6dGhpcy5yZXNvbHV0aW9uV2lkdGgsaGVpZ2h0OnRoaXMucmVzb2x1dGlvbkhlaWdodCx3cmFwUzpuLHdyYXBUOmEsbWluRmlsdGVyOmgsbWFnRmlsdGVyOm8sZGVwdGg6Zn0sdT10aGlzLmZibz17cmVhZDpuZXcgaih0aGlzLmdsLHApLHdyaXRlOm5ldyBqKHRoaXMuZ2wscCksc3dhcDooKT0+e2xldCBkPXUucmVhZDt1LnJlYWQ9dS53cml0ZSx1LndyaXRlPWR9fX1hZGRQYXNzKHt2ZXJ0ZXg6dD1IcyxmcmFnbWVudDplPVFzLHVuaWZvcm1zOnI9e30sdGV4dHVyZVVuaWZvcm06cz0idE1hcCIsZW5hYmxlZDpuPSEwfT17fSl7cltzXT17dmFsdWU6dGhpcy5mYm8ucmVhZC50ZXh0dXJlfTtsZXQgYT1uZXcgVSh0aGlzLmdsLHt2ZXJ0ZXg6dCxmcmFnbWVudDplLHVuaWZvcm1zOnJ9KSxvPXttZXNoOm5ldyBEKHRoaXMuZ2wse2dlb21ldHJ5OnRoaXMuZ2VvbWV0cnkscHJvZ3JhbTphfSkscHJvZ3JhbTphLHVuaWZvcm1zOnIsZW5hYmxlZDpuLHRleHR1cmVVbmlmb3JtOnN9O3JldHVybiB0aGlzLnBhc3Nlcy5wdXNoKG8pLG99cmVzaXplKHt3aWR0aDp0LGhlaWdodDplLGRwcjpyfT17fSl7ciYmKHRoaXMuZHByPXIpLHQmJih0aGlzLndpZHRoPXQpLGUmJih0aGlzLmhlaWdodD1lKSxyPXRoaXMuZHByfHx0aGlzLmdsLnJlbmRlcmVyLmRwcix0aGlzLnJlc29sdXRpb25XaWR0aD1NYXRoLmZsb29yKHRoaXMud2lkdGh8fHRoaXMuZ2wucmVuZGVyZXIud2lkdGgqciksdGhpcy5yZXNvbHV0aW9uSGVpZ2h0PU1hdGguZmxvb3IodGhpcy5oZWlnaHR8fHRoaXMuZ2wucmVuZGVyZXIuaGVpZ2h0KnIpLHRoaXMuZmJvLnJlYWQuc2V0U2l6ZSh0aGlzLnJlc29sdXRpb25XaWR0aCx0aGlzLnJlc29sdXRpb25IZWlnaHQpLHRoaXMuZmJvLndyaXRlLnNldFNpemUodGhpcy5yZXNvbHV0aW9uV2lkdGgsdGhpcy5yZXNvbHV0aW9uSGVpZ2h0KX1yZW5kZXIoe3NjZW5lOnQsY2FtZXJhOmUsdGV4dHVyZTpyLHRhcmdldDpzPW51bGwsdXBkYXRlOm49ITAsc29ydDphPSEwLGZydXN0dW1DdWxsOmg9ITAsYmVmb3JlUG9zdENhbGxiYWNrczpvfSl7bGV0IGw9dGhpcy5wYXNzZXMuZmlsdGVyKGM9PmMuZW5hYmxlZCk7cnx8KHRoaXMuZ2wucmVuZGVyZXIucmVuZGVyKHtzY2VuZTp0LGNhbWVyYTplLHRhcmdldDpsLmxlbmd0aHx8IXMmJnRoaXMudGFyZ2V0T25seT90aGlzLmZiby53cml0ZTpzLHVwZGF0ZTpuLHNvcnQ6YSxmcnVzdHVtQ3VsbDpofSksdGhpcy5mYm8uc3dhcCgpLG8mJm8uZm9yRWFjaChjPT5jJiZjKCkpKSxsLmZvckVhY2goKGMsZik9PntjLm1lc2gucHJvZ3JhbS51bmlmb3Jtc1tjLnRleHR1cmVVbmlmb3JtXS52YWx1ZT0hZiYmcj9yOnRoaXMuZmJvLnJlYWQudGV4dHVyZSx0aGlzLmdsLnJlbmRlcmVyLnJlbmRlcih7c2NlbmU6Yy5tZXNoLHRhcmdldDpmPT09bC5sZW5ndGgtMSYmKHN8fCF0aGlzLnRhcmdldE9ubHkpP3M6dGhpcy5mYm8ud3JpdGUsY2xlYXI6ITB9KSx0aGlzLmZiby5zd2FwKCl9KSx0aGlzLnVuaWZvcm0udmFsdWU9dGhpcy5mYm8ucmVhZC50ZXh0dXJlfX0sSHM9YA0KICAgIGF0dHJpYnV0ZSB2ZWMyIHV2Ow0KICAgIGF0dHJpYnV0ZSB2ZWMyIHBvc2l0aW9uOw0KDQogICAgdmFyeWluZyB2ZWMyIHZVdjsNCg0KICAgIHZvaWQgbWFpbigpIHsNCiAgICAgICAgdlV2ID0gdXY7DQogICAgICAgIGdsX1Bvc2l0aW9uID0gdmVjNChwb3NpdGlvbiwgMCwgMSk7DQogICAgfQ0KYCxRcz1gDQogICAgcHJlY2lzaW9uIGhpZ2hwIGZsb2F0Ow0KDQogICAgdW5pZm9ybSBzYW1wbGVyMkQgdE1hcDsNCiAgICB2YXJ5aW5nIHZlYzIgdlV2Ow0KDQogICAgdm9pZCBtYWluKCkgew0KICAgICAgICBnbF9GcmFnQ29sb3IgPSB0ZXh0dXJlMkQodE1hcCwgdlV2KTsNCiAgICB9DQpgO3ZhciBJZT1uZXcgRSxPZT1uZXcgSyxEZT1uZXcgRSxpcz1uZXcgRSxycz1uZXcgSyxzcz1uZXcgRSxBdD1jbGFzc3tjb25zdHJ1Y3Rvcih7b2JqZWN0czp0LGRhdGE6ZX0pe3RoaXMub2JqZWN0cz10LHRoaXMuZGF0YT1lLHRoaXMuZWxhcHNlZD0wLHRoaXMud2VpZ2h0PTEsdGhpcy5kdXJhdGlvbj1lLmZyYW1lcy5sZW5ndGgtMX11cGRhdGUodD0xLGUpe2xldCByPWU/MTp0aGlzLndlaWdodC90LHM9dGhpcy5lbGFwc2VkJXRoaXMuZHVyYXRpb24sbj1NYXRoLmZsb29yKHMpLGE9cy1uLGg9dGhpcy5kYXRhLmZyYW1lc1tuXSxvPXRoaXMuZGF0YS5mcmFtZXNbKG4rMSkldGhpcy5kdXJhdGlvbl07dGhpcy5vYmplY3RzLmZvckVhY2goKGwsYyk9PntJZS5mcm9tQXJyYXkoaC5wb3NpdGlvbixjKjMpLE9lLmZyb21BcnJheShoLnF1YXRlcm5pb24sYyo0KSxEZS5mcm9tQXJyYXkoaC5zY2FsZSxjKjMpLGlzLmZyb21BcnJheShvLnBvc2l0aW9uLGMqMykscnMuZnJvbUFycmF5KG8ucXVhdGVybmlvbixjKjQpLHNzLmZyb21BcnJheShvLnNjYWxlLGMqMyksSWUubGVycChpcyxhKSxPZS5zbGVycChycyxhKSxEZS5sZXJwKHNzLGEpLGwucG9zaXRpb24ubGVycChJZSxyKSxsLnF1YXRlcm5pb24uc2xlcnAoT2UsciksbC5zY2FsZS5sZXJwKERlLHIpfSl9fTt2YXIgbnM9bmV3IFYsQmU9Y2xhc3MgZXh0ZW5kcyBEe2NvbnN0cnVjdG9yKHQse3JpZzplLGdlb21ldHJ5OnIscHJvZ3JhbTpzLG1vZGU6bj10LlRSSUFOR0xFU309e30pe3N1cGVyKHQse2dlb21ldHJ5OnIscHJvZ3JhbTpzLG1vZGU6bn0pLHRoaXMuY3JlYXRlQm9uZXMoZSksdGhpcy5jcmVhdGVCb25lVGV4dHVyZSgpLHRoaXMuYW5pbWF0aW9ucz1bXSxPYmplY3QuYXNzaWduKHRoaXMucHJvZ3JhbS51bmlmb3Jtcyx7Ym9uZVRleHR1cmU6e3ZhbHVlOnRoaXMuYm9uZVRleHR1cmV9LGJvbmVUZXh0dXJlU2l6ZTp7dmFsdWU6dGhpcy5ib25lVGV4dHVyZVNpemV9fSl9Y3JlYXRlQm9uZXModCl7aWYodGhpcy5yb290PW5ldyBILHRoaXMuYm9uZXM9W10sISghdC5ib25lc3x8IXQuYm9uZXMubGVuZ3RoKSl7Zm9yKGxldCBlPTA7ZTx0LmJvbmVzLmxlbmd0aDtlKyspe2xldCByPW5ldyBIO3IucG9zaXRpb24uZnJvbUFycmF5KHQuYmluZFBvc2UucG9zaXRpb24sZSozKSxyLnF1YXRlcm5pb24uZnJvbUFycmF5KHQuYmluZFBvc2UucXVhdGVybmlvbixlKjQpLHIuc2NhbGUuZnJvbUFycmF5KHQuYmluZFBvc2Uuc2NhbGUsZSozKSx0aGlzLmJvbmVzLnB1c2gocil9dC5ib25lcy5mb3JFYWNoKChlLHIpPT57aWYodGhpcy5ib25lc1tyXS5uYW1lPWUubmFtZSxlLnBhcmVudD09PS0xKXJldHVybiB0aGlzLmJvbmVzW3JdLnNldFBhcmVudCh0aGlzLnJvb3QpO3RoaXMuYm9uZXNbcl0uc2V0UGFyZW50KHRoaXMuYm9uZXNbZS5wYXJlbnRdKX0pLHRoaXMucm9vdC51cGRhdGVNYXRyaXhXb3JsZCghMCksdGhpcy5ib25lcy5mb3JFYWNoKGU9PntlLmJpbmRJbnZlcnNlPW5ldyBWKC4uLmUud29ybGRNYXRyaXgpLmludmVyc2UoKX0pfX1jcmVhdGVCb25lVGV4dHVyZSgpe2lmKCF0aGlzLmJvbmVzLmxlbmd0aClyZXR1cm47bGV0IHQ9TWF0aC5tYXgoNCxNYXRoLnBvdygyLE1hdGguY2VpbChNYXRoLmxvZyhNYXRoLnNxcnQodGhpcy5ib25lcy5sZW5ndGgqNCkpL01hdGguTE4yKSkpO3RoaXMuYm9uZU1hdHJpY2VzPW5ldyBGbG9hdDMyQXJyYXkodCp0KjQpLHRoaXMuYm9uZVRleHR1cmVTaXplPXQsdGhpcy5ib25lVGV4dHVyZT1uZXcgRyh0aGlzLmdsLHtpbWFnZTp0aGlzLmJvbmVNYXRyaWNlcyxnZW5lcmF0ZU1pcG1hcHM6ITEsdHlwZTp0aGlzLmdsLkZMT0FULGludGVybmFsRm9ybWF0OnRoaXMuZ2wucmVuZGVyZXIuaXNXZWJnbDI/dGhpcy5nbC5SR0JBMzJGOnRoaXMuZ2wuUkdCQSxtaW5GaWx0ZXI6dGhpcy5nbC5ORUFSRVNULG1hZ0ZpbHRlcjp0aGlzLmdsLk5FQVJFU1QsZmxpcFk6ITEsd2lkdGg6dH0pfWFkZEFuaW1hdGlvbih0KXtsZXQgZT1uZXcgQXQoe29iamVjdHM6dGhpcy5ib25lcyxkYXRhOnR9KTtyZXR1cm4gdGhpcy5hbmltYXRpb25zLnB1c2goZSksZX11cGRhdGUoKXtsZXQgdD0wO3RoaXMuYW5pbWF0aW9ucy5mb3JFYWNoKGU9PnQrPWUud2VpZ2h0KSx0aGlzLmFuaW1hdGlvbnMuZm9yRWFjaCgoZSxyKT0+e2UudXBkYXRlKHQscj09PTApfSl9ZHJhdyh7Y2FtZXJhOnR9PXt9KXt0aGlzLnJvb3QudXBkYXRlTWF0cml4V29ybGQoITApLHRoaXMuYm9uZXMuZm9yRWFjaCgoZSxyKT0+e25zLm11bHRpcGx5KGUud29ybGRNYXRyaXgsZS5iaW5kSW52ZXJzZSksdGhpcy5ib25lTWF0cmljZXMuc2V0KG5zLHIqMTYpfSksdGhpcy5ib25lVGV4dHVyZSYmKHRoaXMuYm9uZVRleHR1cmUubmVlZHNVcGRhdGU9ITApLHN1cGVyLmRyYXcoe2NhbWVyYTp0fSl9fTtmdW5jdGlvbiBLcyh7Zm9udDppLHRleHQ6dCx3aWR0aDplPTEvMCxhbGlnbjpyPSJsZWZ0IixzaXplOnM9MSxsZXR0ZXJTcGFjaW5nOm49MCxsaW5lSGVpZ2h0OmE9MS40LHdvcmRTcGFjaW5nOmg9MCx3b3JkQnJlYWs6bz0hMX0pe2xldCBsPXRoaXMsYyxmLHAsdSxkLHg9L1xuLyxtPS9ccy87ZygpLEEoKTtmdW5jdGlvbiBnKCl7Yz17fSxpLmNoYXJzLmZvckVhY2goeT0+Y1t5LmNoYXJdPXkpfWZ1bmN0aW9uIEEoKXtwPWkuY29tbW9uLmxpbmVIZWlnaHQsdT1pLmNvbW1vbi5iYXNlLGQ9cy91O2xldCBiPXQucmVwbGFjZSgvWyBcbl0vZywiIikubGVuZ3RoO2Y9e3Bvc2l0aW9uOm5ldyBGbG9hdDMyQXJyYXkoYio0KjMpLHV2Om5ldyBGbG9hdDMyQXJyYXkoYio0KjIpLGlkOm5ldyBGbG9hdDMyQXJyYXkoYio0KSxpbmRleDpuZXcgVWludDE2QXJyYXkoYio2KX07Zm9yKGxldCB6PTA7ejxiO3orKylmLmlkLnNldChbeix6LHosel0seio0KSxmLmluZGV4LnNldChbeio0LHoqNCsyLHoqNCsxLHoqNCsxLHoqNCsyLHoqNCszXSx6KjYpO3coKX1mdW5jdGlvbiB3KCl7bGV0IHk9W10sYj0wLHo9MCxSPTAsdj1MKCk7ZnVuY3Rpb24gTCgpe2xldCBGPXt3aWR0aDowLGdseXBoczpbXX07cmV0dXJuIHkucHVzaChGKSx6PWIsUj0wLEZ9bGV0IFQ9MTAwLFM9MDtmb3IoO2I8dC5sZW5ndGgmJlM8VDspe1MrKztsZXQgRj10W2JdO2lmKCF2LndpZHRoJiZtLnRlc3QoRikpe2IrKyx6PWIsUj0wO2NvbnRpbnVlfWlmKHgudGVzdChGKSl7YisrLHY9TCgpO2NvbnRpbnVlfWxldCBDPWNbRl18fGNbIiAiXTtpZih2LmdseXBocy5sZW5ndGgpe2xldCBCPXYuZ2x5cGhzW3YuZ2x5cGhzLmxlbmd0aC0xXVswXSxJPU0oQy5pZCxCLmlkKSpkO3Yud2lkdGgrPUksUis9SX12LmdseXBocy5wdXNoKFtDLHYud2lkdGhdKTtsZXQgTj0wO2lmKG0udGVzdChGKT8oej1iLFI9MCxOKz1oKnMpOk4rPW4qcyxOKz1DLnhhZHZhbmNlKmQsdi53aWR0aCs9TixSKz1OLHYud2lkdGg+ZSl7aWYobyYmdi5nbHlwaHMubGVuZ3RoPjEpe3Yud2lkdGgtPU4sdi5nbHlwaHMucG9wKCksdj1MKCk7Y29udGludWV9ZWxzZSBpZighbyYmUiE9PXYud2lkdGgpe2xldCBCPWIteisxO3YuZ2x5cGhzLnNwbGljZSgtQixCKSxiPXosdi53aWR0aC09Uix2PUwoKTtjb250aW51ZX19YisrLFM9MH12LndpZHRofHx5LnBvcCgpLF8oeSl9ZnVuY3Rpb24gXyh5KXtsZXQgYj1pLmNvbW1vbi5zY2FsZVcsej1pLmNvbW1vbi5zY2FsZUgsUj0uMDcqcyx2PTA7Zm9yKGxldCBMPTA7TDx5Lmxlbmd0aDtMKyspe2xldCBUPXlbTF07Zm9yKGxldCBTPTA7UzxULmdseXBocy5sZW5ndGg7UysrKXtsZXQgRj1ULmdseXBoc1tTXVswXSxDPVQuZ2x5cGhzW1NdWzFdO2lmKHI9PT0iY2VudGVyIj9DLT1ULndpZHRoKi41OnI9PT0icmlnaHQiJiYoQy09VC53aWR0aCksbS50ZXN0KEYuY2hhcikpY29udGludWU7Qys9Ri54b2Zmc2V0KmQsUi09Ri55b2Zmc2V0KmQ7bGV0IE49Ri53aWR0aCpkLEI9Ri5oZWlnaHQqZDtmLnBvc2l0aW9uLnNldChbQyxSLUIsMCxDLFIsMCxDK04sUi1CLDAsQytOLFIsMF0sdio0KjMpO2xldCBJPUYueC9iLFc9Ri53aWR0aC9iLFE9MS1GLnkveixKPUYuaGVpZ2h0L3o7Zi51di5zZXQoW0ksUS1KLEksUSxJK1csUS1KLEkrVyxRXSx2KjQqMiksUis9Ri55b2Zmc2V0KmQsdisrfVItPXMqYX1sLmJ1ZmZlcnM9ZixsLm51bUxpbmVzPXkubGVuZ3RoLGwuaGVpZ2h0PWwubnVtTGluZXMqcyphLGwud2lkdGg9TWF0aC5tYXgoLi4ueS5tYXAoTD0+TC53aWR0aCkpfWZ1bmN0aW9uIE0oeSxiKXtmb3IobGV0IHo9MDt6PGkua2VybmluZ3MubGVuZ3RoO3orKyl7bGV0IFI9aS5rZXJuaW5nc1t6XTtpZighKFIuZmlyc3Q8eSkmJiEoUi5zZWNvbmQ8YikpcmV0dXJuIFIuZmlyc3Q+eXx8Ui5maXJzdD09PXkmJlIuc2Vjb25kPmI/MDpSLmFtb3VudH1yZXR1cm4gMH10aGlzLnJlc2l6ZT1mdW5jdGlvbih5KXsoe3dpZHRoOmV9PXkpLHcoKX0sdGhpcy51cGRhdGU9ZnVuY3Rpb24oeSl7KHt0ZXh0OnR9PXkpLEEoKX19dmFyIFpzPWANCiAgICBwcmVjaXNpb24gaGlnaHAgZmxvYXQ7DQogICAgcHJlY2lzaW9uIGhpZ2hwIGludDsNCg0KICAgIGF0dHJpYnV0ZSB2ZWMzIHBvc2l0aW9uOw0KICAgIGF0dHJpYnV0ZSB2ZWMzIG5vcm1hbDsNCg0KICAgIHVuaWZvcm0gbWF0MyBub3JtYWxNYXRyaXg7DQogICAgdW5pZm9ybSBtYXQ0IG1vZGVsVmlld01hdHJpeDsNCiAgICB1bmlmb3JtIG1hdDQgcHJvamVjdGlvbk1hdHJpeDsNCg0KICAgIHZhcnlpbmcgdmVjMyB2Tm9ybWFsOw0KDQogICAgdm9pZCBtYWluKCkgew0KICAgICAgICB2Tm9ybWFsID0gbm9ybWFsaXplKG5vcm1hbE1hdHJpeCAqIG5vcm1hbCk7DQogICAgICAgIGdsX1Bvc2l0aW9uID0gcHJvamVjdGlvbk1hdHJpeCAqIG1vZGVsVmlld01hdHJpeCAqIHZlYzQocG9zaXRpb24sIDEuMCk7DQogICAgfQ0KYCwkcz1gDQogICAgcHJlY2lzaW9uIGhpZ2hwIGZsb2F0Ow0KICAgIHByZWNpc2lvbiBoaWdocCBpbnQ7DQoNCiAgICB2YXJ5aW5nIHZlYzMgdk5vcm1hbDsNCg0KICAgIHZvaWQgbWFpbigpIHsNCiAgICAgICAgZ2xfRnJhZ0NvbG9yLnJnYiA9IG5vcm1hbGl6ZSh2Tm9ybWFsKTsNCiAgICAgICAgZ2xfRnJhZ0NvbG9yLmEgPSAxLjA7DQogICAgfQ0KYDtmdW5jdGlvbiBWZShpKXtyZXR1cm4gbmV3IFUoaSx7dmVydGV4OlpzLGZyYWdtZW50OiRzLGN1bGxGYWNlOiExfSl9dmFyIFVlPWNsYXNze2NvbnN0cnVjdG9yKHQse3NpemU6ZT0xMjgsZmFsbG9mZjpyPS4zLGFscGhhOnM9MSxkaXNzaXBhdGlvbjpuPS45OCx0eXBlOmF9PXt9KXtsZXQgaD10aGlzO3RoaXMuZ2w9dCx0aGlzLnVuaWZvcm09e3ZhbHVlOm51bGx9LHRoaXMubWFzaz17cmVhZDpudWxsLHdyaXRlOm51bGwsc3dhcDooKT0+e2xldCBjPWgubWFzay5yZWFkO2gubWFzay5yZWFkPWgubWFzay53cml0ZSxoLm1hc2sud3JpdGU9YyxoLnVuaWZvcm0udmFsdWU9aC5tYXNrLnJlYWQudGV4dHVyZX19LG8oKSx0aGlzLmFzcGVjdD0xLHRoaXMubW91c2U9bmV3IFgsdGhpcy52ZWxvY2l0eT1uZXcgWCx0aGlzLm1lc2g9bCgpO2Z1bmN0aW9uIG8oKXthfHwoYT10LkhBTEZfRkxPQVR8fHQucmVuZGVyZXIuZXh0ZW5zaW9ucy5PRVNfdGV4dHVyZV9oYWxmX2Zsb2F0LkhBTEZfRkxPQVRfT0VTKTtsZXQgYz10LnJlbmRlcmVyLmlzV2ViZ2wyfHx0LnJlbmRlcmVyLmV4dGVuc2lvbnNbYE9FU190ZXh0dXJlXyR7YT09PXQuRkxPQVQ/IiI6ImhhbGZfIn1mbG9hdF9saW5lYXJgXT90LkxJTkVBUjp0Lk5FQVJFU1QsZj17d2lkdGg6ZSxoZWlnaHQ6ZSx0eXBlOmEsZm9ybWF0OnQuUkdCQSxpbnRlcm5hbEZvcm1hdDp0LnJlbmRlcmVyLmlzV2ViZ2wyP2E9PT10LkZMT0FUP3QuUkdCQTMyRjp0LlJHQkExNkY6dC5SR0JBLG1pbkZpbHRlcjpjLGRlcHRoOiExfTtoLm1hc2sucmVhZD1uZXcgaih0LGYpLGgubWFzay53cml0ZT1uZXcgaih0LGYpLGgubWFzay5zd2FwKCl9ZnVuY3Rpb24gbCgpe3JldHVybiBuZXcgRCh0LHtnZW9tZXRyeTpuZXcgaXQodCkscHJvZ3JhbTpuZXcgVSh0LHt2ZXJ0ZXg6SnMsZnJhZ21lbnQ6dG4sdW5pZm9ybXM6e3RNYXA6aC51bmlmb3JtLHVGYWxsb2ZmOnt2YWx1ZTpyKi41fSx1QWxwaGE6e3ZhbHVlOnN9LHVEaXNzaXBhdGlvbjp7dmFsdWU6bn0sdUFzcGVjdDp7dmFsdWU6MX0sdU1vdXNlOnt2YWx1ZTpoLm1vdXNlfSx1VmVsb2NpdHk6e3ZhbHVlOmgudmVsb2NpdHl9fSxkZXB0aFRlc3Q6ITF9KX0pfX11cGRhdGUoKXt0aGlzLm1lc2gucHJvZ3JhbS51bmlmb3Jtcy51QXNwZWN0LnZhbHVlPXRoaXMuYXNwZWN0LHRoaXMuZ2wucmVuZGVyZXIucmVuZGVyKHtzY2VuZTp0aGlzLm1lc2gsdGFyZ2V0OnRoaXMubWFzay53cml0ZSxjbGVhcjohMX0pLHRoaXMubWFzay5zd2FwKCl9fSxKcz1gDQogICAgYXR0cmlidXRlIHZlYzIgdXY7DQogICAgYXR0cmlidXRlIHZlYzIgcG9zaXRpb247DQoNCiAgICB2YXJ5aW5nIHZlYzIgdlV2Ow0KDQogICAgdm9pZCBtYWluKCkgew0KICAgICAgICB2VXYgPSB1djsNCiAgICAgICAgZ2xfUG9zaXRpb24gPSB2ZWM0KHBvc2l0aW9uLCAwLCAxKTsNCiAgICB9DQpgLHRuPWANCiAgICBwcmVjaXNpb24gaGlnaHAgZmxvYXQ7DQoNCiAgICB1bmlmb3JtIHNhbXBsZXIyRCB0TWFwOw0KDQogICAgdW5pZm9ybSBmbG9hdCB1RmFsbG9mZjsNCiAgICB1bmlmb3JtIGZsb2F0IHVBbHBoYTsNCiAgICB1bmlmb3JtIGZsb2F0IHVEaXNzaXBhdGlvbjsNCg0KICAgIHVuaWZvcm0gZmxvYXQgdUFzcGVjdDsNCiAgICB1bmlmb3JtIHZlYzIgdU1vdXNlOw0KICAgIHVuaWZvcm0gdmVjMiB1VmVsb2NpdHk7DQoNCiAgICB2YXJ5aW5nIHZlYzIgdlV2Ow0KDQogICAgdm9pZCBtYWluKCkgew0KICAgICAgICB2ZWM0IGNvbG9yID0gdGV4dHVyZTJEKHRNYXAsIHZVdikgKiB1RGlzc2lwYXRpb247DQoNCiAgICAgICAgdmVjMiBjdXJzb3IgPSB2VXYgLSB1TW91c2U7DQogICAgICAgIGN1cnNvci54ICo9IHVBc3BlY3Q7DQoNCiAgICAgICAgdmVjMyBzdGFtcCA9IHZlYzModVZlbG9jaXR5ICogdmVjMigxLCAtMSksIDEuMCAtIHBvdygxLjAgLSBtaW4oMS4wLCBsZW5ndGgodVZlbG9jaXR5KSksIDMuMCkpOw0KICAgICAgICBmbG9hdCBmYWxsb2ZmID0gc21vb3Roc3RlcCh1RmFsbG9mZiwgMC4wLCBsZW5ndGgoY3Vyc29yKSkgKiB1QWxwaGE7DQoNCiAgICAgICAgY29sb3IucmdiID0gbWl4KGNvbG9yLnJnYiwgc3RhbXAsIHZlYzMoZmFsbG9mZikpOw0KDQogICAgICAgIGdsX0ZyYWdDb2xvciA9IGNvbG9yOw0KICAgIH0NCmA7dmFyIGtlPWNsYXNze2NvbnN0cnVjdG9yKHQse2RhdGE6ZT1uZXcgRmxvYXQzMkFycmF5KDE2KSxnZW9tZXRyeTpyPW5ldyBpdCh0KSx0eXBlOnN9KXt0aGlzLmdsPXQ7bGV0IG49ZTt0aGlzLnBhc3Nlcz1bXSx0aGlzLmdlb21ldHJ5PXIsdGhpcy5kYXRhTGVuZ3RoPW4ubGVuZ3RoLzQsdGhpcy5zaXplPU1hdGgucG93KDIsTWF0aC5jZWlsKE1hdGgubG9nKE1hdGguY2VpbChNYXRoLnNxcnQodGhpcy5kYXRhTGVuZ3RoKSkpL01hdGguTE4yKSksdGhpcy5jb29yZHM9bmV3IEZsb2F0MzJBcnJheSh0aGlzLmRhdGFMZW5ndGgqMik7Zm9yKGxldCBvPTA7bzx0aGlzLmRhdGFMZW5ndGg7bysrKXtsZXQgbD1vJXRoaXMuc2l6ZS90aGlzLnNpemUsYz1NYXRoLmZsb29yKG8vdGhpcy5zaXplKS90aGlzLnNpemU7dGhpcy5jb29yZHMuc2V0KFtsLGNdLG8qMil9bGV0IGE9KCgpPT57aWYobi5sZW5ndGg9PT10aGlzLnNpemUqdGhpcy5zaXplKjQpcmV0dXJuIG47e2xldCBvPW5ldyBGbG9hdDMyQXJyYXkodGhpcy5zaXplKnRoaXMuc2l6ZSo0KTtyZXR1cm4gby5zZXQobiksb319KSgpO3RoaXMudW5pZm9ybT17dmFsdWU6bmV3IEcodCx7aW1hZ2U6YSx0YXJnZXQ6dC5URVhUVVJFXzJELHR5cGU6dC5GTE9BVCxmb3JtYXQ6dC5SR0JBLGludGVybmFsRm9ybWF0OnQucmVuZGVyZXIuaXNXZWJnbDI/dC5SR0JBMzJGOnQuUkdCQSx3cmFwUzp0LkNMQU1QX1RPX0VER0Usd3JhcFQ6dC5DTEFNUF9UT19FREdFLGdlbmVyYXRlTWlwbWFwczohMSxtaW5GaWx0ZXI6dC5ORUFSRVNULG1hZ0ZpbHRlcjp0Lk5FQVJFU1Qsd2lkdGg6dGhpcy5zaXplLGZsaXBZOiExfSl9O2xldCBoPXt3aWR0aDp0aGlzLnNpemUsaGVpZ2h0OnRoaXMuc2l6ZSx0eXBlOnN8fHQuSEFMRl9GTE9BVHx8dC5yZW5kZXJlci5leHRlbnNpb25zLk9FU190ZXh0dXJlX2hhbGZfZmxvYXQuSEFMRl9GTE9BVF9PRVMsZm9ybWF0OnQuUkdCQSxpbnRlcm5hbEZvcm1hdDp0LnJlbmRlcmVyLmlzV2ViZ2wyP3M9PT10LkZMT0FUP3QuUkdCQTMyRjp0LlJHQkExNkY6dC5SR0JBLG1pbkZpbHRlcjp0Lk5FQVJFU1QsZGVwdGg6ITEsdW5wYWNrQWxpZ25tZW50OjF9O3RoaXMuZmJvPXtyZWFkOm5ldyBqKHQsaCksd3JpdGU6bmV3IGoodCxoKSxzd2FwOigpPT57bGV0IG89dGhpcy5mYm8ucmVhZDt0aGlzLmZiby5yZWFkPXRoaXMuZmJvLndyaXRlLHRoaXMuZmJvLndyaXRlPW8sdGhpcy51bmlmb3JtLnZhbHVlPXRoaXMuZmJvLnJlYWQudGV4dHVyZX19fWFkZFBhc3Moe3ZlcnRleDp0PWVuLGZyYWdtZW50OmU9cm4sdW5pZm9ybXM6cj17fSx0ZXh0dXJlVW5pZm9ybTpzPSJ0TWFwIixlbmFibGVkOm49ITB9PXt9KXtyW3NdPXRoaXMudW5pZm9ybTtsZXQgYT1uZXcgVSh0aGlzLmdsLHt2ZXJ0ZXg6dCxmcmFnbWVudDplLHVuaWZvcm1zOnJ9KSxvPXttZXNoOm5ldyBEKHRoaXMuZ2wse2dlb21ldHJ5OnRoaXMuZ2VvbWV0cnkscHJvZ3JhbTphfSkscHJvZ3JhbTphLHVuaWZvcm1zOnIsZW5hYmxlZDpuLHRleHR1cmVVbmlmb3JtOnN9O3JldHVybiB0aGlzLnBhc3Nlcy5wdXNoKG8pLG99cmVuZGVyKCl7dGhpcy5wYXNzZXMuZmlsdGVyKGU9PmUuZW5hYmxlZCkuZm9yRWFjaCgoZSxyKT0+e3RoaXMuZ2wucmVuZGVyZXIucmVuZGVyKHtzY2VuZTplLm1lc2gsdGFyZ2V0OnRoaXMuZmJvLndyaXRlLGNsZWFyOiExfSksdGhpcy5mYm8uc3dhcCgpfSl9fSxlbj1gDQogICAgYXR0cmlidXRlIHZlYzIgdXY7DQogICAgYXR0cmlidXRlIHZlYzIgcG9zaXRpb247DQoNCiAgICB2YXJ5aW5nIHZlYzIgdlV2Ow0KDQogICAgdm9pZCBtYWluKCkgew0KICAgICAgICB2VXYgPSB1djsNCiAgICAgICAgZ2xfUG9zaXRpb24gPSB2ZWM0KHBvc2l0aW9uLCAwLCAxKTsNCiAgICB9DQpgLHJuPWANCiAgICBwcmVjaXNpb24gaGlnaHAgZmxvYXQ7DQoNCiAgICB1bmlmb3JtIHNhbXBsZXIyRCB0TWFwOw0KICAgIHZhcnlpbmcgdmVjMiB2VXY7DQoNCiAgICB2b2lkIG1haW4oKSB7DQogICAgICAgIGdsX0ZyYWdDb2xvciA9IHRleHR1cmUyRCh0TWFwLCB2VXYpOw0KICAgIH0NCmA7dmFyIGd0PW5ldyBFLEdlPWNsYXNze2NvbnN0cnVjdG9yKHQse3BvaW50czplLHZlcnRleDpyPXNuLGZyYWdtZW50OnM9bm4sdW5pZm9ybXM6bj17fSxhdHRyaWJ1dGVzOmE9e319KXt0aGlzLmdsPXQsdGhpcy5wb2ludHM9ZSx0aGlzLmNvdW50PWUubGVuZ3RoLHRoaXMucG9zaXRpb249bmV3IEZsb2F0MzJBcnJheSh0aGlzLmNvdW50KjMqMiksdGhpcy5wcmV2PW5ldyBGbG9hdDMyQXJyYXkodGhpcy5jb3VudCozKjIpLHRoaXMubmV4dD1uZXcgRmxvYXQzMkFycmF5KHRoaXMuY291bnQqMyoyKTtsZXQgaD1uZXcgRmxvYXQzMkFycmF5KHRoaXMuY291bnQqMSoyKSxvPW5ldyBGbG9hdDMyQXJyYXkodGhpcy5jb3VudCoyKjIpLGw9bmV3IFVpbnQxNkFycmF5KCh0aGlzLmNvdW50LTEpKjMqMik7Zm9yKGxldCBwPTA7cDx0aGlzLmNvdW50O3ArKyl7aC5zZXQoWy0xLDFdLHAqMik7bGV0IHU9cC8odGhpcy5jb3VudC0xKTtpZihvLnNldChbMCx1LDEsdV0scCo0KSxwPT09dGhpcy5jb3VudC0xKWNvbnRpbnVlO2xldCBkPXAqMjtsLnNldChbZCswLGQrMSxkKzJdLChkKzApKjMpLGwuc2V0KFtkKzIsZCsxLGQrM10sKGQrMSkqMyl9bGV0IGM9dGhpcy5nZW9tZXRyeT1uZXcgTyh0LE9iamVjdC5hc3NpZ24oYSx7cG9zaXRpb246e3NpemU6MyxkYXRhOnRoaXMucG9zaXRpb259LHByZXY6e3NpemU6MyxkYXRhOnRoaXMucHJldn0sbmV4dDp7c2l6ZTozLGRhdGE6dGhpcy5uZXh0fSxzaWRlOntzaXplOjEsZGF0YTpofSx1djp7c2l6ZToyLGRhdGE6b30saW5kZXg6e3NpemU6MSxkYXRhOmx9fSkpO3RoaXMudXBkYXRlR2VvbWV0cnkoKSxuLnVSZXNvbHV0aW9ufHwodGhpcy5yZXNvbHV0aW9uPW4udVJlc29sdXRpb249e3ZhbHVlOm5ldyBYfSksbi51RFBSfHwodGhpcy5kcHI9bi51RFBSPXt2YWx1ZToxfSksbi51VGhpY2tuZXNzfHwodGhpcy50aGlja25lc3M9bi51VGhpY2tuZXNzPXt2YWx1ZToxfSksbi51Q29sb3J8fCh0aGlzLmNvbG9yPW4udUNvbG9yPXt2YWx1ZTpuZXcgbHQoIiMwMDAiKX0pLG4udU1pdGVyfHwodGhpcy5taXRlcj1uLnVNaXRlcj17dmFsdWU6MX0pLHRoaXMucmVzaXplKCk7bGV0IGY9dGhpcy5wcm9ncmFtPW5ldyBVKHQse3ZlcnRleDpyLGZyYWdtZW50OnMsdW5pZm9ybXM6bn0pO3RoaXMubWVzaD1uZXcgRCh0LHtnZW9tZXRyeTpjLHByb2dyYW06Zn0pfXVwZGF0ZUdlb21ldHJ5KCl7dGhpcy5wb2ludHMuZm9yRWFjaCgodCxlKT0+e3QudG9BcnJheSh0aGlzLnBvc2l0aW9uLGUqMyoyKSx0LnRvQXJyYXkodGhpcy5wb3NpdGlvbixlKjMqMiszKSxlPyh0LnRvQXJyYXkodGhpcy5uZXh0LChlLTEpKjMqMiksdC50b0FycmF5KHRoaXMubmV4dCwoZS0xKSozKjIrMykpOihndC5jb3B5KHQpLnN1Yih0aGlzLnBvaW50c1tlKzFdKS5hZGQodCksZ3QudG9BcnJheSh0aGlzLnByZXYsZSozKjIpLGd0LnRvQXJyYXkodGhpcy5wcmV2LGUqMyoyKzMpKSxlPT09dGhpcy5wb2ludHMubGVuZ3RoLTE/KGd0LmNvcHkodCkuc3ViKHRoaXMucG9pbnRzW2UtMV0pLmFkZCh0KSxndC50b0FycmF5KHRoaXMubmV4dCxlKjMqMiksZ3QudG9BcnJheSh0aGlzLm5leHQsZSozKjIrMykpOih0LnRvQXJyYXkodGhpcy5wcmV2LChlKzEpKjMqMiksdC50b0FycmF5KHRoaXMucHJldiwoZSsxKSozKjIrMykpfSksdGhpcy5nZW9tZXRyeS5hdHRyaWJ1dGVzLnBvc2l0aW9uLm5lZWRzVXBkYXRlPSEwLHRoaXMuZ2VvbWV0cnkuYXR0cmlidXRlcy5wcmV2Lm5lZWRzVXBkYXRlPSEwLHRoaXMuZ2VvbWV0cnkuYXR0cmlidXRlcy5uZXh0Lm5lZWRzVXBkYXRlPSEwfXJlc2l6ZSgpe3RoaXMucmVzb2x1dGlvbiYmdGhpcy5yZXNvbHV0aW9uLnZhbHVlLnNldCh0aGlzLmdsLmNhbnZhcy53aWR0aCx0aGlzLmdsLmNhbnZhcy5oZWlnaHQpLHRoaXMuZHByJiYodGhpcy5kcHIudmFsdWU9dGhpcy5nbC5yZW5kZXJlci5kcHIpfX0sc249YA0KICAgIHByZWNpc2lvbiBoaWdocCBmbG9hdDsNCg0KICAgIGF0dHJpYnV0ZSB2ZWMzIHBvc2l0aW9uOw0KICAgIGF0dHJpYnV0ZSB2ZWMzIG5leHQ7DQogICAgYXR0cmlidXRlIHZlYzMgcHJldjsNCiAgICBhdHRyaWJ1dGUgdmVjMiB1djsNCiAgICBhdHRyaWJ1dGUgZmxvYXQgc2lkZTsNCg0KICAgIHVuaWZvcm0gbWF0NCBtb2RlbFZpZXdNYXRyaXg7DQogICAgdW5pZm9ybSBtYXQ0IHByb2plY3Rpb25NYXRyaXg7DQogICAgdW5pZm9ybSB2ZWMyIHVSZXNvbHV0aW9uOw0KICAgIHVuaWZvcm0gZmxvYXQgdURQUjsNCiAgICB1bmlmb3JtIGZsb2F0IHVUaGlja25lc3M7DQogICAgdW5pZm9ybSBmbG9hdCB1TWl0ZXI7DQoNCiAgICB2YXJ5aW5nIHZlYzIgdlV2Ow0KDQogICAgdmVjNCBnZXRQb3NpdGlvbigpIHsNCiAgICAgICAgbWF0NCBtdnAgPSBwcm9qZWN0aW9uTWF0cml4ICogbW9kZWxWaWV3TWF0cml4Ow0KICAgICAgICB2ZWM0IGN1cnJlbnQgPSBtdnAgKiB2ZWM0KHBvc2l0aW9uLCAxKTsNCiAgICAgICAgdmVjNCBuZXh0UG9zID0gbXZwICogdmVjNChuZXh0LCAxKTsNCiAgICAgICAgdmVjNCBwcmV2UG9zID0gbXZwICogdmVjNChwcmV2LCAxKTsNCg0KICAgICAgICB2ZWMyIGFzcGVjdCA9IHZlYzIodVJlc29sdXRpb24ueCAvIHVSZXNvbHV0aW9uLnksIDEpOw0KICAgICAgICB2ZWMyIGN1cnJlbnRTY3JlZW4gPSBjdXJyZW50Lnh5IC8gY3VycmVudC53ICogYXNwZWN0Ow0KICAgICAgICB2ZWMyIG5leHRTY3JlZW4gPSBuZXh0UG9zLnh5IC8gbmV4dFBvcy53ICogYXNwZWN0Ow0KICAgICAgICB2ZWMyIHByZXZTY3JlZW4gPSBwcmV2UG9zLnh5IC8gcHJldlBvcy53ICogYXNwZWN0Ow0KDQogICAgICAgIHZlYzIgZGlyMSA9IG5vcm1hbGl6ZShjdXJyZW50U2NyZWVuIC0gcHJldlNjcmVlbik7DQogICAgICAgIHZlYzIgZGlyMiA9IG5vcm1hbGl6ZShuZXh0U2NyZWVuIC0gY3VycmVudFNjcmVlbik7DQogICAgICAgIHZlYzIgZGlyID0gbm9ybWFsaXplKGRpcjEgKyBkaXIyKTsNCg0KICAgICAgICB2ZWMyIG5vcm1hbCA9IHZlYzIoLWRpci55LCBkaXIueCk7DQogICAgICAgIG5vcm1hbCAvPSBtaXgoMS4wLCBtYXgoMC4zLCBkb3Qobm9ybWFsLCB2ZWMyKC1kaXIxLnksIGRpcjEueCkpKSwgdU1pdGVyKTsNCiAgICAgICAgbm9ybWFsIC89IGFzcGVjdDsNCg0KICAgICAgICBmbG9hdCBwaXhlbFdpZHRoUmF0aW8gPSAxLjAgLyAodVJlc29sdXRpb24ueSAvIHVEUFIpOw0KICAgICAgICBmbG9hdCBwaXhlbFdpZHRoID0gY3VycmVudC53ICogcGl4ZWxXaWR0aFJhdGlvOw0KICAgICAgICBub3JtYWwgKj0gcGl4ZWxXaWR0aCAqIHVUaGlja25lc3M7DQogICAgICAgIGN1cnJlbnQueHkgLT0gbm9ybWFsICogc2lkZTsNCg0KICAgICAgICByZXR1cm4gY3VycmVudDsNCiAgICB9DQoNCiAgICB2b2lkIG1haW4oKSB7DQogICAgICAgIHZVdiA9IHV2Ow0KICAgICAgICBnbF9Qb3NpdGlvbiA9IGdldFBvc2l0aW9uKCk7DQogICAgfQ0KYCxubj1gDQogICAgcHJlY2lzaW9uIGhpZ2hwIGZsb2F0Ow0KDQogICAgdW5pZm9ybSB2ZWMzIHVDb2xvcjsNCg0KICAgIHZhcnlpbmcgdmVjMiB2VXY7DQoNCiAgICB2b2lkIG1haW4oKSB7DQogICAgICAgIGdsX0ZyYWdDb2xvci5yZ2IgPSB1Q29sb3I7DQogICAgICAgIGdsX0ZyYWdDb2xvci5hID0gMS4wOw0KICAgIH0NCmA7dmFyIHFlPWNsYXNze2NvbnN0cnVjdG9yKHQse2xpZ2h0OmU9bmV3IGh0KHQpLHdpZHRoOnI9MTAyNCxoZWlnaHQ6cz1yfSl7dGhpcy5nbD10LHRoaXMubGlnaHQ9ZSx0aGlzLnRhcmdldD1uZXcgaih0LHt3aWR0aDpyLGhlaWdodDpzfSksdGhpcy50YXJnZXRVbmlmb3JtPXt2YWx1ZTp0aGlzLnRhcmdldC50ZXh0dXJlfSx0aGlzLmRlcHRoUHJvZ3JhbT1uZXcgVSh0LHt2ZXJ0ZXg6WGUsZnJhZ21lbnQ6V2UsY3VsbEZhY2U6ITF9KSx0aGlzLmNhc3RNZXNoZXM9W119YWRkKHttZXNoOnQscmVjZWl2ZTplPSEwLGNhc3Q6cj0hMCx2ZXJ0ZXg6cz1YZSxmcmFnbWVudDpuPVdlLHVuaWZvcm1Qcm9qZWN0aW9uOmE9InNoYWRvd1Byb2plY3Rpb25NYXRyaXgiLHVuaWZvcm1WaWV3Omg9InNoYWRvd1ZpZXdNYXRyaXgiLHVuaWZvcm1UZXh0dXJlOm89InRTaGFkb3cifSl7aWYoZSYmIXQucHJvZ3JhbS51bmlmb3Jtc1thXSYmKHQucHJvZ3JhbS51bmlmb3Jtc1thXT17dmFsdWU6dGhpcy5saWdodC5wcm9qZWN0aW9uTWF0cml4fSx0LnByb2dyYW0udW5pZm9ybXNbaF09e3ZhbHVlOnRoaXMubGlnaHQudmlld01hdHJpeH0sdC5wcm9ncmFtLnVuaWZvcm1zW29dPXRoaXMudGFyZ2V0VW5pZm9ybSksISFyJiYodGhpcy5jYXN0TWVzaGVzLnB1c2godCksdC5jb2xvclByb2dyYW09dC5wcm9ncmFtLCF0LmRlcHRoUHJvZ3JhbSkpe2lmKHM9PT1YZSYmbj09PVdlKXt0LmRlcHRoUHJvZ3JhbT10aGlzLmRlcHRoUHJvZ3JhbTtyZXR1cm59dC5kZXB0aFByb2dyYW09bmV3IFUodGhpcy5nbCx7dmVydGV4OnMsZnJhZ21lbnQ6bixjdWxsRmFjZTohMX0pfX1zZXRTaXplKHt3aWR0aDp0PTEwMjQsaGVpZ2h0OmU9dH0pe3RoaXMudGFyZ2V0PW5ldyBqKHRoaXMuZ2wse3dpZHRoOnQsaGVpZ2h0OmV9KSx0aGlzLnRhcmdldFVuaWZvcm0udmFsdWU9dGhpcy50YXJnZXQudGV4dHVyZX1yZW5kZXIoe3NjZW5lOnR9KXt0LnRyYXZlcnNlKGU9PntlLmRyYXcmJih+dGhpcy5jYXN0TWVzaGVzLmluZGV4T2YoZSk/ZS5wcm9ncmFtPWUuZGVwdGhQcm9ncmFtOihlLmlzRm9yY2VWaXNpYmlsaXR5PWUudmlzaWJsZSxlLnZpc2libGU9ITEpKX0pLHRoaXMuZ2wucmVuZGVyZXIucmVuZGVyKHtzY2VuZTp0LGNhbWVyYTp0aGlzLmxpZ2h0LHRhcmdldDp0aGlzLnRhcmdldH0pLHQudHJhdmVyc2UoZT0+e2UuZHJhdyYmKH50aGlzLmNhc3RNZXNoZXMuaW5kZXhPZihlKT9lLnByb2dyYW09ZS5jb2xvclByb2dyYW06ZS52aXNpYmxlPWUuaXNGb3JjZVZpc2liaWxpdHkpfSl9fSxYZT1gDQogICAgYXR0cmlidXRlIHZlYzMgcG9zaXRpb247DQogICAgYXR0cmlidXRlIHZlYzIgdXY7DQoNCiAgICB1bmlmb3JtIG1hdDQgbW9kZWxWaWV3TWF0cml4Ow0KICAgIHVuaWZvcm0gbWF0NCBwcm9qZWN0aW9uTWF0cml4Ow0KDQogICAgdm9pZCBtYWluKCkgew0KICAgICAgICBnbF9Qb3NpdGlvbiA9IHByb2plY3Rpb25NYXRyaXggKiBtb2RlbFZpZXdNYXRyaXggKiB2ZWM0KHBvc2l0aW9uLCAxLjApOw0KICAgIH0NCmAsV2U9YA0KICAgIHByZWNpc2lvbiBoaWdocCBmbG9hdDsNCg0KICAgIHZlYzQgcGFja1JHQkEgKGZsb2F0IHYpIHsNCiAgICAgICAgdmVjNCBwYWNrID0gZnJhY3QodmVjNCgxLjAsIDI1NS4wLCA2NTAyNS4wLCAxNjU4MTM3NS4wKSAqIHYpOw0KICAgICAgICBwYWNrIC09IHBhY2sueXp3dyAqIHZlYzIoMS4wIC8gMjU1LjAsIDAuMCkueHh4eTsNCiAgICAgICAgcmV0dXJuIHBhY2s7DQogICAgfQ0KDQogICAgdm9pZCBtYWluKCkgew0KICAgICAgICBnbF9GcmFnQ29sb3IgPSBwYWNrUkdCQShnbF9GcmFnQ29vcmQueik7DQogICAgfQ0KYDt2YXIgX3Q9Y2xhc3MgZXh0ZW5kcyBHe2NvbnN0cnVjdG9yKHQse2J1ZmZlcjplLHdyYXBTOnI9dC5DTEFNUF9UT19FREdFLHdyYXBUOnM9dC5DTEFNUF9UT19FREdFLGFuaXNvdHJvcHk6bj0wLG1pbkZpbHRlcjphLG1hZ0ZpbHRlcjpofT17fSl7aWYoc3VwZXIodCx7Z2VuZXJhdGVNaXBtYXBzOiExLHdyYXBTOnIsd3JhcFQ6cyxhbmlzb3Ryb3B5Om4sbWluRmlsdGVyOmEsbWFnRmlsdGVyOmh9KSxlKXJldHVybiB0aGlzLnBhcnNlQnVmZmVyKGUpfXBhcnNlQnVmZmVyKHQpe2xldCBlPW5ldyBhbih0KTtlLm1pcG1hcHMuaXNDb21wcmVzc2VkVGV4dHVyZT0hMCx0aGlzLmltYWdlPWUubWlwbWFwcyx0aGlzLmludGVybmFsRm9ybWF0PWUuZ2xJbnRlcm5hbEZvcm1hdCxlLm51bWJlck9mTWlwbWFwTGV2ZWxzPjE/dGhpcy5taW5GaWx0ZXI9PT10aGlzLmdsLkxJTkVBUiYmKHRoaXMubWluRmlsdGVyPXRoaXMuZ2wuTkVBUkVTVF9NSVBNQVBfTElORUFSKTp0aGlzLm1pbkZpbHRlcj09PXRoaXMuZ2wuTkVBUkVTVF9NSVBNQVBfTElORUFSJiYodGhpcy5taW5GaWx0ZXI9dGhpcy5nbC5MSU5FQVIpfX07ZnVuY3Rpb24gYW4oaSl7bGV0IHQ9WzE3MSw3NSw4NCw4OCwzMiw0OSw0OSwxODcsMTMsMTAsMjYsMTBdLGU9bmV3IFVpbnQ4QXJyYXkoaSwwLDEyKTtmb3IobGV0IGY9MDtmPGUubGVuZ3RoO2YrKylpZihlW2ZdIT09dFtmXSlyZXR1cm4gY29uc29sZS5lcnJvcigiRmlsZSBtaXNzaW5nIEtUWCBpZGVudGlmaWVyIik7bGV0IHI9VWludDMyQXJyYXkuQllURVNfUEVSX0VMRU1FTlQscz1uZXcgRGF0YVZpZXcoaSwxMiwxMypyKSxuPXMuZ2V0VWludDMyKDAsITApPT09NjczMDU5ODU7aWYocy5nZXRVaW50MzIoMSpyLG4pIT09MClyZXR1cm4gY29uc29sZS53YXJuKCJvbmx5IGNvbXByZXNzZWQgZm9ybWF0cyBjdXJyZW50bHkgc3VwcG9ydGVkIik7dGhpcy5nbEludGVybmFsRm9ybWF0PXMuZ2V0VWludDMyKDQqcixuKTtsZXQgaD1zLmdldFVpbnQzMig2KnIsbiksbz1zLmdldFVpbnQzMig3KnIsbik7dGhpcy5udW1iZXJPZkZhY2VzPXMuZ2V0VWludDMyKDEwKnIsbiksdGhpcy5udW1iZXJPZk1pcG1hcExldmVscz1NYXRoLm1heCgxLHMuZ2V0VWludDMyKDExKnIsbikpO2xldCBsPXMuZ2V0VWludDMyKDEyKnIsbik7dGhpcy5taXBtYXBzPVtdO2xldCBjPTEyKzEzKjQrbDtmb3IobGV0IGY9MDtmPHRoaXMubnVtYmVyT2ZNaXBtYXBMZXZlbHM7ZisrKXtsZXQgcD1uZXcgSW50MzJBcnJheShpLGMsMSlbMF07Yys9NDtmb3IobGV0IHU9MDt1PHRoaXMubnVtYmVyT2ZGYWNlczt1Kyspe2xldCBkPW5ldyBVaW50OEFycmF5KGksYyxwKTt0aGlzLm1pcG1hcHMucHVzaCh7ZGF0YTpkLHdpZHRoOmgsaGVpZ2h0Om99KSxjKz1wLGMrPTMtKHArMyklNH1oPWg+PjEsbz1vPj4xfX12YXIgV3Q9e30sdnQ9W10sWWU9Y2xhc3N7c3RhdGljIGxvYWQodCx7c3JjOmUsd3JhcFM6cj10LkNMQU1QX1RPX0VER0Usd3JhcFQ6cz10LkNMQU1QX1RPX0VER0UsYW5pc290cm9weTpuPTAsZm9ybWF0OmE9dC5SR0JBLGludGVybmFsRm9ybWF0Omg9YSxnZW5lcmF0ZU1pcG1hcHM6bz0hMCxtaW5GaWx0ZXI6bD1vP3QuTkVBUkVTVF9NSVBNQVBfTElORUFSOnQuTElORUFSLG1hZ0ZpbHRlcjpjPXQuTElORUFSLHByZW11bHRpcGx5QWxwaGE6Zj0hMSx1bnBhY2tBbGlnbm1lbnQ6cD00LGZsaXBZOnU9ITB9PXt9KXtsZXQgZD10aGlzLmdldFN1cHBvcnRlZEV4dGVuc2lvbnModCkseD0ibm9uZSI7aWYodHlwZW9mIGU9PSJzdHJpbmciJiYoeD1lLnNwbGl0KCIuIikucG9wKCkuc3BsaXQoIj8iKVswXS50b0xvd2VyQ2FzZSgpKSx0eXBlb2YgZT09Im9iamVjdCIpe2ZvcihsZXQgQSBpbiBlKWlmKGQuaW5jbHVkZXMoQS50b0xvd2VyQ2FzZSgpKSl7eD1BLnRvTG93ZXJDYXNlKCksZT1lW0FdO2JyZWFrfX1sZXQgbT1lK3IrcytuK2EraCtvK2wrYytmK3ArdSt0LnJlbmRlcmVyLmlkO2lmKFd0W21dKXJldHVybiBXdFttXTtsZXQgZztzd2l0Y2goeCl7Y2FzZSJrdHgiOmNhc2UicHZydGMiOmNhc2UiczN0YyI6Y2FzZSJldGMiOmNhc2UiZXRjMSI6Y2FzZSJhc3RjIjpnPW5ldyBfdCh0LHtzcmM6ZSx3cmFwUzpyLHdyYXBUOnMsYW5pc290cm9weTpuLG1pbkZpbHRlcjpsLG1hZ0ZpbHRlcjpjfSksZy5sb2FkZWQ9dGhpcy5sb2FkS1RYKGUsZyk7YnJlYWs7Y2FzZSJ3ZWJwIjpjYXNlImpwZyI6Y2FzZSJqcGVnIjpjYXNlInBuZyI6Zz1uZXcgRyh0LHt3cmFwUzpyLHdyYXBUOnMsYW5pc290cm9weTpuLGZvcm1hdDphLGludGVybmFsRm9ybWF0OmgsZ2VuZXJhdGVNaXBtYXBzOm8sbWluRmlsdGVyOmwsbWFnRmlsdGVyOmMscHJlbXVsdGlwbHlBbHBoYTpmLHVucGFja0FsaWdubWVudDpwLGZsaXBZOnV9KSxnLmxvYWRlZD10aGlzLmxvYWRJbWFnZSh0LGUsZyx1KTticmVhaztkZWZhdWx0OmNvbnNvbGUud2FybigiTm8gc3VwcG9ydGVkIGZvcm1hdCBzdXBwbGllZCIpLGc9bmV3IEcodCl9cmV0dXJuIGcuZXh0PXgsV3RbbV09ZyxnfXN0YXRpYyBnZXRTdXBwb3J0ZWRFeHRlbnNpb25zKHQpe2lmKHZ0Lmxlbmd0aClyZXR1cm4gdnQ7bGV0IGU9e3B2cnRjOnQucmVuZGVyZXIuZ2V0RXh0ZW5zaW9uKCJXRUJHTF9jb21wcmVzc2VkX3RleHR1cmVfcHZydGMiKXx8dC5yZW5kZXJlci5nZXRFeHRlbnNpb24oIldFQktJVF9XRUJHTF9jb21wcmVzc2VkX3RleHR1cmVfcHZydGMiKSxzM3RjOnQucmVuZGVyZXIuZ2V0RXh0ZW5zaW9uKCJXRUJHTF9jb21wcmVzc2VkX3RleHR1cmVfczN0YyIpLGV0YzE6dC5yZW5kZXJlci5nZXRFeHRlbnNpb24oIldFQkdMX2NvbXByZXNzZWRfdGV4dHVyZV9ldGMxIiksYXN0Yzp0LnJlbmRlcmVyLmdldEV4dGVuc2lvbigiV0VCR0xfY29tcHJlc3NlZF90ZXh0dXJlX2FzdGMiKSxiYzc6dC5yZW5kZXJlci5nZXRFeHRlbnNpb24oIkVYVF90ZXh0dXJlX2NvbXByZXNzaW9uX2JwdGMiKX07Zm9yKGxldCByIGluIGUpZVtyXSYmdnQucHVzaChyKTtyZXR1cm4gdnQucHVzaCgicG5nIiwianBnIiwid2VicCIpLHZ0fXN0YXRpYyBsb2FkS1RYKHQsZSl7cmV0dXJuIGZldGNoKHQpLnRoZW4ocj0+ci5hcnJheUJ1ZmZlcigpKS50aGVuKHI9PmUucGFyc2VCdWZmZXIocikpfXN0YXRpYyBsb2FkSW1hZ2UodCxlLHIscyl7cmV0dXJuIG9uKGUscykudGhlbihuPT4oIXQucmVuZGVyZXIuaXNXZWJnbDImJighYXMobi53aWR0aCl8fCFhcyhuLmhlaWdodCkpJiYoci5nZW5lcmF0ZU1pcG1hcHMmJihyLmdlbmVyYXRlTWlwbWFwcz0hMSksci5taW5GaWx0ZXI9PT10Lk5FQVJFU1RfTUlQTUFQX0xJTkVBUiYmKHIubWluRmlsdGVyPXQuTElORUFSKSxyLndyYXBTPT09dC5SRVBFQVQmJihyLndyYXBTPXIud3JhcFQ9dC5DTEFNUF9UT19FREdFKSksci5pbWFnZT1uLHIub25VcGRhdGU9KCk9PntuLmNsb3NlJiZuLmNsb3NlKCksci5vblVwZGF0ZT1udWxsfSxuKSl9c3RhdGljIGNsZWFyQ2FjaGUoKXtXdD17fX19O2Z1bmN0aW9uIGFzKGkpe3JldHVybiBNYXRoLmxvZzIoaSklMT09PTB9ZnVuY3Rpb24gb24oaSx0KXtyZXR1cm4gbmV3IFByb21pc2UoKGUscik9PntpZihobigpKWZldGNoKGkse21vZGU6ImNvcnMifSkudGhlbihzPT5zLmJsb2IoKSkudGhlbihzPT5jcmVhdGVJbWFnZUJpdG1hcChzLHtpbWFnZU9yaWVudGF0aW9uOnQ/ImZsaXBZIjoibm9uZSIscHJlbXVsdGlwbHlBbHBoYToibm9uZSJ9KSkudGhlbihlKS5jYXRjaChzPT5yKHMpKTtlbHNle2xldCBzPW5ldyBJbWFnZTtzLmNyb3NzT3JpZ2luPSIiLHMuc3JjPWkscy5vbmVycm9yPSh7dHlwZTpufSk9PnIoYCR7bn06IExvYWRpbmcgaW1hZ2VgKSxzLm9ubG9hZD0oKT0+ZShzKX19KX1mdW5jdGlvbiBobigpe2lmKCFuYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoImNocm9tZSIpKXJldHVybiExO3RyeXtjcmVhdGVJbWFnZUJpdG1hcH1jYXRjaHtyZXR1cm4hMX1yZXR1cm4hMH12YXIgb3M9bmV3IEUsbG49bmV3IEUsY249bmV3IEUsZm49bmV3IEUsaHM9bmV3IEssdW49bmV3IEsscG49bmV3IEssZG49bmV3IEssYnQ9Y2xhc3N7Y29uc3RydWN0b3IodCxlPTEpe3RoaXMuZGF0YT10LHRoaXMuZWxhcHNlZD0wLHRoaXMud2VpZ2h0PWUsdGhpcy5sb29wPSEwLHRoaXMuc3RhcnRUaW1lPXQucmVkdWNlKChyLHt0aW1lczpzfSk9Pk1hdGgubWluKHIsc1swXSksMS8wKSx0aGlzLmVuZFRpbWU9dC5yZWR1Y2UoKHIse3RpbWVzOnN9KT0+TWF0aC5tYXgocixzW3MubGVuZ3RoLTFdKSwwKSx0aGlzLmR1cmF0aW9uPXRoaXMuZW5kVGltZS10aGlzLnN0YXJ0VGltZX11cGRhdGUodD0xLGUpe2xldCByPWU/MTp0aGlzLndlaWdodC90LHM9dGhpcy5kdXJhdGlvbj8odGhpcy5sb29wP3RoaXMuZWxhcHNlZCV0aGlzLmR1cmF0aW9uOk1hdGgubWluKHRoaXMuZWxhcHNlZCx0aGlzLmR1cmF0aW9uLS4wMDEpKSt0aGlzLnN0YXJ0VGltZTowO3RoaXMuZGF0YS5mb3JFYWNoKCh7bm9kZTpuLHRyYW5zZm9ybTphLGludGVycG9sYXRpb246aCx0aW1lczpvLHZhbHVlczpsfSk9PntpZighdGhpcy5kdXJhdGlvbil7bGV0IEE9b3Msdz0zO2E9PT0icXVhdGVybmlvbiImJihBPWhzLHc9NCksQS5mcm9tQXJyYXkobCwwKSx3PT09ND9uW2FdLnNsZXJwKEEscik6blthXS5sZXJwKEEscik7cmV0dXJufWxldCBjPU1hdGgubWF4KDEsby5maW5kSW5kZXgoQT0+QT5zKSktMSxmPWMrMSxwPShzLW9bY10pLyhvW2ZdLW9bY10pO2g9PT0iU1RFUCImJihwPTApO2xldCB1PW9zLGQ9bG4seD1jbixtPWZuLGc9MzthPT09InF1YXRlcm5pb24iJiYodT1ocyxkPXVuLHg9cG4sbT1kbixnPTQpLGg9PT0iQ1VCSUNTUExJTkUiPyh1LmZyb21BcnJheShsLGMqZyozK2cqMSksZC5mcm9tQXJyYXkobCxjKmcqMytnKjIpLHguZnJvbUFycmF5KGwsZipnKjMrZyowKSxtLmZyb21BcnJheShsLGYqZyozK2cqMSksdT10aGlzLmN1YmljU3BsaW5lSW50ZXJwb2xhdGUocCx1LGQseCxtKSxnPT09NCYmdS5ub3JtYWxpemUoKSk6KHUuZnJvbUFycmF5KGwsYypnKSxtLmZyb21BcnJheShsLGYqZyksZz09PTQ/dS5zbGVycChtLHApOnUubGVycChtLHApKSxnPT09ND9uW2FdLnNsZXJwKHUscik6blthXS5sZXJwKHUscil9KX1jdWJpY1NwbGluZUludGVycG9sYXRlKHQsZSxyLHMsbil7bGV0IGE9dCp0LGg9YSp0LG89MyphLTIqaCxsPWgtYSxjPTEtbyxmPWwtYSt0O2ZvcihsZXQgcD0wO3A8ZS5sZW5ndGg7cCsrKWVbcF09YyplW3BdK2YqKDEtdCkqcltwXStvKm5bcF0rbCp0KnNbcF07cmV0dXJuIGV9fTt2YXIgbHM9bmV3IFYsbW49bmV3IFYsRnQ9Y2xhc3MgZXh0ZW5kcyBEe2NvbnN0cnVjdG9yKHQse3NrZWxldG9uOmUsZ2VvbWV0cnk6cixwcm9ncmFtOnMsbW9kZTpuPXQuVFJJQU5HTEVTfT17fSl7c3VwZXIodCx7Z2VvbWV0cnk6cixwcm9ncmFtOnMsbW9kZTpufSksdGhpcy5za2VsZXRvbj1lLHRoaXMucHJvZ3JhbT1zLHRoaXMuY3JlYXRlQm9uZVRleHR1cmUoKX1jcmVhdGVCb25lVGV4dHVyZSgpe2lmKCF0aGlzLnNrZWxldG9uLmpvaW50cy5sZW5ndGgpcmV0dXJuO2xldCB0PU1hdGgubWF4KDQsTWF0aC5wb3coMixNYXRoLmNlaWwoTWF0aC5sb2coTWF0aC5zcXJ0KHRoaXMuc2tlbGV0b24uam9pbnRzLmxlbmd0aCo0KSkvTWF0aC5MTjIpKSk7dGhpcy5ib25lTWF0cmljZXM9bmV3IEZsb2F0MzJBcnJheSh0KnQqNCksdGhpcy5ib25lVGV4dHVyZVNpemU9dCx0aGlzLmJvbmVUZXh0dXJlPW5ldyBHKHRoaXMuZ2wse2ltYWdlOnRoaXMuYm9uZU1hdHJpY2VzLGdlbmVyYXRlTWlwbWFwczohMSx0eXBlOnRoaXMuZ2wuRkxPQVQsaW50ZXJuYWxGb3JtYXQ6dGhpcy5nbC5yZW5kZXJlci5pc1dlYmdsMj90aGlzLmdsLlJHQkEzMkY6dGhpcy5nbC5SR0JBLG1pbkZpbHRlcjp0aGlzLmdsLk5FQVJFU1QsbWFnRmlsdGVyOnRoaXMuZ2wuTkVBUkVTVCxmbGlwWTohMSx3aWR0aDp0fSl9dXBkYXRlVW5pZm9ybXMoKXt0aGlzLnNrZWxldG9uLmpvaW50cy5mb3JFYWNoKCh0LGUpPT57bHMubXVsdGlwbHkodC53b3JsZE1hdHJpeCx0LmJpbmRJbnZlcnNlKSx0aGlzLmJvbmVNYXRyaWNlcy5zZXQobHMsZSoxNil9KSx0aGlzLmJvbmVUZXh0dXJlLm5lZWRzVXBkYXRlPSEwLHRoaXMucHJvZ3JhbS51bmlmb3Jtcy5ib25lVGV4dHVyZS52YWx1ZT10aGlzLmJvbmVUZXh0dXJlLHRoaXMucHJvZ3JhbS51bmlmb3Jtcy5ib25lVGV4dHVyZVNpemUudmFsdWU9dGhpcy5ib25lVGV4dHVyZVNpemV9ZHJhdyh7Y2FtZXJhOnR9PXt9KXt0aGlzLnByb2dyYW0udW5pZm9ybXMuYm9uZVRleHR1cmV8fE9iamVjdC5hc3NpZ24odGhpcy5wcm9ncmFtLnVuaWZvcm1zLHtib25lVGV4dHVyZTp7dmFsdWU6dGhpcy5ib25lVGV4dHVyZX0sYm9uZVRleHR1cmVTaXplOnt2YWx1ZTp0aGlzLmJvbmVUZXh0dXJlU2l6ZX19KSx0aGlzLnVwZGF0ZVVuaWZvcm1zKCk7bGV0IGU9dGhpcy53b3JsZE1hdHJpeDt0aGlzLndvcmxkTWF0cml4PW1uLHN1cGVyLmRyYXcoe2NhbWVyYTp0fSksdGhpcy53b3JsZE1hdHJpeD1lfX07dmFyIFR0PWNsYXNzIGV4dGVuZHMgRHtjb25zdHJ1Y3RvciguLi50KXtzdXBlciguLi50KSx0aGlzLmZydXN0dW1DdWxsZWQ9ITEsdGhpcy5pc0luc3RhbmNlZE1lc2g9ITB9YWRkRnJ1c3R1bUN1bGwoKXt0aGlzLmluc3RhbmNlVHJhbnNmb3Jtcz1udWxsLHRoaXMuaW5zdGFuY2VMaWdodG1hcFNjYWxlT2Zmc2V0PW51bGwsdGhpcy50b3RhbEluc3RhbmNlQ291bnQ9MCx0aGlzLmZydXN0dW1DdWxsRnVuY3Rpb249bnVsbCx0aGlzLmluc3RhbmNlUmVuZGVyTGlzdD1udWxsLHRoaXMuZ2VvbWV0cnkuYXR0cmlidXRlcy5pbnN0YW5jZU1hdHJpeHx8Y29uc29sZS5lcnJvcihgbWVzaCAke3RoaXMubmFtZT9gIiR7dGhpcy5uYW1lfSIgYDoiIn1taXNzaW5nIGluc3RhbmNlTWF0cml4IGF0dHJpYnV0ZTsgdW5hYmxlIHRvIGZydXN0dW0gY3VsbGApO2xldCB0PXRoaXMuZ2VvbWV0cnkuYXR0cmlidXRlcy5pbnN0YW5jZU1hdHJpeC5kYXRhO3RoaXMuaW5zdGFuY2VUcmFuc2Zvcm1zPVtdO2ZvcihsZXQgZT0wLHI9MDtlPHQubGVuZ3RoO2UrPTE2LHIrKyl7bGV0IHM9bmV3IEg7cy5pbmRleD1yLHMubWF0cml4LmZyb21BcnJheSh0LGUpLHMuZGVjb21wb3NlKCksdGhpcy5pbnN0YW5jZVRyYW5zZm9ybXMucHVzaChzKSxzLnNldFBhcmVudCh0aGlzLnBhcmVudCl9aWYodGhpcy50b3RhbEluc3RhbmNlQ291bnQ9dGhpcy5pbnN0YW5jZVRyYW5zZm9ybXMubGVuZ3RoLHRoaXMuZ2VvbWV0cnkuYXR0cmlidXRlcy5saWdodG1hcFNjYWxlT2Zmc2V0KXtsZXQgZT10aGlzLmdlb21ldHJ5LmF0dHJpYnV0ZXMubGlnaHRtYXBTY2FsZU9mZnNldC5kYXRhO2ZvcihsZXQgcj0wLHM9MDtyPGUubGVuZ3RoO3IrPTQscysrKXRoaXMuaW5zdGFuY2VUcmFuc2Zvcm1zW3NdLmxpZ2h0bWFwRGF0YT1uZXcgeXQoKS5mcm9tQXJyYXkoZSxyKX10aGlzLmZydXN0dW1DdWxsRnVuY3Rpb249KHtjYW1lcmE6ZX0pPT57dGhpcy5pbnN0YW5jZVJlbmRlckxpc3Q9W10sdGhpcy5pbnN0YW5jZVRyYW5zZm9ybXMuZm9yRWFjaChyPT57ZS5mcnVzdHVtSW50ZXJzZWN0c01lc2godGhpcyxyLndvcmxkTWF0cml4KSYmdGhpcy5pbnN0YW5jZVJlbmRlckxpc3QucHVzaChyKX0pLHRoaXMuaW5zdGFuY2VSZW5kZXJMaXN0LmZvckVhY2goKHIscyk9PntyLm1hdHJpeC50b0FycmF5KHRoaXMuZ2VvbWV0cnkuYXR0cmlidXRlcy5pbnN0YW5jZU1hdHJpeC5kYXRhLHMqMTYpLHIubGlnaHRtYXBEYXRhJiYoci5saWdodG1hcERhdGEudG9BcnJheSh0aGlzLmdlb21ldHJ5LmF0dHJpYnV0ZXMubGlnaHRtYXBTY2FsZU9mZnNldC5kYXRhLHMqNCksdGhpcy5nZW9tZXRyeS5hdHRyaWJ1dGVzLmxpZ2h0bWFwU2NhbGVPZmZzZXQubmVlZHNVcGRhdGU9ITApfSksdGhpcy5nZW9tZXRyeS5pbnN0YW5jZWRDb3VudD10aGlzLmluc3RhbmNlUmVuZGVyTGlzdC5sZW5ndGgsdGhpcy5nZW9tZXRyeS5hdHRyaWJ1dGVzLmluc3RhbmNlTWF0cml4Lm5lZWRzVXBkYXRlPSEwfSx0aGlzLm9uQmVmb3JlUmVuZGVyKHRoaXMuZnJ1c3R1bUN1bGxGdW5jdGlvbil9cmVtb3ZlRnJ1c3R1bUN1bGwoKXt0aGlzLm9mZkJlZm9yZVJlbmRlcih0aGlzLmZydXN0dW1DdWxsRnVuY3Rpb24pLHRoaXMuZ2VvbWV0cnkuaW5zdGFuY2VkQ291bnQ9dGhpcy50b3RhbEluc3RhbmNlQ291bnQsdGhpcy5pbnN0YW5jZVRyYW5zZm9ybXMuZm9yRWFjaCgodCxlKT0+e3QubWF0cml4LnRvQXJyYXkodGhpcy5nZW9tZXRyeS5hdHRyaWJ1dGVzLmluc3RhbmNlTWF0cml4LmRhdGEsZSoxNiksdC5saWdodG1hcERhdGEmJih0LmxpZ2h0bWFwRGF0YS50b0FycmF5KHRoaXMuZ2VvbWV0cnkuYXR0cmlidXRlcy5saWdodG1hcFNjYWxlT2Zmc2V0LmRhdGEsZSo0KSx0aGlzLmdlb21ldHJ5LmF0dHJpYnV0ZXMubGlnaHRtYXBTY2FsZU9mZnNldC5uZWVkc1VwZGF0ZT0hMCl9KSx0aGlzLmdlb21ldHJ5LmF0dHJpYnV0ZXMuaW5zdGFuY2VNYXRyaXgubmVlZHNVcGRhdGU9ITB9fTt2YXIgY3M9ezUxMjA6SW50OEFycmF5LDUxMjE6VWludDhBcnJheSw1MTIyOkludDE2QXJyYXksNTEyMzpVaW50MTZBcnJheSw1MTI1OlVpbnQzMkFycmF5LDUxMjY6RmxvYXQzMkFycmF5LCJpbWFnZS9qcGVnIjpVaW50OEFycmF5LCJpbWFnZS9wbmciOlVpbnQ4QXJyYXksImltYWdlL3dlYnAiOlVpbnQ4QXJyYXl9LGduPXtTQ0FMQVI6MSxWRUMyOjIsVkVDMzozLFZFQzQ6NCxNQVQyOjQsTUFUMzo5LE1BVDQ6MTZ9LGZzPXtQT1NJVElPTjoicG9zaXRpb24iLE5PUk1BTDoibm9ybWFsIixUQU5HRU5UOiJ0YW5nZW50IixURVhDT09SRF8wOiJ1diIsVEVYQ09PUkRfMToidXYyIixDT0xPUl8wOiJjb2xvciIsV0VJR0hUU18wOiJza2luV2VpZ2h0IixKT0lOVFNfMDoic2tpbkluZGV4In0seG49e3RyYW5zbGF0aW9uOiJwb3NpdGlvbiIscm90YXRpb246InF1YXRlcm5pb24iLHNjYWxlOiJzY2FsZSJ9LGplPWNsYXNze3N0YXRpYyBzZXREcmFjb01hbmFnZXIodCl7dGhpcy5kcmFjb01hbmFnZXI9dH1zdGF0aWMgc2V0QmFzaXNNYW5hZ2VyKHQpe3RoaXMuYmFzaXNNYW5hZ2VyPXR9c3RhdGljIGFzeW5jIGxvYWQodCxlKXtsZXQgcj1lLnNwbGl0KCIvIikuc2xpY2UoMCwtMSkuam9pbigiLyIpKyIvIixzPWF3YWl0IHRoaXMucGFyc2VEZXNjKGUpO3JldHVybiB0aGlzLnBhcnNlKHQscyxyKX1zdGF0aWMgYXN5bmMgcGFyc2UodCxlLHIpeyhlLmFzc2V0PT09dm9pZCAwfHxlLmFzc2V0LnZlcnNpb25bMF08MikmJmNvbnNvbGUud2FybigiT25seSBHTFRGID49Mi4wIHN1cHBvcnRlZC4gQXR0ZW1wdGluZyB0byBwYXJzZS4iKSxlLmV4dGVuc2lvbnNSZXF1aXJlZD8uaW5jbHVkZXMoIktIUl9kcmFjb19tZXNoX2NvbXByZXNzaW9uIikmJiF0aGlzLmRyYWNvTWFuYWdlciYmY29uc29sZS53YXJuKCJLSFJfZHJhY29fbWVzaF9jb21wcmVzc2lvbiBleHRlbnNpb24gcmVxdWlyZWQgYnV0IG5vIG1hbmFnZXIgc3VwcGxpZWQuIFVzZSAuc2V0RHJhY29NYW5hZ2VyKCkiKSxlLmV4dGVuc2lvbnNSZXF1aXJlZD8uaW5jbHVkZXMoIktIUl90ZXh0dXJlX2Jhc2lzdSIpJiYhdGhpcy5iYXNpc01hbmFnZXImJmNvbnNvbGUud2FybigiS0hSX3RleHR1cmVfYmFzaXN1IGV4dGVuc2lvbiByZXF1aXJlZCBidXQgbm8gbWFuYWdlciBzdXBwbGllZC4gVXNlIC5zZXRCYXNpc01hbmFnZXIoKSIpO2xldCBzPWF3YWl0IHRoaXMubG9hZEJ1ZmZlcnMoZSxyKTt0LnJlbmRlcmVyLmJpbmRWZXJ0ZXhBcnJheShudWxsKTtsZXQgbj10aGlzLnBhcnNlQnVmZmVyVmlld3ModCxlLHMpLGE9YXdhaXQgdGhpcy5wYXJzZUltYWdlcyh0LGUscixuKSxoPXRoaXMucGFyc2VUZXh0dXJlcyh0LGUsYSksbz10aGlzLnBhcnNlTWF0ZXJpYWxzKHQsZSxoKSxsPXRoaXMucGFyc2VTa2lucyh0LGUsbiksYz1hd2FpdCB0aGlzLnBhcnNlTWVzaGVzKHQsZSxuLG8sbCksW2YscF09dGhpcy5wYXJzZU5vZGVzKHQsZSxjLGwsYSk7dGhpcy5wb3B1bGF0ZVNraW5zKGwsZik7bGV0IHU9dGhpcy5wYXJzZUFuaW1hdGlvbnModCxlLGYsbiksZD10aGlzLnBhcnNlU2NlbmVzKGUsZikseD1kW2Uuc2NlbmVdLG09dGhpcy5wYXJzZUxpZ2h0cyh0LGUsZixkKTtmb3IobGV0IGc9Zi5sZW5ndGg7Zz49MDtnLS0pZltnXXx8Zi5zcGxpY2UoZywxKTtyZXR1cm57anNvbjplLGJ1ZmZlcnM6cyxidWZmZXJWaWV3czpuLGNhbWVyYXM6cCxpbWFnZXM6YSx0ZXh0dXJlczpoLG1hdGVyaWFsczpvLG1lc2hlczpjLG5vZGVzOmYsbGlnaHRzOm0sYW5pbWF0aW9uczp1LHNjZW5lczpkLHNjZW5lOnh9fXN0YXRpYyBwYXJzZURlc2ModCl7cmV0dXJuIGZldGNoKHQse21vZGU6ImNvcnMifSkudGhlbihlPT5lLmFycmF5QnVmZmVyKCkpLnRoZW4oZT0+e2xldCByPW5ldyBUZXh0RGVjb2RlcjtyZXR1cm4gci5kZWNvZGUobmV3IFVpbnQ4QXJyYXkoZSwwLDQpKT09PSJnbFRGIj90aGlzLnVucGFja0dMQihlKTpKU09OLnBhcnNlKHIuZGVjb2RlKGUpKX0pfXN0YXRpYyB1bnBhY2tHTEIodCl7bGV0IGU9bmV3IFVpbnQzMkFycmF5KHQsMCwzKTtpZihlWzBdIT09MTE3OTkzNzg5NSl0aHJvdyBuZXcgRXJyb3IoIkludmFsaWQgZ2xURiBhc3NldC4iKTtpZihlWzFdIT09Mil0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIGdsVEYgYmluYXJ5IHZlcnNpb24sICIke2VbMV19Ii5gKTtsZXQgcj1uZXcgVWludDMyQXJyYXkodCwxMiwyKSxzPTIwLG49clswXTtpZihyWzFdIT09MTMxMzgyMTUxNCl0aHJvdyBuZXcgRXJyb3IoIlVuZXhwZWN0ZWQgR0xCIGxheW91dC4iKTtsZXQgYT1uZXcgVGV4dERlY29kZXIoKS5kZWNvZGUodC5zbGljZShzLHMrbikpLGg9SlNPTi5wYXJzZShhKTtpZihzK249PT10LmJ5dGVMZW5ndGgpcmV0dXJuIGg7bGV0IG89bmV3IFVpbnQzMkFycmF5KHQscytuLDIpO2lmKG9bMV0hPT01MTMwNTYyKXRocm93IG5ldyBFcnJvcigiVW5leHBlY3RlZCBHTEIgbGF5b3V0LiIpO2xldCBsPXMrbis4LGM9b1swXSxmPXQuc2xpY2UobCxsK2MpO3JldHVybiBoLmJ1ZmZlcnNbMF0uYmluYXJ5PWYsaH1zdGF0aWMgcmVzb2x2ZVVSSSh0LGUpe3JldHVybiB0eXBlb2YgdCE9InN0cmluZyJ8fHQ9PT0iIj8iIjooL15odHRwcz86XC9cLy9pLnRlc3QoZSkmJi9eXC8vLnRlc3QodCkmJihlPWUucmVwbGFjZSgvKF5odHRwcz86XC9cL1teXC9dKykuKi9pLCIkMSIpKSwvXihodHRwcz86KT9cL1wvL2kudGVzdCh0KXx8L15kYXRhOi4qLC4qJC9pLnRlc3QodCl8fC9eYmxvYjouKiQvaS50ZXN0KHQpP3Q6ZSt0KX1zdGF0aWMgbG9hZEJ1ZmZlcnModCxlKXtyZXR1cm4gdC5idWZmZXJzP1Byb21pc2UuYWxsKHQuYnVmZmVycy5tYXAocj0+e2lmKHIuYmluYXJ5KXJldHVybiByLmJpbmFyeTtsZXQgcz10aGlzLnJlc29sdmVVUkkoci51cmksZSk7cmV0dXJuIGZldGNoKHMse21vZGU6ImNvcnMifSkudGhlbihuPT5uLmFycmF5QnVmZmVyKCkpfSkpOm51bGx9c3RhdGljIHBhcnNlQnVmZmVyVmlld3ModCxlLHIpe2lmKCFlLmJ1ZmZlclZpZXdzKXJldHVybiBudWxsO2xldCBzPWUuYnVmZmVyVmlld3M7cmV0dXJuIGUubWVzaGVzJiZlLm1lc2hlcy5mb3JFYWNoKCh7cHJpbWl0aXZlczpufSk9PntuLmZvckVhY2goKHthdHRyaWJ1dGVzOmEsaW5kaWNlczpoLGV4dGVuc2lvbnM6b30pPT57Zm9yKGxldCBsIGluIGEpe2xldCBjPWUuYWNjZXNzb3JzW2FbbF1dO2MuYnVmZmVyVmlldz09PXZvaWQgMCYmbyYmby5LSFJfZHJhY29fbWVzaF9jb21wcmVzc2lvbiYmKGMuYnVmZmVyVmlldz1vLktIUl9kcmFjb19tZXNoX2NvbXByZXNzaW9uLmJ1ZmZlclZpZXcsc1tjLmJ1ZmZlclZpZXddLmlzRHJhY289ITApLHNbYy5idWZmZXJWaWV3XS5pc0F0dHJpYnV0ZT0hMH1pZihoIT09dm9pZCAwKXtsZXQgbD1lLmFjY2Vzc29yc1toXTtsLmJ1ZmZlclZpZXc9PT12b2lkIDAmJm8mJm8uS0hSX2RyYWNvX21lc2hfY29tcHJlc3Npb24mJihsLmJ1ZmZlclZpZXc9by5LSFJfZHJhY29fbWVzaF9jb21wcmVzc2lvbi5idWZmZXJWaWV3LHNbbC5idWZmZXJWaWV3XS5pc0RyYWNvPSEwKSxzW2wuYnVmZmVyVmlld10uaXNBdHRyaWJ1dGU9ITAsc1tsLmJ1ZmZlclZpZXddLnRhcmdldD10LkVMRU1FTlRfQVJSQVlfQlVGRkVSfX0pfSksZS5hY2Nlc3NvcnMuZm9yRWFjaCgoe2J1ZmZlclZpZXc6bixjb21wb25lbnRUeXBlOmF9KT0+e24hPT12b2lkIDAmJihzW25dLmNvbXBvbmVudFR5cGU9YSl9KSxlLmltYWdlcyYmZS5pbWFnZXMuZm9yRWFjaCgoe3VyaTpuLGJ1ZmZlclZpZXc6YSxtaW1lVHlwZTpofSk9PnthIT09dm9pZCAwJiYoc1thXS5taW1lVHlwZT1oKX0pLHMuZm9yRWFjaCgoe2J1ZmZlcjpuLGJ5dGVPZmZzZXQ6YT0wLGJ5dGVMZW5ndGg6aCxieXRlU3RyaWRlOm8sdGFyZ2V0Omw9dC5BUlJBWV9CVUZGRVIsbmFtZTpjLGV4dGVuc2lvbnM6ZixleHRyYXM6cCxjb21wb25lbnRUeXBlOnUsbWltZVR5cGU6ZCxpc0F0dHJpYnV0ZTp4LGlzRHJhY286bX0sZyk9PntpZihzW2ddLmRhdGE9cltuXS5zbGljZShhLGEraCksIXh8fG0pcmV0dXJuO2xldCBBPXQuY3JlYXRlQnVmZmVyKCk7dC5iaW5kQnVmZmVyKGwsQSksdC5yZW5kZXJlci5zdGF0ZS5ib3VuZEJ1ZmZlcj1BLHQuYnVmZmVyRGF0YShsLHNbZ10uZGF0YSx0LlNUQVRJQ19EUkFXKSxzW2ddLmJ1ZmZlcj1BfSksc31zdGF0aWMgcGFyc2VJbWFnZXModCxlLHIscyl7cmV0dXJuIGUuaW1hZ2VzP1Byb21pc2UuYWxsKGUuaW1hZ2VzLm1hcChhc3luYyh7dXJpOm4sYnVmZmVyVmlldzphLG1pbWVUeXBlOmgsbmFtZTpvfSk9PntpZihoPT09ImltYWdlL2t0eDIiKXtsZXR7ZGF0YTpjfT1zW2FdO3JldHVybiBhd2FpdCB0aGlzLmJhc2lzTWFuYWdlci5wYXJzZVRleHR1cmUoYyl9bGV0IGw9bmV3IEltYWdlO2lmKGwubmFtZT1vLG4pbC5zcmM9dGhpcy5yZXNvbHZlVVJJKG4scik7ZWxzZSBpZihhIT09dm9pZCAwKXtsZXR7ZGF0YTpjfT1zW2FdLGY9bmV3IEJsb2IoW2NdLHt0eXBlOmh9KTtsLnNyYz1VUkwuY3JlYXRlT2JqZWN0VVJMKGYpfXJldHVybiBsLnJlYWR5PW5ldyBQcm9taXNlKGM9PntsLm9ubG9hZD0oKT0+YygpfSksbH0pKTpudWxsfXN0YXRpYyBwYXJzZVRleHR1cmVzKHQsZSxyKXtyZXR1cm4gZS50ZXh0dXJlcz9lLnRleHR1cmVzLm1hcChzPT50aGlzLmNyZWF0ZVRleHR1cmUodCxlLHIscykpOm51bGx9c3RhdGljIGNyZWF0ZVRleHR1cmUodCxlLHIse3NhbXBsZXI6cyxzb3VyY2U6bixuYW1lOmEsZXh0ZW5zaW9uczpoLGV4dHJhczpvfSl7bj09PXZvaWQgMCYmaCYmKGguRVhUX3RleHR1cmVfd2VicCYmKG49aC5FWFRfdGV4dHVyZV93ZWJwLnNvdXJjZSksaC5LSFJfdGV4dHVyZV9iYXNpc3UmJihuPWguS0hSX3RleHR1cmVfYmFzaXN1LnNvdXJjZSkpO2xldCBsPXJbbl07aWYobC50ZXh0dXJlKXJldHVybiBsLnRleHR1cmU7bGV0IGM9e2ZsaXBZOiExLHdyYXBTOnQuUkVQRUFULHdyYXBUOnQuUkVQRUFUfSxmPXMhPT12b2lkIDA/ZS5zYW1wbGVyc1tzXTpudWxsO2lmKGYmJlsibWFnRmlsdGVyIiwibWluRmlsdGVyIiwid3JhcFMiLCJ3cmFwVCJdLmZvckVhY2godT0+e2ZbdV0mJihjW3VdPWZbdV0pfSksbC5pc0Jhc2lzKXtjLmltYWdlPWwsYy5pbnRlcm5hbEZvcm1hdD1sLmludGVybmFsRm9ybWF0LGwuaXNDb21wcmVzc2VkVGV4dHVyZSYmKGMuZ2VuZXJhdGVNaXBtYXBzPSExLGwubGVuZ3RoPjEmJih0aGlzLm1pbkZpbHRlcj10Lk5FQVJFU1RfTUlQTUFQX0xJTkVBUikpO2xldCB1PW5ldyBHKHQsYyk7cmV0dXJuIHUubmFtZT1hLGwudGV4dHVyZT11LHV9bGV0IHA9bmV3IEcodCxjKTtyZXR1cm4gcC5uYW1lPWEsbC50ZXh0dXJlPXAsbC5yZWFkeS50aGVuKCgpPT57cC5pbWFnZT1sfSkscH1zdGF0aWMgcGFyc2VNYXRlcmlhbHModCxlLHIpe3JldHVybiBlLm1hdGVyaWFscz9lLm1hdGVyaWFscy5tYXAoKHtuYW1lOnMsZXh0ZW5zaW9uczpuLGV4dHJhczphLHBick1ldGFsbGljUm91Z2huZXNzOmg9e30sbm9ybWFsVGV4dHVyZTpvLG9jY2x1c2lvblRleHR1cmU6bCxlbWlzc2l2ZVRleHR1cmU6YyxlbWlzc2l2ZUZhY3RvcjpmPVswLDAsMF0sYWxwaGFNb2RlOnA9Ik9QQVFVRSIsYWxwaGFDdXRvZmY6dT0uNSxkb3VibGVTaWRlZDpkPSExfSk9PntsZXR7YmFzZUNvbG9yRmFjdG9yOng9WzEsMSwxLDFdLGJhc2VDb2xvclRleHR1cmU6bSxtZXRhbGxpY0ZhY3RvcjpnPTEscm91Z2huZXNzRmFjdG9yOkE9MSxtZXRhbGxpY1JvdWdobmVzc1RleHR1cmU6d309aDtyZXR1cm4gbSYmKG0udGV4dHVyZT1yW20uaW5kZXhdKSxvJiYoby50ZXh0dXJlPXJbby5pbmRleF0pLHcmJih3LnRleHR1cmU9clt3LmluZGV4XSksbCYmKGwudGV4dHVyZT1yW2wuaW5kZXhdKSxjJiYoYy50ZXh0dXJlPXJbYy5pbmRleF0pLHtuYW1lOnMsZXh0ZW5zaW9uczpuLGV4dHJhczphLGJhc2VDb2xvckZhY3Rvcjp4LGJhc2VDb2xvclRleHR1cmU6bSxtZXRhbGxpY0ZhY3RvcjpnLHJvdWdobmVzc0ZhY3RvcjpBLG1ldGFsbGljUm91Z2huZXNzVGV4dHVyZTp3LG5vcm1hbFRleHR1cmU6byxvY2NsdXNpb25UZXh0dXJlOmwsZW1pc3NpdmVUZXh0dXJlOmMsZW1pc3NpdmVGYWN0b3I6ZixhbHBoYU1vZGU6cCxhbHBoYUN1dG9mZjp1LGRvdWJsZVNpZGVkOmR9fSk6bnVsbH1zdGF0aWMgcGFyc2VTa2lucyh0LGUscil7cmV0dXJuIGUuc2tpbnM/ZS5za2lucy5tYXAoKHtpbnZlcnNlQmluZE1hdHJpY2VzOnMsc2tlbGV0b246bixqb2ludHM6YX0pPT4oe2ludmVyc2VCaW5kTWF0cmljZXM6dGhpcy5wYXJzZUFjY2Vzc29yKHMsZSxyKSxza2VsZXRvbjpuLGpvaW50czphfSkpOm51bGx9c3RhdGljIHBhcnNlTWVzaGVzKHQsZSxyLHMsbil7cmV0dXJuIGUubWVzaGVzP1Byb21pc2UuYWxsKGUubWVzaGVzLm1hcChhc3luYyh7cHJpbWl0aXZlczphLHdlaWdodHM6aCxuYW1lOm8sZXh0ZW5zaW9uczpsLGV4dHJhczpjPXt9fSxmKT0+e2xldCBwPTAsdT1bXSxkPSExO3JldHVybiBlLm5vZGVzJiZlLm5vZGVzLmZvckVhY2goKHttZXNoOm0sc2tpbjpnLGV4dHJhczpBfSk9PnttPT09ZiYmKHArKyxnIT09dm9pZCAwJiZ1LnB1c2goZyksQSYmQS5saWdodG1hcF9zY2FsZV9vZmZzZXQmJihkPSEwKSl9KSwhIXUubGVuZ3RoPyhhPWF3YWl0IFByb21pc2UuYWxsKHUubWFwKGFzeW5jIG09Pihhd2FpdCB0aGlzLnBhcnNlUHJpbWl0aXZlcyh0LGEsZSxyLHMsMSxkKSkubWFwKCh7Z2VvbWV0cnk6Zyxwcm9ncmFtOkEsbW9kZTp3fSk9PntsZXQgXz1uZXcgRnQodCx7c2tlbGV0b246blttXSxnZW9tZXRyeTpnLHByb2dyYW06QSxtb2RlOnd9KTtyZXR1cm4gXy5uYW1lPW8sXy5leHRyYXM9YyxsJiYoXy5leHRlbnNpb25zPWwpLF8uZnJ1c3R1bUN1bGxlZD0hMSxffSkpKSxhLmluc3RhbmNlQ291bnQ9MCxhLm51bUluc3RhbmNlcz1wKTphPShhd2FpdCB0aGlzLnBhcnNlUHJpbWl0aXZlcyh0LGEsZSxyLHMscCxkKSkubWFwKCh7Z2VvbWV0cnk6bSxwcm9ncmFtOmcsbW9kZTpBfSk9PntsZXQgdz1tLmF0dHJpYnV0ZXMuaW5zdGFuY2VNYXRyaXg/VHQ6RCxfPW5ldyB3KHQse2dlb21ldHJ5Om0scHJvZ3JhbTpnLG1vZGU6QX0pO3JldHVybiBfLm5hbWU9byxfLmV4dHJhcz1jLGwmJihfLmV4dGVuc2lvbnM9bCksXy5udW1JbnN0YW5jZXM9cCxffSkse3ByaW1pdGl2ZXM6YSx3ZWlnaHRzOmgsbmFtZTpvfX0pKTpudWxsfXN0YXRpYyBwYXJzZVByaW1pdGl2ZXModCxlLHIscyxuLGEsaCl7cmV0dXJuIFByb21pc2UuYWxsKGUubWFwKGFzeW5jKHthdHRyaWJ1dGVzOm8saW5kaWNlczpsLG1hdGVyaWFsOmMsbW9kZTpmPTQsdGFyZ2V0czpwLGV4dGVuc2lvbnM6dSxleHRyYXM6ZH0pPT57bGV0IHg9bmV3IFZlKHQpO2MhPT12b2lkIDAmJih4LmdsdGZNYXRlcmlhbD1uW2NdKTtsZXQgbT1uZXcgTyh0KTtpZihkJiYobS5leHRyYXM9ZCksdSYmKG0uZXh0ZW5zaW9ucz11KSx1JiZ1LktIUl9kcmFjb19tZXNoX2NvbXByZXNzaW9uKXtsZXQgZz11LktIUl9kcmFjb19tZXNoX2NvbXByZXNzaW9uLmJ1ZmZlclZpZXcsQT11LktIUl9kcmFjb19tZXNoX2NvbXByZXNzaW9uLmF0dHJpYnV0ZXMsdz17fSxfPXt9LE09e30seT17fTtmb3IobGV0IFIgaW4gbyl7bGV0IHY9ci5hY2Nlc3NvcnNbb1tSXV0sTD1mc1tSXTt3W0xdPUFbUl0sX1tMXT12LmNvbXBvbmVudFR5cGUsTVtMXT1jc1t2LmNvbXBvbmVudFR5cGVdLm5hbWUseVtMXT12Lm5vcm1hbGl6ZWQ9PT0hMH1sZXR7ZGF0YTpifT1zW2ddLHo9YXdhaXQgdGhpcy5kcmFjb01hbmFnZXIuZGVjb2RlR2VvbWV0cnkoYix7YXR0cmlidXRlSWRzOncsYXR0cmlidXRlVHlwZXM6TX0pO2ZvcihsZXQgUj0wO1I8ei5hdHRyaWJ1dGVzLmxlbmd0aDtSKyspe2xldCB2PXouYXR0cmlidXRlc1tSXSxMPXYubmFtZSxUPXYuYXJyYXksUz12Lml0ZW1TaXplLEY9X1tMXSxDPXlbTF0sTj10LmNyZWF0ZUJ1ZmZlcigpO3QuYmluZEJ1ZmZlcih0LkFSUkFZX0JVRkZFUixOKSx0LnJlbmRlcmVyLnN0YXRlLmJvdW5kQnVmZmVyPU4sdC5idWZmZXJEYXRhKHQuQVJSQVlfQlVGRkVSLFQsdC5TVEFUSUNfRFJBVyksbS5hZGRBdHRyaWJ1dGUoTCx7ZGF0YTpULHNpemU6Uyx0eXBlOkYsbm9ybWFsaXplZDpDLGJ1ZmZlcjpOfSl9aWYoei5pbmRleCl7bGV0IFI9ei5pbmRleC5hcnJheSx2PXouaW5kZXguaXRlbVNpemUsTD10LmNyZWF0ZUJ1ZmZlcigpO3QuYmluZEJ1ZmZlcih0LkVMRU1FTlRfQVJSQVlfQlVGRkVSLEwpLHQucmVuZGVyZXIuc3RhdGUuYm91bmRCdWZmZXI9TCx0LmJ1ZmZlckRhdGEodC5FTEVNRU5UX0FSUkFZX0JVRkZFUixSLHQuU1RBVElDX0RSQVcpLG0uYWRkQXR0cmlidXRlKCJpbmRleCIse2RhdGE6UixzaXplOnYsdHlwZTo1MTI1LG5vcm1hbGl6ZWQ6ITEsYnVmZmVyOkx9KX19ZWxzZXtmb3IobGV0IGcgaW4gbyltLmFkZEF0dHJpYnV0ZShmc1tnXSx0aGlzLnBhcnNlQWNjZXNzb3Iob1tnXSxyLHMpKTtsIT09dm9pZCAwJiZtLmFkZEF0dHJpYnV0ZSgiaW5kZXgiLHRoaXMucGFyc2VBY2Nlc3NvcihsLHIscykpfXJldHVybiBhPjEmJm0uYWRkQXR0cmlidXRlKCJpbnN0YW5jZU1hdHJpeCIse2luc3RhbmNlZDoxLHNpemU6MTYsZGF0YTpuZXcgRmxvYXQzMkFycmF5KGEqMTYpfSksaCYmbS5hZGRBdHRyaWJ1dGUoImxpZ2h0bWFwU2NhbGVPZmZzZXQiLHtpbnN0YW5jZWQ6MSxzaXplOjQsZGF0YTpuZXcgRmxvYXQzMkFycmF5KGEqNCl9KSx7Z2VvbWV0cnk6bSxwcm9ncmFtOngsbW9kZTpmfX0pKX1zdGF0aWMgcGFyc2VBY2Nlc3Nvcih0LGUscil7bGV0e2J1ZmZlclZpZXc6cyxieXRlT2Zmc2V0Om49MCxjb21wb25lbnRUeXBlOmEsbm9ybWFsaXplZDpoPSExLGNvdW50Om8sdHlwZTpsLG1pbjpjLG1heDpmLHNwYXJzZTpwfT1lLmFjY2Vzc29yc1t0XSx7ZGF0YTp1LGJ1ZmZlcjpkLGJ5dGVPZmZzZXQ6eD0wLGJ5dGVTdHJpZGU6bT0wLHRhcmdldDpnfT1yW3NdLEE9Z25bbF0sdz1jc1thXSxfPXcuQllURVNfUEVSX0VMRU1FTlQsTT1tL18seT0hIW0mJk0hPT1BLGI7aWYoeSl7bGV0IHo9bmV3IHcodSxuKTtiPW5ldyB3KG8qQSk7Zm9yKGxldCBSPTA7UjxvO1IrKyl7bGV0IHY9TSpSLEw9ditBO2Iuc2V0KHouc2xpY2UodixMKSxSKkEpfX1lbHNlIGI9bmV3IHcodSxuLG8qQSk7cmV0dXJue2RhdGE6YixzaXplOkEsdHlwZTphLG5vcm1hbGl6ZWQ6aCxidWZmZXI6ZCxzdHJpZGU6bSxvZmZzZXQ6bixjb3VudDpvLG1pbjpjLG1heDpmfX1zdGF0aWMgcGFyc2VOb2Rlcyh0LGUscixzLG4pe2lmKCFlLm5vZGVzKXJldHVybiBudWxsO2xldCBhPVtdLGg9ZS5ub2Rlcy5tYXAoKHtjYW1lcmE6byxjaGlsZHJlbjpsLHNraW46YyxtYXRyaXg6ZixtZXNoOnAscm90YXRpb246dSxzY2FsZTpkLHRyYW5zbGF0aW9uOngsd2VpZ2h0czptLG5hbWU6ZyxleHRlbnNpb25zOkEsZXh0cmFzOnd9KT0+e2xldCBfPW8hPT12b2lkIDAsTT1fP25ldyBodCh0KTpuZXcgSDtpZihfKXtsZXQgdj1lLmNhbWVyYXNbb107aWYodi50eXBlPT09InBlcnNwZWN0aXZlIil7bGV0e3lmb3Y6TCx6bmVhcjpULHpmYXI6U309di5wZXJzcGVjdGl2ZTtNLnBlcnNwZWN0aXZlKHtmb3Y6TCooMTgwL01hdGguUEkpLG5lYXI6VCxmYXI6U30pfWVsc2V7bGV0e3htYWc6TCx5bWFnOlQsem5lYXI6Uyx6ZmFyOkZ9PXYub3J0aG9ncmFwaGljO00ub3J0aG9ncmFwaGljKHtuZWFyOlMsZmFyOkYsbGVmdDotTCxyaWdodDpMLHRvcDotVCxib3R0b206VH0pfWEucHVzaChNKX1nJiYoTS5uYW1lPWcpLHcmJihNLmV4dHJhcz13KSxBJiYoTS5leHRlbnNpb25zPUEpLHcmJncubGlnaHRtYXBUZXh0dXJlIT09dm9pZCAwJiYody5saWdodG1hcFRleHR1cmUudGV4dHVyZT10aGlzLmNyZWF0ZVRleHR1cmUodCxlLG4se3NvdXJjZTp3LmxpZ2h0bWFwVGV4dHVyZS5pbmRleH0pKSxmPyhNLm1hdHJpeC5jb3B5KGYpLE0uZGVjb21wb3NlKCkpOih1JiZNLnF1YXRlcm5pb24uY29weSh1KSxkJiZNLnNjYWxlLmNvcHkoZCkseCYmTS5wb3NpdGlvbi5jb3B5KHgpLE0udXBkYXRlTWF0cml4KCkpO2xldCB5PSExLGI9ITAsej0hMTtpZihwIT09dm9pZCAwJiYoYyE9PXZvaWQgMD8ocltwXS5wcmltaXRpdmVzW3JbcF0ucHJpbWl0aXZlcy5pbnN0YW5jZUNvdW50XS5mb3JFYWNoKHY9Pnt3JiZPYmplY3QuYXNzaWduKHYuZXh0cmFzLHcpLHYuc2V0UGFyZW50KE0pfSkscltwXS5wcmltaXRpdmVzLmluc3RhbmNlQ291bnQrKyxyW3BdLnByaW1pdGl2ZXMuaW5zdGFuY2VDb3VudD09PXJbcF0ucHJpbWl0aXZlcy5udW1JbnN0YW5jZXMmJihkZWxldGUgcltwXS5wcmltaXRpdmVzLm51bUluc3RhbmNlcyxkZWxldGUgcltwXS5wcmltaXRpdmVzLmluc3RhbmNlQ291bnQpKTpyW3BdLnByaW1pdGl2ZXMuZm9yRWFjaCh2PT57dyYmT2JqZWN0LmFzc2lnbih2LmV4dHJhcyx3KSx2Lmdlb21ldHJ5LmlzSW5zdGFuY2VkJiYoeT0hMCx2Lmluc3RhbmNlQ291bnQ/Yj0hMTp2Lmluc3RhbmNlQ291bnQ9MCx2Lmdlb21ldHJ5LmF0dHJpYnV0ZXMuaW5zdGFuY2VNYXRyaXgmJih6PSEwLE0ubWF0cml4LnRvQXJyYXkodi5nZW9tZXRyeS5hdHRyaWJ1dGVzLmluc3RhbmNlTWF0cml4LmRhdGEsdi5pbnN0YW5jZUNvdW50KjE2KSksdi5nZW9tZXRyeS5hdHRyaWJ1dGVzLmxpZ2h0bWFwU2NhbGVPZmZzZXQmJnYuZ2VvbWV0cnkuYXR0cmlidXRlcy5saWdodG1hcFNjYWxlT2Zmc2V0LmRhdGEuc2V0KHcubGlnaHRtYXBfc2NhbGVfb2Zmc2V0LHYuaW5zdGFuY2VDb3VudCo0KSx2Lmluc3RhbmNlQ291bnQrKyx2Lmluc3RhbmNlQ291bnQ9PT12Lm51bUluc3RhbmNlcyYmKGRlbGV0ZSB2Lm51bUluc3RhbmNlcyxkZWxldGUgdi5pbnN0YW5jZUNvdW50LHYuZ2VvbWV0cnkuYXR0cmlidXRlcy5pbnN0YW5jZU1hdHJpeCYmKHYuZ2VvbWV0cnkuYXR0cmlidXRlcy5pbnN0YW5jZU1hdHJpeC5uZWVkc1VwZGF0ZT0hMCksdi5nZW9tZXRyeS5hdHRyaWJ1dGVzLmxpZ2h0bWFwU2NhbGVPZmZzZXQmJih2Lmdlb21ldHJ5LmF0dHJpYnV0ZXMubGlnaHRtYXBTY2FsZU9mZnNldC5uZWVkc1VwZGF0ZT0hMCkpKSx5P2ImJnYuc2V0UGFyZW50KE0pOnYuc2V0UGFyZW50KE0pfSkpLHope2lmKCFiKXJldHVybiBudWxsO00ubWF0cml4LmlkZW50aXR5KCksTS5kZWNvbXBvc2UoKX1yZXR1cm4gTX0pO3JldHVybiBlLm5vZGVzLmZvckVhY2goKHtjaGlsZHJlbjpvPVtdfSxsKT0+e28uZm9yRWFjaChjPT57aFtjXSYmaFtjXS5zZXRQYXJlbnQoaFtsXSl9KX0pLHIuZm9yRWFjaCgoe3ByaW1pdGl2ZXM6b30sbCk9PntvLmZvckVhY2goKGMsZik9PntjLmlzSW5zdGFuY2VkTWVzaCYmYy5hZGRGcnVzdHVtQ3VsbCgpfSl9KSxbaCxhXX1zdGF0aWMgcG9wdWxhdGVTa2lucyh0LGUpe3QmJnQuZm9yRWFjaChyPT57ci5qb2ludHM9ci5qb2ludHMubWFwKChzLG4pPT57bGV0IGE9ZVtzXTtyZXR1cm4gYS5za2luPXIsYS5iaW5kSW52ZXJzZT1uZXcgViguLi5yLmludmVyc2VCaW5kTWF0cmljZXMuZGF0YS5zbGljZShuKjE2LChuKzEpKjE2KSksYX0pLHIuc2tlbGV0b24mJihyLnNrZWxldG9uPWVbci5za2VsZXRvbl0pfSl9c3RhdGljIHBhcnNlQW5pbWF0aW9ucyh0LGUscixzKXtyZXR1cm4gZS5hbmltYXRpb25zP2UuYW5pbWF0aW9ucy5tYXAoKHtjaGFubmVsczpuLHNhbXBsZXJzOmEsbmFtZTpofSxvKT0+e2xldCBsPW4ubWFwKCh7c2FtcGxlcjpjLHRhcmdldDpmfSk9PntsZXR7aW5wdXQ6cCxpbnRlcnBvbGF0aW9uOnU9IkxJTkVBUiIsb3V0cHV0OmR9PWFbY10se25vZGU6eCxwYXRoOm19PWYsZz1yW3hdLEE9eG5bbV0sdz10aGlzLnBhcnNlQWNjZXNzb3IocCxlLHMpLmRhdGEsXz10aGlzLnBhcnNlQWNjZXNzb3IoZCxlLHMpLmRhdGE7cmV0dXJuIGcuYW5pbWF0aW9uc3x8KGcuYW5pbWF0aW9ucz1bXSksZy5hbmltYXRpb25zLmluY2x1ZGVzKG8pfHxnLmFuaW1hdGlvbnMucHVzaChvKSx7bm9kZTpnLHRyYW5zZm9ybTpBLGludGVycG9sYXRpb246dSx0aW1lczp3LHZhbHVlczpffX0pO3JldHVybntuYW1lOmgsYW5pbWF0aW9uOm5ldyBidChsKX19KTpudWxsfXN0YXRpYyBwYXJzZVNjZW5lcyh0LGUpe3JldHVybiB0LnNjZW5lcz90LnNjZW5lcy5tYXAoKHtub2RlczpyPVtdLG5hbWU6cyxleHRlbnNpb25zOm4sZXh0cmFzOmF9KT0+e2xldCBoPXIucmVkdWNlKChvLGwpPT4oZVtsXSYmby5wdXNoKGVbbF0pLG8pLFtdKTtyZXR1cm4gaC5leHRyYXM9YSxofSk6bnVsbH1zdGF0aWMgcGFyc2VMaWdodHModCxlLHIscyl7bGV0IG49e2RpcmVjdGlvbmFsOltdLHBvaW50OltdLHNwb3Q6W119O3MuZm9yRWFjaChoPT5oLmZvckVhY2gobz0+by51cGRhdGVNYXRyaXhXb3JsZCgpKSk7bGV0IGE9ZS5leHRlbnNpb25zPy5LSFJfbGlnaHRzX3B1bmN0dWFsPy5saWdodHN8fFtdO3JldHVybiByLmZvckVhY2goaD0+e2lmKCFoPy5leHRlbnNpb25zPy5LSFJfbGlnaHRzX3B1bmN0dWFsKXJldHVybjtsZXQgbz1oLmV4dGVuc2lvbnMuS0hSX2xpZ2h0c19wdW5jdHVhbC5saWdodCxsPWFbb10sYz17bmFtZTpsLm5hbWV8fCIiLGNvbG9yOnt2YWx1ZTpuZXcgRSgpLnNldChsLmNvbG9yfHwxKX19O3N3aXRjaChsLmludGVuc2l0eSE9PXZvaWQgMCYmYy5jb2xvci52YWx1ZS5tdWx0aXBseShsLmludGVuc2l0eSksbC50eXBlKXtjYXNlImRpcmVjdGlvbmFsIjpjLmRpcmVjdGlvbj17dmFsdWU6bmV3IEUoMCwwLDEpLnRyYW5zZm9ybURpcmVjdGlvbihoLndvcmxkTWF0cml4KX07YnJlYWs7Y2FzZSJwb2ludCI6Yy5wb3NpdGlvbj17dmFsdWU6bmV3IEUoKS5hcHBseU1hdHJpeDQoaC53b3JsZE1hdHJpeCl9LGMuZGlzdGFuY2U9e3ZhbHVlOmwucmFuZ2V9LGMuZGVjYXk9e3ZhbHVlOjJ9O2JyZWFrO2Nhc2Uic3BvdCI6T2JqZWN0LmFzc2lnbihjLGwpO2JyZWFrfW5bbC50eXBlXS5wdXNoKGMpfSksbn19O3ZhciBIZT0wLFFlPWNsYXNze2NvbnN0cnVjdG9yKHQpe3RoaXMub25NZXNzYWdlPXRoaXMub25NZXNzYWdlLmJpbmQodGhpcyksdGhpcy5xdWV1ZT1uZXcgTWFwLHRoaXMuaW5pdFdvcmtlcih0KX1pbml0V29ya2VyKHQpe3RoaXMud29ya2VyPW5ldyBXb3JrZXIodCksdGhpcy53b3JrZXIub25tZXNzYWdlPXRoaXMub25NZXNzYWdlfW9uTWVzc2FnZSh7ZGF0YTp0fSl7bGV0e2lkOmUsZXJyb3I6cixnZW9tZXRyeTpzfT10O2lmKHIpe2NvbnNvbGUubG9nKHIsZSk7cmV0dXJufWxldCBuPXRoaXMucXVldWUuZ2V0KGUpO3RoaXMucXVldWUuZGVsZXRlKGUpLG4ocyl9ZGVjb2RlR2VvbWV0cnkodCxlKXtIZSsrLHRoaXMud29ya2VyLnBvc3RNZXNzYWdlKHtpZDpIZSxidWZmZXI6dCxjb25maWc6ZX0pO2xldCByLHM9bmV3IFByb21pc2Uobj0+cj1uKTtyZXR1cm4gdGhpcy5xdWV1ZS5zZXQoSGUsciksc319O3ZhciBLZSxaZT0wLCRlPWNsYXNze2NvbnN0cnVjdG9yKHQsZSl7S2V8fChLZT10aGlzLmdldFN1cHBvcnRlZEZvcm1hdChlKSksdGhpcy5vbk1lc3NhZ2U9dGhpcy5vbk1lc3NhZ2UuYmluZCh0aGlzKSx0aGlzLnF1ZXVlPW5ldyBNYXAsdGhpcy5pbml0V29ya2VyKHQpfWdldFN1cHBvcnRlZEZvcm1hdCh0PWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoImNhbnZhcyIpLmdldENvbnRleHQoIndlYmdsIikpe3JldHVybiB0LmdldEV4dGVuc2lvbigiV0VCR0xfY29tcHJlc3NlZF90ZXh0dXJlX2FzdGMiKT8iYXN0YyI6dC5nZXRFeHRlbnNpb24oIkVYVF90ZXh0dXJlX2NvbXByZXNzaW9uX2JwdGMiKT8iYnB0YyI6dC5nZXRFeHRlbnNpb24oIldFQkdMX2NvbXByZXNzZWRfdGV4dHVyZV9zM3RjIik/InMzdGMiOnQuZ2V0RXh0ZW5zaW9uKCJXRUJHTF9jb21wcmVzc2VkX3RleHR1cmVfZXRjMSIpPyJldGMxIjp0LmdldEV4dGVuc2lvbigiV0VCR0xfY29tcHJlc3NlZF90ZXh0dXJlX3B2cnRjIil8fHQuZ2V0RXh0ZW5zaW9uKCJXRUJLSVRfV0VCR0xfY29tcHJlc3NlZF90ZXh0dXJlX3B2cnRjIik/InB2cnRjIjoibm9uZSJ9aW5pdFdvcmtlcih0KXt0aGlzLndvcmtlcj1uZXcgV29ya2VyKHQpLHRoaXMud29ya2VyLm9ubWVzc2FnZT10aGlzLm9uTWVzc2FnZX1vbk1lc3NhZ2Uoe2RhdGE6dH0pe2xldHtpZDplLGVycm9yOnIsaW1hZ2U6c309dDtpZihyKXtjb25zb2xlLmxvZyhyLGUpO3JldHVybn1sZXQgbj10aGlzLnF1ZXVlLmdldChlKTt0aGlzLnF1ZXVlLmRlbGV0ZShlKSxzLmlzQmFzaXM9ITAsbihzKX1wYXJzZVRleHR1cmUodCl7WmUrKyx0aGlzLndvcmtlci5wb3N0TWVzc2FnZSh7aWQ6WmUsYnVmZmVyOnQsc3VwcG9ydGVkRm9ybWF0OktlfSk7bGV0IGUscj1uZXcgUHJvbWlzZShzPT5lPXMpO3JldHVybiB0aGlzLnF1ZXVlLnNldChaZSxlKSxyfX07dmFyIEplPWNsYXNzIGV4dGVuZHMgRHtjb25zdHJ1Y3Rvcih0LHtnZW9tZXRyeTplLHdpcmVDb2xvcjpyPW5ldyBsdCgwLC43NSwuNSksLi4uc309e30pe2xldCBuPW5ldyBVKHQse3ZlcnRleDp3bixmcmFnbWVudDpNbix1bmlmb3Jtczp7d2lyZUNvbG9yOnt2YWx1ZTpyfX19KSxhPWUuYXR0cmlidXRlcy5wb3NpdGlvbi5kYXRhLGg9W10sbz1uZXcgU2V0O2Z1bmN0aW9uIGwocCl7Zm9yKGxldCB1PTA7dTxwLmxlbmd0aDt1Kz0yKXluKHBbdV0qMyxwW3UrMV0qMyxhLG8pJiZoLnB1c2gocFt1XSxwW3UrMV0pfWlmKGUuYXR0cmlidXRlcy5pbmRleCl7bGV0IHA9ZS5hdHRyaWJ1dGVzLmluZGV4LmRhdGE7Zm9yKGxldCB1PTA7dTxwLmxlbmd0aDt1Kz0zKWwoW3BbdV0scFt1KzFdLHBbdSsxXSxwW3UrMl0scFt1KzJdLHBbdV1dKX1lbHNle2xldCBwPU1hdGguZmxvb3IoYS5sZW5ndGgvMyk7Zm9yKGxldCB1PTA7dTxwO3UrPTMpbChbdSx1KzEsdSsxLHUrMix1KzIsdV0pfWxldCBjPWgubGVuZ3RoPjY1NTM2P25ldyBVaW50MzJBcnJheShoKTpuZXcgVWludDE2QXJyYXkoaCksZj1uZXcgTyh0LHtwb3NpdGlvbjp7Li4uZS5hdHRyaWJ1dGVzLnBvc2l0aW9ufSxpbmRleDp7ZGF0YTpjfX0pO3N1cGVyKHQsey4uLnMsbW9kZTp0LkxJTkVTLGdlb21ldHJ5OmYscHJvZ3JhbTpufSl9fTtmdW5jdGlvbiB5bihpLHQsZSxyKXtsZXQgcz1bZVtpXSxlW2krMV0sZVtpKzJdLGVbdF0sZVt0KzFdLGVbdCsyXV0uam9pbigiIyIpLG49W2VbdF0sZVt0KzFdLGVbdCsyXSxlW2ldLGVbaSsxXSxlW2krMl1dLmpvaW4oIiMiKSxhPXIuc2l6ZTtyZXR1cm4gci5hZGQocyksci5hZGQobiksci5zaXplLWE9PT0yfXZhciB3bj1gDQphdHRyaWJ1dGUgdmVjMyBwb3NpdGlvbjsNCnVuaWZvcm0gbWF0NCBtb2RlbFZpZXdNYXRyaXg7DQp1bmlmb3JtIG1hdDQgcHJvamVjdGlvbk1hdHJpeDsNCg0Kdm9pZCBtYWluKCkgew0KICAgIGdsX1Bvc2l0aW9uID0gcHJvamVjdGlvbk1hdHJpeCAqIG1vZGVsVmlld01hdHJpeCAqIHZlYzQocG9zaXRpb24sIDEuMCk7DQp9DQpgLE1uPWANCnByZWNpc2lvbiBoaWdocCBmbG9hdDsNCnVuaWZvcm0gdmVjMyB3aXJlQ29sb3I7DQoNCnZvaWQgbWFpbigpIHsNCiAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KHdpcmVDb2xvciwgMS4wKTsNCn0NCmA7dmFyIHRpPWNsYXNzIGV4dGVuZHMgRHtjb25zdHJ1Y3Rvcih0LHtzaXplOmU9MSxzeW1tZXRyaWM6cj0hMSx4Q29sb3I6cz1uZXcgRSguOTYsLjIxLC4zMikseUNvbG9yOm49bmV3IEUoLjQ0LC42NCwuMTEpLHpDb2xvcjphPW5ldyBFKC4xOCwuNTIsLjg5KSwuLi5ofT17fSl7bGV0IG89cj8tZTowLGw9ZSxjPW5ldyBGbG9hdDMyQXJyYXkoW28sMCwwLGwsMCwwLDAsbywwLDAsbCwwLDAsMCxvLDAsMCxsXSksZj1uZXcgRmxvYXQzMkFycmF5KFsuLi5zLC4uLnMsLi4ubiwuLi5uLC4uLmEsLi4uYV0pLHA9bmV3IE8odCx7cG9zaXRpb246e3NpemU6MyxkYXRhOmN9LGNvbG9yOntzaXplOjMsZGF0YTpmfX0pLHU9bmV3IFUodCx7dmVydGV4OkVuLGZyYWdtZW50OkFufSk7c3VwZXIodCx7Li4uaCxtb2RlOnQuTElORVMsZ2VvbWV0cnk6cCxwcm9ncmFtOnV9KX19LEVuPWANCmF0dHJpYnV0ZSB2ZWMzIHBvc2l0aW9uOw0KYXR0cmlidXRlIHZlYzMgY29sb3I7DQp1bmlmb3JtIG1hdDQgbW9kZWxWaWV3TWF0cml4Ow0KdW5pZm9ybSBtYXQ0IHByb2plY3Rpb25NYXRyaXg7DQoNCnZhcnlpbmcgdmVjMyB2Q29sb3I7DQoNCnZvaWQgbWFpbigpIHsNCiAgICB2Q29sb3IgPSBjb2xvcjsNCiAgICBnbF9Qb3NpdGlvbiA9IHByb2plY3Rpb25NYXRyaXggKiBtb2RlbFZpZXdNYXRyaXggKiB2ZWM0KHBvc2l0aW9uLCAxLjApOw0KfQ0KYCxBbj1gDQpwcmVjaXNpb24gaGlnaHAgZmxvYXQ7DQp2YXJ5aW5nIHZlYzMgdkNvbG9yOw0KDQp2b2lkIG1haW4oKSB7DQogICAgZ2xfRnJhZ0NvbG9yID0gdmVjNCh2Q29sb3IsIDEuMCk7DQp9DQpgO3ZhciBlaT1jbGFzcyBleHRlbmRzIER7Y29uc3RydWN0b3IodCx7c2l6ZTplPTEwLGRpdmlzaW9uczpyPTEwLGNvbG9yOnM9bmV3IEUoLjc1LC43NSwuNzUpLC4uLm59PXt9KXtsZXQgYT0oZSsxKSoyKjIsaD1uZXcgRmxvYXQzMkFycmF5KGEqMyksbz1lLzI7Zm9yKGxldCBmPTA7Zjw9cjtmKyspe2xldCB1PWYvciplLW87aC5zZXQoW3UsMCwtbyx1LDAsb10sZioxMiksaC5zZXQoWy1vLDAsdSxvLDAsdV0sZioxMis2KX1sZXQgbD1uZXcgTyh0LHtwb3NpdGlvbjp7c2l6ZTozLGRhdGE6aH19KSxjPW5ldyBVKHQse3ZlcnRleDpfbixmcmFnbWVudDp2bix1bmlmb3Jtczp7Y29sb3I6e3ZhbHVlOnN9fX0pO3N1cGVyKHQsey4uLm4sbW9kZTp0LkxJTkVTLGdlb21ldHJ5OmwscHJvZ3JhbTpjfSl9fSxfbj1gDQphdHRyaWJ1dGUgdmVjMyBwb3NpdGlvbjsNCnVuaWZvcm0gbWF0NCBtb2RlbFZpZXdNYXRyaXg7DQp1bmlmb3JtIG1hdDQgcHJvamVjdGlvbk1hdHJpeDsNCg0Kdm9pZCBtYWluKCkgew0KICAgIGdsX1Bvc2l0aW9uID0gcHJvamVjdGlvbk1hdHJpeCAqIG1vZGVsVmlld01hdHJpeCAqIHZlYzQocG9zaXRpb24sIDEuMCk7DQp9DQpgLHZuPWANCnByZWNpc2lvbiBoaWdocCBmbG9hdDsNCnVuaWZvcm0gdmVjMyBjb2xvcjsNCg0Kdm9pZCBtYWluKCkgew0KICAgIGdsX0ZyYWdDb2xvciA9IHZlYzQoY29sb3IsIDEuMCk7DQp9DQpgO3ZhciBpaT1jbGFzcyBleHRlbmRzIER7Y29uc3RydWN0b3IodCx7c2l6ZTplPS4xLGNvbG9yOnI9bmV3IEUoLjg2LC4xNiwuODYpLC4uLnN9PXt9KXtsZXQgbj10LmdsLGE9dC5nZW9tZXRyeS5hdHRyaWJ1dGVzLm5vcm1hbC5jb3VudCxoPW5ldyBGbG9hdDMyQXJyYXkoYSoyKjMpLG89bmV3IEZsb2F0MzJBcnJheShhKjIqMyksbD1uZXcgRmxvYXQzMkFycmF5KGEqMiksYz10Lmdlb21ldHJ5LmF0dHJpYnV0ZXMubm9ybWFsLmRhdGEsZj10Lmdlb21ldHJ5LmF0dHJpYnV0ZXMucG9zaXRpb24uZGF0YSxwPW5ldyBGbG9hdDMyQXJyYXkoWzAsZV0pO2ZvcihsZXQgeD0wO3g8YTt4Kyspe2xldCBtPXgqNixnPXgqMyxBPWYuc3ViYXJyYXkoZyxnKzMpO2guc2V0KEEsbSksaC5zZXQoQSxtKzMpO2xldCB3PWMuc3ViYXJyYXkoZyxnKzMpO28uc2V0KHcsbSksby5zZXQodyxtKzMpLGwuc2V0KHAseCoyKX1sZXQgdT1uZXcgTyhuLHtwb3NpdGlvbjp7c2l6ZTozLGRhdGE6aH0sbm9ybWFsOntzaXplOjMsZGF0YTpvfSxzaXplOntzaXplOjEsZGF0YTpsfX0pLGQ9bmV3IFUobix7dmVydGV4OmJuLGZyYWdtZW50OkZuLHVuaWZvcm1zOntjb2xvcjp7dmFsdWU6cn0sd29ybGROb3JtYWxNYXRyaXg6e3ZhbHVlOm5ldyBldH0sb2JqZWN0V29ybGRNYXRyaXg6e3ZhbHVlOnQud29ybGRNYXRyaXh9fX0pO3N1cGVyKG4sey4uLnMsbW9kZTpuLkxJTkVTLGdlb21ldHJ5OnUscHJvZ3JhbTpkfSksdGhpcy5vYmplY3Q9dH1kcmF3KHQpe3RoaXMucHJvZ3JhbS51bmlmb3Jtcy53b3JsZE5vcm1hbE1hdHJpeC52YWx1ZS5nZXROb3JtYWxNYXRyaXgodGhpcy5vYmplY3Qud29ybGRNYXRyaXgpLHN1cGVyLmRyYXcodCl9fSxibj1gDQphdHRyaWJ1dGUgdmVjMyBwb3NpdGlvbjsNCmF0dHJpYnV0ZSB2ZWMzIG5vcm1hbDsNCmF0dHJpYnV0ZSBmbG9hdCBzaXplOw0KDQp1bmlmb3JtIG1hdDQgdmlld01hdHJpeDsNCnVuaWZvcm0gbWF0NCBwcm9qZWN0aW9uTWF0cml4Ow0KdW5pZm9ybSBtYXQ0IG9iamVjdFdvcmxkTWF0cml4Ow0KdW5pZm9ybSBtYXQzIHdvcmxkTm9ybWFsTWF0cml4Ow0KDQp2b2lkIG1haW4oKSB7DQogICAgdmVjMyBuID0gbm9ybWFsaXplKHdvcmxkTm9ybWFsTWF0cml4ICogbm9ybWFsKSAqIHNpemU7DQogICAgdmVjMyBwID0gKG9iamVjdFdvcmxkTWF0cml4ICogdmVjNChwb3NpdGlvbiwgMS4wKSkueHl6Ow0KICAgIGdsX1Bvc2l0aW9uID0gcHJvamVjdGlvbk1hdHJpeCAqIHZpZXdNYXRyaXggKiB2ZWM0KHAgKyBuLCAxLjApOw0KfQ0KYCxGbj1gDQpwcmVjaXNpb24gaGlnaHAgZmxvYXQ7DQp1bmlmb3JtIHZlYzMgY29sb3I7DQoNCnZvaWQgbWFpbigpIHsNCiAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KGNvbG9yLCAxLjApOw0KfQ0KYDt2YXIgUnQ9bmV3IEUscXQ9bmV3IEUsenQ9bmV3IEUscmk9bmV3IEUsc2k9bmV3IEUsbmk9Y2xhc3MgZXh0ZW5kcyBEe2NvbnN0cnVjdG9yKHQse3NpemU6ZT0uMSxjb2xvcjpyPW5ldyBFKC4xNSwuODYsLjg2KSwuLi5zfT17fSl7bGV0IG49dC5nbCxhPXQuZ2VvbWV0cnkuYXR0cmlidXRlcy5wb3NpdGlvbi5kYXRhLGg9bmV3IEZsb2F0MzJBcnJheShbMCxlXSksbz10Lmdlb21ldHJ5LmF0dHJpYnV0ZXMuaW5kZXgsbD1vP2c9Pm8uZGF0YVtnXTpnPT5nLGM9bz9vLmRhdGEubGVuZ3RoOk1hdGguZmxvb3IoYS5sZW5ndGgvMyksZj1NYXRoLmZsb29yKGMvMykscD1uZXcgRmxvYXQzMkFycmF5KGYqMiozKSx1PW5ldyBGbG9hdDMyQXJyYXkoZioyKjMpLGQ9bmV3IEZsb2F0MzJBcnJheShmKjIpO2ZvcihsZXQgZz0wO2c8YztnKz0zKXtSdC5mcm9tQXJyYXkoYSxsKGcrMCkqMykscXQuZnJvbUFycmF5KGEsbChnKzEpKjMpLHp0LmZyb21BcnJheShhLGwoZysyKSozKSxyaS5hZGQoUnQscXQpLmFkZCh6dCkubXVsdGlwbHkoMS8zKSxSdC5zdWIoUnQscXQpLHp0LnN1Yih6dCxxdCksc2kuY3Jvc3MoenQsUnQpLm5vcm1hbGl6ZSgpO2xldCBBPWcqMjtwLnNldChyaSxBKSxwLnNldChyaSxBKzMpLHUuc2V0KHNpLEEpLHUuc2V0KHNpLEErMyksZC5zZXQoaCxnLzMqMil9bGV0IHg9bmV3IE8obix7cG9zaXRpb246e3NpemU6MyxkYXRhOnB9LG5vcm1hbDp7c2l6ZTozLGRhdGE6dX0sc2l6ZTp7c2l6ZToxLGRhdGE6ZH19KSxtPW5ldyBVKG4se3ZlcnRleDpUbixmcmFnbWVudDpSbix1bmlmb3Jtczp7Y29sb3I6e3ZhbHVlOnJ9LHdvcmxkTm9ybWFsTWF0cml4Ont2YWx1ZTpuZXcgZXR9LG9iamVjdFdvcmxkTWF0cml4Ont2YWx1ZTp0LndvcmxkTWF0cml4fX19KTtzdXBlcihuLHsuLi5zLG1vZGU6bi5MSU5FUyxnZW9tZXRyeTp4LHByb2dyYW06bX0pLHRoaXMub2JqZWN0PXR9ZHJhdyh0KXt0aGlzLnByb2dyYW0udW5pZm9ybXMud29ybGROb3JtYWxNYXRyaXgudmFsdWUuZ2V0Tm9ybWFsTWF0cml4KHRoaXMub2JqZWN0LndvcmxkTWF0cml4KSxzdXBlci5kcmF3KHQpfX0sVG49YA0KYXR0cmlidXRlIHZlYzMgcG9zaXRpb247DQphdHRyaWJ1dGUgdmVjMyBub3JtYWw7DQphdHRyaWJ1dGUgZmxvYXQgc2l6ZTsNCg0KdW5pZm9ybSBtYXQ0IHZpZXdNYXRyaXg7DQp1bmlmb3JtIG1hdDQgcHJvamVjdGlvbk1hdHJpeDsNCnVuaWZvcm0gbWF0NCBvYmplY3RXb3JsZE1hdHJpeDsNCnVuaWZvcm0gbWF0MyB3b3JsZE5vcm1hbE1hdHJpeDsNCg0Kdm9pZCBtYWluKCkgew0KICAgIHZlYzMgbiA9IG5vcm1hbGl6ZSh3b3JsZE5vcm1hbE1hdHJpeCAqIG5vcm1hbCkgKiBzaXplOw0KICAgIHZlYzMgcCA9IChvYmplY3RXb3JsZE1hdHJpeCAqIHZlYzQocG9zaXRpb24sIDEuMCkpLnh5ejsNCiAgICBnbF9Qb3NpdGlvbiA9IHByb2plY3Rpb25NYXRyaXggKiB2aWV3TWF0cml4ICogdmVjNChwICsgbiwgMS4wKTsNCn0NCmAsUm49YA0KcHJlY2lzaW9uIGhpZ2hwIGZsb2F0Ow0KdW5pZm9ybSB2ZWMzIGNvbG9yOw0KDQp2b2lkIG1haW4oKSB7DQogICAgZ2xfRnJhZ0NvbG9yID0gdmVjNChjb2xvciwgMS4wKTsNCn0NCmA7dmFyIGFpPWNsYXNzIGV4dGVuZHMgR3tjb25zdHJ1Y3Rvcih0LGUpe3N1cGVyKHQsey4uLmUsdGFyZ2V0OnQuVEVYVFVSRV8zRCx3aWR0aDplLndpZHRoP2Uud2lkdGg6MixoZWlnaHQ6ZS5oZWlnaHQ/ZS5oZWlnaHQ6Mn0pO2xldCByPW5ldyBJbWFnZTtyLmNyb3NzT3JpZ2luPSIqIixyLnNyYz1lLnNyYyxyLm9ubG9hZD0oKT0+e2xldCBzPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoImNhbnZhcyIpO3Mud2lkdGg9ci53aWR0aCxzLmhlaWdodD1yLmhlaWdodDtsZXQgbj1zLmdldENvbnRleHQoIjJkIik7bi5zY2FsZSgxLC0xKSxuLnRyYW5zbGF0ZSgwLC1yLmhlaWdodCksbi5kcmF3SW1hZ2UociwwLDApO2xldCBhPW4uZ2V0SW1hZ2VEYXRhKDAsMCxyLndpZHRoLHIuaGVpZ2h0KS5kYXRhO3M9bnVsbCxuPW51bGw7bGV0IGg7c3dpdGNoKHRoaXMuZm9ybWF0KXtjYXNlIHQuUkVEOmg9MTticmVhaztjYXNlIHQuUkc6aD0yO2JyZWFrO2Nhc2UgdC5SR0I6aD0zO2JyZWFrO2RlZmF1bHQ6aD00O2JyZWFrfWxldCBvPXRoaXMud2lkdGgqdGhpcy5oZWlnaHQqdGhpcy5sZW5ndGgqaCxsPXRoaXMudHlwZT09PXQuVU5TSUdORURfQllURT9uZXcgVWludDhBcnJheShvKTpuZXcgRmxvYXQzMkFycmF5KG8pLGM9MDtmb3IobGV0IGY9MDtmPHRoaXMubGVuZ3RoO2YrKylmb3IobGV0IHA9MDtwPHRoaXMuaGVpZ2h0O3ArKylmb3IobGV0IHU9MDt1PHRoaXMud2lkdGg7dSsrKXtsZXQgZD1mJWUudGlsZUNvdW50WCp0aGlzLndpZHRoLHg9TWF0aC5mbG9vcihmL2UudGlsZUNvdW50WCkqKHRoaXMud2lkdGgqdGhpcy5oZWlnaHQqZS50aWxlQ291bnRYKSxtPXUrZCsocCpyLndpZHRoK3gpLGc9YVttKjRdLEE9YVttKjQrMV0sdz1hW20qNCsyXSxfPWFbbSo0KzNdLE09W2csQSx3LF9dO2ZvcihsZXQgeT0wO3k8aDt5KyspdGhpcy50eXBlPT09dGhpcy5nbC5VTlNJR05FRF9CWVRFP2xbYysrXT1NW3ldOmxbYysrXT1NW3ldLzI1NX10aGlzLmltYWdlPWwsdGhpcy5uZWVkc1VwZGF0ZT0hMH19fTtleHBvcnR7QXQgYXMgQW5pbWF0aW9uLHRpIGFzIEF4ZXNIZWxwZXIsJGUgYXMgQmFzaXNNYW5hZ2VyLHhlIGFzIEJveCxodCBhcyBDYW1lcmEsbHQgYXMgQ29sb3IsZHQgYXMgQ3VydmUsd2UgYXMgQ3lsaW5kZXIsUWUgYXMgRHJhY29NYW5hZ2VyLHh0IGFzIEV1bGVyLG5pIGFzIEZhY2VOb3JtYWxzSGVscGVyLFVlIGFzIEZsb3dtYXAsYnQgYXMgR0xURkFuaW1hdGlvbixqZSBhcyBHTFRGTG9hZGVyLEZ0IGFzIEdMVEZTa2luLGtlIGFzIEdQR1BVLE8gYXMgR2VvbWV0cnksZWkgYXMgR3JpZEhlbHBlcixUdCBhcyBJbnN0YW5jZWRNZXNoLF90IGFzIEtUWFRleHR1cmUsZXQgYXMgTWF0MyxWIGFzIE1hdDQsRCBhcyBNZXNoLFZlIGFzIE5vcm1hbFByb2dyYW0sSXMgYXMgT3JiaXQsU2UgYXMgUGF0aCx0dCBhcyBQbGFuZSxHZSBhcyBQb2x5bGluZSxOZSBhcyBQb3N0LFUgYXMgUHJvZ3JhbSxLIGFzIFF1YXQsX2UgYXMgUmF5Y2FzdCxqIGFzIFJlbmRlclRhcmdldCxpZSBhcyBSZW5kZXJlcixxZSBhcyBTaGFkb3csQmUgYXMgU2tpbix5ZSBhcyBTcGhlcmUsS3MgYXMgVGV4dCxHIGFzIFRleHR1cmUsYWkgYXMgVGV4dHVyZTNELFllIGFzIFRleHR1cmVMb2FkZXIsTWUgYXMgVG9ydXMsSCBhcyBUcmFuc2Zvcm0saXQgYXMgVHJpYW5nbGUsQ2UgYXMgVHViZSxYIGFzIFZlYzIsRSBhcyBWZWMzLHl0IGFzIFZlYzQsaWkgYXMgVmVydGV4Tm9ybWFsc0hlbHBlcixKZSBhcyBXaXJlTWVzaH07DQovLyMgc291cmNlTWFwcGluZ1VSTD1vZ2wuYnVuZGxlLm1qcy5tYXANCg==');
const BOLT = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><path d="M39 3 12 37h17l-4 24 27-34H35z" fill="#fff"/></svg>'
)}`;
const RASTER = 320;
const CELL = 4;
const FAR = 1e20;
const ARCS = 5;
const PULSES = 3;
const PIXEL_BUDGET = 4e6;

const hexToRgb = hex => {
  let h = String(hex || '').replace('#', '');
  if (h.length === 3) h = h.replace(/./g, c => c + c);
  const n = parseInt(h.slice(0, 6), 16);
  return Number.isNaN(n) ? [1, 1, 1] : [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const transformLine = (f, d, v, z, n) => {
  let k = 0;
  v[0] = 0;
  z[0] = -FAR;
  z[1] = FAR;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = FAR;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
};

const transformGrid = (grid, w, h) => {
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    transformLine(f, d, v, z, h);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    transformLine(f, d, v, z, w);
    for (let x = 0; x < w; x++) grid[y * w + x] = d[x];
  }
};

const blurLine = (src, dst, offset, stride, n, r) => {
  const scale = 1 / (2 * r + 1);
  let sum = 0;
  for (let i = 0; i <= r && i < n; i++) sum += src[offset + i * stride];
  for (let i = 0; i < n; i++) {
    dst[offset + i * stride] = sum * scale;
    if (i + r + 1 < n) sum += src[offset + (i + r + 1) * stride];
    if (i - r >= 0) sum -= src[offset + (i - r) * stride];
  }
};

const blurGrid = (grid, w, h, r) => {
  const tmp = new Float32Array(w * h);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < h; y++) blurLine(grid, tmp, y * w, 1, w, r);
    for (let x = 0; x < w; x++) blurLine(tmp, grid, x, w, h, r);
  }
};

const readCoverage = (data, w, h) => {
  const coverage = new Float32Array(w * h);
  let clear = 0;
  for (let i = 0; i < w * h; i++) if (data[i * 4 + 3] < 250) clear++;
  if (clear > w * h * 0.01) {
    for (let i = 0; i < w * h; i++) coverage[i] = data[i * 4 + 3] / 255;
    return coverage;
  }
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const sample = i => {
    r += data[i * 4];
    g += data[i * 4 + 1];
    b += data[i * 4 + 2];
    n++;
  };
  for (let x = 0; x < w; x++) {
    sample(x);
    sample((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    sample(y * w);
    sample(y * w + w - 1);
  }
  r /= n;
  g /= n;
  b /= n;
  for (let i = 0; i < w * h; i++) {
    const diff = Math.max(Math.abs(data[i * 4] - r), Math.abs(data[i * 4 + 1] - g), Math.abs(data[i * 4 + 2] - b));
    coverage[i] = Math.min(1, Math.max(0, (diff - 24) / 48));
  }
  return coverage;
};

const sampleField = (shape, x, y) => {
  const { field, width, height } = shape;
  const cx = Math.min(Math.max(x, 0.5), width - 0.5);
  const cy = Math.min(Math.max(y, 0.5), height - 0.5);
  const x0 = Math.min(Math.floor(cx - 0.5), width - 2);
  const y0 = Math.min(Math.floor(cy - 0.5), height - 2);
  const tx = cx - 0.5 - x0;
  const ty = cy - 0.5 - y0;
  const i = y0 * width + x0;
  const top = field[i] + (field[i + 1] - field[i]) * tx;
  const bottom = field[i + width] + (field[i + width + 1] - field[i + width]) * tx;
  return top + (bottom - top) * ty + Math.hypot(x - cx, y - cy);
};

const traceShape = image => {
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  if (!iw || !ih) return null;
  const fit = RASTER / Math.max(iw, ih);
  const w = Math.max(2, Math.round(iw * fit));
  const h = Math.max(2, Math.round(ih * fit));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, w, h);
  const coverage = readCoverage(ctx.getImageData(0, 0, w, h).data, w, h);

  let left = w;
  let top = h;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (coverage[y * w + x] <= 0.01) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < 0) return null;

  const logoWidth = right - left + 1;
  const logoHeight = bottom - top + 1;
  const pad = Math.ceil(Math.max(logoWidth, logoHeight) * 0.25) + 2;
  const width = logoWidth + pad * 2;
  const height = logoHeight + pad * 2;
  const outer = new Float32Array(width * height);
  const inner = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = x - pad + left;
      const sy = y - pad + top;
      const a = sx >= 0 && sy >= 0 && sx < w && sy < h ? coverage[sy * w + sx] : 0;
      const i = y * width + x;
      if (a >= 1) {
        outer[i] = 0;
        inner[i] = FAR;
      } else if (a <= 0) {
        outer[i] = FAR;
        inner[i] = 0;
      } else {
        const e = 0.5 - a;
        outer[i] = e > 0 ? e * e : 0;
        inner[i] = e < 0 ? e * e : 0;
      }
    }
  }
  transformGrid(outer, width, height);
  transformGrid(inner, width, height);

  const field = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) field[i] = Math.sqrt(outer[i]) - Math.sqrt(inner[i]);

  const points = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const d = field[i];
      if (d > 0) continue;
      if (field[i - 1] <= 0 && field[i + 1] <= 0 && field[i - width] <= 0 && field[i + width] <= 0) continue;
      const gx = field[i + 1] - field[i - 1];
      const gy = field[i + width] - field[i - width];
      const len = Math.hypot(gx, gy) || 1;
      points.push(x + 0.5 - (d * gx) / len, y + 0.5 - (d * gy) / len);
    }
  }
  const stride = Math.max(1, Math.ceil(points.length / 2 / 3000)) * 2;
  const edges = [];
  for (let i = 0; i < points.length; i += stride) edges.push(points[i], points[i + 1]);

  const size = Math.max(logoWidth, logoHeight);
  const glowPad = Math.ceil((size * 0.7) / CELL);
  const glowWidth = Math.ceil(logoWidth / CELL) + glowPad * 2;
  const glowHeight = Math.ceil(logoHeight / CELL) + glowPad * 2;
  const tight = new Float32Array(glowWidth * glowHeight);
  for (let y = 0; y < height; y++) {
    const gy = Math.floor((y - pad) / CELL) + glowPad;
    for (let x = 0; x < width; x++) {
      const gx = Math.floor((x - pad) / CELL) + glowPad;
      tight[gy * glowWidth + gx] += Math.exp(-Math.abs(field[y * width + x]) / 1.5) / (CELL * CELL);
    }
  }
  const wide = tight.slice();
  const tightRadius = Math.max(1, Math.round((size * 0.035) / CELL));
  const wideRadius = Math.max(2, Math.round((size * 0.13) / CELL));
  blurGrid(tight, glowWidth, glowHeight, tightRadius);
  blurGrid(wide, glowWidth, glowHeight, wideRadius);
  const tightNorm = (Math.sqrt(2 * Math.PI * (tightRadius * tightRadius + tightRadius)) * CELL) / 3;
  const wideNorm = (Math.sqrt(2 * Math.PI * (wideRadius * wideRadius + wideRadius)) * CELL) / 3;
  const glow = new Float32Array(glowWidth * glowHeight * 2);
  for (let i = 0; i < glowWidth * glowHeight; i++) {
    glow[i * 2] = tight[i] * tightNorm;
    glow[i * 2 + 1] = wide[i] * wideNorm;
  }

  return {
    field,
    edges,
    width,
    height,
    pad,
    logoWidth,
    logoHeight,
    glow,
    glowWidth,
    glowHeight,
    glowOffset: pad - glowPad * CELL
  };
};

const spawnArc = (shape, time, focus) => {
  const { edges, logoWidth, logoHeight } = shape;
  const count = edges.length / 2;
  if (count < 2) return null;
  const size = Math.max(logoWidth, logoHeight);
  let i = Math.floor(Math.random() * count);
  if (focus) {
    let found = false;
    for (let attempt = 0; attempt < 40 && !found; attempt++) {
      const j = Math.floor(Math.random() * count);
      if (Math.hypot(edges[j * 2] - focus.x, edges[j * 2 + 1] - focus.y) < focus.radius) {
        i = j;
        found = true;
      }
    }
    if (!found) return null;
  }
  const ax = edges[i * 2];
  const ay = edges[i * 2 + 1];
  for (let attempt = 0; attempt < 24; attempt++) {
    const j = Math.floor(Math.random() * count);
    const bx = edges[j * 2];
    const by = edges[j * 2 + 1];
    const len = Math.hypot(bx - ax, by - ay);
    if (len < size * 0.08 || len > size * 0.3) continue;
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    const bow = len * (0.2 + Math.random() * 0.3);
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const left = sampleField(shape, mx + nx * bow, my + ny * bow);
    const right = sampleField(shape, mx - nx * bow, my - ny * bow);
    if (Math.max(left, right) <= 0) continue;
    return {
      ax,
      ay,
      bx,
      by,
      bow: left >= right ? bow : -bow,
      seed: 1 + Math.random() * 60,
      born: time,
      life: 0.35 + Math.random() * 0.45
    };
  }
  return null;
};

const vertex = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
precision highp int;

uniform sampler2D tFieldFrom;
uniform sampler2D tGlowFrom;
uniform sampler2D tFieldTo;
uniform sampler2D tGlowTo;
uniform vec4 uMapFrom;
uniform vec4 uSizeFrom;
uniform vec4 uMapTo;
uniform vec4 uSizeTo;
uniform float uMorph;
uniform vec2 uResolution;
uniform float uUnit;
uniform float uTime;
uniform float uPresence;
uniform vec3 uHover;
uniform float uHoverRadius;
uniform vec4 uPulses[${PULSES}];
uniform float uPulseBoost;
uniform float uFlash;
uniform vec3 uColor;
uniform vec3 uGlowColor;
uniform float uIntensity;
uniform float uGlow;
uniform float uThickness;
uniform float uStrands;
uniform float uBend;
uniform float uCrackle;
uniform float uFlicker;
uniform float uFill;
uniform float uInk;
uniform vec4 uArcEnds[${ARCS}];
uniform vec4 uArcShape[${ARCS}];

in vec2 vUv;
out vec4 fragColor;

uint scramble(uint x) {
  x ^= x >> 16u;
  x *= 0x7feb352du;
  x ^= x >> 15u;
  x *= 0x846ca68bu;
  x ^= x >> 16u;
  return x;
}

float fieldAt(sampler2D tex, vec4 map, vec4 size, vec2 p) {
  vec2 f = (p - map.xy) / map.z;
  vec2 c = clamp(f, vec2(0.5), size.xy - 0.5);
  return (textureLod(tex, c / size.xy, 0.0).r + length(f - c)) * map.z;
}

vec2 glowAt(sampler2D tex, vec4 map, vec4 size, vec2 p) {
  vec2 f = (p - map.xy) / map.z - map.w;
  return textureLod(tex, f / (size.zw * ${CELL}.0), 0.0).rg;
}

float shape(vec2 p, float k) {
  float to = fieldAt(tFieldTo, uMapTo, uSizeTo, p);
  if (k >= 1.0) return to;
  return mix(fieldAt(tFieldFrom, uMapFrom, uSizeFrom, p), to, k);
}

vec2 aura(vec2 p, float k) {
  vec2 to = glowAt(tGlowTo, uMapTo, uSizeTo, p);
  if (k >= 1.0) return to;
  return mix(glowAt(tGlowFrom, uMapFrom, uSizeFrom, p), to, k);
}

vec4 corner(ivec2 c, uint seed) {
  uint h = scramble(uint(c.x) * 0x8da6b343u + uint(c.y) * 0xd8163841u + seed * 0xcb1ab31fu);
  return vec4(uvec4(h, h >> 8u, h >> 16u, h >> 24u) & 255u) / 127.5 - 1.0;
}

vec2 drift(vec2 p, uint seed, out mat2 jac) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  ivec2 c = ivec2(i);
  vec4 ga = corner(c, seed);
  vec4 gb = corner(c + ivec2(1, 0), seed);
  vec4 gc = corner(c + ivec2(0, 1), seed);
  vec4 gd = corner(c + ivec2(1, 1), seed);
  vec2 fb = f - vec2(1.0, 0.0);
  vec2 fc = f - vec2(0.0, 1.0);
  vec2 fd = f - vec2(1.0);
  vec2 va = vec2(dot(ga.xy, f), dot(ga.zw, f));
  vec2 vb = vec2(dot(gb.xy, fb), dot(gb.zw, fb));
  vec2 vc = vec2(dot(gc.xy, fc), dot(gc.zw, fc));
  vec2 vd = vec2(dot(gd.xy, fd), dot(gd.zw, fd));
  vec2 k = va - vb - vc + vd;
  vec4 g = ga + u.x * (gb - ga) + u.y * (gc - ga) + u.x * u.y * (ga - gb - gc + gd);
  jac = mat2(
    g.xy + du * (u.yx * k.x + vec2(vb.x - va.x, vc.x - va.x)),
    g.zw + du * (u.yx * k.y + vec2(vb.y - va.y, vc.y - va.y))
  );
  return va + u.x * (vb - va) + u.y * (vc - va) + u.x * u.y * k;
}

float wobble(vec2 p, uint seed) {
  mat2 jac;
  return drift(p, seed, jac).x;
}

vec2 ripple(vec2 p, out float surge) {
  vec2 push = vec2(0.0);
  surge = 0.0;
  float width = uUnit * 10.0;
  for (int i = 0; i < ${PULSES}; i++) {
    vec4 pulse = uPulses[i];
    if (pulse.w <= 0.0) continue;
    vec2 d = p - pulse.xy;
    float dist = length(d);
    float front = (dist - pulse.z * uUnit * 150.0) / width;
    float env = exp(-front * front) * pulse.w * exp(-pulse.z * 1.7) * smoothstep(0.0, uUnit * 8.0, dist);
    push += d / max(dist, 1.0) * env * cos(front * 2.2) * uUnit * 7.5;
    surge += env;
  }
  return push;
}

vec2 wander(vec2 p, float t, uint seed, float reachScale, out mat2 jac, out vec2 sway) {
  vec2 q = p / uUnit;
  mat2 ja;
  mat2 jb;
  mat2 jc;
  mat2 jd;
  vec2 a = drift(q * 0.028 + vec2(t * 0.29, t * 0.21), seed, ja);
  vec2 b = drift(q * 0.085 + a * 0.4 + vec2(t * 0.83, -t * 0.61) + 17.0, seed + 1u, jb);
  vec2 c = drift(p / 9.0 + b * 0.6 + vec2(t * 1.9, t * 1.3) + 5.0, seed + 2u, jc);
  vec2 d = drift(p / 4.1 + vec2(-t * 2.7, t * 2.2) + 11.0, seed + 3u, jd);
  float bendAmp = uBend * 8.0 * reachScale;
  float rippleAmp = uBend * 3.2 * reachScale;
  float crinkleAmp = uCrackle * 1.5 * reachScale;
  jac = ja * (0.028 * bendAmp) + jb * (0.085 * rippleAmp) + jc * (crinkleAmp / 9.0) + jd * (crinkleAmp * 0.35 / 4.1);
  sway = (a * bendAmp + b * rippleAmp) * uUnit;
  return sway + (c + d * 0.35) * crinkleAmp;
}

vec2 glowShape(float line, float spread, float w) {
  float x = abs(line);
  float y = abs(spread);
  return vec2(exp(-x * x / (w * w * 0.5)) + exp(-y / (w * 2.2)) * 0.6, exp(-y / (w * 4.5)) * 0.5);
}

void addArc(vec2 p, vec4 ends, vec4 info, float t, inout vec3 light, inout float energy, inout float hot) {
  if (info.y < 0.002) return;
  vec2 ab = ends.zw - ends.xy;
  float len = max(length(ab), 1.0);
  vec2 dir = ab / len;
  vec2 rel = p - ends.xy;
  float s = dot(rel, dir);
  float h = dot(rel, vec2(-dir.y, dir.x));
  float margin = abs(info.x) + uCrackle * (2.0 + len * 0.08) + uThickness * 12.0 + 10.0;
  if (s < -margin || s > len + margin || abs(h) > margin) return;
  float u = clamp(s / len, 0.0, 1.0);
  float taper = sin(3.14159265 * u);
  float bendSlope = s > 0.0 && s < len ? 3.14159265 / len * cos(3.14159265 * u) : 0.0;
  float beyond = max(-s, 0.0) + max(s - len, 0.0);
  for (int c = 0; c < 2; c++) {
    uint seed = uint(info.z * 131.0) + uint(c) * 29u + 7u;
    float jag = 0.0;
    float jagSlope = 0.0;
    float wave = max(len * 0.3, 14.0);
    float weight = uCrackle * (1.5 + len * 0.05) * (c == 0 ? 1.0 : 1.5);
    for (int o = 0; o < 3; o++) {
      mat2 jac;
      float n = drift(vec2(s / wave + info.z * 3.0, t * (1.4 + float(o) * 1.1)), seed + uint(o), jac).x;
      jag += n * weight;
      jagSlope += jac[0].x * weight / wave;
      wave *= 0.42;
      weight *= 0.4;
    }
    float offset = (info.x + jag) * taper;
    float offsetSlope = (info.x + jag) * bendSlope + jagSlope * taper;
    float across = (h - offset) / sqrt(1.0 + offsetSlope * offsetSlope);
    float gap = length(vec2(beyond, across));
    float w = uThickness * (c == 0 ? 0.9 : 0.6);
    vec2 g = glowShape(gap, gap, w);
    float k = info.y * (c == 0 ? 1.0 : 0.45);
    light += (uColor * g.x + uGlowColor * g.y * uGlow) * k;
    energy += (g.x + g.y * uGlow) * k;
    hot += exp(-gap * gap / (w * w * 0.16)) * k * (c == 0 ? 1.0 : 0.0);
  }
}

void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uResolution;
  float t = uTime;
  vec3 light = vec3(0.0);
  float energy = 0.0;
  float hot = 0.0;

  float surge;
  vec2 pr = p - ripple(p, surge);
  float k = uMorph >= 1.0 ? 1.0 : smoothstep(0.0, 1.0, clamp(uMorph * 1.7 - 0.35 + 0.35 * wobble(p / uUnit * 0.018, 41u), 0.0, 1.0));
  float transit = uMorph >= 1.0 ? 0.0 : sin(3.14159265 * uMorph);
  float base = shape(pr, k);

  vec2 toHover = p - uHover.xy;
  float heat = min(uHover.z * exp(-dot(toHover, toHover) / (uHoverRadius * uHoverRadius)) + surge * 1.4 + transit * 0.5, 2.0);
  float heatCap = min(uHover.z + uPulseBoost * 1.4 + transit * 0.5, 2.0);
  float breath = 1.0 + uFlicker * 0.6 * wobble(vec2(t * 2.1, 7.0), 3u);
  float grow = uPresence;

  float edge = abs(base);
  vec2 halo = aura(pr, k);
  float ink = uInk;
  float bloom = (halo.x * 0.16 + halo.y * 0.08) * (1.0 - ink * 0.65) * uGlow * (1.0 + heat * 1.2);
  float body = smoothstep(0.75, -0.75, base) * uFill * (0.06 + 1.2 * min(halo.x, 1.0)) * (1.0 + heat * 0.5);
  light += uGlowColor * bloom * grow * grow;
  energy += bloom * grow * grow;

  float reachScale = mix(0.15, 1.0, grow) * (1.0 + heat * 0.9);
  float reach = (uUnit * uBend * 16.0 + uCrackle * 3.0) * (1.0 + heatCap * 0.9) + uThickness * 20.0 + 8.0;
  if (edge < reach && grow > 0.0) {
    float fade = smoothstep(reach, reach * 0.55, edge);
    vec2 q = pr / uUnit;
    float count = min(uStrands + heat * 2.5, 6.0);
    float limit = min(uStrands + heatCap * 2.5, 6.0);
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      if (fi >= limit) break;
      float present = clamp(count - fi, 0.0, 1.0);
      if (present <= 0.0) continue;
      uint seed = uint(i) * 7u + 3u;
      mat2 jac;
      vec2 sway;
      float lead = i == 0 ? 1.0 : 0.0;
      vec2 warped = pr + wander(pr, t * (1.0 + fi * 0.19), seed, reachScale * mix(0.6 + fi * 0.2, 0.7, lead), jac, sway);
      float dw = shape(warped, k);
      vec2 slope = vec2(shape(warped + vec2(1.0, 0.0), k), shape(warped + vec2(0.0, 1.0), k)) - dw;
      float d = dw / max(length(slope + jac * slope), 0.3);
      float spread = shape(pr + sway, k);
      float swell = 0.5 + 0.5 * wobble(q * 0.06 + vec2(t * 0.9, fi * 5.1 - t * 0.6), seed + 8u);
      float w = uThickness * mix(0.5, 1.0, lead) * (0.5 + swell);
      float vis = mix(0.3 + 0.45 * smoothstep(-0.25, 0.2, wobble(q * 0.035 + vec2(t * 0.21, fi * 3.7), seed + 5u)), 1.0, lead);
      float spark = 1.0 - uFlicker * 0.3 * (0.5 + 0.5 * wobble(vec2(t * 6.0, fi * 2.3), seed + 6u));
      float weight = max(vis, heat * 0.85) * spark * fade * present * (0.7 + 0.6 * swell);
      vec2 g = glowShape(d, spread, w) * weight;
      float soft = mix(1.0, mix(0.5, 1.0, lead), ink);
      vec3 stroke = mix(uColor, uGlowColor, ink * (1.0 - lead) * 0.65);
      float haze = uGlow * (1.0 + heat) * (1.0 - ink * 0.7);
      light += stroke * g.x * soft + uGlowColor * g.y * haze;
      energy += g.x * soft + g.y * haze;
      hot += exp(-d * d / (w * w * 0.16)) * lead * weight;
    }
    light *= grow;
    energy *= grow;
  }

  for (int i = 0; i < ${ARCS}; i++) addArc(pr, uArcEnds[i], uArcShape[i], t, light, energy, hot);

  float gain = uIntensity * breath * (1.0 + heat * 0.45) * (1.0 + uFlash * 0.3) * 1.4;
  float alpha = 1.0 - exp(-energy * gain);
  vec3 color = mix(1.0 - exp(-light * gain), alpha * light / max(energy, 1e-4), ink);
  color = mix(color, vec3(alpha), clamp(hot * grow, 0.0, 1.0) * ink * 0.85);
  float tint = (1.0 - exp(-body * gain * 1.2)) * grow * grow * (1.0 - ink * 0.82);
  color += uGlowColor * tint * (1.0 - alpha);
  alpha += tint * (1.0 - alpha);
  float grain = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  alpha = clamp(alpha + grain, 0.0, 1.0);
  fragColor = vec4(clamp(color + grain, 0.0, alpha), alpha);
}
`;

function electricMask(){const c=document.createElement('canvas');c.width=c.height=360;const x=c.getContext('2d');x.translate(180,180);x.scale(360,360);x.strokeStyle='#fff';x.lineCap='round';x.lineJoin='round';x.lineWidth=.024;x.beginPath();x.arc(0,0,.35,-.19,Math.PI*2-.95);x.stroke();x.lineWidth=.028;x.beginPath();x.moveTo(-.19,.105);x.bezierCurveTo(-.14,.10,-.13,-.035,-.095,.005);x.bezierCurveTo(-.04,.07,.005,.04,.065,-.055);x.bezierCurveTo(.11,-.1,.15,-.10,.175,-.155);x.stroke();x.lineWidth=.025;[-.18,-.10,-.02,.06,.14].forEach((v,i)=>{x.beginPath();x.moveTo(v,[.133,.067,.094,0,-.052][i]);x.lineTo(v,.17);x.stroke()});return c}

 const settingsRef={current:{color:'#5c50a1',glowColor:'#9b8bcf',scale:.79,intensity:.82,glow:.68,thickness:1.05,strands:2,bend:.24,crackle:.42,arcs:.22,flicker:.10,fill:.035,speed:.85,interactive:false,cursorIntensity:0,cursorRadius:80,theme:'light',onRender:()=>{if(uniforms.uPresence.value>.45)container.parentElement.classList.add('electric-ready')}}},shapeRef={current:traceShape(electricMask())};
    const renderer = new Renderer({
      dpr: Math.min(window.devicePixelRatio || 1, 1.25),
      alpha: true,
      premultipliedAlpha: true,
      antialias: false
    });
    const gl = renderer.gl;
    if (!renderer.isWebgl2) {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return undefined;
    }
    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    const makeSlot = () => ({
      shape: null,
      field: new Texture(gl, {
        image: new Float32Array([1000]),
        width: 1,
        height: 1,
        internalFormat: gl.R16F,
        format: gl.RED,
        type: gl.FLOAT,
        minFilter: gl.LINEAR,
        magFilter: gl.LINEAR,
        generateMipmaps: false,
        flipY: false,
        unpackAlignment: 1
      }),
      glow: new Texture(gl, {
        image: new Float32Array([0, 0]),
        width: 1,
        height: 1,
        internalFormat: gl.RG16F,
        format: gl.RG,
        type: gl.FLOAT,
        minFilter: gl.LINEAR,
        magFilter: gl.LINEAR,
        generateMipmaps: false,
        flipY: false,
        unpackAlignment: 1
      })
    });
    const slots = [makeSlot(), makeSlot()];

    const arcEnds = Array.from({ length: ARCS * 4 }, () => 0);
    const arcShape = Array.from({ length: ARCS * 4 }, () => 0);
    const pulseData = Array.from({ length: PULSES * 4 }, () => 0);
    const uniforms = {
      tFieldFrom: { value: slots[1].field },
      tGlowFrom: { value: slots[1].glow },
      tFieldTo: { value: slots[0].field },
      tGlowTo: { value: slots[0].glow },
      uMapFrom: { value: [0, 0, 1, 0] },
      uSizeFrom: { value: [1, 1, 1, 1] },
      uMapTo: { value: [0, 0, 1, 0] },
      uSizeTo: { value: [1, 1, 1, 1] },
      uMorph: { value: 1 },
      uResolution: { value: [1, 1] },
      uUnit: { value: 1 },
      uTime: { value: 0 },
      uPresence: { value: 0 },
      uHover: { value: [0, 0, 0] },
      uHoverRadius: { value: 120 },
      uPulses: { value: pulseData },
      uPulseBoost: { value: 0 },
      uFlash: { value: 0 },
      uColor: { value: [1, 1, 1] },
      uGlowColor: { value: [0.43, 0.48, 1] },
      uIntensity: { value: 1 },
      uGlow: { value: 1 },
      uThickness: { value: 1.8 },
      uStrands: { value: 3 },
      uBend: { value: 1 },
      uCrackle: { value: 1 },
      uFlicker: { value: 0.4 },
      uFill: { value: 0.5 },
      uInk: { value: 0 },
      uArcEnds: { value: arcEnds },
      uArcShape: { value: arcShape }
    };
    const mesh = new Mesh(gl, {
      geometry: new Triangle(gl),
      program: new Program(gl, { vertex, fragment, uniforms, depthTest: false, depthWrite: false })
    });

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const pointer = { x: 0, y: 0, over: false };
    const hover = { x: 0, y: 0, vx: 0, vy: 0, power: 0 };
    const sparks = [];
    const pulses = [];
    let target = 0;
    let pending = null;
    let morph = 1;
    let burst = null;
    let progress = 0; let shapeStarted=0;
    let ink = 0;
    const hues = [
      [1, 1, 1],
      [1, 1, 1]
    ];
    let settled = false;
    let time = 0;
    let width = 1;
    let height = 1;
    let raf = 0;
    let last = performance.now();
    let visible = true;

    const load = (slot, next) => {
      slot.shape = next;
      slot.field.image = next.field;
      slot.field.width = next.width;
      slot.field.height = next.height;
      slot.field.needsUpdate = true;
      slot.glow.image = next.glow;
      slot.glow.width = next.glowWidth;
      slot.glow.height = next.glowHeight;
      slot.glow.needsUpdate = true;
    };

    const place = (shape, s) => {
      const fit = Math.max(1e-4, Math.min((width * s.scale) / shape.logoWidth, (height * s.scale) / shape.logoHeight));
      return {
        fit,
        ox: width / 2 - (shape.pad + shape.logoWidth / 2) * fit,
        oy: height / 2 - (shape.pad + shape.logoHeight / 2) * fit,
        unit: (Math.max(shape.logoWidth, shape.logoHeight) * fit) / 100
      };
    };

    let resizePending = false;
    const applyResize = () => {
      width = Math.max(1, container.clientWidth);
      height = Math.max(1, container.clientHeight);
      renderer.dpr = Math.min(window.devicePixelRatio || 1, 1.25, Math.sqrt(PIXEL_BUDGET / (width * height)));
      renderer.setSize(width, height);
      uniforms.uResolution.value = [width, height];
    };

    const resize = () => {
      resizePending = true;
      start();
    };

    const frame = now => {
      raf = 0;
      if (resizePending) {
        resizePending = false;
        applyResize();
      }
      const s = settingsRef.current;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;

      const incoming = shapeRef.current;
      if (incoming && incoming !== slots[target].shape) pending = incoming;
      if (pending && morph >= 1) {
        if (slots[target].shape) {
          target = 1 - target;
          morph = 0;
          sparks.length = 0;
        }
        load(slots[target], pending);
        pending = null;
      }
      if (morph < 1) morph = Math.min(1, morph + dt / (pending ? 0.3 : 1.6));

      const to = slots[target].shape;
      const from = morph < 1 ? slots[1 - target].shape : null;
      if(to){if(!shapeStarted)shapeStarted=now;progress=Math.min(1,(now-shapeStarted)/950)}
      const presence = progress * progress * (3 - 2 * progress);

      if (to && s) {
        const near = place(to, s);
        const far = from ? place(from, s) : near;
        const blend = morph * morph * (3 - 2 * morph);
        const unit = far.unit + (near.unit - far.unit) * blend;

        const engaged = s.interactive && pointer.over;
        if (engaged && hover.power < 0.01) {
          hover.x = pointer.x;
          hover.y = pointer.y;
          hover.vx = 0;
          hover.vy = 0;
        }
        hover.vx += ((pointer.x - hover.x) * 120 - hover.vx * 19) * dt;
        hover.vy += ((pointer.y - hover.y) * 120 - hover.vy * 19) * dt;
        hover.x += hover.vx * dt;
        hover.y += hover.vy * dt;
        hover.power += ((engaged ? 1 : 0) - hover.power) * (1 - Math.exp(-dt / (engaged ? 0.3 : 0.55)));

        const motion = reducedMotion ? 0.2 : 1;
        time += dt * s.speed * motion;

        for (let i = sparks.length - 1; i >= 0; i--) {
          if (time - sparks[i].born > sparks[i].life) sparks.splice(i, 1);
        }
        const focus = spot => ({
          x: (spot.x - near.ox) / near.fit,
          y: (spot.y - near.oy) / near.fit,
          radius: Math.max(1, s.cursorRadius) / near.fit
        });
        if (burst && morph >= 1 && s.arcs > 0) {
          for (let i = 0; i < 3 && sparks.length < ARCS; i++) {
            const spark = spawnArc(to, time, focus(burst));
            if (spark) sparks.push(spark);
          }
        }
        burst = null;
        if (!reducedMotion && presence > 0.8 && morph >= 1 && sparks.length < ARCS) {
          const chance = dt * s.speed * s.arcs;
          if (Math.random() < chance * 6 * hover.power * s.cursorIntensity) {
            const spark = spawnArc(to, time, focus(hover));
            if (spark) sparks.push(spark);
          } else if (Math.random() < chance * 2.2) {
            const spark = spawnArc(to, time, null);
            if (spark) sparks.push(spark);
          }
        }

        for (let i = 0; i < ARCS; i++) {
          const o = i * 4;
          const spark = sparks[i];
          if (!spark) {
            arcShape[o + 1] = 0;
            continue;
          }
          const k = (time - spark.born) / spark.life;
          arcEnds[o] = near.ox + spark.ax * near.fit;
          arcEnds[o + 1] = near.oy + spark.ay * near.fit;
          arcEnds[o + 2] = near.ox + spark.bx * near.fit;
          arcEnds[o + 3] = near.oy + spark.by * near.fit;
          arcShape[o] = spark.bow * near.fit;
          arcShape[o + 1] = Math.sin(Math.PI * Math.min(1, Math.max(0, k))) * presence;
          arcShape[o + 2] = spark.seed;
        }

        let boost = 0;
        let flash = 0;
        for (let i = pulses.length - 1; i >= 0; i--) {
          if ((now - pulses[i].born) / 1000 > 2) pulses.splice(i, 1);
        }
        for (let i = 0; i < PULSES; i++) {
          const o = i * 4;
          const pulse = pulses[i];
          if (!pulse) {
            pulseData[o + 3] = 0;
            continue;
          }
          const age = (now - pulse.born) / 1000;
          pulseData[o] = pulse.x;
          pulseData[o + 1] = pulse.y;
          pulseData[o + 2] = age;
          pulseData[o + 3] = 1;
          boost = Math.max(boost, Math.exp(-age * 1.7));
          flash += Math.exp(-age * 7);
        }

        const fromSlot = slots[1 - target];
        uniforms.tFieldTo.value = slots[target].field;
        uniforms.tGlowTo.value = slots[target].glow;
        uniforms.tFieldFrom.value = fromSlot.field;
        uniforms.tGlowFrom.value = fromSlot.glow;
        uniforms.uMapTo.value = [near.ox, near.oy, near.fit, to.glowOffset];
        uniforms.uSizeTo.value = [to.width, to.height, to.glowWidth, to.glowHeight];
        if (from) {
          uniforms.uMapFrom.value = [far.ox, far.oy, far.fit, from.glowOffset];
          uniforms.uSizeFrom.value = [from.width, from.height, from.glowWidth, from.glowHeight];
        }
        uniforms.uMorph.value = morph;
        uniforms.uUnit.value = unit;
        uniforms.uTime.value = time;
        uniforms.uPresence.value = presence;
        uniforms.uHover.value = [hover.x, hover.y, hover.power * Math.max(0, s.cursorIntensity)];
        uniforms.uHoverRadius.value = Math.max(1, s.cursorRadius);
        uniforms.uPulseBoost.value = boost;
        uniforms.uFlash.value = flash;
        const targets = [hexToRgb(s.color), hexToRgb(s.glowColor)];
        const shift = settled ? 1 - Math.exp(-dt / 0.35) : 1;
        settled = true;
        for (let i = 0; i < 2; i++) {
          for (let c = 0; c < 3; c++) hues[i][c] += (targets[i][c] - hues[i][c]) * shift;
        }
        uniforms.uColor.value = hues[0].slice();
        uniforms.uGlowColor.value = hues[1].slice();
        uniforms.uIntensity.value = s.intensity;
        uniforms.uGlow.value = s.glow;
        uniforms.uThickness.value = s.thickness;
        uniforms.uStrands.value = Math.max(1, Math.min(6, Math.round(s.strands)));
        uniforms.uBend.value = s.bend;
        uniforms.uCrackle.value = s.crackle;
        uniforms.uFlicker.value = reducedMotion ? 0 : s.flicker;
        ink += ((s.theme === 'light' ? 1 : 0) - ink) * (1 - Math.exp(-dt / 0.25));
        uniforms.uFill.value = s.fill;
        uniforms.uInk.value = ink;
        renderer.render({ scene: mesh });
        s.onRender?.(canvas);
      }

      if (visible) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (raf || !visible) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const onMove = e => {
      const rect = container.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.over = true;
    };
    const onDown = e => {
      onMove(e);
      if (!settingsRef.current?.interactive || reducedMotion) return;
      pulses.push({ x: pointer.x, y: pointer.y, born: performance.now() });
      if (pulses.length > PULSES) pulses.shift();
      burst = { x: pointer.x, y: pointer.y };
    };
    const onLeave = () => {
      pointer.over = false;
    };
    container.addEventListener('pointermove', onMove);
    container.addEventListener('pointerdown', onDown);
    container.addEventListener('pointerleave', onLeave);
    container.addEventListener('pointercancel', onLeave);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    });
    intersectionObserver.observe(container);

    resize();
    start();
    addEventListener('pagehide',()=>cleanup(),{once:true});

    const cleanup = () => {
      visible = false;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      container.removeEventListener('pointermove', onMove);
      container.removeEventListener('pointerdown', onDown);
      container.removeEventListener('pointerleave', onLeave);
      container.removeEventListener('pointercancel', onLeave);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };

 }catch(error){container.parentElement.classList.remove('electric-ready');container.textContent='';container.dataset.fallback='static';console.info('Electric logo: static fallback enabled.')}}
installElectricIntro();

function installBrandIntro(){
 const overlay=$('brandIntro'),mark=$('introMark'),brand=$('brandReplay'),skip=$('introSkip'),main=document.querySelector('main');let autoTimer=null,finishTimer=null,flight=null,playing=false,leaving=false,previous=null,replayMode=false;
 function remember(){try{sessionStorage.setItem('dca-intro-v391','seen')}catch{}}
 function close(){clearTimeout(autoTimer);clearTimeout(finishTimer);flight?.cancel();flight=null;overlay.hidden=true;overlay.classList.remove('is-playing','is-leaving');document.body.classList.remove('intro-active','intro-leaving');main.inert=false;playing=false;leaving=false;remember();if(previous&&document.contains(previous)&&previous!==document.body&&!overlay.contains(previous))previous.focus({preventScroll:true});else brand.focus({preventScroll:true})}
 function finish(immediate=false){if(!playing)return;if(leaving){if(immediate)close();return;}clearTimeout(autoTimer);if(immediate||matchMedia('(prefers-reduced-motion: reduce)').matches){close();return}leaving=true;document.body.classList.add('intro-leaving');overlay.classList.add('is-leaving');let a=mark.getBoundingClientRect(),b=brand.getBoundingClientRect(),dx=b.x+b.width/2-(a.x+a.width/2),dy=b.y+b.height/2-(a.y+a.height/2);let matrix=getComputedStyle(main).transform,lift=matrix.startsWith('matrix(')?parseFloat(matrix.split(',')[5])||0:0;dy-=lift;finishTimer=setTimeout(close,800);if(typeof mark.animate==='function'){try{flight=mark.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${dx}px,${dy}px) scale(${b.width/a.width})`,opacity:1}],{duration:650,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});flight.finished.then(close).catch(()=>{})}catch{close()}}}
 function start(manualReplay=false){if(playing)return;if(!manualReplay&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;replayMode=manualReplay;overlay.dataset.replay=manualReplay?'manual':'auto';$('introContinue').hidden=!manualReplay;previous=document.activeElement;playing=true;leaving=false;overlay.hidden=false;main.inert=true;document.body.style.setProperty('--intro-scrollbar',Math.max(0,window.innerWidth-document.documentElement.clientWidth)+'px');document.body.classList.add('intro-active');overlay.classList.remove('is-playing','is-leaving');void overlay.offsetWidth;overlay.classList.add('is-playing');skip.focus({preventScroll:true});if(!manualReplay)autoTimer=setTimeout(()=>finish(),3500)}
 brand.onclick=()=>start(true);overlay.addEventListener('click',e=>{if(replayMode&&playing&&e.target!==skip)finish()});skip.onclick=()=>finish(true);document.addEventListener('keydown',e=>{if(!playing)return;if(replayMode&&['Enter',' '].includes(e.key)){e.preventDefault();finish();return}if(e.key==='Escape'){e.preventDefault();finish(true)}if(e.key==='Tab'){e.preventDefault();skip.focus({preventScroll:true})}});document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing&&!replayMode)finish(true)});let seen=false;try{seen=sessionStorage.getItem('dca-intro-v391')==='seen'}catch{}if(!seen)start();
}
installBrandIntro();

// COMEX Gold continuous/main quote, separate from the RMB DCA research assets.
function marketParseGold(payload,now=new Date().toISOString()){const d=payload?.data;if(payload?.rc!==0||d?.code!=='GC00Y'||Number(d.market)!==101)throw Error('COMEX quote unavailable');const previous=Number(d.preSettlement||d.preClose),rows=d.trends||[],date=String(rows[0]||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(previous)||previous<=0)throw Error('Invalid COMEX reference');const points=rows.map(row=>String(row).split(',')).filter(a=>/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(a[0])&&Number.isFinite(Number(a[2]))&&Number(a[2])>0).map(a=>[a[0].slice(11).replace(':',''),Number(a[2])]);if(points.length<2)throw Error('Insufficient COMEX intraday data');return{code:'GC00Y',date,points,previous,quoteTime:new Date(Number(d.time)*1000).toLocaleString('sv-SE',{timeZone:'Asia/Shanghai',hour12:false})+'（北京时间）',fetchedAt:now,basis:'前结算价',unit:'美元/盎司',source:'东方财富 COMEX黄金主连'}}
function marketTimeline(points){let offset=0,last=-1;return points.map(p=>{const t=marketMinutes(p[0]);if(last>=0&&t<last)offset+=1440;last=t;return t+offset})}
function marketEndLabel(a){const p=a.points.at(-1)[0],times=marketTimeline(a.points),days=Math.floor(times.at(-1)/1440)-Math.floor(times[0]/1440);return p.slice(0,2)+':'+p.slice(2)+(days?' +'+days:'')}

// Calendar-date based session coordinates. Prices are never extrapolated.
// Exchange-local time for indices; Beijing time for the COMEX provider.
function marketSession(a){
 const code=a.code,breaks=code==='sh000001'||code==='sz399001'?[[690,780]]:code==='hkHSI'&&!/-(12-24|12-31)$/.test(a.date)?[[720,780]]:[];
 const cutoff=code==='sh000001'||code==='sz399001'?900:code==='hkHSI'?(/-(12-24|12-31)$/.test(a.date)?730:970):code.startsWith('us.')?(['2025-07-03','2025-11-28','2025-12-24','2026-11-27','2026-12-24'].includes(a.date)?780:960):Infinity;
 const points=code==='GC00Y'?a.points:a.points.filter(p=>{const m=marketMinutes(p[0]);return m>=570&&m<=cutoff&&!breaks.some(([from,to])=>m>from&&m<to)});
 const times=marketTimeline(points),first=times[0]??570,last=times.at(-1)??first;
 let open=first,close=last;
 if(code==='sh000001'||code==='sz399001'){open=570;close=900}
 else if(code==='hkHSI'){open=570;close=970;if(/-(12-24|12-31)$/.test(a.date))close=730;}
 else if(code==='us.IXIC'||code==='us.INX'){
  open=570;close=960;
  // Published Nasdaq early closes; do not infer holidays from incomplete data.
  if(['2025-07-03','2025-11-28','2025-12-24','2026-11-27','2026-12-24'].includes(a.date))close=780;
 }else if(code==='GC00Y'){
  const noon=new Date(a.date+'T12:00:00+08:00'),parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'}).formatToParts(noon),nyHour=Number(parts.find(p=>p.type==='hour').value),summer=nyHour===0;
  open=(summer?6:7)*60;close=open+23*60;
  // Provider can return a partial session beginning later; retain real minutes.
  while(first>=close){open+=1440;close+=1440}
 }
 open=Math.min(open,first);close=Math.max(close,last);
 const tradingMinute=m=>m-breaks.reduce((n,[from,to])=>n+Math.max(0,Math.min(m,to)-from),0);
 const clock=m=>String(Math.floor(m%1440/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
 return {open,close,points,times,plotTimes:times.map(tradingMinute),plotOpen:tradingMinute(open),plotClose:tradingMinute(close),breaks,latest:last,startLabel:clock(open),label:clock(close)+(Math.floor(close/1440)>Math.floor(open/1440)?' +1':'')};
}

/* GlowCursor shader adapted from React Bits by David Haz.
 * MIT + Commons Clause. This version follows real quote curves automatically;
 * there are no mouse or pointer emitters. See reactbits-license.txt. */
function createMarketGlow(container,canvas,getSources,active){try{
const VERTEX = `#version 300 es
in vec2 aPosition;
uniform vec2 uTexel;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(uTexel.x, 0.0);
  vR = vUv + vec2(uTexel.x, 0.0);
  vT = vUv + vec2(0.0, uTexel.y);
  vB = vUv - vec2(0.0, uTexel.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const HEADER = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 outColor;
`;

const SPLAT = `${HEADER}
uniform sampler2D uTarget;
uniform float uAspect;
uniform vec2 uA;
uniform vec2 uB;
uniform float uRadius;
uniform float uWide;
uniform vec3 uValue;
uniform float uMode;
uniform float uStrength;
float erf(float x) {
  float x2 = x * x;
  float a = 0.147;
  return sign(x) * sqrt(1.0 - exp(-x2 * (1.2732395 + a * x2) / (1.0 + a * x2)));
}
float sweep(float along, float length, float across, float radius) {
  return exp(-across * across / (radius * radius)) * 0.5 * (erf(along / radius) - erf((along - length) / radius));
}
void main() {
  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  vec2 a = vec2(uA.x * uAspect, uA.y);
  vec2 ab = vec2(uB.x * uAspect, uB.y) - a;
  float len = length(ab);
  vec2 dir = len > 1e-6 ? ab / len : vec2(1.0, 0.0);
  vec2 ap = p - a;
  vec3 base = texture(uTarget, vUv).xyz;
  if (uMode > 1.5) {
    float along = dot(ap, dir);
    float across = dot(ap, vec2(-dir.y, dir.x));
    if (uMode > 2.5) {
      outColor = vec4(mix(base, uValue, sweep(along, len, across, uRadius) * uStrength), 1.0);
      return;
    }
    vec3 add = vec3(uValue.xy * sweep(along, len, across, uRadius), uValue.z * sweep(along, len, across, uWide));
    outColor = vec4(base + add, 1.0);
    return;
  }
  float h = clamp(dot(ap, ab) / max(dot(ab, ab), 1e-9), 0.0, 1.0);
  vec2 d = ap - ab * h;
  float r2 = dot(d, d);
  float falloff = exp(-r2 / (uRadius * uRadius));
  float wide = exp(-r2 / (uWide * uWide));
  vec3 result = uMode > 0.5 ? mix(base, uValue, falloff * uStrength) : base + vec3(uValue.xy * falloff, uValue.z * wide);
  outColor = vec4(result, 1.0);
}`;

const ADVECT = `${HEADER}
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uVelocityTexel;
uniform float uDt;
uniform vec4 uDecay;
void main() {
  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uVelocityTexel;
  outColor = texture(uSource, coord) * uDecay;
}`;

const MACCORMACK = `${HEADER}
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform sampler2D uForward;
uniform sampler2D uBack;
uniform vec2 uVelocityTexel;
uniform vec2 uSourceTexel;
uniform float uDt;
uniform vec4 uDecay;
void main() {
  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uVelocityTexel;
  vec4 forward = texture(uForward, vUv);
  vec4 corrected = forward + 0.5 * (texture(uSource, vUv) - texture(uBack, vUv));
  vec2 base = (floor(coord / uSourceTexel - 0.5) + 0.5) * uSourceTexel;
  vec4 a = texture(uSource, base);
  vec4 b = texture(uSource, base + vec2(uSourceTexel.x, 0.0));
  vec4 c = texture(uSource, base + vec2(0.0, uSourceTexel.y));
  vec4 d = texture(uSource, base + uSourceTexel);
  vec4 low = min(min(a, b), min(c, d));
  vec4 high = max(max(a, b), max(c, d));
  outColor = clamp(corrected, low, high) * uDecay;
}`;

const DIVERGENCE = `${HEADER}
uniform sampler2D uVelocity;
void main() {
  float left = texture(uVelocity, vL).x;
  float right = texture(uVelocity, vR).x;
  float top = texture(uVelocity, vT).y;
  float bottom = texture(uVelocity, vB).y;
  vec2 center = texture(uVelocity, vUv).xy;
  if (vL.x < 0.0) left = -center.x;
  if (vR.x > 1.0) right = -center.x;
  if (vT.y > 1.0) top = -center.y;
  if (vB.y < 0.0) bottom = -center.y;
  outColor = vec4(0.5 * (right - left + top - bottom), 0.0, 0.0, 1.0);
}`;

const SCALE = `${HEADER}
uniform sampler2D uSource;
uniform float uValue;
void main() {
  outColor = texture(uSource, vUv) * uValue;
}`;

const PRESSURE = `${HEADER}
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main() {
  float left = texture(uPressure, vL).x;
  float right = texture(uPressure, vR).x;
  float top = texture(uPressure, vT).x;
  float bottom = texture(uPressure, vB).x;
  float divergence = texture(uDivergence, vUv).x;
  outColor = vec4((left + right + bottom + top - divergence) * 0.25, 0.0, 0.0, 1.0);
}`;

const GRADIENT = `${HEADER}
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main() {
  float left = texture(uPressure, vL).x;
  float right = texture(uPressure, vR).x;
  float top = texture(uPressure, vT).x;
  float bottom = texture(uPressure, vB).x;
  vec2 velocity = texture(uVelocity, vUv).xy - vec2(right - left, top - bottom);
  outColor = vec4(velocity, 0.0, 1.0);
}`;

const SHADE = `
uniform vec3 uColor;
uniform vec3 uSecondary;
uniform float uIntensity;
uniform float uHotspot;
vec3 shade(vec3 dye) {
  float energy = max(dye.x, 0.0);
  float heat = clamp(dye.y, 0.0, energy);
  float gas = max(dye.z, 0.0);
  float fresh = heat / max(energy, 0.0001);
  vec3 tint = mix(uSecondary, uColor, fresh);
  return (tint * energy + uSecondary * gas + vec3(heat * heat * 0.3 * uHotspot)) * uIntensity;
}
`;

const PREFILTER = `${HEADER}${SHADE}
uniform sampler2D uDye;
uniform vec2 uDyeTexel;
void main() {
  vec2 o = uDyeTexel * 0.5;
  vec3 light = shade(texture(uDye, vUv + vec2(-o.x, -o.y)).xyz);
  light += shade(texture(uDye, vUv + vec2(o.x, -o.y)).xyz);
  light += shade(texture(uDye, vUv + vec2(-o.x, o.y)).xyz);
  light += shade(texture(uDye, vUv + vec2(o.x, o.y)).xyz);
  outColor = vec4(light * 0.25, 1.0);
}`;

const DOWN = `${HEADER}
uniform sampler2D uSource;
uniform vec2 uSourceTexel;
void main() {
  vec2 o = uSourceTexel;
  vec3 color = texture(uSource, vUv).rgb * 4.0;
  color += texture(uSource, vUv + vec2(-o.x, -o.y)).rgb;
  color += texture(uSource, vUv + vec2(o.x, -o.y)).rgb;
  color += texture(uSource, vUv + vec2(-o.x, o.y)).rgb;
  color += texture(uSource, vUv + vec2(o.x, o.y)).rgb;
  outColor = vec4(color / 8.0, 1.0);
}`;

const UP = `${HEADER}
uniform sampler2D uSource;
uniform vec2 uSourceTexel;
void main() {
  vec2 o = uSourceTexel;
  vec3 color = texture(uSource, vUv + vec2(-o.x * 2.0, 0.0)).rgb;
  color += texture(uSource, vUv + vec2(o.x * 2.0, 0.0)).rgb;
  color += texture(uSource, vUv + vec2(0.0, -o.y * 2.0)).rgb;
  color += texture(uSource, vUv + vec2(0.0, o.y * 2.0)).rgb;
  color += texture(uSource, vUv + vec2(-o.x, -o.y)).rgb * 2.0;
  color += texture(uSource, vUv + vec2(o.x, -o.y)).rgb * 2.0;
  color += texture(uSource, vUv + vec2(-o.x, o.y)).rgb * 2.0;
  color += texture(uSource, vUv + vec2(o.x, o.y)).rgb * 2.0;
  outColor = vec4(color / 12.0, 1.0);
}`;

const DISPLAY = `${HEADER}${SHADE}
uniform sampler2D uDye;
uniform sampler2D uBloom;
uniform float uGlow;
uniform float uGrain;
uniform float uTime;
uniform float uLight;
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
void main() {
  vec3 dye = texture(uDye, vUv).xyz;
  vec3 light = shade(dye);
  vec3 bloom = texture(uBloom, vUv).rgb * uGlow;
  float edge = smoothstep(0.0, 0.02, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
  float grain = 1.0 + (hash(gl_FragCoord.xy + fract(uTime * 13.7) * 97.0) - 0.5) * uGrain * 2.0;
  if (uLight > 0.5) {
    float energy = max(dye.x, 0.0);
    float heat = clamp(dye.y, 0.0, energy);
    float gas = max(dye.z, 0.0);
    float fresh = heat / max(energy, 0.0001);
    vec3 tint = mix(uSecondary, uColor, fresh);
    float halo = dot(bloom, vec3(0.2126, 0.7152, 0.0722));
    float density = 1.0 - exp(-((energy * 1.1 + gas * 0.8) * uIntensity + halo * 0.25));
    float tone = dot(tint, vec3(0.2126, 0.7152, 0.0722));
    vec3 ink = tint * min(1.0, 0.5 / max(tone, 0.001)) * mix(0.95, 0.72, smoothstep(0.5, 3.0, energy));
    ink = mix(ink, vec3(1.0), clamp(heat * heat * 0.05 * uHotspot, 0.0, 0.45));
    density = clamp(density * grain, 0.0, 1.0) * edge;
    outColor = vec4(ink * density, density);
  } else {
    vec3 color = 1.0 - exp(-(light + bloom) * grain);
    color *= edge;
    outColor = vec4(color, max(color.r, max(color.g, color.b)));
  }
}`;

const QUALITY = {
  low: { sim: 96, dye: 384 },
  medium: { sim: 128, dye: 576 },
  high: { sim: 160, dye: 768 }
};

const PRESSURE_STEPS = 12;
const FLOW = 0.75;
const BLOOM_LEVELS = 5;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const compile = (gl, type, source) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
};

const toHsv = ([r, g, b]) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta > 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
  }
  return [(hue * 60 + 360) % 360, max > 0 ? delta / max : 0, max];
};

const fromHsv = (hue, saturation, value) => {
  const h = (((hue % 360) + 360) % 360) / 60;
  const c = value * saturation;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = value - c;
  const [r, g, b] =
    h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
  return [r + m, g + m, b + m];
};


const settingsRef={current:{color:'#8875b6',secondaryColor:'#b58a9b',intensity:.72,trailWidth:2.2,linger:.55,glow:.72,hotspot:.24,followSpeed:1,grain:0,clickBurst:false,quality:'low',theme:'light',maxDevicePixelRatio:1,enabled:true}},feeders=new Map;
    const gl = canvas?.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false
    });
    if (!container || !canvas || !gl || !gl.getExtension('EXT_color_buffer_float')) return undefined;

    const vertexShader = compile(gl, gl.VERTEX_SHADER, VERTEX);
    if (!vertexShader) return undefined;

    const build = source => {
      const fragment = compile(gl, gl.FRAGMENT_SHADER, source);
      const program = gl.createProgram();
      if (!fragment || !program) return null;
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragment);
      gl.bindAttribLocation(program, 0, 'aPosition');
      gl.linkProgram(program);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        return null;
      }
      const uniforms = {};
      const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < count; i++) {
        const info = gl.getActiveUniform(program, i);
        if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
      }
      return { program, uniforms };
    };

    const passes = {
      splat: build(SPLAT),
      advect: build(ADVECT),
      maccormack: build(MACCORMACK),
      divergence: build(DIVERGENCE),
      scale: build(SCALE),
      pressure: build(PRESSURE),
      gradient: build(GRADIENT),
      prefilter: build(PREFILTER),
      down: build(DOWN),
      up: build(UP),
      display: build(DISPLAY)
    };
    if (Object.values(passes).some(pass => !pass)) return undefined;

    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const probe = document.createElement('canvas');
    probe.width = 1;
    probe.height = 1;
    const probeContext = probe.getContext('2d', { willReadFrequently: true });
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const state = {
      width: 1,
      height: 1,
      ratio: 1,
      colorKey: '',
      color: [0.37, 0.55, 1],
      secondary: [0.25, 0.3, 1],
      pointer: { x: 0, y: 0, inside: false },
      emitter: { x: 0, y: 0, vx: 0, vy: 0, px: 0, py: 0, travelled: 0 },
      ready: false,
      bursts: [],
      active: -Infinity,
      time: 0,
      allocated: '',
      targets: null
    };
    let raf = 0;
    let last = 0;
    let alive = true;
    let visible = true;

    const toRgb = (value, fallback) => {
      if (!probeContext || !value) return fallback;
      const css = /^[0-9a-f]{3,8}$/i.test(value) ? `#${value}` : value;
      probeContext.clearRect(0, 0, 1, 1);
      probeContext.fillStyle = '#000000';
      probeContext.fillStyle = css;
      probeContext.fillRect(0, 0, 1, 1);
      const [r, g, b] = probeContext.getImageData(0, 0, 1, 1).data;
      return [r / 255, g / 255, b / 255];
    };

    const resolveColors = s => {
      const key = `${s.color}|${s.secondaryColor}`;
      if (key === state.colorKey) return;
      state.colorKey = key;
      state.color = toRgb(s.color, [0.37, 0.55, 1]);
      if (s.secondaryColor) {
        state.secondary = toRgb(s.secondaryColor, state.color);
      } else {
        const [hue, saturation, value] = toHsv(state.color);
        state.secondary = fromHsv(hue + 8, Math.min(1, saturation * 1.1 + 0.05), value);
      }
    };

    const createTarget = (width, height, internalFormat, format, filter) => {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, gl.HALF_FLOAT, null);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return { texture, fbo, width, height, texel: [1 / width, 1 / height] };
    };

    const createPair = (width, height, internalFormat, format, filter) => {
      let read = createTarget(width, height, internalFormat, format, filter);
      let write = createTarget(width, height, internalFormat, format, filter);
      return {
        get read() {
          return read;
        },
        get write() {
          return write;
        },
        swap() {
          const next = read;
          read = write;
          write = next;
        },
        targets() {
          return [read, write];
        }
      };
    };

    const destroyTarget = target => {
      gl.deleteTexture(target.texture);
      gl.deleteFramebuffer(target.fbo);
    };

    const release = () => {
      const t = state.targets;
      if (!t) return;
      [
        ...t.velocity.targets(),
        ...t.dye.targets(),
        ...t.pressure.targets(),
        t.divergence,
        t.forward,
        t.back,
        ...t.bloom
      ].forEach(destroyTarget);
      state.targets = null;
    };

    const clearTargets = () => {
      const t = state.targets;
      if (!t) return;
      gl.clearColor(0, 0, 0, 0);
      [...t.velocity.targets(), ...t.dye.targets(), ...t.pressure.targets()].forEach(target => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        gl.clear(gl.COLOR_BUFFER_BIT);
      });
    };

    const allocate = () => {
      const s = settingsRef.current;
      const key = `${s.quality}|${state.width}|${state.height}|${canvas.width}|${canvas.height}`;
      if (key === state.allocated && state.targets) return;
      release();
      state.allocated = key;
      const preset = QUALITY[s.quality];
      const aspect = state.width / state.height;
      const dims = base => (aspect >= 1 ? [Math.round(base * aspect), base] : [base, Math.round(base / aspect)]);
      const [simW, simH] = dims(preset.sim);
      let [dyeW, dyeH] = dims(preset.dye);
      const shrink = Math.min(1, canvas.width / dyeW, canvas.height / dyeH);
      dyeW = Math.max(2, Math.round(dyeW * shrink));
      dyeH = Math.max(2, Math.round(dyeH * shrink));
      const bloom = [];
      let bloomW = dyeW >> 1;
      let bloomH = dyeH >> 1;
      for (let i = 0; i < BLOOM_LEVELS; i++) {
        bloom.push(createTarget(Math.max(1, bloomW), Math.max(1, bloomH), gl.RGBA16F, gl.RGBA, gl.LINEAR));
        bloomW >>= 1;
        bloomH >>= 1;
      }
      state.targets = {
        velocity: createPair(simW, simH, gl.RG16F, gl.RG, gl.LINEAR),
        dye: createPair(dyeW, dyeH, gl.RGBA16F, gl.RGBA, gl.LINEAR),
        forward: createTarget(dyeW, dyeH, gl.RGBA16F, gl.RGBA, gl.LINEAR),
        back: createTarget(dyeW, dyeH, gl.RGBA16F, gl.RGBA, gl.LINEAR),
        pressure: createPair(simW, simH, gl.R16F, gl.RED, gl.NEAREST),
        divergence: createTarget(simW, simH, gl.R16F, gl.RED, gl.NEAREST),
        bloom
      };
    };

    let resizePending = false;
    const applyResize = () => {
      const s = settingsRef.current;
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      const ratio = Math.min(window.devicePixelRatio || 1, Math.max(0.5, s.maxDevicePixelRatio || 2));
      const pixelWidth = Math.max(1, Math.round(width * ratio));
      const pixelHeight = Math.max(1, Math.round(height * ratio));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      state.width = width;
      state.height = height;
      state.ratio = ratio;
      allocate();
    };

    const resize = () => {
      resizePending = true;
      wake();
    };

    const draw = target => {
      if (target) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        gl.viewport(0, 0, target.width, target.height);
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const use = (pass, texel) => {
      gl.useProgram(pass.program);
      if (pass.uniforms.uTexel) gl.uniform2f(pass.uniforms.uTexel, texel[0], texel[1]);
      return pass.uniforms;
    };

    const bind = (unit, target) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, target.texture);
      return unit;
    };

    const splat = (pair, ax, ay, bx, by, radius, value, mode, strength, wide = radius) => {
      const u = use(passes.splat, pair.read.texel);
      gl.uniform1i(u.uTarget, bind(0, pair.read));
      gl.uniform1f(u.uAspect, state.width / state.height);
      gl.uniform2f(u.uA, ax / state.width, 1 - ay / state.height);
      gl.uniform2f(u.uB, bx / state.width, 1 - by / state.height);
      gl.uniform1f(u.uRadius, radius / state.height);
      gl.uniform1f(u.uWide, wide / state.height);
      gl.uniform3f(u.uValue, value[0], value[1], value[2]);
      gl.uniform1f(u.uMode, mode);
      gl.uniform1f(u.uStrength, strength);
      draw(pair.write);
      pair.swap();
    };

    const toGrid = (vx, vy) => {
      const { velocity } = state.targets;
      return [(vx * velocity.read.width) / state.width, (-vy * velocity.read.height) / state.height];
    };

    const lightRadius = s => Math.max(s.trailWidth * 0.5, (state.height / state.targets.dye.read.height) * 0.9);

    const emit = (s, dt, now) => {
      const { emitter, pointer } = state;
      const { velocity, dye } = state.targets;
      emitter.px = emitter.x;
      emitter.py = emitter.y;
      if (reduce || s.followSpeed >= 1) {
        emitter.x = pointer.x;
        emitter.y = pointer.y;
      } else {
        const omega = 10 + s.followSpeed * 50;
        const steps = Math.max(1, Math.ceil(dt / 0.004));
        const h = dt / steps;
        for (let k = 0; k < steps; k++) {
          emitter.vx += (omega * omega * (pointer.x - emitter.x) - 2 * omega * emitter.vx) * h;
          emitter.vy += (omega * omega * (pointer.y - emitter.y) - 2 * omega * emitter.vy) * h;
          emitter.x += emitter.vx * h;
          emitter.y += emitter.vy * h;
        }
      }
      const dx = emitter.x - emitter.px;
      const dy = emitter.y - emitter.py;
      const length = Math.hypot(dx, dy);
      if (length < 0.05 || !s.enabled) return;
      const radius = lightRadius(s);
      if (!reduce) {
        const target = toGrid(dx / Math.max(dt, 1e-3), dy / Math.max(dt, 1e-3));
        splat(
          velocity,
          emitter.px,
          emitter.py,
          emitter.x,
          emitter.y,
          radius * 4 + 18,
          [target[0], target[1], 0],
          3,
          FLOW * 0.6
        );
      }
      splat(dye, emitter.px, emitter.py, emitter.x, emitter.y, radius, [5.6, 5.6, 0.7], 2, 1, radius * 5 + 6);
      state.active = now;
    };

    const burst = (s, x, y, now) => {
      const { velocity, dye } = state.targets;
      const radius = lightRadius(s);
      const jets = 6;
      const base = Math.random() * Math.PI * 2;
      for (let k = 0; k < jets; k++) {
        const angle = base + (k / jets) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const cx = Math.cos(angle);
        const cy = Math.sin(angle);
        const reach = 20 + Math.random() * 14;
        const ax = x + cx * 3;
        const ay = y + cy * 3;
        const bx = x + cx * reach;
        const by = y + cy * reach;
        if (!reduce) {
          const target = toGrid(Math.cos(angle + 0.6) * 760, Math.sin(angle + 0.6) * 760);
          splat(velocity, ax, ay, bx, by, 18, [target[0], target[1], 0], 1, 0.9);
        }
        splat(dye, ax, ay, bx, by, radius * 1.1, [2.4, 2.4, 0.3], 0, 1, radius * 5 + 6);
      }
      splat(dye, x, y, x + 0.01, y, radius * 2.2, [1.8, 1.8, 0.4], 0, 1, radius * 7 + 10);
      state.active = now;
    };

    const step = (s, dt) => {
      const { velocity, dye, pressure, divergence } = state.targets;
      if (!reduce) {
        let u = use(passes.divergence, velocity.read.texel);
        gl.uniform1i(u.uVelocity, bind(0, velocity.read));
        draw(divergence);

        u = use(passes.scale, pressure.read.texel);
        gl.uniform1i(u.uSource, bind(0, pressure.read));
        gl.uniform1f(u.uValue, 0.8);
        draw(pressure.write);
        pressure.swap();

        u = use(passes.pressure, pressure.read.texel);
        gl.uniform1i(u.uDivergence, bind(1, divergence));
        for (let i = 0; i < PRESSURE_STEPS; i++) {
          gl.uniform1i(u.uPressure, bind(0, pressure.read));
          draw(pressure.write);
          pressure.swap();
        }

        u = use(passes.gradient, velocity.read.texel);
        gl.uniform1i(u.uPressure, bind(0, pressure.read));
        gl.uniform1i(u.uVelocity, bind(1, velocity.read));
        draw(velocity.write);
        velocity.swap();

        u = use(passes.advect, velocity.read.texel);
        gl.uniform2f(u.uVelocityTexel, velocity.read.texel[0], velocity.read.texel[1]);
        gl.uniform1i(u.uVelocity, bind(0, velocity.read));
        gl.uniform1i(u.uSource, bind(0, velocity.read));
        gl.uniform1f(u.uDt, dt);
        const calm = Math.exp(-dt * 1.2);
        gl.uniform4f(u.uDecay, calm, calm, 1, 1);
        draw(velocity.write);
        velocity.swap();
      }

      const decay = [
        Math.exp((-dt * 4.6) / (s.linger * 0.8)),
        Math.exp((-dt * 4.6) / (s.linger * 0.2)),
        Math.exp((-dt * 4.6) / (s.linger * 1.2)),
        1
      ];
      const { forward, back } = state.targets;
      if (reduce) {
        const u = use(passes.advect, dye.read.texel);
        gl.uniform2f(u.uVelocityTexel, velocity.read.texel[0], velocity.read.texel[1]);
        gl.uniform1i(u.uVelocity, bind(0, velocity.read));
        gl.uniform1i(u.uSource, bind(1, dye.read));
        gl.uniform1f(u.uDt, 0);
        gl.uniform4f(u.uDecay, decay[0], decay[1], decay[2], decay[3]);
        draw(dye.write);
        dye.swap();
        return;
      }
      let u = use(passes.advect, dye.read.texel);
      gl.uniform2f(u.uVelocityTexel, velocity.read.texel[0], velocity.read.texel[1]);
      gl.uniform1i(u.uVelocity, bind(0, velocity.read));
      gl.uniform1i(u.uSource, bind(1, dye.read));
      gl.uniform1f(u.uDt, dt);
      gl.uniform4f(u.uDecay, 1, 1, 1, 1);
      draw(forward);
      gl.uniform1i(u.uSource, bind(1, forward));
      gl.uniform1f(u.uDt, -dt);
      draw(back);
      u = use(passes.maccormack, dye.read.texel);
      gl.uniform2f(u.uVelocityTexel, velocity.read.texel[0], velocity.read.texel[1]);
      gl.uniform2f(u.uSourceTexel, dye.read.texel[0], dye.read.texel[1]);
      gl.uniform1i(u.uVelocity, bind(0, velocity.read));
      gl.uniform1i(u.uSource, bind(1, dye.read));
      gl.uniform1i(u.uForward, bind(2, forward));
      gl.uniform1i(u.uBack, bind(3, back));
      gl.uniform1f(u.uDt, dt);
      gl.uniform4f(u.uDecay, decay[0], decay[1], decay[2], decay[3]);
      draw(dye.write);
      dye.swap();
    };

    const setShade = (u, s) => {
      gl.uniform3f(u.uColor, state.color[0], state.color[1], state.color[2]);
      gl.uniform3f(u.uSecondary, state.secondary[0], state.secondary[1], state.secondary[2]);
      gl.uniform1f(u.uIntensity, s.intensity);
      gl.uniform1f(u.uHotspot, s.hotspot);
    };

    const render = s => {
      const { dye, bloom } = state.targets;
      if (s.glow > 0) {
        let u = use(passes.prefilter, bloom[0].texel);
        gl.uniform1i(u.uDye, bind(0, dye.read));
        gl.uniform2f(u.uDyeTexel, dye.read.texel[0], dye.read.texel[1]);
        setShade(u, s);
        draw(bloom[0]);
        u = use(passes.down, bloom[0].texel);
        for (let i = 1; i < bloom.length; i++) {
          gl.uniform1i(u.uSource, bind(0, bloom[i - 1]));
          gl.uniform2f(u.uSourceTexel, bloom[i - 1].texel[0], bloom[i - 1].texel[1]);
          draw(bloom[i]);
        }
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        u = use(passes.up, bloom[0].texel);
        for (let i = bloom.length - 1; i > 0; i--) {
          gl.uniform1i(u.uSource, bind(0, bloom[i]));
          gl.uniform2f(u.uSourceTexel, bloom[i].texel[0], bloom[i].texel[1]);
          draw(bloom[i - 1]);
        }
        gl.disable(gl.BLEND);
      }
      const u = use(passes.display, [1 / canvas.width, 1 / canvas.height]);
      gl.uniform1i(u.uDye, bind(0, dye.read));
      gl.uniform1i(u.uBloom, bind(1, bloom[0]));
      setShade(u, s);
      gl.uniform1f(u.uGlow, s.glow > 0 ? (s.glow * 1.4) / BLOOM_LEVELS : 0);
      gl.uniform1f(u.uGrain, s.grain);
      gl.uniform1f(u.uTime, state.time);
      gl.uniform1f(u.uLight, s.theme === 'light' ? 1 : 0);
      draw(null);
    };

    const blank = () => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    };

    const frame = now => {
      raf = 0;
      if (resizePending) {
        resizePending = false;
        applyResize();
      }
      if (!alive || !visible || document.hidden || !active()) {blank();last=0;return;}
      const s = settingsRef.current;
      const dt = last ? Math.min(1 / 30, (now - last) / 1000) : 1 / 60;
      last = now;
      state.time += dt;
      const wanted = Math.min(window.devicePixelRatio || 1, Math.max(0.5, s.maxDevicePixelRatio || 2));
      if (Math.abs(wanted - state.ratio) > 0.01) applyResize();
      allocate();
      resolveColors(s);
      gl.bindVertexArray(vao);
      gl.disable(gl.BLEND);

      const sources=getSources(now),present=new Set;
      for(const point of sources){present.add(point.id);let e=feeders.get(point.id);if(!e||Math.hypot(e.x-point.x,e.y-point.y)>80){e={x:point.x,y:point.y,px:point.x,py:point.y,vx:0,vy:0,travelled:0};feeders.set(point.id,e)}state.emitter=e;state.pointer={x:point.x,y:point.y,inside:true};state.ready=true;emit(s,dt,now)}
      for(const id of feeders.keys())if(!present.has(id))feeders.delete(id);
      while (state.bursts.length) {
        const [x, y] = state.bursts.shift();
        burst(s, x, y, now);
      }
      step(s, dt);
      render(s);

      const quiet = now - state.active > s.linger * 1200 + 900;
      const resting = Math.hypot(state.emitter.vx, state.emitter.vy) < 1;
      if (quiet && resting && !active()) {
        clearTargets();
        blank();
        last = 0;
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (!raf && alive && visible && !document.hidden && active()) raf = requestAnimationFrame(frame);
    };

    const onVisibility = () => {
      last = 0;
      wake();
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      wake();
    });
    resizeObserver.observe(container);
    const intersection = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (visible) {
        last = 0;
        wake();
      }
    });
    intersection.observe(container);



    document.addEventListener('visibilitychange', onVisibility);
    resize();
    blank();

    const cleanup = () => {
      alive = false;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersection.disconnect();



      document.removeEventListener('visibilitychange', onVisibility);
      release();
      Object.values(passes).forEach(pass => gl.deleteProgram(pass.program));
      gl.deleteShader(vertexShader);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
    };

    new MutationObserver(()=>{feeders.clear();if(!active()){cancelAnimationFrame(raf);raf=0;if(state.targets)clearTargets();blank();last=0}else wake()}).observe(container,{attributes:true,attributeFilter:['hidden','class']});
    addEventListener('pagehide',cleanup,{once:true});
    return {wake,cleanup};

}catch(error){console.info('Market glow: lightweight fallback enabled.');return null}}

// Public index intraday data; separate from the frozen DCA research dataset.
const MARKET_META=[['sh000001','上证指数','SSE Composite'],['sz399001','深证成指','SZSE Component'],['hkHSI','恒生指数','Hang Seng'],['us.IXIC','纳斯达克综合','Nasdaq Composite'],['us.INX','标普500','S&P 500'],['GC00Y','纽约金','COMEX Gold']];
function marketParse(payload,code,now=new Date().toISOString()){if(payload?.code!==0)throw Error('Market data unavailable');const d=payload.data?.[code],raw=d?.data,qt=d?.qt?.[code],previous=Number(qt?.[4]);let day=String(raw?.date||'');if(/^\d{8}$/.test(day))day=day.slice(0,4)+'-'+day.slice(4,6)+'-'+day.slice(6,8);if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(previous)||previous<=0)throw Error('Invalid market date or previous close');const points=(raw.data||[]).map(row=>String(row).split(/\s+/)).filter(a=>/^\d{4}$/.test(a[0])&&Number.isFinite(Number(a[1]))&&Number(a[1])>0).map(a=>[a[0],Number(a[1])]);if(points.length<2)throw Error('Insufficient intraday points');return{code,date:day,points,previous,quoteTime:String(qt[30]||''),fetchedAt:now}}
function marketValid(a,code){return a?.code===code&&/^\d{4}-\d{2}-\d{2}$/.test(a.date)&&Number.isFinite(a.previous)&&a.previous>0&&Array.isArray(a.points)&&a.points.length>=2&&a.points.every(p=>Array.isArray(p)&&/^\d{4}$/.test(p[0])&&Number.isFinite(p[1])&&p[1]>0)}
function marketMinutes(s){return Number(s.slice(0,2))*60+Number(s.slice(2))}
let marketData=[{"code":"sh000001","name":"上证指数","en":"SSE Composite","points":[["0930",3522.59],["0931",3512.27],["0932",3513.83],["0933",3511.4],["0934",3517.06],["0935",3515.77],["0936",3523.29],["0937",3519.19],["0938",3523.86],["0939",3520.84],["0940",3521.04],["0941",3523.63],["0942",3521.53],["0943",3521.75],["0944",3523.59],["0945",3520.35],["0946",3521.13],["0947",3525.4],["0948",3522.38],["0949",3520.62],["0950",3520.81],["0951",3517.02],["0952",3516.91],["0953",3518.73],["0954",3516.13],["0955",3516.97],["0956",3515.44],["0957",3516.85],["0958",3518.33],["0959",3516.35],["1000",3514.67],["1001",3515.92],["1002",3515.22],["1003",3516.9],["1004",3518.24],["1005",3520.3],["1006",3519.45],["1007",3519.52],["1008",3517.99],["1009",3517.98],["1010",3518.05],["1011",3520.2],["1012",3517.55],["1013",3517.17],["1014",3515.03],["1015",3517.25],["1016",3514.78],["1017",3514.21],["1018",3514.66],["1019",3513.37],["1020",3514.9],["1021",3514.9],["1022",3514.64],["1023",3513.48],["1024",3515.01],["1025",3514.5],["1026",3513.92],["1027",3515.05],["1028",3515],["1029",3514.67],["1030",3514.64],["1031",3516.04],["1032",3517.49],["1033",3517.11],["1034",3516.26],["1035",3514.4],["1036",3513.57],["1037",3514.37],["1038",3513.76],["1039",3512.56],["1040",3511.38],["1041",3511.74],["1042",3510.55],["1043",3510.95],["1044",3511.57],["1045",3516.57],["1046",3518.47],["1047",3518.81],["1048",3516.74],["1049",3515.92],["1050",3515.71],["1051",3514.7],["1052",3514.17],["1053",3511.73],["1054",3511.53],["1055",3512.15],["1056",3512.13],["1057",3510.24],["1058",3509.97],["1059",3509.14],["1100",3509.32],["1101",3510.1],["1102",3509.86],["1103",3510.24],["1104",3510.04],["1105",3509.88],["1106",3510.8],["1107",3514.4],["1108",3512.28],["1109",3511.59],["1110",3513.79],["1111",3513.94],["1112",3513.39],["1113",3513.89],["1114",3512.96],["1115",3511.84],["1116",3512.09],["1117",3512.04],["1118",3514.88],["1119",3515.9],["1120",3515.64],["1121",3513.91],["1122",3514.24],["1123",3512.61],["1124",3512.68],["1125",3512.56],["1126",3511.56],["1127",3512.24],["1128",3515.1],["1129",3512.98],["1130",3512.66],["1300",3512.66],["1301",3506.48],["1302",3504.16],["1303",3504.09],["1304",3503.9],["1305",3503],["1306",3504.12],["1307",3502.63],["1308",3503.63],["1309",3503.27],["1310",3502.3],["1311",3500.36],["1312",3501.35],["1313",3502.11],["1314",3502.24],["1315",3501.45],["1316",3500.27],["1317",3497.52],["1318",3496.69],["1319",3497.47],["1320",3504.17],["1321",3507.23],["1322",3508.71],["1323",3502.97],["1324",3502.32],["1325",3501.8],["1326",3503.78],["1327",3506.47],["1328",3505.04],["1329",3502.76],["1330",3502.84],["1331",3501.9],["1332",3503.17],["1333",3500.46],["1334",3499.02],["1335",3498.37],["1336",3499.13],["1337",3495.99],["1338",3496.28],["1339",3495.57],["1340",3495.84],["1341",3495.53],["1342",3493.59],["1343",3492.65],["1344",3492.74],["1345",3491.91],["1346",3491.09],["1347",3493.62],["1348",3492.38],["1349",3492.08],["1350",3490.27],["1351",3488.58],["1352",3487.66],["1353",3487.97],["1354",3489.11],["1355",3490.45],["1356",3489.74],["1357",3489.35],["1358",3490.32],["1359",3487.78],["1400",3486.22],["1401",3484.93],["1402",3484.59],["1403",3483.63],["1404",3484.35],["1405",3482.92],["1406",3483.38],["1407",3481.78],["1408",3481.09],["1409",3482.23],["1410",3480.48],["1411",3480.77],["1412",3478.15],["1413",3486.36],["1414",3485.69],["1415",3486.48],["1416",3481.96],["1417",3478.68],["1418",3478.61],["1419",3479.49],["1420",3480.71],["1421",3480.65],["1422",3479.82],["1423",3478.28],["1424",3475.63],["1425",3476.76],["1426",3476.47],["1427",3478.84],["1428",3485.42],["1429",3488.65],["1430",3491.24],["1431",3489.77],["1432",3492.41],["1433",3481.07],["1434",3487.53],["1435",3481.62],["1436",3479.82],["1437",3479.69],["1438",3477.05],["1439",3480.02],["1440",3477.51],["1441",3477.25],["1442",3475.03],["1443",3473.11],["1444",3470.63],["1445",3474.41],["1446",3477.57],["1447",3478.48],["1448",3476.05],["1449",3477.77],["1450",3477.59],["1451",3478.78],["1452",3481.64],["1453",3483.37],["1454",3489.49],["1455",3482.89],["1456",3482.16],["1457",3476.38],["1458",3476.45],["1459",3476.45],["1500",3476.47]],"date":"2026-11-25","previous":3548.37,"quoteTime":"20261125161427","source":"https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=sh000001","fetchedAt":"2026-11-25T13:40:19.013950+00:00"},{"code":"sz399001","name":"深证成指","en":"SZSE Component","points":[["0930",10272.19],["0931",10273.84],["0932",10279.26],["0933",10280.33],["0934",10295.4],["0935",10296.55],["0936",10325.94],["0937",10320.41],["0938",10322.92],["0939",10311.71],["0940",10321.85],["0941",10342.33],["0942",10343.41],["0943",10347.15],["0944",10357.63],["0945",10343.65],["0946",10350.39],["0947",10375.17],["0948",10363.81],["0949",10369.89],["0950",10376.64],["0951",10349.89],["0952",10343.63],["0953",10358.2],["0954",10354.31],["0955",10353.79],["0956",10346.17],["0957",10356.06],["0958",10374.33],["0959",10354.42],["1000",10341.6],["1001",10345.25],["1002",10351.33],["1003",10375.74],["1004",10380.5],["1005",10382.11],["1006",10377.75],["1007",10384.68],["1008",10377.22],["1009",10390.4],["1010",10397.15],["1011",10392.87],["1012",10375.4],["1013",10364.19],["1014",10364.49],["1015",10376.1],["1016",10363.57],["1017",10371.36],["1018",10371.84],["1019",10353.9],["1020",10361.84],["1021",10354.76],["1022",10346.38],["1023",10344.2],["1024",10354.6],["1025",10348.37],["1026",10349.94],["1027",10352.02],["1028",10349.34],["1029",10350.94],["1030",10348.58],["1031",10355.31],["1032",10356.2],["1033",10353.22],["1034",10341.74],["1035",10333.2],["1036",10333.6],["1037",10340.43],["1038",10333.62],["1039",10329.82],["1040",10328.48],["1041",10333.05],["1042",10330.35],["1043",10334.85],["1044",10338.48],["1045",10333.97],["1046",10334.46],["1047",10332.09],["1048",10315.96],["1049",10316.57],["1050",10315.48],["1051",10308.96],["1052",10304.72],["1053",10303.01],["1054",10304.29],["1055",10312.24],["1056",10306.03],["1057",10298.94],["1058",10297.02],["1059",10294.18],["1100",10295.21],["1101",10304.05],["1102",10294.48],["1103",10297.49],["1104",10297.02],["1105",10297.29],["1106",10303.76],["1107",10316.84],["1108",10312.46],["1109",10307.56],["1110",10313.84],["1111",10311.94],["1112",10312.26],["1113",10315.96],["1114",10312.99],["1115",10305.51],["1116",10302.4],["1117",10307.08],["1118",10312.3],["1119",10308.87],["1120",10307.36],["1121",10311.7],["1122",10312.88],["1123",10311.63],["1124",10311.48],["1125",10317.71],["1126",10305.41],["1127",10303.87],["1128",10321.12],["1129",10303.49],["1130",10300],["1300",10300],["1301",10272.9],["1302",10262.61],["1303",10264.86],["1304",10263.48],["1305",10254.57],["1306",10263.3],["1307",10257.43],["1308",10261.84],["1309",10258.42],["1310",10255.22],["1311",10244.58],["1312",10240.68],["1313",10242.98],["1314",10243.17],["1315",10246.35],["1316",10240.3],["1317",10223.82],["1318",10219.86],["1319",10222.06],["1320",10238.06],["1321",10245.97],["1322",10253.12],["1323",10231.47],["1324",10223.35],["1325",10225.95],["1326",10230.09],["1327",10226.97],["1328",10220.09],["1329",10209.47],["1330",10207.68],["1331",10201.81],["1332",10216.77],["1333",10207.49],["1334",10202.05],["1335",10203.36],["1336",10207.15],["1337",10190.32],["1338",10196.86],["1339",10192.38],["1340",10195.15],["1341",10188.91],["1342",10179.28],["1343",10178.04],["1344",10182.83],["1345",10180.75],["1346",10176.7],["1347",10187.88],["1348",10179.52],["1349",10181.73],["1350",10170.75],["1351",10170.88],["1352",10166.57],["1353",10173.72],["1354",10176.82],["1355",10171.58],["1356",10165.35],["1357",10166.11],["1358",10170.8],["1359",10158.3],["1400",10150.92],["1401",10147.06],["1402",10141.01],["1403",10133.21],["1404",10134.06],["1405",10125.92],["1406",10130.52],["1407",10119.84],["1408",10117.5],["1409",10125.42],["1410",10115.94],["1411",10117.1],["1412",10106.98],["1413",10147.28],["1414",10150.32],["1415",10155.85],["1416",10129.26],["1417",10124.42],["1418",10124.04],["1419",10130.23],["1420",10134.36],["1421",10134.45],["1422",10127.53],["1423",10122.52],["1424",10106.01],["1425",10107.45],["1426",10106.26],["1427",10116.9],["1428",10138.92],["1429",10145.73],["1430",10156.14],["1431",10159.51],["1432",10165.77],["1433",10125.15],["1434",10142.27],["1435",10122.78],["1436",10115.16],["1437",10118.27],["1438",10106.48],["1439",10114.55],["1440",10114],["1441",10111.83],["1442",10107.1],["1443",10098.71],["1444",10096.3],["1445",10112.69],["1446",10127.04],["1447",10128],["1448",10114.19],["1449",10109.18],["1450",10114.23],["1451",10119.01],["1452",10135.79],["1453",10140.83],["1454",10153.51],["1455",10144.87],["1456",10119.4],["1457",10101.34],["1458",10102.22],["1459",10102.22],["1500",10086.36]],"date":"2026-11-25","previous":10423.6,"quoteTime":"20261125161448","source":"https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=sz399001","fetchedAt":"2026-11-25T13:40:19.095735+00:00"},{"code":"hkHSI","name":"恒生指数","en":"Hang Seng","points":[["0930",22252.81],["0931",22314.54],["0932",22296.97],["0933",22336.47],["0934",22355.57],["0935",22381.98],["0936",22380.82],["0937",22352.01],["0938",22367.31],["0939",22378.75],["0940",22398.1],["0941",22416.21],["0942",22415.85],["0943",22405.32],["0944",22409.56],["0945",22386.21],["0946",22388.99],["0947",22391.13],["0948",22391.06],["0949",22391.42],["0950",22392.19],["0951",22358.93],["0952",22360.9],["0953",22374.6],["0954",22371.14],["0955",22372.35],["0956",22380.21],["0957",22416.55],["0958",22412.51],["0959",22429.23],["1000",22420.59],["1001",22445.93],["1002",22462],["1003",22465.54],["1004",22476.98],["1005",22492.13],["1006",22484.11],["1007",22482.68],["1008",22454.03],["1009",22471.71],["1010",22487.06],["1011",22483.14],["1012",22476.88],["1013",22470.55],["1014",22453.84],["1015",22456.4],["1016",22441.66],["1017",22438.7],["1018",22443.57],["1019",22436.52],["1020",22440.9],["1021",22458.6],["1022",22463.01],["1023",22469.14],["1024",22475.34],["1025",22458.3],["1026",22479.92],["1027",22477.98],["1028",22476.63],["1029",22475.61],["1030",22464.7],["1031",22466.66],["1032",22480.33],["1033",22489.51],["1034",22479.45],["1035",22475.23],["1036",22461.29],["1037",22456.64],["1038",22444.96],["1039",22436.68],["1040",22441.26],["1041",22433.85],["1042",22424.09],["1043",22427.18],["1044",22427.55],["1045",22444.18],["1046",22454.08],["1047",22464.22],["1048",22439.37],["1049",22428.64],["1050",22438.99],["1051",22424.34],["1052",22414.14],["1053",22400.84],["1054",22393.58],["1055",22388.94],["1056",22384.93],["1057",22372.21],["1058",22355.73],["1059",22345.69],["1100",22339.65],["1101",22347.39],["1102",22322.11],["1103",22322.43],["1104",22319.68],["1105",22324.01],["1106",22333.65],["1107",22346.14],["1108",22338.95],["1109",22337.07],["1110",22349.24],["1111",22352.18],["1112",22364.01],["1113",22361.51],["1114",22361],["1115",22344.76],["1116",22348.41],["1117",22344.06],["1118",22348.25],["1119",22345.07],["1120",22338.25],["1121",22338.38],["1122",22337.46],["1123",22334.41],["1124",22334.34],["1125",22338.09],["1126",22323.49],["1127",22332.17],["1128",22340.24],["1129",22331.4],["1130",22332.11],["1131",22327.16],["1132",22330.92],["1133",22320.75],["1134",22306.99],["1135",22309.4],["1136",22312.01],["1137",22309.47],["1138",22303.02],["1139",22293.26],["1140",22284.36],["1141",22291.37],["1142",22296.63],["1143",22295.08],["1144",22297.97],["1145",22290.89],["1146",22288.27],["1147",22286.28],["1148",22275.39],["1149",22271.72],["1150",22271.92],["1151",22267.8],["1152",22269.76],["1153",22276.23],["1154",22278.98],["1155",22272.34],["1156",22266.25],["1157",22275.79],["1158",22270.92],["1159",22271.9],["1200",22265.68],["1300",22265.68],["1301",22270.46],["1302",22228.22],["1303",22224.5],["1304",22217.05],["1305",22206.57],["1306",22213.13],["1307",22197.64],["1308",22204.06],["1309",22196],["1310",22194.17],["1311",22190.26],["1312",22179.35],["1313",22176.08],["1314",22180.96],["1315",22182.3],["1316",22177.06],["1317",22157.06],["1318",22158.05],["1319",22170.35],["1320",22186.13],["1321",22193.47],["1322",22205.33],["1323",22190.72],["1324",22197.58],["1325",22194.43],["1326",22202.29],["1327",22202.9],["1328",22196.8],["1329",22189.78],["1330",22191.41],["1331",22175.58],["1332",22189.03],["1333",22180.58],["1334",22181.95],["1335",22181.08],["1336",22179.97],["1337",22176.98],["1338",22179.62],["1339",22167.39],["1340",22157.8],["1341",22169.52],["1342",22164.05],["1343",22153.68],["1344",22148.21],["1345",22147.01],["1346",22150.6],["1347",22164.13],["1348",22160.05],["1349",22156.93],["1350",22144.41],["1351",22139.62],["1352",22134.27],["1353",22138],["1354",22144.89],["1355",22152.19],["1356",22141.85],["1357",22140.7],["1358",22146.5],["1359",22143.62],["1400",22143.87],["1401",22143.08],["1402",22142.36],["1403",22124.96],["1404",22122.84],["1405",22116.27],["1406",22109.54],["1407",22105.29],["1408",22106.07],["1409",22118.17],["1410",22110.55],["1411",22112.36],["1412",22103.4],["1413",22125.06],["1414",22125.56],["1415",22119.5],["1416",22097.95],["1417",22093.66],["1418",22084.6],["1419",22088.77],["1420",22088.03],["1421",22080.23],["1422",22055.8],["1423",22057],["1424",22065.21],["1425",22053.21],["1426",22039.37],["1427",22044.34],["1428",22057],["1429",22059.38],["1430",22064.65],["1431",22061.05],["1432",22061.9],["1433",22040.62],["1434",22039.92],["1435",22035.54],["1436",22037.68],["1437",22042.84],["1438",22051.76],["1439",22053.69],["1440",22061.16],["1441",22057.25],["1442",22050.91],["1443",22043.35],["1444",22039.79],["1445",22045.9],["1446",22044.71],["1447",22042.07],["1448",22038.77],["1449",22039.54],["1450",22044.82],["1451",22041.97],["1452",22038.23],["1453",22029.82],["1454",22035.31],["1455",22030.46],["1456",22021.6],["1457",22008.61],["1458",22021.31],["1459",22024.32],["1500",22017.39],["1501",22017.26],["1502",22020.24],["1503",22034.58],["1504",22030.96],["1505",22041.78],["1506",22065.54],["1507",22055.95],["1508",22056.04],["1509",22053.85],["1510",22050.58],["1511",22058.21],["1512",22069.27],["1513",22068.16],["1514",22057.67],["1515",22053.18],["1516",22052.96],["1517",22041.2],["1518",22029.65],["1519",22013.91],["1520",22012.45],["1521",22005.5],["1522",22005.86],["1523",21998.21],["1524",21990.91],["1525",21991.42],["1526",21975.25],["1527",21977.74],["1528",21961.67],["1529",21955.2],["1530",21952.24],["1531",21942.58],["1532",21944.64],["1533",21943.78],["1534",21938.46],["1535",21951.02],["1536",21962.66],["1537",21956.14],["1538",21943.63],["1539",21948.12],["1540",21938.6],["1541",21919.63],["1542",21922.05],["1543",21933.39],["1544",21928.37],["1545",21927.13],["1546",21944.25],["1547",21952.39],["1548",21946.63],["1549",21948.88],["1550",21963.97],["1551",21970.75],["1552",21959.64],["1553",21950.9],["1554",21953.19],["1555",21955.01],["1556",21964.04],["1557",21965.29],["1558",21965.85],["1559",21963.89],["1831",21966.01]],"date":"2026-11-25","previous":22219.65,"quoteTime":"2026/11/25 18:31:03","source":"https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=hkHSI","fetchedAt":"2026-11-25T13:40:19.195734+00:00"},{"code":"us.IXIC","date":"2026-11-25","points":[["0930",22947.25],["0931",22947.25],["0932",22865.19],["0933",22929.57],["0934",22876.89],["0935",22823.46],["0936",22807],["0937",22775.21],["0938",22821.92],["0939",22792.74],["0940",22778.81],["0941",22728.16],["0942",22717.36],["0943",22704.79],["0944",22673.32],["0945",22657.58],["0946",22700.49],["0947",22714.23]],"previous":23733.54,"quoteTime":"2026-11-25 09:46:46","fetchedAt":"2026-11-25T14:46:45.911Z"},{"code":"us.INX","date":"2026-11-25","points":[["0930",7038.45],["0931",7038.45],["0932",7020.47],["0933",7033.56],["0934",7023.91],["0935",7014.4],["0936",7010.03],["0937",6999.78],["0938",7009.84],["0939",7003.63],["0940",7001.67],["0941",6992.46],["0942",6991.67],["0943",6988.98],["0944",6977.29],["0945",6977.26],["0946",6984.44],["0947",6988.46]],"previous":7201.09,"quoteTime":"2026-11-25 09:46:45","fetchedAt":"2026-11-25T14:46:45.913Z"},{"code":"GC00Y","date":"2026-11-25","points":[["0700",3556.1],["0701",3559.9],["0702",3560.6],["0703",3559.1],["0704",3558],["0705",3557.8],["0706",3557.5],["0707",3556.6],["0708",3555.6],["0709",3556.2],["0710",3555.8],["0711",3555],["0712",3557.1],["0713",3556.7],["0714",3560.9],["0715",3560.9],["0716",3560],["0717",3561.1],["0718",3559],["0719",3559.7],["0720",3558.4],["0721",3557.6],["0722",3558],["0723",3556.8],["0724",3559.2],["0725",3559.1],["0726",3561.5],["0727",3562.7],["0728",3563.3],["0729",3566.6],["0730",3564.4],["0731",3562.1],["0732",3561.3],["0733",3560],["0734",3560.2],["0735",3562.3],["0736",3563.2],["0737",3560.1],["0738",3558],["0739",3558.1],["0740",3555.4],["0741",3551.5],["0742",3550.9],["0743",3552],["0744",3555.7],["0745",3553.4],["0746",3552.7],["0747",3551.9],["0748",3551.5],["0749",3548.7],["0750",3548.5],["0751",3546.5],["0752",3548.2],["0753",3549.7],["0754",3549.3],["0755",3547.3],["0756",3549.6],["0757",3548.2],["0758",3547.3],["0759",3548.6],["0800",3548.9],["0801",3545.4],["0802",3548.9],["0803",3550.2],["0804",3551.2],["0805",3552.9],["0806",3553.1],["0807",3552.9],["0808",3552.2],["0809",3552.4],["0810",3549.9],["0811",3547.7],["0812",3546.3],["0813",3549.9],["0814",3548.4],["0815",3548.9],["0816",3547.9],["0817",3543.7],["0818",3544.8],["0819",3541.1],["0820",3540],["0821",3539],["0822",3541.8],["0823",3543.5],["0824",3543],["0825",3540.6],["0826",3541.2],["0827",3540.1],["0828",3538.6],["0829",3539.1],["0830",3540.5],["0831",3543.7],["0832",3545.6],["0833",3545.2],["0834",3547.5],["0835",3547.9],["0836",3546.1],["0837",3544.3],["0838",3542.9],["0839",3544.6],["0840",3546.9],["0841",3540.9],["0842",3542.2],["0843",3541.8],["0844",3542.5],["0845",3542.5],["0846",3543],["0847",3542.9],["0848",3546.1],["0849",3544.2],["0850",3549],["0851",3551.2],["0852",3553.6],["0853",3551.8],["0854",3552.7],["0855",3554],["0856",3552.5],["0857",3555.5],["0858",3553.8],["0859",3551.9],["0900",3547.5],["0901",3545.6],["0902",3549.8],["0903",3545.5],["0904",3545.2],["0905",3544.5],["0906",3544.2],["0907",3542.5],["0908",3539.7],["0909",3537.7],["0910",3538.9],["0911",3537.1],["0912",3536.5],["0913",3537.8],["0914",3538.5],["0915",3539.3],["0916",3539.3],["0917",3534.4],["0918",3534.6],["0919",3534.4],["0920",3535],["0921",3534.1],["0922",3536.8],["0923",3535.9],["0924",3534],["0925",3534.1],["0926",3539.7],["0927",3539.1],["0928",3539.5],["0929",3539.8],["0930",3539.8],["0931",3541.1],["0932",3538],["0933",3535.1],["0934",3536.3],["0935",3543],["0936",3548.4],["0937",3546.7],["0938",3549.5],["0939",3548.4],["0940",3542.8],["0941",3548.9],["0942",3551.6],["0943",3553.1],["0944",3551.9],["0945",3550.9],["0946",3551.3],["0947",3550.8],["0948",3549],["0949",3549.7],["0950",3551.5],["0951",3546.3],["0952",3546.9],["0953",3546.3],["0954",3553.1],["0955",3553.2],["0956",3550.7],["0957",3550.9],["0958",3548.5],["0959",3547.3],["1000",3546.2],["1001",3544.4],["1002",3547.1],["1003",3550.5],["1004",3550.2],["1005",3547.8],["1006",3549.7],["1007",3555],["1008",3551.3],["1009",3555.3],["1010",3554.4],["1011",3554.6],["1012",3554.3],["1013",3556.8],["1014",3556.7],["1015",3559],["1016",3559.1],["1017",3559.7],["1018",3559],["1019",3558.9],["1020",3560.6],["1021",3564],["1022",3560.1],["1023",3561.4],["1024",3562.5],["1025",3562.8],["1026",3563.8],["1027",3565.3],["1028",3566.9],["1029",3563.9],["1030",3564.1],["1031",3571.8],["1032",3571.6],["1033",3570.7],["1034",3567.2],["1035",3568],["1036",3564.6],["1037",3565.6],["1038",3563.2],["1039",3561.4],["1040",3559.8],["1041",3559.6],["1042",3558.4],["1043",3557.3],["1044",3556.2],["1045",3556.6],["1046",3555.4],["1047",3556.8],["1048",3555],["1049",3555.5],["1050",3554.5],["1051",3552.6],["1052",3550.1],["1053",3549.3],["1054",3551],["1055",3551.3],["1056",3550.7],["1057",3551.6],["1058",3552.6],["1059",3550.8],["1100",3550.3],["1101",3550.3],["1102",3547.1],["1103",3548],["1104",3547.4],["1105",3546.5],["1106",3547.9],["1107",3551.7],["1108",3554.5],["1109",3556],["1110",3557],["1111",3557.5],["1112",3558.5],["1113",3558.3],["1114",3557.6],["1115",3556.2],["1116",3556.5],["1117",3556.4],["1118",3556],["1119",3555.5],["1120",3555.3],["1121",3555.9],["1122",3555.5],["1123",3554.8],["1124",3555.6],["1125",3555.1],["1126",3553.4],["1127",3550.4],["1128",3550.4],["1129",3549.9],["1130",3550.3],["1131",3552.1],["1132",3553.9],["1133",3552.9],["1134",3552.2],["1135",3551.3],["1136",3552.2],["1137",3550],["1138",3550.1],["1139",3549.8],["1140",3550],["1141",3550.9],["1142",3550.3],["1143",3549.6],["1144",3549.4],["1145",3549.5],["1146",3551.7],["1147",3551.1],["1148",3549.2],["1149",3548.1],["1150",3547.7],["1151",3549],["1152",3548.5],["1153",3547.7],["1154",3548.7],["1155",3548],["1156",3547.4],["1157",3547.7],["1158",3547.2],["1159",3546.8],["1200",3547.8],["1201",3546.6],["1202",3546.1],["1203",3546.1],["1204",3544.2],["1205",3543.8],["1206",3543.5],["1207",3545.2],["1208",3543.2],["1209",3543.4],["1210",3543.6],["1211",3543.8],["1212",3543.1],["1213",3546.7],["1214",3547.7],["1215",3548.5],["1216",3548.9],["1217",3550.9],["1218",3553],["1219",3553],["1220",3554.4],["1221",3555.4],["1222",3555.9],["1223",3555.7],["1224",3552.1],["1225",3552],["1226",3552.4],["1227",3552.4],["1228",3551.7],["1229",3550.6],["1230",3550],["1231",3548.4],["1232",3548.9],["1233",3548.1],["1234",3549.3],["1235",3548.2],["1236",3548.4],["1237",3548.8],["1238",3548.4],["1239",3546.6],["1240",3548.1],["1241",3544.2],["1242",3545.5],["1243",3546.4],["1244",3546.5],["1245",3546.5],["1246",3547.6],["1247",3547.9],["1248",3547.2],["1249",3548.1],["1250",3547.9],["1251",3548],["1252",3548.3],["1253",3549.8],["1254",3550.9],["1255",3550.8],["1256",3549],["1257",3549],["1258",3548.7],["1259",3549],["1300",3548.5],["1301",3549.1],["1302",3546.9],["1303",3546],["1304",3546.5],["1305",3546.4],["1306",3545.7],["1307",3544.6],["1308",3544.9],["1309",3545.7],["1310",3544.2],["1311",3544.5],["1312",3544.6],["1313",3545],["1314",3545],["1315",3545.5],["1316",3544.3],["1317",3543.4],["1318",3543.6],["1319",3545.9],["1320",3547.8],["1321",3547.8],["1322",3545.5],["1323",3544.7],["1324",3546.2],["1325",3544.6],["1326",3546.3],["1327",3545.2],["1328",3542],["1329",3541.3],["1330",3538.7],["1331",3534.6],["1332",3535.2],["1333",3539.3],["1334",3537],["1335",3537.3],["1336",3534.9],["1337",3533.8],["1338",3536],["1339",3536.3],["1340",3533.8],["1341",3534.1],["1342",3531.4],["1343",3532.8],["1344",3531.5],["1345",3529.5],["1346",3530.2],["1347",3531.4],["1348",3527.8],["1349",3527],["1350",3523],["1351",3526.7],["1352",3525.7],["1353",3525.7],["1354",3526],["1355",3526.9],["1356",3521.2],["1357",3522],["1358",3524.7],["1359",3522.1],["1400",3521.8],["1401",3516.8],["1402",3515.8],["1403",3517.2],["1404",3518.9],["1405",3519.9],["1406",3520.2],["1407",3517.5],["1408",3515.9],["1409",3519],["1410",3519.1],["1411",3523.7],["1412",3523.6],["1413",3526.4],["1414",3525.1],["1415",3524],["1416",3522.4],["1417",3522.4],["1418",3521.8],["1419",3522.8],["1420",3524.4],["1421",3525.6],["1422",3521.1],["1423",3522.4],["1424",3522.6],["1425",3522.3],["1426",3521.5],["1427",3521.1],["1428",3521],["1429",3522.6],["1430",3525.3],["1431",3524.6],["1432",3525.8],["1433",3524.1],["1434",3521.1],["1435",3520.2],["1436",3520.7],["1437",3520.5],["1438",3521],["1439",3519.9],["1440",3519.2],["1441",3518.5],["1442",3515.9],["1443",3517.5],["1444",3520.1],["1445",3521.3],["1446",3521.4],["1447",3521.6],["1448",3518.6],["1449",3520.3],["1450",3521.1],["1451",3519.4],["1452",3517.2],["1453",3516.4],["1454",3518.4],["1455",3517.9],["1456",3515.8],["1457",3513.4],["1458",3511.8],["1459",3514.3],["1500",3514.7],["1501",3515.4],["1502",3517.1],["1503",3517.1],["1504",3517],["1505",3519.4],["1506",3519],["1507",3518.7],["1508",3518.9],["1509",3518.8],["1510",3519.3],["1511",3518.5],["1512",3518.4],["1513",3520.2],["1514",3519.3],["1515",3518.9],["1516",3519.2],["1517",3518.9],["1518",3518.6],["1519",3518.3],["1520",3518.8],["1521",3517.4],["1522",3516.7],["1523",3516],["1524",3515.6],["1525",3516.5],["1526",3517],["1527",3518.3],["1528",3516.7],["1529",3518.8],["1530",3520.6],["1531",3521.9],["1532",3523.3],["1533",3523.4],["1534",3523.4],["1535",3524.1],["1536",3522.2],["1537",3521.7],["1538",3520.1],["1539",3521.6],["1540",3523.2],["1541",3522.9],["1542",3522.5],["1543",3520.9],["1544",3519.5],["1545",3519.8],["1546",3523.4],["1547",3528.2],["1548",3525.2],["1549",3526.3],["1550",3527],["1551",3525.7],["1552",3524.8],["1553",3523.2],["1554",3522.2],["1555",3522.9],["1556",3522.3],["1557",3523.5],["1558",3524.2],["1559",3524.3],["1600",3522.1],["1601",3524.3],["1602",3523.1],["1603",3520.9],["1604",3519.8],["1605",3518.5],["1606",3515],["1607",3517.3],["1608",3517.9],["1609",3519.2],["1610",3522.8],["1611",3520.2],["1612",3522.6],["1613",3522.9],["1614",3521.9],["1615",3520.6],["1616",3521.3],["1617",3521.4],["1618",3519.7],["1619",3522.6],["1620",3522.5],["1621",3528.5],["1622",3526.5],["1623",3526.8],["1624",3528],["1625",3527.9],["1626",3527.9],["1627",3526.1],["1628",3526.3],["1629",3527.5],["1630",3530.3],["1631",3530.5],["1632",3531.6],["1633",3532.2],["1634",3532.5],["1635",3532.6],["1636",3534.6],["1637",3533.7],["1638",3531.7],["1639",3530.2],["1640",3530.6],["1641",3532.4],["1642",3534.5],["1643",3537.8],["1644",3536.1],["1645",3535.2],["1646",3535.4],["1647",3534.7],["1648",3534.1],["1649",3535.4],["1650",3536.5],["1651",3535.6],["1652",3534],["1653",3530.6],["1654",3530.1],["1655",3532],["1656",3532.9],["1657",3532.9],["1658",3531.9],["1659",3532.6],["1700",3533.1],["1701",3532.6],["1702",3532.4],["1703",3532.2],["1704",3532.7],["1705",3533.8],["1706",3534.3],["1707",3534.1],["1708",3533.3],["1709",3534],["1710",3534.7],["1711",3532.6],["1712",3531.6],["1713",3528.7],["1714",3530.1],["1715",3530.1],["1716",3529.6],["1717",3530],["1718",3530],["1719",3530.9],["1720",3530.1],["1721",3528.3],["1722",3529.1],["1723",3525.8],["1724",3526.9],["1725",3526.7],["1726",3526.6],["1727",3526.3],["1728",3525.2],["1729",3524.2],["1730",3523.6],["1731",3523.9],["1732",3525],["1733",3523.2],["1734",3522.8],["1735",3525.8],["1736",3526.2],["1737",3528.3],["1738",3526.8],["1739",3526.9],["1740",3525.8],["1741",3524.2],["1742",3524.3],["1743",3523.6],["1744",3525.2],["1745",3526.1],["1746",3525.3],["1747",3524.7],["1748",3524.3],["1749",3525.4],["1750",3527],["1751",3526.3],["1752",3525.9],["1753",3524.1],["1754",3523.8],["1755",3525.3],["1756",3526.9],["1757",3527.7],["1758",3526.7],["1759",3527.1],["1800",3527.3],["1801",3527],["1802",3527.4],["1803",3529.5],["1804",3531.9],["1805",3534.4],["1806",3533.4],["1807",3534.4],["1808",3535.1],["1809",3535.4],["1810",3533.7],["1811",3533.7],["1812",3532.9],["1813",3531.2],["1814",3532.6],["1815",3532.1],["1816",3531.7],["1817",3533.8],["1818",3531.7],["1819",3532.1],["1820",3532.3],["1821",3531.3],["1822",3529.5],["1823",3529.8],["1824",3529.2],["1825",3529],["1826",3529.3],["1827",3529.8],["1828",3530.1],["1829",3529.2],["1830",3528.8],["1831",3530.7],["1832",3531.5],["1833",3530.7],["1834",3530.1],["1835",3529.4],["1836",3527.3],["1837",3527.6],["1838",3528.6],["1839",3529.8],["1840",3529],["1841",3530],["1842",3529.9],["1843",3529.5],["1844",3529.1],["1845",3528.7],["1846",3529.4],["1847",3528.7],["1848",3529.3],["1849",3529.8],["1850",3528.8],["1851",3529],["1852",3529.2],["1853",3528.8],["1854",3528.4],["1855",3529.4],["1856",3530],["1857",3530.6],["1858",3529.9],["1859",3529.5],["1900",3530.9],["1901",3529.7],["1902",3528.9],["1903",3528.3],["1904",3527.5],["1905",3528.1],["1906",3525.7],["1907",3527.3],["1908",3527.4],["1909",3526.5],["1910",3526.1],["1911",3527],["1912",3526.4],["1913",3527.3],["1914",3525.3],["1915",3525.6],["1916",3525.2],["1917",3526.5],["1918",3528.9],["1919",3525.9],["1920",3525.8],["1921",3525.1],["1922",3523.3],["1923",3524.9],["1924",3524.5],["1925",3523.2],["1926",3522.3],["1927",3521.1],["1928",3519],["1929",3518.5],["1930",3516.8],["1931",3515],["1932",3514.6],["1933",3514.7],["1934",3517.3],["1935",3517],["1936",3513.8],["1937",3510.3],["1938",3510.9],["1939",3512],["1940",3512.5],["1941",3512.6],["1942",3508.9],["1943",3509.1],["1944",3507.8],["1945",3509.9],["1946",3510],["1947",3511],["1948",3511.9],["1949",3513.2],["1950",3513.6],["1951",3514.6],["1952",3514.3],["1953",3512],["1954",3511.1],["1955",3510.9],["1956",3507.8],["1957",3509.4],["1958",3507.6],["1959",3493.6],["2000",3488.8],["2001",3491.4],["2002",3497.6],["2003",3494.7],["2004",3496.2],["2005",3499.6],["2006",3497.6],["2007",3496.9],["2008",3497.3],["2009",3498.7],["2010",3499.5],["2011",3501.7],["2012",3504.5],["2013",3507.3],["2014",3511],["2015",3512.2],["2016",3517.2],["2017",3518],["2018",3517.7],["2019",3516.8],["2020",3519.6],["2021",3517.1],["2022",3517.1],["2023",3519.2],["2024",3519],["2025",3516.8],["2026",3518.1],["2027",3519.8],["2028",3521.5],["2029",3523.1],["2030",3521.3],["2031",3521.6],["2032",3519.7],["2033",3517.6],["2034",3521.7],["2035",3523.3],["2036",3523.1],["2037",3524.7],["2038",3529.1],["2039",3524.7],["2040",3521.4],["2041",3520.4],["2042",3518.6],["2043",3519.5],["2044",3520.8],["2045",3521.8],["2046",3516.8],["2047",3514.3],["2048",3516.9],["2049",3517.9],["2050",3517.8],["2051",3515.9],["2052",3516.9],["2053",3517.4],["2054",3518.3],["2055",3516.3],["2056",3516.2],["2057",3517.1],["2058",3518],["2059",3520.6],["2100",3520.8],["2101",3516.2],["2102",3516.8],["2103",3516.1],["2104",3515.6],["2105",3516.6],["2106",3511.4],["2107",3512.1],["2108",3513],["2109",3512],["2110",3511.4],["2111",3512.8],["2112",3513.4],["2113",3513.5],["2114",3512.8],["2115",3510.1],["2116",3508.2],["2117",3508],["2118",3505.5],["2119",3501.1],["2120",3500.7],["2121",3497.1],["2122",3499.2],["2123",3504],["2124",3505.1],["2125",3504.5],["2126",3506.1],["2127",3505.3],["2128",3502.7],["2129",3506],["2130",3504.5],["2131",3494],["2132",3500.8],["2133",3498.5],["2134",3494.4],["2135",3491.8],["2136",3487.9],["2137",3481.2],["2138",3481.6],["2139",3481.9],["2140",3477.7],["2141",3471.1],["2142",3472.8],["2143",3475.9],["2144",3474.3],["2145",3475.3],["2146",3475],["2147",3479.1],["2148",3483.5],["2149",3486.1],["2150",3481.2],["2151",3479],["2152",3478.9],["2153",3480.1],["2154",3477],["2155",3475.7],["2156",3475.2],["2157",3470.7],["2158",3468.7],["2159",3469.6],["2200",3475.1],["2201",3477.8],["2202",3483.4],["2203",3480.5],["2204",3478],["2205",3477.8],["2206",3478.7],["2207",3481.5],["2208",3485.2],["2209",3485.4],["2210",3483],["2211",3480.8],["2212",3482.4],["2213",3482.9],["2214",3480.1],["2215",3481.5],["2216",3480],["2217",3476.8],["2218",3477.4],["2219",3476.6],["2220",3479],["2221",3477.7],["2222",3477],["2223",3478.1],["2224",3477.4],["2225",3476.5],["2226",3475.8],["2227",3474.1],["2228",3468.2],["2229",3469.4],["2230",3469.2],["2231",3463.5],["2232",3460.7],["2233",3462.7],["2234",3463.8],["2235",3464.3],["2236",3462.3],["2237",3466.3]],"previous":3561.9,"quoteTime":"2026-11-25 22:36:49（北京时间）","fetchedAt":"2026-11-25T14:46:45.914Z","basis":"前结算价","unit":"美元/盎司","source":"东方财富 COMEX黄金主连"}]
,marketFailures=new Set,marketBusy=false,marketFrame=0,marketPhase=0,marketLastFrame=0;
try{const saved=JSON.parse(localStorage.getItem('dca-market-v37')||'null');if(Array.isArray(saved))marketData=MARKET_META.map(([code],i)=>{const a=saved.find(a=>a.code===code);return marketValid(a,code)&&a.date>=marketData[i].date?a:marketData[i]})}catch{}
function marketName(k){return MARKET_META[k][LANG==='en'?2:1]}
function marketClock(s){s=String(s);return /^\d{14}$/.test(s)?s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8)+' '+s.slice(8,10)+':'+s.slice(10,12)+':'+s.slice(12,14):s.replace(/\//g,'-')}
function marketEscape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function marketCanvas(canvas){const r=canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1),w=r.width,h=r.height;if(!w||!h)return null;if(canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d)){canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);}const ctx=canvas.getContext('2d');ctx.setTransform(d,0,0,d,0,0);return{ctx,w,h}}
function marketRender(){const box=$('marketCards');box.innerHTML=MARKET_META.map(([code],k)=>{const a=marketData[k],v=a.points.at(-1)[1],p=v/a.previous-1;return`<article class="market-card"><div class="flex" style="justify-content:space-between"><strong>${marketName(k)}</strong><span class="code">${code}</span></div><div class="market-value">${v.toLocaleString('en-US',{maximumFractionDigits:2})}<span style="color:${p>=0?'#227d75':'#ad647b'}">${p>=0?'+':''}${(p*100).toFixed(2)}%</span></div><div class="market-mini"><canvas id="marketMini${k}" aria-label="${marketName(k)} ${a.date}"></canvas></div><div class="market-meta">${a.date} · ${LANG==='en'?'Trading day':'交易日'}<br>${LANG==='en'?'Quote timestamp':'行情时间'} ${marketEscape(marketClock(a.quoteTime).replace('（北京时间）',LANG==='en'?' (Beijing)':'（北京时间）'))}${a.code==='GC00Y'?'<br>'+(LANG==='en'?'USD/oz · Previous settlement basis':'美元/盎司 · 前结算价基准'):''}<br>${marketFailures.has(code)?(LANG==='en'?'Refresh failed · Last available data':'刷新失败 · 保留最近可用数据'):(LANG==='en'?'Latest successful fetch':'最近成功获取')} ${new Date(a.fetchedAt).toLocaleString(LANG==='en'?'en-GB':'zh-CN',{hour12:false})}</div></article>`}).join('');requestAnimationFrame(()=>{MARKET_META.forEach((_,k)=>{const c=marketCanvas($('marketMini'+k));if(c)marketPlotCard(c.ctx,marketData[k],k,4,2,c.w-8,c.h-4)});marketPaint()});$('marketRefresh').disabled=marketBusy;$('marketRefresh').textContent=marketBusy?'正在刷新…':'↻ 刷新行情';$('marketStatus').textContent=marketFailures.size?'部分连接失败 · 显示最近可用行情':'每60秒自动刷新 · 公开行情可能延迟';}
async function marketRefresh(){if(marketBusy||document.hidden)return;marketBusy=true;marketRender();await Promise.allSettled(MARKET_META.map(async([code],k)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000),route=code.startsWith('us.')?'UsMinute':'minute';try{const url=code==='GC00Y'?'https://push2his.eastmoney.com/api/qt/stock/trends2/get?secid=101.GC00Y&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58&ndays=1&iscr=0&_='+Date.now():'https://web.ifzq.gtimg.cn/appstock/app/'+route+'/query?code='+encodeURIComponent(code)+'&_='+Date.now(),res=await fetch(url,{signal:controller.signal,cache:'no-store',credentials:'omit'});if(!res.ok)throw Error('HTTP '+res.status);const payload=await res.json(),next=code==='GC00Y'?marketParseGold(payload):marketParse(payload,code);if(next.date>=marketData[k].date)marketData[k]=next;marketFailures.delete(code)}catch{marketFailures.add(code)}finally{clearTimeout(timer)}}));marketBusy=false;try{localStorage.setItem('dca-market-v37',JSON.stringify(marketData))}catch{}marketRender()}
function installMarkets(){const dialog=$('marketDialog');let focus=null;function close(){dialog.hidden=true;document.querySelector('main').inert=false;focus?.focus({preventScroll:true})}$('marketBtn').onclick=()=>{focus=document.activeElement;dialog.hidden=false;document.querySelector('main').inert=true;marketRender();$('marketClose').focus()};$('marketClose').onclick=close;dialog.onclick=e=>{if(e.target===dialog)close()};document.addEventListener('keydown',e=>{if(dialog.hidden)return;if(e.key==='Escape'){e.preventDefault();close()}if(e.key==='Tab'){const nodes=[...dialog.querySelectorAll('button:not([disabled]),a[href]')];if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0].focus()}}});$('marketRefresh').onclick=marketRefresh;addEventListener('resize',marketRender);addEventListener('online',marketRefresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)marketRefresh()});let lastMarketLang=LANG;new MutationObserver(()=>{if(lastMarketLang!==LANG){lastMarketLang=LANG;marketRender()}}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});marketRender();marketRefresh();installMarketPlayback();setInterval(()=>{if(!document.hidden&&(marketIntroVisible()||!dialog.hidden))marketRefresh()},60000)}
// Autonomous playback of the latest real intraday path. No pointer input.
let marketReplayStarted=performance.now(),marketCurvePaths=[],marketGlowEngine=null;
function marketIntroVisible(){return !$('brandIntro').hidden}
function marketPlaybackActive(){return marketIntroVisible()&&!$('brandIntro').classList.contains('is-leaving')&&!document.hidden&&performance.now()-marketReplayStarted<4200&&motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches}
function marketTracePhase(now=performance.now()){return marketPlaybackActive()?Math.min(1,(now-marketReplayStarted)/3000):1}
function marketIntroLayout(w,h){if(w>=760){const margin=w*.035,pw=Math.min(390,w*.285,Math.max(110,(w-540)/2-margin)),ph=Math.min(190,h*.225),gap=(h-3*ph)/4;return Array.from({length:6},(_,k)=>({k,x:k%2?w-margin-pw:margin,y:gap+Math.floor(k/2)*(ph+gap),w:pw,h:ph}))}const ph=Math.min(112,Math.max(72,(h-570)/2)),pw=(w-48)/3;return Array.from({length:6},(_,k)=>({k,x:16+k%3*(pw+8),y:k<3?48:h-ph-24,w:pw,h:ph}))}

function marketCurveGeometry(a,box){const session=marketSession(a),returns=session.points.map(p=>p[1]/a.previous-1),lo=Math.min(0,...returns),hi=Math.max(0,...returns),pad=Math.max(.0015,(hi-lo)*.16),min=lo-pad,max=hi+pad,times=session.plotTimes,first=session.plotOpen,last=session.plotClose,Y=v=>box.y+box.h-(v-min)/(max-min)*box.h;return{points:session.points.map((p,i)=>({x:box.x+(times[i]-first)/(last-first||1)*box.w,y:Y(returns[i])})),zero:Y(0),box}}
function marketCurveHead(path,progress){const pts=path.points,target=pts[0].x+(pts.at(-1).x-pts[0].x)*Math.min(1,Math.max(0,progress));let i=1;while(i<pts.length&&pts[i].x<target)i++;const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i)],f=Math.max(0,Math.min(1,(target-a.x)/(b.x-a.x||1)));return{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f}}
function marketGlowSources(now){if(!marketPlaybackActive())return[];const phase=marketTracePhase(now);if(phase>=1)return[];return marketCurvePaths.map((p,k)=>({id:k,...marketCurveHead(p,phase)}))}
function marketDrawLine(ctx,a,box,color,alpha=1,progress=1,live=false){if(marketSession(a).points.length<2)return null;const path=marketCurveGeometry(a,box),points=path.points;ctx.save();ctx.globalAlpha=alpha;ctx.setLineDash([3,5]);ctx.strokeStyle='#8698b04d';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(box.x,path.zero);ctx.lineTo(box.x+box.w,path.zero);ctx.stroke();ctx.setLineDash([]);const trace=()=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y))};trace();ctx.strokeStyle=color;ctx.lineWidth=live?1.1:1.5;ctx.globalAlpha=alpha*(live?.20:1);ctx.stroke();if(live){ctx.beginPath();ctx.rect(box.x,box.y-6,marketCurveHead(path,progress).x-box.x,box.h+12);ctx.clip();ctx.globalAlpha=alpha;trace();ctx.lineWidth=1.7;ctx.shadowColor='#9b86bc';ctx.shadowBlur=5;ctx.stroke();ctx.shadowBlur=0}ctx.lineTo(points.at(-1).x,box.y+box.h);ctx.lineTo(points[0].x,box.y+box.h);ctx.closePath();const grad=ctx.createLinearGradient(0,box.y,0,box.y+box.h);grad.addColorStop(0,color+'20');grad.addColorStop(1,color+'00');ctx.fillStyle=grad;ctx.fill();ctx.restore();if(live){marketCurvePaths.push(path);const head=marketCurveHead(path,progress);ctx.save();ctx.fillStyle='#8970b0';ctx.shadowColor='#b7a4cf';ctx.shadowBlur=9;ctx.beginPath();ctx.arc(head.x,head.y,2.0,0,Math.PI*2);ctx.fill();ctx.restore()}return path}
function marketPlotCard(ctx,a,k,x,y,w,h,quiet=false,live=false){const change=a.points.at(-1)[1]/a.previous-1,color=change>=0?'#5e8a83':'#aa7583',fontSize=w<150?10:12;ctx.save();ctx.fillStyle='#56667c';ctx.font=fontSize+'px "Lab English","Lab Sans",sans-serif';ctx.textAlign='left';ctx.fillText(marketName(k),x,y+14);ctx.textAlign='right';ctx.font=fontSize+'px "Lab Numbers",sans-serif';ctx.fillStyle=color;ctx.fillText((change>=0?'+':'')+(change*100).toFixed(2)+'%',x+w,y+14);marketDrawLine(ctx,a,{x,y:y+28,w,h:h-55},color,.90,live?marketTracePhase():1,live);ctx.textAlign='left';ctx.fillStyle='#8793a5';ctx.font='9px "Lab Numbers","Lab Sans",sans-serif';ctx.fillText(w<150?a.date:a.date+' '+marketSession(a).startLabel,x,y+h-(w<150?15:3));ctx.textAlign='right';ctx.fillText((w<150?marketSession(a).startLabel+'–':'')+marketSession(a).label,x+w,y+h-3);ctx.restore()}
function marketPaint(){const c=marketCanvas($('introMarketField'));if(!c)return;const{ctx,w,h}=c;ctx.clearRect(0,0,w,h);marketCurvePaths=[];if(marketIntroVisible()){for(const b of marketIntroLayout(w,h))marketPlotCard(ctx,marketData[b.k],b.k,b.x,b.y,b.w,b.h,false,true);ctx.font='10px "Lab English","Lab Sans",sans-serif';ctx.fillStyle='#8390a3';ctx.textAlign='center';ctx.fillText(LANG==='en'?'REPLAY · BREAKS FOLDED · REFRESH 60s':'日内走势回放 · 午休已折叠 · 行情每60秒刷新',w/2,h-9)}if(marketPlaybackActive()){if(!marketFrame)marketFrame=requestAnimationFrame(()=>{marketFrame=0;marketPaint()})}else{cancelAnimationFrame(marketFrame);marketFrame=0}}
function installMarketPlayback(){const intro=$('brandIntro');let wasOpen=marketIntroVisible();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)marketGlowEngine=createMarketGlow(intro,$('introMarketGlow'),marketGlowSources,marketPlaybackActive);const observer=new MutationObserver(()=>{const open=marketIntroVisible();if(open&&!wasOpen){marketReplayStarted=performance.now();marketRefresh()}wasOpen=open;marketPaint();marketGlowEngine?.wake()});observer.observe(intro,{attributes:true,attributeFilter:['hidden','class']});marketPaint()}

installMarkets();

/* Original A2 mark, sampled into four discrete vertical line weights. */
(()=>{
 const anchors=[[-.19,.105],[-.145,.088],[-.095,.005],[-.045,.024],[.005,.039],[.065,-.055],[.115,-.08],[.175,-.155]],curve=[];
 function distance(x,y,a,b){let dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)}
 for(let i=0;i<anchors.length-1;i++){let a=anchors[Math.max(0,i-1)],b=anchors[i],c=anchors[i+1],d=anchors[Math.min(anchors.length-1,i+2)];for(let j=0;j<12;j++){let t=j/12,t2=t*t,t3=t2*t;curve.push([0,1].map(k=>.5*(2*b[k]+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t2+(-a[k]+3*b[k]-3*c[k]+d[k])*t3)))}}curve.push(anchors.at(-1));
 function inside(x,y){let r=Math.hypot(x,y),a=Math.atan2(y,x);if(r>.315&&r<.385&&!(a>-.95&&a<-.2))return true;if(curve.slice(1).some((b,i)=>distance(x,y,curve[i],b)<.017))return true;let xs=[-.18,-.10,-.02,.06,.14],tops=[.133,.067,.094,0,-.052];return xs.some((v,i)=>distance(x,y,[v,tops[i]],[v,.17])<.015)}
 const cache=new Map;
 function points(size,pitch){let key=size+':'+pitch;if(cache.has(key))return cache.get(key);let out=[];for(let x=-size*.41;x<=size*.41;x+=pitch)for(let y=-size*.41;y<=size*.41;y+=pitch){let hit=0;for(let [dx,dy]of[[0,0],[-.003,0],[.003,0],[0,-.004],[0,.004]])if(inside(x/size+dx,y/size+dy))hit++;if(hit)out.push([x,y,Math.min(3,Math.floor(hit/1.3))])}cache.set(key,out);return out}
 function renderMark(ctx,cx,cy,size,phase,alpha,background=false){let pitch=background?8:(size>90?4:1.35),weights=background?[1,2,3,4]:(size>90?[.8,1.4,2.1,2.9]:[.35,.5,.7,.95]),ps=points(size,pitch);ctx.strokeStyle=background?'#68748d':'#5147a3';ctx.globalAlpha=alpha;ctx.lineCap='round';for(let [x,y,k]of ps){let dx=phase===null?0:Math.sin(y/80+phase)*2.3,dy=phase===null?0:Math.sin(x/105+phase*.7)*1.8;ctx.lineWidth=weights[k];ctx.beginPath();ctx.moveTo(cx+x+dx,cy+y+dy-pitch*.365);ctx.lineTo(cx+x+dx,cy+y+dy+pitch*.365);ctx.stroke()}ctx.globalAlpha=1}
 function icon(canvas){let r=canvas.getBoundingClientRect(),size=Math.round(r.width||48),dpr=Math.min(2,devicePixelRatio||1);canvas.width=size*dpr;canvas.height=size*dpr;let c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);renderMark(c,size/2,size/2,size*1.05,null,1)}
 document.querySelectorAll('.identity-mark').forEach(icon);
 const field=document.getElementById('identityField'),ctx=field.getContext('2d');if(!ctx)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),N=60,ROWS=30;
 // Sample A2 once. Every later frame uses only this stored luminance table.
 const source=new Float32Array(N*N);
 for(let row=0;row<N;row++)for(let col=0;col<N;col++){let sum=0;for(let a=0;a<5;a++)for(let b=0;b<5;b++)sum+=inside(((col+(a+.5)/5)/N-.5)*.9,((row+(b+.5)/5)/N-.5)*.9)?1:0;source[row*N+col]=sum/25}
 const lattice=new Float32Array(128*128);let randomState=7319;
 for(let i=0;i<lattice.length;i++){randomState^=randomState<<13;randomState^=randomState>>>17;randomState^=randomState<<5;lattice[i]=(randomState>>>0)/4294967295*2-1}
 function noise(x,y){let ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);let at=(a,b)=>lattice[((b%128+128)%128)*128+(a%128+128)%128],top=at(ix,iy)*(1-fx)+at(ix+1,iy)*fx,bottom=at(ix,iy+1)*(1-fx)+at(ix+1,iy+1)*fx;return top*(1-fy)+bottom*fy}
 const scenes=[3,29,51].map(seed=>({seed,cx:0,cy:0,size:0,segments:Array.from({length:N*ROWS},(_,i)=>{let col=i%N,row=Math.floor(i/N),lum=(source[(row*2)*N+col]+source[(row*2+1)*N+col])/2;return{col,row,lum,value:lum,x:0,y:0,vx:0,vy:0}}),pulse:0,px:0,py:0,lastX:Infinity,lastY:Infinity,hover:false,fade:0,scanAt:-1,boxes:[],live:new Float32Array(N*N),sat:new Float32Array(61*61)}));
 let w=0,h=0,dpr=0,raf=0,last=0,elapsed=0,rects=[],pointer={x:-10000,y:-10000,pending:false},focus=false;
 const animated=()=>motion&&!reduced.matches&&!document.hidden&&!document.querySelector('#method:not([hidden])');
 function measure(){w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,2);field.width=Math.round(w*dpr);field.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);let size=Math.round(Math.min(780,Math.max(440,w*.49)));Object.assign(scenes[0],{cx:w*.045,cy:h*.23,size:size*.76});Object.assign(scenes[1],{cx:w*.97,cy:h*.53,size:size*.88});Object.assign(scenes[2],{cx:w*.085,cy:h*.91,size:size*.56});rects=[...document.querySelectorAll('header,.hero h1,.hero .sub,.hero .study-dates,.hero .eyebrow,.hero aside,.toolbar,.tabs,.panel,footer')].filter(el=>el.getClientRects().length).map(el=>el.getBoundingClientRect());document.querySelectorAll('.identity-mark').forEach(icon)}
 function updatePointer(){if(!pointer.pending)return;pointer.pending=false;let protectedArea=rects.some(r=>pointer.x>=r.x-8&&pointer.x<=r.right+8&&pointer.y>=r.y-8&&pointer.y<=r.bottom+8);for(let s of scenes){s.px=pointer.x-s.cx;s.py=pointer.y-s.cy;let inPlot=Math.abs(s.px)<s.size*.49&&Math.abs(s.py)<s.size*.49&&!protectedArea;s.hover=inPlot;if(inPlot&&Math.hypot(pointer.x-s.lastX,pointer.y-s.lastY)>1.5){s.pulse=1;s.lastX=pointer.x;s.lastY=pointer.y}else if(!inPlot){s.lastX=s.lastY=Infinity}}}
 function update(s,dt,still){let cell=s.size/N,radius=s.size*.25;for(let p of s.segments){let x=(p.col+.5-N/2)*cell,y=(p.row*2+1-N/2)*cell;
  let dx=x-s.px,dy=y-s.py,dist=Math.hypot(dx,dy),influence=Math.max(0,1-dist/radius)**2*s.pulse;
  let tx=still?0:dx/(dist||1)*influence*25,ty=still?0:dy/(dist||1)*influence*25*.58;
  if(still){p.x=p.y=p.vx=p.vy=0}else{let left=dt;while(left>0){let step=Math.min(left,1/30);p.vx+=((tx-p.x)*145-p.vx*19)*step;p.vy+=((ty-p.y)*145-p.vy*19)*step;p.x+=p.vx*step;p.y+=p.vy*step;left-=step}}
  p.value=p.lum*.94+noise(p.col*.15+s.seed,p.row*.16-elapsed*.17)*.12*(.25+p.lum*.75);
 }s.pulse=still?0:s.pulse*Math.exp(-dt*5.5);let target=s.hover||focus?1:0;s.fade=still?target:s.fade+(target-s.fade)*(1-Math.exp(-dt*8));}
 function detect(s){let live=s.live,sat=s.sat,cell=s.size/N;live.fill(0);sat.fill(0);for(let p of s.segments){let x=p.col+p.x/cell,y=p.row*2+p.y/cell,v=Math.max(0,p.value);for(let row of [y,y+1]){let ix=Math.floor(x),iy=Math.floor(row),fx=x-ix,fy=row-iy;for(let a=0;a<2;a++)for(let b=0;b<2;b++){let xx=ix+a,yy=iy+b;if(xx>=0&&xx<N&&yy>=0&&yy<N)live[yy*N+xx]+=v*(a?fx:1-fx)*(b?fy:1-fy)}}}
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){let i=(y+1)*61+x+1;sat[i]=live[y*N+x]+sat[i-1]+sat[i-61]-sat[i-62]}
  let candidates=[];for(let y=0;y<=N-7;y++)for(let x=0;x<=N-7;x++){let score=(sat[(y+7)*61+x+7]-sat[y*61+x+7]-sat[(y+7)*61+x]+sat[y*61+x])/49;candidates.push({x:x-1,y:y-1,score})}candidates.sort((a,b)=>b.score-a.score);let brightest=candidates[0].score,targets=[];if(brightest>=.04)for(let c of candidates){if(c.score<brightest*.48)break;if(targets.every(t=>Math.hypot(t.x-c.x,t.y-c.y)>=16)){targets.push(c);if(targets.length===3)break}}
  let used=new Set;for(let t of targets){let old=s.boxes.filter(b=>!used.has(b)).sort((a,b)=>Math.hypot(a.tx-t.x,a.ty-t.y)-Math.hypot(b.tx-t.x,b.ty-t.y))[0];if(old&&Math.hypot(old.tx-t.x,old.ty-t.y)<12){old.tx=t.x;old.ty=t.y;old.target=1;used.add(old)}else{s.boxes.push({x:t.x,y:t.y,tx:t.x,ty:t.y,vx:0,vy:0,alpha:0,target:1});used.add(s.boxes.at(-1))}}for(let b of s.boxes)if(!used.has(b))b.target=0;s.boxes=s.boxes.filter(b=>b.target||b.alpha>.04).slice(-6);
 }
 function drawScene(s,dt,still){let cell=s.size/N,weights=[.38,1.12,2.28,3.80],opacities=[.15,.64,.93,1];ctx.strokeStyle='#68748d';ctx.lineCap='butt';for(let level=0;level<4;level++){ctx.lineWidth=weights[level]*cell/5.25;ctx.globalAlpha=(s.seed===3?.13:s.seed===29?.12:.105)*opacities[level];ctx.beginPath();for(let p of s.segments){let k=p.value<.12?0:p.value<.42?1:p.value<.89?2:3;if(k!==level)continue;let x=s.cx+(p.col+.5-N/2)*cell+p.x,y=s.cy+(p.row*2+1-N/2)*cell+p.y;ctx.moveTo(x,y-cell+.35);ctx.lineTo(x,y+cell-.35)}ctx.stroke()}
  if(s.fade>.01){if(still||elapsed-s.scanAt>=.1){detect(s);s.scanAt=elapsed}let visible=[];for(let b of s.boxes){if(still){b.x=b.tx;b.y=b.ty;b.alpha=b.target}else{let left=dt;while(left>0){let step=Math.min(left,1/120);b.vx+=((b.tx-b.x)*144-b.vx*24)*step;b.vy+=((b.ty-b.y)*144-b.vy*24)*step;b.x+=b.vx*step;b.y+=b.vy*step;left-=step}b.alpha+=(b.target-b.alpha)*(1-Math.exp(-dt*16))}if(b.alpha>.02)visible.push(b)}
   ctx.strokeStyle='#267dff';ctx.fillStyle='#267dff';ctx.lineWidth=.8;for(let b of visible){let x=s.cx+(b.x-N/2)*cell,y=s.cy+(b.y-N/2)*cell,side=9*cell;ctx.globalAlpha=.018*s.fade*b.alpha;ctx.fillRect(x,y,side,side);ctx.globalAlpha=.25*s.fade*b.alpha;ctx.strokeRect(x,y,side,side);ctx.font='9px monospace';ctx.fillText(`${b.x.toFixed(1)} / ${b.y.toFixed(1)}`,x,y-5)}for(let i=1;i<visible.length;i++){let a=visible[i-1],b=visible[i];ctx.globalAlpha=.16*s.fade*Math.min(a.alpha,b.alpha);ctx.beginPath();ctx.moveTo(s.cx+(a.x+4.5-N/2)*cell,s.cy+(a.y+4.5-N/2)*cell);ctx.lineTo(s.cx+(b.x+4.5-N/2)*cell,s.cy+(b.y+4.5-N/2)*cell);ctx.stroke()}
  }ctx.globalAlpha=1;
 }
 function paint(dt=0,still=!animated()){updatePointer();ctx.clearRect(0,0,w,h);for(let s of scenes){update(s,dt,still);drawScene(s,dt,still)}ctx.globalCompositeOperation='destination-out';ctx.fillStyle='#000';for(let r of rects)ctx.fillRect(r.x-12,r.y-10,r.width+24,r.height+20);ctx.globalCompositeOperation='source-over'}
 function tick(now){raf=0;if(!animated())return;if(Math.min(devicePixelRatio||1,2)!==dpr)measure();let dt=Math.min(.06,Math.max(0,(now-last)/1000));last=now;elapsed+=dt;paint(dt,false);raf=requestAnimationFrame(tick)}
 function sync(){cancelAnimationFrame(raf);raf=0;measure();paint(0,!animated());if(animated()){last=performance.now();raf=requestAnimationFrame(tick)}}
 let scheduled=false;function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;measure();paint(0,!animated())})}
 addEventListener('pointermove',e=>{pointer.x=e.clientX;pointer.y=e.clientY;pointer.pending=true;if(!animated())queue()},{passive:true});addEventListener('pointerdown',e=>{pointer.x=e.clientX;pointer.y=e.clientY;pointer.pending=true;scenes.forEach(s=>{s.lastX=s.lastY=Infinity});if(!animated())queue()},{passive:true});addEventListener('pointerout',e=>{if(!e.relatedTarget){pointer.x=pointer.y=-10000;pointer.pending=true;if(!animated())queue()}});addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue);
 document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
 new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
 new MutationObserver(queue).observe(document.querySelector('main'),{subtree:true,attributes:true,attributeFilter:['hidden','class']});
 new MutationObserver(sync).observe(document.getElementById('method'),{attributes:true,attributeFilter:['hidden']});
 document.getElementById('brandReplay').addEventListener('focus',()=>{focus=true;if(!animated())queue()});document.getElementById('brandReplay').addEventListener('blur',()=>{focus=false;if(!animated())queue()});
 document.fonts.ready.then(queue);
 new MutationObserver(()=>{if(!document.getElementById('brandIntro').hidden)document.querySelectorAll('#introMark .identity-mark').forEach(icon)}).observe(document.getElementById('brandIntro'),{attributes:true,attributeFilter:['hidden']});
 sync();
 let fav=document.createElement('canvas');fav.width=fav.height=64;let fc=fav.getContext('2d');renderMark(fc,32,32,67.2,null,1);let link=document.querySelector('link[rel=icon]');if(link){link.type='image/png';link.href=fav.toDataURL('image/png')}
})();

/* StyleKit Neumorphism room: soft follow aura, gentle magnetic buttons, pressed surfaces. */
(()=>{
 const fine=matchMedia('(pointer: fine)'),reduce=matchMedia('(prefers-reduced-motion: reduce)'),aura=document.createElement('div');aura.id='softAura';aura.setAttribute('aria-hidden','true');document.body.appendChild(aura);
 let x=-500,y=-500,px=x,py=y,raf=0,active=false,button=null,card=null;
 const allowed=()=>fine.matches&&!reduce.matches&&!document.hidden&&motion&&!document.body.classList.contains('intro-active');
 function reset(){cancelAnimationFrame(raf);raf=0;aura.style.opacity='0';if(button){button.style.removeProperty('--mag-x');button.style.removeProperty('--mag-y');button.classList.remove('soft-magnet');button=null}card?.classList.remove('soft-near');card=null}
 function tick(){raf=0;if(!allowed()){reset();return}px+=(x-px)*.24;py+=(y-py)*.24;aura.style.transform=`translate3d(${px-100}px,${py-100}px,0)`;if(Math.hypot(x-px,y-py)>.12&&active)raf=requestAnimationFrame(tick)}
 addEventListener('pointermove',e=>{if(e.pointerType==='touch'||!allowed()){reset();return}let overChart=e.target.closest('.chart,input,select,textarea,.tablewrap,.modal');active=!overChart;x=e.clientX;y=e.clientY;aura.style.opacity=active?'1':'0';if(!raf)raf=requestAnimationFrame(tick);
  let next=active?e.target.closest('button:not(.cell):not(:disabled)'):null;if(next!==button&&button){button.style.removeProperty('--mag-x');button.style.removeProperty('--mag-y');button.classList.remove('soft-magnet')}button=next;if(button){let r=button.getBoundingClientRect();button.classList.add('soft-magnet');button.style.setProperty('--mag-x',Math.max(-4,Math.min(4,(x-r.left-r.width/2)*.22))+'px');button.style.setProperty('--mag-y',Math.max(-3,Math.min(3,(y-r.top-r.height/2)*.22))+'px')}
  let nextCard=active?e.target.closest('.asset-card'):null;if(nextCard!==card){card?.classList.remove('soft-near');card=nextCard;card?.classList.add('soft-near')}
 },{passive:true});
 addEventListener('pointerout',e=>{if(!e.relatedTarget){active=false;reset()}});document.addEventListener('visibilitychange',reset);reduce.addEventListener('change',reset);fine.addEventListener('change',reset);new MutationObserver(()=>{if(!allowed())reset()}).observe(document.body,{attributes:true,attributeFilter:['class']});
})();

// Compact controls only; all research results remain available on every width.
(()=>{const picker=$('assetPicker'),toggle=$('assetPickerToggle'),small=matchMedia('(max-width:1199px)');let opened=false;
function render(){toggle.innerHTML='<strong>'+(LANG==='en'?'Compare assets · choose 4 of 7':'对比资产 · 七选四')+'</strong><span>'+(LANG==='en'?'Edit selection':'展开选择资产')+'</span>';toggle.setAttribute('aria-expanded',String(opened));picker.classList.toggle('picker-open',opened);$('assetPickerBody').inert=small.matches&&!opened;}
toggle.addEventListener('click',()=>{opened=!opened;render()});small.addEventListener('change',render);new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});render();})();
