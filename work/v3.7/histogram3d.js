// All observations are counted once, into a common return grid for four assets.
let histBinWidth=.01,histPicked=null;
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
 for(let k=0;k<4;k++)histogramTick(ctx,'0'+(k+1),[-leftX,-.69,-.72+k*.48],15,0);
 for(let j=0;j<=4;j++){const y=-.69+j*1.32/4;histogramTick(ctx,(c.zMax*100*j/4).toFixed(c.zMax<.1?1:0)+'%',[leftX,y,nearZ],-21,0);cloudLine(ctx,[leftX,y,nearZ],[leftX*.96,y,nearZ],'#8595ad')}
 ctx.font=(w<550?'11':'13')+'px "Lab English","Lab Sans",sans-serif';
 const po=cloudProject(...origin),px=cloudProject(...xe),pyo=cloudProject(...yo),py=cloudProject(...ye);
 histogramAligned(ctx,LANG==='en'?'X · 5-year return (%)':'X · 五年累计收益率（%）',origin,xe,(w<550?34:39)*Math.sign(px.x-po.x||1));
 histogramAligned(ctx,LANG==='en'?'Y · Asset':'Y · 资产类别',yo,ye,-37*Math.sign(py.y-pyo.y||1));
 histogramAligned(ctx,LANG==='en'?'Z · Sample share (%)':'Z · 样本比例（%）',origin,ze,-51);
 const zero=-1.08-c.binLo/(c.binHi-c.binLo)*2.16;if(zero>=-1.08&&zero<=1.08)cloudLine(ctx,[zero,-.685,-.9],[zero,-.685,.9],'#ad647b99',1,[3,4]);
 ctx.textAlign='left';ctx.fillStyle='#78869b';ctx.font='10px "Lab English","Lab Sans",sans-serif';ctx.fillText(LANG==='en'?'FREQUENCY / SHARED SCALE':'样本频率 / 四资产共用刻度',16,22);ctx.textAlign='right';ctx.fillText('n = '+fmt(c.points.length),w-16,22)
}
function histogramInside(x,y,pts){let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside}return inside}
function cloudHit(x,y){if(!cloudScene||cloudScene.progress<1)return null;const faces=cloudScene.faces||[];for(let i=faces.length-1;i>=0;i--)if(histogramInside(x,y,faces[i].pts))return faces[i].b;return null}
function histogramTip(b){return`<strong>${translate(ACTIVE[b.k].name)}</strong><br>${pct(b.from)} ≤ ${LANG==='en'?'return':'收益率'} &lt; ${pct(b.to)}<br>${LANG==='en'?'Sample share':'样本比例'} ${pct(b.p)}<br>${fmt(b.n)} / ${fmt(scopeData[b.k].length)} ${LANG==='en'?'samples':'个样本'}`}
function installHistogram(){$('histBinWidth').onchange=e=>{const v=Number(e.target.value);if(![.005,.01,.02,.05].includes(v))return;histBinWidth=v;histPicked=null;cloudScene=null;prepareCloud(true)};const select=$('histAsset').onchange;$('histAsset').onchange=e=>{histPicked=null;select?.(e)}}
