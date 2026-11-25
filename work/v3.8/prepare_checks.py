from pathlib import Path
q=Path('work/v3.8');s=Path('work/v3.7/checks.cjs').read_text(encoding='utf8')
s=s.replace("work/v3.7/app.js","work/v3.8/app.js").replace("fs.readFileSync('work/v3.7/'+n","fs.readFileSync('work/v3.8/'+n").replace("work/v3.7/markets.js","work/v3.8/markets.js").replace("outputs/v3.7/定投交互实验室_v3.7.html","outputs/v3.8/定投交互实验室_v3.8.html").replace('[.005,.01,.02,.05]','[.005,.01,.02,.04,.05]')
s+='''
box.marketData=JSON.parse(fs.readFileSync('work/v3.8/market-snapshot.json','utf8'));vm.runInContext('let motion=true;'+fs.readFileSync('work/v3.8/playback.js','utf8'),box);
vm.runInContext(`
for(const [w,h]of [[375,715],[390,844],[760,715],[1280,715],[1945,1251]]){const bs=marketIntroLayout(w,h);if(bs.length!==5)throw Error('Missing market');for(const b of bs)if(b.x<0||b.y<0||b.x+b.w>w||b.y+b.h>h||b.w<=0||b.h<=55)throw Error('Market layout clipped');for(let i=0;i<5;i++)for(let j=i+1;j<5;j++){const a=bs[i],b=bs[j];if(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y)throw Error('Overlapping markets')}}
for(const a of marketData){const path=marketCurveGeometry(a,{x:20,y:30,w:330,h:130}),p0=marketCurveHead(path,0),p1=marketCurveHead(path,1);if(p0.x!==path.points[0].x||p0.y!==path.points[0].y||p1.x!==path.points.at(-1).x||p1.y!==path.points.at(-1).y)throw Error('Replay endpoints not real');for(let i=0;i<=100;i++){const p=marketCurveHead(path,i/100);if(!Number.isFinite(p.x+p.y)||p.x<20||p.x>350)throw Error('Invalid replay point')}}
console.log('PASS: five responsive layouts, nonoverlap, real curve endpoints and interpolated playback positions.');`,box);
const html=fs.readFileSync('outputs/v3.8/定投交互实验室_v3.8.html','utf8'),glow=fs.readFileSync('work/v3.8/glow.js','utf8');assert(!html.includes('id="marketField"'));assert(!html.includes('id="histAxisKeys"'));assert(!glow.includes("addEventListener('pointer"));assert(html.includes('value="0.04" selected'));console.log('PASS: no main-background quotes, no cursor triggers, no axis cards, 4 pp default.');
'''
(q/'checks.cjs').write_text(s,encoding='utf8')
