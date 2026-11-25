// Shared return scale; height is deliberately normalized per asset.
// The smoothed silhouette is decorative. Dots retain exact observed returns.
const RIDGE_BINS=54,RIDGE_LIGHT=['#8daaff','#e7c274','#5ce0ca','#b7a0ff','#edaa85','#85c9ef','#e89ac6'];
function ridgeColor(k){return RIDGE_LIGHT[DATA.assets.indexOf(ACTIVE[k])]||'#a5b9ff'}
function cloudRecords(rows,lo,hi){return rows.flatMap((rs,k)=>{const bins=Array.from({length:RIDGE_BINS},()=>[]);rs.forEach(r=>bins[Math.max(0,Math.min(RIDGE_BINS-1,Math.floor((r[5]-lo)/(hi-lo)*RIDGE_BINS)))].push(r));const peak=Math.max(1,...bins.map(b=>b.length));return bins.flatMap(bin=>bin.sort((a,b)=>a[0].localeCompare(b[0])).map((r,j)=>({r,k,x:-1.08+(r[5]-lo)/(hi-lo)*2.16,y:-.66+(j+.5)/peak*1.18,z:-.72+k*.48})))})}
function ridgeProfile(k){const c=cloudScene;c.profiles??=[];if(c.profiles[k])return c.profiles[k];const bins=Array(RIDGE_BINS).fill(0);scopeData[k].forEach(r=>bins[Math.max(0,Math.min(RIDGE_BINS-1,Math.floor((r[5]-c.lo)/(c.hi-c.lo)*RIDGE_BINS)))]++);const smooth=bins.map((_,i)=>{let sum=0,w=0;for(let j=-2;j<=2;j++){let ix=i+j;if(ix>=0&&ix<bins.length){let weight=3-Math.abs(j);sum+=bins[ix]*weight;w+=weight}}return sum/w}),peak=Math.max(1,...smooth);return c.profiles[k]=smooth.map((v,i)=>[-1.08+(i+.5)/RIDGE_BINS*2.16,-.66+v/peak*1.18,-.72+k*.48])}
function paintCloud(progress=1){const c=cloudScene;if(!c)return;const {ctx,w,h}=c;c.progress=progress;ctx.clearRect(0,0,w,h);ctx.font='11px "Lab Numbers","Lab English","Lab Sans",sans-serif';
 const line=(a,b,color,width=1,dash=[])=>cloudLine(ctx,a,b,color,width,dash);
 const path=pts=>{ctx.beginPath();pts.forEach((p,i)=>{const v=cloudProject(...p);i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y)})};
 // Perspective floor and subtle horizon rings add depth without invented data.
 const floor=[[-1.24,-.69,-.95],[1.24,-.69,-.95],[1.24,-.69,.95],[-1.24,-.69,.95]];path(floor);ctx.closePath();ctx.fillStyle='#9caed00b';ctx.fill();ctx.strokeStyle='#8ca1c22c';ctx.stroke();
 for(let i=0;i<=8;i++){let x=-1.08+i*2.16/8;line([x,-.69,-.85],[x,-.69,.85],'#9eb7e118')}
 const zero=-1.08-c.lo/(c.hi-c.lo)*2.16;line([zero,-.69,-.9],[zero,-.69,.9],'#ee8ba477',1.2,[4,5]);
 const order=[0,1,2,3].sort((a,b)=>cloudProject(0,0,-.72+b*.48).depth-cloudProject(0,0,-.72+a*.48).depth);let screen=[];
 for(const k of order){const z=-.72+k*.48,col=ridgeColor(k),profile=ridgeProfile(k).map(p=>[p[0],-.66+(p[1]+.66)*progress,p[2]]),base=[[-1.08,-.66,z],[1.08,-.66,z]];
  // A filled ribbon with an illuminated crest, and a floor reflection.
  path([base[0],...profile,base[1]]);ctx.closePath();let g=ctx.createLinearGradient(0,h*.22,0,h*.83);g.addColorStop(0,col+'46');g.addColorStop(1,col+'03');ctx.fillStyle=g;ctx.fill();
  path(profile);ctx.strokeStyle=col+'88';ctx.lineWidth=1.5;ctx.shadowColor=col;ctx.shadowBlur=10;ctx.stroke();ctx.shadowBlur=0;line(...base,col+'70',1.1);
  const dots=c.points.filter(p=>p.k===k).map(p=>({...p,...cloudProject(p.x,-.66+(p.y+.66)*progress,z)})).sort((a,b)=>b.depth-a.depth);screen.push(...dots);
  const radius=Math.max(.8,Math.min(1.6,w/620));ctx.fillStyle=col;for(const p of dots){ctx.globalAlpha=(.36+.2*p.p)*progress;ctx.beginPath();ctx.arc(p.x,p.y,radius*Math.min(1.2,p.p),0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
  const median=statistics[k].median,mx=-1.08+(median-c.lo)/(c.hi-c.lo)*2.16;line([mx,-.67,z],[mx,-.57,z],col,2);const mp=cloudProject(mx,-.67,z);ctx.beginPath();ctx.arc(mp.x,mp.y,3,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
 }
 c.screen=screen;ctx.font='11px "Lab Numbers","Lab English","Lab Sans",sans-serif';for(let i=0;i<=4;i++){let x=-1.08+i*2.16/4;cloudLabel(ctx,((c.lo+(c.hi-c.lo)*i/4)*100).toFixed(0)+'%',x,-.86,-.85,'#b4c3db')}
 if(progress>=1){for(const p of screen.filter(p=>p.r[0]===selected)){ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.strokeStyle=ridgeColor(p.k);ctx.lineWidth=1.6;ctx.stroke()}if(cloudHover){const p=screen.find(p=>p.r===cloudHover.r&&p.k===cloudHover.k);if(p){ctx.beginPath();ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke()}}}
 // Asset labels in fixed rows stay readable at every camera angle.
 ctx.textAlign='left';ctx.fillStyle='#c1cde1';ctx.font='10px "Lab English","Lab Sans",sans-serif';ctx.fillText('DISTRIBUTION / FOUR LAYERS',20,26);ctx.textAlign='right';ctx.fillStyle='#8094b6';ctx.fillText('n = '+fmt(c.points.length),w-20,26);
 ctx.textAlign='left';ctx.fillStyle='#899dbd';ctx.fillText(LANG==='en'?'RETURN →  /  HEIGHTS NORMALIZED PER ASSET':'收益率 →  /  山高按各资产峰值归一化',20,h-18);
}
