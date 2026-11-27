const fs=require('fs'),vm=require('vm'),assert=require('assert');
(async()=>{
 const nodes=new Map(),events={},el=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,value:'25',textContent:'',setAttribute(){}});return nodes.get(id)};
 let watch,plays=0,paused=true,reject=null;
 const audio={src:'',load(){},addEventListener(){},pause(){paused=true},get paused(){return paused},async play(){plays++;if(reject)throw {name:reject};paused=false}};
 const box={$:el,translate:x=>x,Audio:function(){return audio},localStorage:{getItem:()=>null,setItem(){}},document:{hidden:false,addEventListener:(k,f)=>events[k]=f},MutationObserver:class{constructor(fn){watch=fn}observe(){}}};
 vm.runInNewContext(fs.readFileSync('src/js/music.js','utf8'),box);
 assert.equal(plays,0,'cover must remain silent');
 reject='NotAllowedError';events['dca-enter']();assert.equal(plays,1,'play must be invoked synchronously by entry gesture');await new Promise(setImmediate);assert.equal(el('musicBtn').textContent,'▶ 播放音乐');
 reject=null;el('musicBtn').onclick();await new Promise(setImmediate);assert(!paused);assert(audio.loop);
 el('musicBtn').onclick();assert(paused);events['dca-enter']();assert.equal(plays,2,'manual pause survives intro closure');
 el('musicBtn').onclick();await new Promise(setImmediate);box.document.hidden=true;events.visibilitychange();assert(paused);
 box.document.hidden=false;events.visibilitychange();await new Promise(setImmediate);assert(!paused);
 const beforeReplay=plays;events['dca-enter']();assert(!paused);assert.equal(plays,beforeReplay,'replaying cover must not restart music');
 el('musicVolume').value='60';el('musicVolume').oninput();assert.equal(audio.volume,.6);
 el('musicBtn').onclick();reject='NotSupportedError';el('musicBtn').onclick();await new Promise(setImmediate);assert.equal(el('musicBtn').textContent,'↻ 重试音乐');
 console.log('PASS: silent cover, autoplay denial, explicit pause, background/intro lifecycle, volume and source failure.');
})().catch(e=>{console.error(e);process.exitCode=1});
