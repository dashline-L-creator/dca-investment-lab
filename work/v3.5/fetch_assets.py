from pathlib import Path
import requests,concurrent.futures
q=Path('work/v3.5')
tasks=[]
for code,first in [('511260',2017),('513500',2014)]:
 for y in range(first,2027):
  for adj in ['','hfq']:
   tasks.append((f'sh{code}_{y}_{adj or "raw"}.json',f'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=sh{code},day,{y}-01-01,{y}-12-31,640,{adj}'))
 tasks.extend([(f'fhsp_{code}.html',f'https://fundf10.eastmoney.com/fhsp_{code}.html'),(f'nav_{code}.js',f'https://fund.eastmoney.com/pingzhongdata/{code}.js')])
def fetch(task):
 name,url=task;p=q/name
 if p.exists():return name,'cached'
 session=requests.Session();session.trust_env=False
 for attempt in range(3):
  try:
   r=session.get(url,timeout=30);r.raise_for_status();r.encoding='utf8';p.write_text(r.text,encoding='utf8');return name,len(r.content)
  except Exception as e:
   if attempt==2:return name,type(e).__name__
with concurrent.futures.ThreadPoolExecutor(5) as ex:
 for r in ex.map(fetch,tasks):print(r,flush=True)
