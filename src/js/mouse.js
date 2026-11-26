/* StyleKit Neumorphism room: soft follow aura, gentle magnetic buttons, pressed surfaces. */
(()=>{
 const fine=matchMedia('(pointer: fine)'),reduce=matchMedia('(prefers-reduced-motion: reduce)'),aura=document.createElement('div');aura.id='softAura';aura.setAttribute('aria-hidden','true');document.body.appendChild(aura);
 let x=-500,y=-500,px=x,py=y,raf=0,active=false,button=null,card=null;
 const allowed=()=>fine.matches&&!reduce.matches&&!document.hidden&&motion&&!document.body.classList.contains('intro-active');
 function reset(){cancelAnimationFrame(raf);raf=0;aura.style.opacity='0';if(button){button.style.removeProperty('--mag-x');button.style.removeProperty('--mag-y');button.classList.remove('soft-magnet');button=null}card?.classList.remove('soft-near');card=null}
 function tick(){raf=0;if(!allowed()){reset();return}px+=(x-px)*.24;py+=(y-py)*.24;aura.style.transform=`translate3d(${px-100}px,${py-100}px,0)`;if(Math.hypot(x-px,y-py)>.12&&active)raf=requestAnimationFrame(tick)}
 addEventListener('pointermove',e=>{if(e.pointerType==='touch'||!allowed()){reset();return}let overChart=e.target.closest('.chart,input,select,textarea,.tablewrap,.modal');active=!overChart;x=e.clientX;y=e.clientY;aura.style.opacity=active?'1':'0';if(!raf)raf=requestAnimationFrame(tick);
  let next=active?e.target.closest('button:not(.cell):not(:disabled)'):null;if(next!==button&&button){button.style.removeProperty('--mag-x');button.style.removeProperty('--mag-y');button.classList.remove('soft-magnet')}button=next;if(button){let r=button.getBoundingClientRect();button.classList.add('soft-magnet');button.style.setProperty('--mag-x',Math.max(-4,Math.min(4,(x-r.left-r.width/2)*.22))+'px');button.style.setProperty('--mag-y',Math.max(-3,Math.min(3,(y-r.top-r.height/2)*.22))+'px')}
  let nextCard=active?e.target.closest('.asset-card'):null;if(nextCard!==card){card?.classList.remove('soft-near');card=nextCard;card?.classList.add('soft-near')}
 },{passive:true});
 addEventListener('pointerout',e=>{if(!e.relatedTarget){active=false;reset()}});document.addEventListener('visibilitychange',reset);reduce.addEventListener('change',reset);fine.addEventListener('change',reset);new MutationObserver(()=>{if(!allowed())reset()}).observe(document.body,{attributes:true,attributeFilter:['class']});
})();
