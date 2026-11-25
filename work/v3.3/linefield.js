/* Original A2 mark, sampled into four discrete vertical line weights. */
(()=>{
 const anchors=[[-.19,.105],[-.145,.088],[-.095,.005],[-.045,.024],[.005,.039],[.065,-.055],[.115,-.08],[.175,-.155]],curve=[];
 function distance(x,y,a,b){let dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)}
 for(let i=0;i<anchors.length-1;i++){let a=anchors[Math.max(0,i-1)],b=anchors[i],c=anchors[i+1],d=anchors[Math.min(anchors.length-1,i+2)];for(let j=0;j<12;j++){let t=j/12,t2=t*t,t3=t2*t;curve.push([0,1].map(k=>.5*(2*b[k]+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t2+(-a[k]+3*b[k]-3*c[k]+d[k])*t3)))}}curve.push(anchors.at(-1));
 function inside(x,y){let r=Math.hypot(x,y),a=Math.atan2(y,x);if(r>.315&&r<.385&&!(a>-.95&&a<-.2))return true;if(curve.slice(1).some((b,i)=>distance(x,y,curve[i],b)<.017))return true;let xs=[-.18,-.10,-.02,.06,.14],tops=[.133,.067,.094,0,-.052];return xs.some((v,i)=>distance(x,y,[v,tops[i]],[v,.17])<.015)}
 const cache=new Map;
 function points(size,pitch){let key=size+':'+pitch;if(cache.has(key))return cache.get(key);let out=[];for(let x=-size*.41;x<=size*.41;x+=pitch)for(let y=-size*.41;y<=size*.41;y+=pitch){let hit=0;for(let [dx,dy]of[[0,0],[-.003,0],[.003,0],[0,-.004],[0,.004]])if(inside(x/size+dx,y/size+dy))hit++;if(hit)out.push([x,y,Math.min(3,Math.floor(hit/1.3))])}cache.set(key,out);return out}
 function renderMark(ctx,cx,cy,size,phase,alpha,background=false){let pitch=background?8:(size>90?4:1.35),weights=background?[1,2,3,4]:(size>90?[.8,1.4,2.1,2.9]:[.35,.5,.7,.95]),ps=points(size,pitch);ctx.strokeStyle=background?'#68748d':'#5147a3';ctx.globalAlpha=alpha;ctx.lineCap='round';for(let [x,y,k]of ps){let dx=phase===null?0:Math.sin(y/80+phase)*2.3,dy=phase===null?0:Math.sin(x/105+phase*.7)*1.8;ctx.lineWidth=weights[k];ctx.beginPath();ctx.moveTo(cx+x+dx,cy+y+dy-pitch*.365);ctx.lineTo(cx+x+dx,cy+y+dy+pitch*.365);ctx.stroke()}ctx.globalAlpha=1}
 function icon(canvas){let r=canvas.getBoundingClientRect(),size=Math.round(r.width||48),dpr=Math.min(2,devicePixelRatio||1);canvas.width=size*dpr;canvas.height=size*dpr;let c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);renderMark(c,size/2,size/2,size*1.05,null,1)}
 document.querySelectorAll('.identity-mark').forEach(icon);
 const field=document.getElementById('identityField'),ctx=field.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)');let w=0,h=0,raf=0,last=0,rects=[],pointer={x:0,y:0},spring={x:0,y:0},phase=0;
 const animated=()=>motion&&!reduced.matches&&!document.hidden;
 function measure(){w=innerWidth;h=innerHeight;let dpr=Math.min(devicePixelRatio||1,1.5);field.width=Math.round(w*dpr);field.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);rects=[...document.querySelectorAll('header,.hero h1,.hero .sub,.hero .eyebrow,.hero aside,.toolbar,.tabs,.panel,footer')].filter(el=>el.getClientRects().length).map(el=>el.getBoundingClientRect());document.querySelectorAll('.identity-mark').forEach(icon)}
 function paint(){ctx.clearRect(0,0,w,h);let size=Math.round(Math.min(780,Math.max(440,w*.49)));renderMark(ctx,w*.06+spring.x,h*.67+spring.y,size,animated()?phase:null,.14,true);renderMark(ctx,w*.95-spring.x*.65,h*.20-spring.y*.65,size*.80,animated()?phase+2:null,.11,true);ctx.globalCompositeOperation='destination-out';ctx.fillStyle='#000';for(let r of rects)ctx.fillRect(r.x-12,r.y-10,r.width+24,r.height+20);ctx.globalCompositeOperation='source-over'}
 function tick(now){raf=0;if(!animated())return;if(now-last>48){let dt=Math.min(.08,(now-last)/1000);last=now;phase+=dt*.24;spring.x+=(pointer.x-spring.x)*.08;spring.y+=(pointer.y-spring.y)*.08;paint()}raf=requestAnimationFrame(tick)}
 function sync(){cancelAnimationFrame(raf);raf=0;measure();paint();if(animated()){last=performance.now();raf=requestAnimationFrame(tick)}}
 let scheduled=false;function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;measure();paint()})}
 addEventListener('pointermove',e=>{pointer.x=(e.clientX/w-.5)*8;pointer.y=(e.clientY/h-.5)*8},{passive:true});addEventListener('pointerout',e=>{if(!e.relatedTarget){pointer.x=pointer.y=0}});addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue);
 document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
 new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
 new MutationObserver(queue).observe(document.querySelector('main'),{subtree:true,attributes:true,attributeFilter:['hidden','class']});
 document.fonts.ready.then(queue);
 // Re-measure the intro icon when its previously hidden canvas becomes visible.
 new MutationObserver(()=>{if(!document.getElementById('brandIntro').hidden)icon(document.querySelector('#introMark canvas'))}).observe(document.getElementById('brandIntro'),{attributes:true,attributeFilter:['hidden']});
 sync();
 // Browser-tab identity is also drawn from the same quantized geometry.
 let fav=document.createElement('canvas');fav.width=fav.height=64;let fc=fav.getContext('2d');renderMark(fc,32,32,67.2,null,1);let link=document.querySelector('link[rel=icon]');if(link){link.type='image/png';link.href=fav.toDataURL('image/png')}
})();
