import requests
s=requests.Session();s.trust_env=False
urls={
'qt':'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=sh511010,day,2013-01-01,2025-12-31,10000,hfq',
'sina_bond':'https://quotes.sina.cn/cn/api/jsonp_v2.php/var%20_x=/CN_MarketDataService.getKLineData?symbol=sh511010&scale=240&ma=no&datalen=10000',
'bond_em':'https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=1.511010&klt=101&fqt=2&beg=19900101&end=20251231&lmt=10000&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61'}
for k,u in urls.items():
 try:
  r=s.get(u,timeout=25);open('work/'+k+'.txt','w',encoding='utf8').write(r.text);print(k,r.status_code,len(r.content),r.text[:100])
 except Exception as e:print(k,type(e).__name__)
