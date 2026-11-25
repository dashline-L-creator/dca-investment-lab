import requests,json
from pathlib import Path
s=requests.Session();s.trust_env=False;s.proxies={'http':'http://127.0.0.1:7890','https':'http://127.0.0.1:7890'}
u='https://push2his.eastmoney.com/api/qt/stock/trends2/get?secid=101.GC00Y&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58&ndays=1&iscr=0&cb=dca_gold'
try:
 r=s.get(u,headers={'User-Agent':'Mozilla/5.0','Referer':'https://quote.eastmoney.com/'},timeout=15);Path('work/v3.8/gold-em-proxy.txt').write_text(r.text,encoding='utf8');print(r.status_code,r.headers.get('Access-Control-Allow-Origin'),r.text[:750])
except Exception as e:print(type(e).__name__,str(e))
