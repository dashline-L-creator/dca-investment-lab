const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('work/v3.4/app.js','utf8'),data=fs.readFileSync('work/v3.4/data.json','utf8'),els=new Map();
function el(id){if(!els.has(id))els.set(id,{textContent:id==='dataset'?data:'',value:'0',dataset:{},classList:{toggle(){}},setAttribute(){}});return els.get(id)}
const context={document:{getElementById:el,querySelectorAll:()=>[]},console,clearInterval(){},localStorage:{getItem:()=>null}};
vm.createContext(context);
vm.runInContext(source.split('const charts={}')[0]+`
let swarmKey='';function stopScan(){}function drawGrowth(){}function renderStats(){}function renderMap(){}function drawDistribution(){}
let scenarios=0,paths=0;
for(const code of DATA.assets.map(a=>a.code))for(const mode of ['common','all']){omitted=code;setScope(mode);if(ACTIVE.length!==4)throw Error('Not exactly four');if(ACTIVE.some(a=>a.code===code))throw Error('Omitted asset leaked');if(starts.at(-1)!=='2021-10-29')throw Error('Wrong final start');let union=[...new Set(ACTIVE.flatMap(a=>a.samples.map(r=>r[0])))].sort(),intersection=union.filter(d=>ACTIVE.every(a=>a.lookup.has(d)));if(JSON.stringify(starts)!==JSON.stringify(mode==='common'?intersection:union))throw Error('Wrong scope dates');for(let i of [0,Math.floor(starts.length/2),starts.length-1]){setStart(i);paths+=trajectories.filter(Boolean).length}for(let k=0;k<4;k++){let expected=scopeData[k].reduce((v,r)=>v+r[5],0)/scopeData[k].length;if(Math.abs(expected-statistics[k].mean)>1e-12)throw Error('Wrong mean');if(COLORS[k]!==PALETTE[DATA.assets.indexOf(ACTIVE[k])])throw Error('Unstable color')}scenarios++}
// Independently reconstruct every asset's last sample, including 2026 dividends.
for(let a of DATA.assets){let r=a.samples.at(-1),start=dateIndex.get(r[0]),end=dateIndex.get(r[1]),units=0,count=0;for(let i=start;i<end;i++)if(a.trading[i]){units+=50/a.prices[i];count++}if(count!==r[2]||Math.abs(units*a.prices[end]-r[4])>.00001)throw Error('Latest sample reconstruction failed')}
console.log('PASS:',scenarios,'asset/scope selections,',paths,'trajectory checks; final date, exact intersection/union, means, stable colors, latest sample reconstructions.');`,context);
// All sample inputs and terminal values must be finite and sensible.
let d=JSON.parse(data);for(const a of d.assets){assert.equal(a.prices.length,d.dates.length);assert.equal(a.trading.length,d.dates.length);for(const r of a.samples){assert(r[0]<='2021-10-31');assert(r[1]>r[0]);assert(r[2]>0);assert.equal(r[3],r[2]*50);assert(r[4]>0);assert(Number.isFinite(r[5]));assert(Math.abs(r[4]/r[3]-1-r[5])<1e-12)}}
console.log('PASS: all',d.assets.reduce((n,a)=>n+a.samples.length,0),'samples and five daily series structurally valid.');
