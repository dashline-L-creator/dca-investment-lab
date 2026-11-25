from pathlib import Path
import shutil,requests,json
q=Path('work/v3.7');o=Path('outputs/v3.7');o.mkdir(exist_ok=True)
names=['template.html','build.py','i18n.js','intro.js','linefield.js','mouse.js','favicon.html','translations.json','font-project.json','fonts.py','cloud3d.js','morph.js','orbit.js','IBMPlexSans-400.woff2','IBMPlexSans-600.woff2','IBMPlexSans-OFL.txt','NotoSansSC-400.woff2','NotoSansSC-600.woff2']
for name in names:
 shutil.copy2(Path('work/v3.6')/name,q/name)
 if name.endswith(('.html','.py','.js','.json')):
  p=q/name;s=p.read_text(encoding='utf-8-sig').replace('v3.6','v3.7').replace('dca-intro-v36','dca-intro-v37');p.write_text(s,encoding='utf8')
shutil.copy2('outputs/v3.6/时间的复利_A2收细圆环.svg',o/'时间的复利_A2收细圆环.svg')
s=requests.Session();s.trust_env=False
r=s.get('https://esm.sh/ogl@1.0.11/es2022/ogl.bundle.mjs',timeout=25);r.raise_for_status();(q/'ogl.bundle.mjs').write_bytes(r.content)
r=s.get('https://cdn.jsdelivr.net/npm/ogl@1.0.11/package.json',timeout=20);r.raise_for_status();assert r.json()['license']=='Unlicense';r=s.get('https://spdx.org/licenses/Unlicense.txt',timeout=20);r.raise_for_status();(q/'OGL-LICENSE.txt').write_text('OGL 1.0.11 — https://github.com/oframe/ogl\n\n'+r.text,encoding='utf8')
markets=[('sh000001','上证指数','SSE Composite','1.000001'),('sz399001','深证成指','SZSE Component','0.399001'),('hkHSI','恒生指数','Hang Seng','100.HSI'),('us.IXIC','纳斯达克综合','Nasdaq Composite','100.NDX'),('us.INX','标普500','S&P 500','100.SPX')]
out=[]
from datetime import datetime,timezone
for code,name,en,_ in markets:
 path='UsMinute' if code.startswith('us') else 'minute'
 u='https://web.ifzq.gtimg.cn/appstock/app/'+path+'/query?code='+code
 r=s.get(u,timeout=15);r.raise_for_status();p=r.json();d=p['data'][code];qt=d['qt'][code];points=[]
 for row in d['data']['data']:
  a=row.split();price=float(a[1]);clock=a[0]
  if len(clock)==4 and price>0:points.append([clock,price])
 if len(points)<2:raise ValueError('Insufficient intraday points: '+code)
 date=d['data']['date'];date=date[:4]+'-'+date[4:6]+'-'+date[6:8] if len(date)==8 else date
 out.append(dict(code=code,name=name,en=en,points=points,date=date,previous=float(qt[4]),quoteTime=qt[30],source=u,fetchedAt=datetime.now(timezone.utc).isoformat()))
(q/'market-snapshot.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf8')
print('Prepared v3.7; genuine market snapshots:',[(a['code'],a['date'],len(a['points'])) for a in out])
