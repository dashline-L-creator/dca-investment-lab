from pathlib import Path
import requests,json,concurrent.futures
q=Path('work/v3.8')
def fetch(code):
 s=requests.Session();s.trust_env=False;s.proxies={'http':'http://127.0.0.1:7890','https':'http://127.0.0.1:7890'}
 url='https://push2his.eastmoney.com/api/qt/stock/trends2/get?secid=101.GC00Y&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58&ndays=1&iscr=0' if code=='GC00Y' else 'https://web.ifzq.gtimg.cn/appstock/app/'+('UsMinute' if code.startswith('us.') else 'minute')+'/query?code='+code
 try:
  r=s.get(url,timeout=12);r.raise_for_status();return code,r.json()
 except Exception:return code,None
out=dict(concurrent.futures.ThreadPoolExecutor(max_workers=6).map(fetch,['sh000001','sz399001','hkHSI','us.IXIC','us.INX','GC00Y']))
(q/'seed-responses.json').write_text(json.dumps(out,ensure_ascii=False),encoding='utf8');print('Fetched fresh seed payloads:',[k for k,v in out.items() if v])
