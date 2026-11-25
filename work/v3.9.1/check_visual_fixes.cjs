const fs=require('fs'),vm=require('vm'),assert=require('assert');
const box={Intl,Date,performance:{now:()=>0}};vm.createContext(box);
vm.runInContext('function marketMinutes(s){return Number(s.slice(0,2))*60+Number(s.slice(2))}\n'+['gold.js','sessions.js','playback.js','axis.js'].map(f=>fs.readFileSync('work/v3.9.1/'+f,'utf8')).join('\n'),box);
for(const code of ['sh000001','sz399001','hkHSI']){
 const start=code==='hkHSI'?'1200':'1130',middle=code==='hkHSI'?'1230':'1200';
 box.a={code,date:'2026-11-25',previous:100,points:[['0930',100],[start,101],[middle,101],['1300',102],['1400',103]]};
 const p=vm.runInContext('marketCurveGeometry(a,{x:0,y:0,w:400,h:150})',box),s=vm.runInContext('marketSession(a)',box);
 assert.equal(s.points.length,4);assert.equal(p.points[1].x,p.points[2].x);assert.equal(p.points[1].y!==p.points[2].y,true);assert(p.points.at(-1).x<400);
}
box.ctx={measureText:t=>({width:t.length*7.3})};
for(let width=80;width<=1200;width+=3){box.width=width;const ticks=vm.runInContext('axisTickLayout(ctx,0,60,0,width,v=>String(2015+Math.floor(v/12))+"-"+String(Math.round(v)%12+1).padStart(2,"0"))',box);assert(ticks.length>=1);for(let i=1;i<ticks.length;i++)assert(ticks[i].start>=ticks[i-1].end+12);if(width>=120){assert.equal(ticks[0].x,0);assert.equal(ticks.at(-1).x,width)}}
assert.equal(vm.runInContext('marketSession({code:"hkHSI",date:"2026-12-24",points:[["0930",100],["1200",101],["1210",102]]}).points.length',box),3);
console.log('PASS: A-share/HK lunch gaps removed without price changes, real future blank retained; 374 narrow/wide axis layouts have no overlapping labels; HK half-day auction retained.');
