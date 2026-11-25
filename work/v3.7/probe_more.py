import requests,concurrent.futures,json
from pathlib import Path
q=Path('work/v3.7')
jobs={
'us-minute-ixic':'https://web.ifzq.gtimg.cn/appstock/app/UsMinute/query?code=us.IXIC',
'us-minute-inx':'https://web.ifzq.gtimg.cn/appstock/app/UsMinute/query?code=us.INX',
'em2-ixic':'https://push2.eastmoney.com/api/qt/stock/trends2/get?secid=100.NDX&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11&fields2=f51,f52,f53,f54,f55,f56,f57,f58&ndays=1&iscr=0&cb=dca_probe',
'emhis-ixic':'https://push2his.eastmoney.com/api/qt/stock/trends2/get?secid=100.NDX&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11&fields2=f51,f52,f53,f54,f55,f56,f57,f58&ndays=1&iscr=0&cb=dca_probe',
'yahoo-ixic':'https://query1.finance.yahoo.com/v8/finance/chart/%5EIXIC?interval=1m&range=1d'}
def one(job):
 n,u=job;s=requests.Session();s.trust_env=False
 try:
  r=s.get(u,headers={'User-Agent':'Mozilla/5.0','Referer':'https://quote.eastmoney.com/'},timeout=12);(q/(n+'.txt')).write_text(r.text,encoding='utf8');return n,r.status_code,r.headers.get('access-control-allow-origin'),r.text[:200]
 except Exception as e:return n,str(e)
print(*concurrent.futures.ThreadPoolExecutor(max_workers=5).map(one,jobs.items()),sep='\n')
