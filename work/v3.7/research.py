from pathlib import Path
import requests,concurrent.futures,json
q=Path('work/v3.7')
jobs={
'electric-reference.jsx':'https://raw.githubusercontent.com/DavidHDev/react-bits/main/src/content/Animations/ElectricLogo/ElectricLogo.jsx',
'electric-demo.jsx':'https://raw.githubusercontent.com/DavidHDev/react-bits/main/src/demo/Animations/ElectricLogoDemo.jsx',
'reactbits-license.txt':'https://raw.githubusercontent.com/DavidHDev/react-bits/main/LICENSE.md'}
for code in ['1.000001','0.399001','100.HSI','100.NDX','100.SPX']:
 jobs['market-'+code+'.json']='https://push2his.eastmoney.com/api/qt/stock/trends2/get?secid='+code+'&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11&fields2=f51,f52,f53,f54,f55,f56,f57,f58&ndays=1&iscr=0&cb=dca_probe'
def one(job):
 name,url=job;s=requests.Session();s.trust_env=False
 try:
  r=s.get(url,timeout=25);r.raise_for_status()
  if name.endswith('.json'):
   payload=json.loads(r.text.removeprefix('dca_probe(').rstrip(');'));(q/name).write_text(json.dumps(payload,ensure_ascii=False),encoding='utf8');d=payload.get('data') or {};rows=d.get('trends',[]);return name,len(rows),d.get('preClose'),rows[0] if rows else None,rows[-1] if rows else None
  (q/name).write_bytes(r.content)
  return name,len(r.content)
 except Exception as e:return name,str(e)
print(*concurrent.futures.ThreadPoolExecutor(max_workers=8).map(one,jobs.items()),sep='\n')
