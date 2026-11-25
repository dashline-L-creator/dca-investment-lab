import requests,concurrent.futures,re
from pathlib import Path
q=Path('work/v3.8')
jobs={
'gold-page':'https://quote.eastmoney.com/globalfuture/GC00Y.html',
'gold-tencent':'https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=hfGC',
'gold-em':'https://push2his.eastmoney.com/api/qt/stock/trends2/get?secid=101.GC00Y&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11&fields2=f51,f52,f53,f54,f55,f56,f57,f58&ndays=1&iscr=0&cb=dca_gold',
'gold-sina':'https://stock2.finance.sina.com.cn/futures/api/jsonp.php/dca_gold/GlobalFuturesService.getGlobalFuturesMinLine?symbol=GC&type=1'}
def one(job):
 name,url=job;s=requests.Session();s.trust_env=False
 try:
  r=s.get(url,headers={'User-Agent':'Mozilla/5.0','Referer':'https://finance.sina.com.cn/'},timeout=15);(q/(name+'.txt')).write_text(r.text,encoding='utf8')
  if name=='gold-page':return name,r.status_code,re.findall('.{0,45}(?:GC00Y|secid|marketid).{0,65}',r.text)[:8]
  return name,r.status_code,r.headers.get('Access-Control-Allow-Origin'),r.text[:300]
 except Exception as e:return name,str(e)
print(*concurrent.futures.ThreadPoolExecutor(max_workers=4).map(one,jobs.items()),sep='\n')
