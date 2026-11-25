// Calendar-date based session coordinates. Prices are never extrapolated.
// Exchange-local time for indices; Beijing time for the COMEX provider.
function marketSession(a){
 const code=a.code;
 const cutoff=code==='sh000001'||code==='sz399001'?900:code==='hkHSI'?(/-(12-24|12-31)$/.test(a.date)?730:970):code.startsWith('us.')?(['2025-07-03','2025-11-28','2025-12-24','2026-11-27','2026-12-24'].includes(a.date)?780:960):Infinity;
 const points=code==='GC00Y'?a.points:a.points.filter(p=>{const m=marketMinutes(p[0]);return m>=570&&m<=cutoff});
 const times=marketTimeline(points),first=times[0]??570,last=times.at(-1)??first;
 let open=first,close=last;
 if(code==='sh000001'||code==='sz399001'){open=570;close=900}
 else if(code==='hkHSI'){open=570;close=970;if(/-(12-24|12-31)$/.test(a.date))close=730;}
 else if(code==='us.IXIC'||code==='us.INX'){
  open=570;close=960;
  // Published Nasdaq early closes; do not infer holidays from incomplete data.
  if(['2025-07-03','2025-11-28','2025-12-24','2026-11-27','2026-12-24'].includes(a.date))close=780;
 }else if(code==='GC00Y'){
  const noon=new Date(a.date+'T12:00:00+08:00'),parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'}).formatToParts(noon),nyHour=Number(parts.find(p=>p.type==='hour').value),summer=nyHour===0;
  open=(summer?6:7)*60;close=open+23*60;
  // Provider can return a partial session beginning later; retain real minutes.
  while(first>=close){open+=1440;close+=1440}
 }
 open=Math.min(open,first);close=Math.max(close,last);
 const clock=m=>String(Math.floor(m%1440/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
 return {open,close,points,times,latest:last,startLabel:clock(open),label:clock(close)+(Math.floor(close/1440)>Math.floor(open/1440)?' +1':'')};
}
