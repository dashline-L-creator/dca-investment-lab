from pathlib import Path
import requests,json,re,concurrent.futures
q=Path('work/v3.4');q.mkdir(exist_ok=True)
def fetch(task):
 name,url=task
 p=q/name
 if p.exists():return name,'cached',len(p.read_bytes())
 s=requests.Session();s.trust_env=False
 for attempt in range(3):
  try:
   r=s.get(url,timeout=40);r.raise_for_status();r.encoding='utf8';p.write_text(r.text,encoding='utf8');return name,r.status_code,len(r.content)
  except Exception as e:
   if attempt==2:return name,type(e).__name__,str(e)[:140]
tasks=[]
for code in ['sh511010','sh518880','sh513100']:
 for y in [2025,2026]:
  for adj in ['', 'hfq']:
   tasks.append((f'{code}_{y}_{adj or "raw"}.json',f'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param={code},day,{y}-01-01,{y}-12-31,640,{adj}'))
for y in range(2012,2027):
 for adj in ['', 'hfq']:
  tasks.append((f'sz159920_{y}_{adj or "raw"}.json',f'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=sz159920,day,{y}-01-01,{y}-12-31,640,{adj}'))
for code in ['511010','518880','513100','159920']:
 tasks.append((f'nav_{code}.js',f'https://fund.eastmoney.com/pingzhongdata/{code}.js'))
tasks += [('csi_2026.json','https://www.csindex.com.cn/csindex-home/perf/index-perf?indexCode=H00300&startDate=20250101&endDate=20261031'),('mouse_reference.html','https://www.stylekit.top/zh/mouse-interactions')]
with concurrent.futures.ThreadPoolExecutor(5) as ex:
 for row in ex.map(fetch,tasks):print(row,flush=True)
for p in q.glob('nav_*.js'):
 m=re.search(r'var Data_netWorthTrend\s*=\s*(\[.*?\]);',p.read_text(encoding='utf8'))
 if m:print(p.name,'events',[(x['x'],x['unitMoney']) for x in json.loads(m.group(1)) if x['unitMoney']],flush=True)
for p in [q/'csi_2026.json',q/'sh518880_2026_raw.json',q/'sz159920_2026_raw.json']:
 try:
  j=json.loads(p.read_text(encoding='utf8'));print(p.name,str(j)[:130],str(j)[-250:])
 except Exception as e:print(p.name,type(e).__name__)
