const fs=require('fs'),vm=require('vm'),assert=require('assert');
const box={Intl,Date,performance:{now:()=>0}};vm.createContext(box);
vm.runInContext('function marketMinutes(s){return Number(s.slice(0,2))*60+Number(s.slice(2))}\n'+['gold.js','sessions.js','playback.js'].map(f=>fs.readFileSync('src/js/'+f,'utf8')).join('\n'),box);
function run(a){box.a=a;return vm.runInContext('marketSession(a)',box)}
for(const [code,close]of [['sh000001',900],['sz399001',900],['hkHSI',970],['us.IXIC',960],['us.INX',960]]){
 const a={code,date:'2026-11-25',previous:100,points:[['0930',100],['1000',101]]},s=run(a);assert.equal(s.close,close);assert.equal(s.startLabel,'09:30');
 const p=vm.runInContext('marketCurveGeometry(a,{x:0,y:0,w:390,h:150})',box);assert(p.points.at(-1).x<390);const duration=code.startsWith('sh')||code.startsWith('sz')?240:code==='hkHSI'?340:390;assert.equal(p.points.at(-1).x,30/duration*390);
 box.p=p;for(const t of [0,.1,.5,.9,1]){box.t=t;const head=vm.runInContext('marketCurveHead(p,t)',box);assert(head.x<=p.points.at(-1).x);assert(head.x>=p.points[0].x)}
 const full={...a,points:[['0930',100],[String(Math.floor(close/60)).padStart(2,'0')+String(close%60).padStart(2,'0'),101]]};run(full);assert.equal(vm.runInContext('marketCurveGeometry(a,{x:0,y:0,w:390,h:150}).points.at(-1).x',box),390);
}
assert.equal(run({code:'GC00Y',date:'2026-11-25',points:[['0700',100],['2330',101],['0100',102]]}).close,1800);
assert.equal(run({code:'GC00Y',date:'2026-07-15',points:[['0600',100],['2330',101],['0100',102]]}).close,1740);
assert.equal(run({code:'us.IXIC',date:'2026-11-27',points:[['0930',100],['1000',101]]}).close,780);
assert.equal(run({code:'hkHSI',date:'2026-12-24',points:[['0930',100],['1000',101]]}).close,730);
const late=run({code:'hkHSI',date:'2026-11-25',points:[['0930',100],['1559',101],['1831',102]]});assert.equal(late.close,970);assert.equal(late.points.at(-1)[0],'1559');
console.log('PASS: five partial/complete index sessions, future area remains empty, replay heads stop at actual data, COMEX summer/winter and midnight, known half-day closes.');
