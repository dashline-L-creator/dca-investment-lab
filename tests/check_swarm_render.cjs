// Execute the real 2D render path; layout-only tests missed a paint-time scope error.
const fs=require('fs'),vm=require('vm'),assert=require('assert');const data=fs.readFileSync('data/research/dca.json','utf8'),source=fs.readFileSync('.cache/app.js','utf8'),els=new Map();
function el(id){if(!els.has(id))els.set(id,{textContent:id==='dataset'?data:'',value:'0',dataset:{},classList:{toggle(){}},setAttribute(){}});return els.get(id)}
let dots=0;const ctx=new Proxy({arc(x,y,r){assert(Number.isFinite(x+y+r));dots++},measureText:s=>({width:s.length*7}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
const box={ctx,console,Math,Date,document:{getElementById:el,querySelectorAll:()=>[]},performance:{now:()=>1000},localStorage:{getItem:()=>null},requestAnimationFrame:()=>1,cancelAnimationFrame(){},clearInterval(){},matchMedia:()=>({matches:true})};vm.createContext(box);
const layout=source.slice(source.indexOf('function prepareSwarm('),source.indexOf('function drawDistribution('));
vm.runInContext(source.split('const charts={}')[0]+`const charts={};let cloudMode='2d',swarmScene=null,swarmKey='',swarmFrame=0,histPicked=null,W=320;function stopScan(){}function setup(){return {cv:{dataset:{}},ctx,w:W,h:390,l:30,r:22,t:38,b:50}}function drawGrowth(){}function renderStats(){}function renderMap(){}function drawDistribution(){}`+fs.readFileSync('src/js/axis.js','utf8')+fs.readFileSync('src/js/morph.js','utf8')+layout,box);
for(const w of [280,320,760,1100])for(const mode of ['common','all'])for(let k=0;k<4;k++){
 dots=0;box.width=w;box.mode=mode;box.asset=k;
 vm.runInContext(`W=width;setScope(mode);$('histAsset').value=asset;prepareSwarm(false);morphAmount=0;paintSwarm(1);`,box);
 const n=vm.runInContext('swarmScene.points.length',box);assert(dots>=n&&n>0);
 vm.runInContext('morphAmount=1;paintSwarm(1);morphAmount=0;paintSwarm(1);',box);
}
console.log('PASS: real 2D canvas draws every sample across 32 viewport/scope/asset cases; particle globe and restoration draw finite coordinates.');
