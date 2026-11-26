const fs=require('fs'),crypto=require('crypto'),assert=require('assert');
const raw=fs.readFileSync('data/research/dca.json'),manifest=JSON.parse(fs.readFileSync('data/research/manifest.json','utf8')),data=JSON.parse(raw),expected=JSON.parse(fs.readFileSync('data/research/expected_stats.json','utf8'));
assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),manifest.sha256);assert.equal(data.assets.length,manifest.assets);
let total=0;const near=(a,b)=>assert(Math.abs(a-b)<1e-10,`${a} != ${b}`);
for(const a of data.assets){const e=expected.find(v=>v.code===a.code);assert(e);assert.equal(a.samples.length,e.n);total+=a.samples.length;
 for(const r of a.samples){assert.equal(r[3],r[2]*50);near(r[5],r[4]/r[3]-1)}
 const x=a.samples.map(r=>r[5]).sort((a,b)=>a-b),n=x.length,mean=x.reduce((s,v)=>s+v,0)/n;
 const quantile=p=>{const j=(n-1)*p,i=Math.floor(j);return x[i]+(x[Math.min(n-1,i+1)]-x[i])*(j-i)};
 near(mean,e.mean);near(Math.sqrt(x.reduce((s,v)=>s+(v-mean)**2,0)/n),e.sd);
 for(const p of [5,25,50,75,95])near(quantile(p/100),e['p'+p]);near(x[0],e.min);near(x.at(-1),e.max);near(x.filter(v=>v>0).length/n,e.positive);near(x.filter(v=>v<0).length/n,e.loss);
}
assert.equal(total,manifest.samples);console.log('PASS: frozen SHA256, all 15,354 cashflow/return identities and seven-asset statistic baselines.');
