// Measure the actual font and label bounds; preserve endpoints and remove collisions.
function axisTickLayout(ctx,min,max,left,right,format,gap=12){
 for(let count=5;count>=2;count--){
  const ticks=Array.from({length:count},(_,i)=>{const v=min+(max-min)*i/(count-1),x=left+(right-left)*i/(count-1),label=String(format(v)),width=ctx.measureText(label).width,align=i===0?'left':i===count-1?'right':'center',start=align==='left'?x:align==='right'?x-width:x-width/2;return{v,x,label,align,start,end:start+width}});
  if(ticks.every((t,i)=>!i||t.start>=ticks[i-1].end+gap))return ticks;
 }
 // Extremely narrow charts: retain the first date rather than overlap text.
 const label=String(format(min));return[{v:min,x:left,label,align:'left',start:left,end:left+ctx.measureText(label).width}];
}
