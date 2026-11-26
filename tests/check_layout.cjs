const fs=require('fs'),vm=require('vm'),assert=require('assert');const box={Intl,Date,performance:{now:()=>0}};vm.createContext(box);
vm.runInContext('function marketMinutes(s){return Number(s.slice(0,2))*60+Number(s.slice(2))}\n'+['gold.js','sessions.js','playback.js'].map(f=>fs.readFileSync('src/js/'+f,'utf8')).join('\n'),box);
for(const [w,h]of [[320,550],[360,620],[390,700],[390,844],[600,800],[768,700],[1024,768],[1280,900],[1945,1251]]){
 box.w=w;box.h=h;const a=vm.runInContext('introComposition(w,h)',box);assert.equal(a.markets.length,6);
 const logo={x:w/2-a.logo*.62,right:w/2+a.logo*.62};
 for(const b of a.markets){assert(b.x>=0&&b.y>=0&&b.x+b.w<=w&&b.y+b.h<=h);if(w>=760)assert(b.x+b.w<=logo.x||b.x>=logo.right)}
 if(w<760){const top=a.markets[0].y+a.markets[0].h,bottom=a.markets[3].y;assert(a.logo*1.24+124<=bottom-top-36+1e-6)}
}
for(const [code,prices]of [['sh000001',[98.1,98.2,98.3]],['us.INX',[102,103,104]],['GC00Y',[99.99,100,100.01]]]){
 box.a={code,date:'2026-11-25',previous:100,points:prices.map((p,i)=>[['0930','1000','1100'][i],p])};const p=vm.runInContext('marketCurveGeometry(a,{x:0,y:0,w:300,h:100})',box);const ys=p.points.map(v=>v.y);assert(Math.max(...ys)-Math.min(...ys)>70);assert(ys.every(y=>y>=0&&y<=100));
}
console.log('PASS: nine intro viewport compositions reserve logo/market regions, phone stage fits; independently scaled negative/positive/narrow market paths use >70% vertical range.');
