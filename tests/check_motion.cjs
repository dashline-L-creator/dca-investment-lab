// Exercise the actual canvas renderer and playback lifecycle on frozen asset paths.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('src/js/motion.js','utf8');
const section=(from,to)=>source.slice(source.indexOf(from),source.indexOf(to));
const data=JSON.parse(fs.readFileSync('data/research/dca.json','utf8')),els=new Map();
const el=id=>{if(!els.has(id))els.set(id,{value:1000,hidden:false,style:{},textContent:'',getBoundingClientRect:()=>({width:78})});return els.get(id)};
const ctx=new Proxy({},{get:(o,k)=>o[k]||(()=>{})});
let activeTween=null,killed=0,rendered=0;
const box={Math,LANG:'zh',COLORS:['#506bb7'],position:1000,trajectories:[],charts:{},$:el,
 setup:()=>({ctx,w:350,h:300,l:40,r:12,t:24,b:44}),
 axes:c=>Object.assign(c,{X:x=>40+x/1200*298,Y:y=>256-y/120000*232}),line(c,points){for(const p of points)assert(Number.isFinite(p[0]+p[1]));},
 renderGrowth(){rendered++},stopTravel(){},animated:()=>true,
 gsap:{to(clock,options){activeTween={clock,options,kill(){killed++}};return activeTween;}}
};vm.createContext(box);
vm.runInContext('let replay=null;'+section('function sampleHead(','function stopReplay(')+section('function stopReplay(','function revealTitle(')+'function stopGrowth(){stopReplay();$("growthPlay").textContent="▶ 回放这5年"}',box);
for(const asset of data.assets){const r=asset.samples[Math.floor(asset.samples.length/2)],start=data.dates.indexOf(r[0]),end=data.dates.indexOf(r[1]);let units=0,capital=0;
 const points=[];for(let i=start;i<=end;i++){if(i<end&&(!asset.trading||asset.trading[i])){units+=50/asset.prices[i];capital+=50}points.push({date:data.dates[i],value:units*asset.prices[i],capital})}
 box.trajectories=[{k:0,points}];box.points=points;
 for(const p of [0,.001,.25,.5,.999,1]){box.progress=p;const h=vm.runInContext('sampleHead(points,progress)',box);assert(Number.isFinite(h.raw+h.value));assert.equal(h.date,points[h.i].date);if(p===0)assert.equal(h.value,points[0].value);if(p===1)assert(Math.abs(h.value-r[4])<.001);box.position=p*1000;vm.runInContext('drawGrowth()',box);assert.equal(el('growthPlayhead').hidden,p===1);}
}
box.position=1000;vm.runInContext('play()',box);assert.equal(box.position,0);activeTween.clock.value=432.1;activeTween.options.onUpdate();assert.equal(box.position,432.1);vm.runInContext('play()',box);assert.equal(killed,1);assert.equal(box.position,432.1);
vm.runInContext('play()',box);assert(Math.abs(activeTween.options.duration-8*(1-.4321))<1e-10);activeTween.options.onComplete();assert.equal(box.position,1000);assert.equal(el('growthSlider').value,1000);
box.animated=()=>false;box.position=200;vm.runInContext('play()',box);assert.equal(box.position,1000);
assert(rendered>=3);console.log('PASS: seven-asset real path endpoints, fractional heads and 42 finite canvas states; pause/resume, exact completion and reduced-motion fallback.');
