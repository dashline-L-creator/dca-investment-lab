// Local, offline GSAP enhancement. Research cashflows and samples remain untouched.
(()=>{
 if(!window.gsap||!window.Flip||!window.SplitText)return;
 gsap.registerPlugin(Flip,SplitText);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),cards=$('cards');
 let replay=null,cardFlip=null,sortByReturn=false,sortPending=false,split=null,titleTween=null,titleSeen=false;
 const animated=()=>motion&&!reduced.matches;
 function syncSortLabel(){const b=$('cardSort');b.textContent=LANG==='en'?(sortByReturn?'Asset order ↗':'Sort by return ↗'):(sortByReturn?'恢复资产顺序 ↗':'按收益排序 ↗');b.setAttribute('aria-pressed',String(sortByReturn));}
 function orderCards(nodes){if(!sortByReturn)return nodes;return nodes.slice().sort((a,b)=>{const ratio=code=>{const k=ACTIVE.findIndex(x=>x.code===code),t=trajectories[k];if(!t)return -Infinity;const p=currentPoint(t);return p.capital?p.value/p.capital-1:0};return ratio(b.dataset.code)-ratio(a.dataset.code)});}
 function renderCards(html){
  const template=document.createElement('template');template.innerHTML=html;
  const before=[...cards.children],old=new Map(before.map(e=>[e.dataset.code,e]));
  const incoming=[...template.content.children],membership=incoming.map(e=>e.dataset.code).join('|')!==before.map(e=>e.dataset.code).sort((a,b)=>ACTIVE.findIndex(x=>x.code===a)-ACTIVE.findIndex(x=>x.code===b)).join('|');
  const transition=animated()&&(membership||sortPending);
  if(transition){cardFlip?.kill();gsap.set(before,{clearProps:'transform,opacity'});}
  const state=transition?Flip.getState(before):null;
  let changed=false;
  const next=incoming.map(fresh=>{const code=fresh.dataset.code,node=old.get(code)||fresh,signature=fresh.innerHTML;
   if(node.dataset.content!==signature){const opened=node.querySelector('.card-details')?.open;node.innerHTML=signature;node.dataset.content=signature;node.dataset.detailsOpen=opened?'true':'false';changed=true;}
   return node;
  });
  // Sorting is explicit: during playback cards stay put so values remain easy to follow.
  const ordered=sortPending||membership?orderCards(next):before.map(e=>next.find(n=>n.dataset.code===e.dataset.code)).filter(Boolean);
  for(const e of before)if(!next.includes(e))e.remove();
  if(ordered.some((e,i)=>cards.children[i]!==e))cards.append(...ordered);
  if(changed){window.refreshCardDetails?.();for(const e of ordered)if(e.dataset.detailsOpen==='true'){const d=e.querySelector('.card-details');if(d)d.open=true;}}
  if(state)cardFlip=Flip.from(state,{targets:ordered,duration:matchMedia('(max-width:599px)').matches ? .36 : .55,ease:'power2.inOut',scale:false,onEnter:els=>gsap.fromTo(els,{opacity:0,y:12},{opacity:1,y:0,duration:.32,clearProps:'transform,opacity'}),onComplete:()=>gsap.set(ordered,{clearProps:'transform,opacity'})});
  sortPending=false;syncSortLabel();
 }
 function sampleHead(points,progress){const raw=Math.max(0,Math.min(1,progress))*(points.length-1),i=Math.floor(raw),j=Math.min(i+1,points.length-1),f=raw-i;return{i,raw,date:points[i].date,value:points[i].value+(points[j].value-points[i].value)*f};}
 function drawGrowth(){
  const c=setup('growthChart');if(!c)return;
  const ts=trajectories.filter(Boolean);if(!ts.length)return;
  const n=ts[0].points.length,end=Math.floor(position/1000*(n-1)),max=Math.max(...ts.flatMap(t=>t.points.map(p=>Math.max(p.value,p.capital))));
  axes(c,0,n-1,0,max*1.1,v=>ts[0].points[Math.min(n-1,Math.round(v))].date.slice(0,7),v=>LANG==='en'?(v/1000).toFixed(0)+'k':(v/10000).toFixed(1)+'万');
  const ctx=c.ctx;ctx.fillStyle='#626d80';ctx.textAlign='left';ctx.fillText(LANG==='en'?'RMB / CNY':'人民币 / 元',c.l,0);
  // The full contribution reference is intentional; colored curves reveal actual history.
  line(c,ts[0].points.map((p,i)=>[i,p.capital]),'#8a94a5',[4,5]);
  const raw=position/1000*(n-1),headX=c.X(raw);
  if(position<1000){ctx.save();ctx.strokeStyle='#6d5dfc35';ctx.setLineDash([3,5]);ctx.beginPath();ctx.moveTo(headX,c.t);ctx.lineTo(headX,c.h-c.b);ctx.stroke();ctx.restore();}
  ts.forEach(t=>{const head=sampleHead(t.points,position/1000),pts=t.points.slice(0,head.i+1).map((p,i)=>[i,p.value]);if(head.raw>head.i)pts.push([head.raw,head.value]);
   line(c,pts,COLORS[t.k]);ctx.save();ctx.fillStyle=COLORS[t.k];ctx.shadowColor=COLORS[t.k];ctx.shadowBlur=position<1000?10:0;ctx.beginPath();ctx.arc(c.X(head.raw),c.Y(head.value),position<1000?4:3.5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#e0e5ec';ctx.lineWidth=1.5;ctx.stroke();ctx.restore();
  });
  charts.growth={...c,end,ts};
  const label=$('growthPlayhead');label.hidden=position>=1000;
  if(!label.hidden){label.textContent=ts[0].points[end].date;const width=label.getBoundingClientRect().width;label.style.left=Math.max(c.l,Math.min(c.w-c.r-width,headX-width/2))+'px';label.style.top='25px';}
 }
 function stopReplay(){replay?.kill();replay=null;}
 function play(){
  if(replay){stopGrowth();return;}
  stopTravel();if(position>=1000)position=0;
  if(!animated()){position=1000;$('growthSlider').value=1000;renderGrowth();return;}
  const clock={value:position};$('growthPlay').textContent=LANG==='en'?'Ⅱ Pause replay':'Ⅱ 暂停回放';
  replay=gsap.to(clock,{value:1000,duration:8*(1-position/1000),ease:'none',onUpdate:()=>{position=clock.value;$('growthSlider').value=position;renderGrowth();},onComplete:()=>{replay=null;position=1000;$('growthSlider').value=1000;renderGrowth();stopGrowth();}});
 }
 function revealTitle(){
  if(!$('brandIntro').hidden||titleSeen)return;
  titleSeen=true;if(!animated())return;
  document.fonts.ready.then(()=>{if(!animated())return;const h=document.querySelector('.hero h1');
   // SplitText restores responsive line breaks; text remains accessible through its aria label.
   split=SplitText.create(h,{type:'lines',autoSplit:true,onSplit:self=>gsap.from(self.lines,{yPercent:65,opacity:0,duration:.65,stagger:.10,ease:'power2.out',onComplete:()=>{h.classList.remove('headline-entering');}})});
   h.classList.add('headline-entering');titleTween=gsap.getTweensOf(split.lines)[0];
  });
 }
 const playhead=document.createElement('span');playhead.id='growthPlayhead';playhead.className='growth-playhead';playhead.hidden=true;$('growthChart').parentElement.append(playhead);
 window.dcaMotion={renderCards,drawGrowth,stopReplay,sampleHead};
 $('growthPlay').onclick=play;
 $('cardSort').onclick=()=>{stopTravel();stopGrowth();sortByReturn=!sortByReturn;sortPending=true;renderGrowth();};
 const introWatcher=new MutationObserver(revealTitle);introWatcher.observe($('brandIntro'),{attributes:true,attributeFilter:['hidden']});
 const settle=()=>{if(animated())return;stopGrowth();cardFlip?.kill();gsap.set([...cards.children],{clearProps:'transform,opacity'});titleTween?.kill();split?.revert();split=null;document.querySelector('.hero h1').classList.remove('headline-entering');};
 reduced.addEventListener('change',settle);new MutationObserver(()=>{syncSortLabel();settle();}).observe(document.body,{attributes:true,attributeFilter:['class']});
 new MutationObserver(syncSortLabel).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 renderGrowth();revealTitle();
})();
