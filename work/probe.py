import requests; session=requests.Session(); session.trust_env=False; requests.get=session.get
urls={
'csi':'https://www.csindex.com.cn/csindex-home/perf/index-perf?indexCode=H00300&startDate=20020101&endDate=20251231',
'sina':'https://quotes.sina.cn/cn/api/jsonp_v2.php/var%20_x=/CN_MarketDataService.getKLineData?symbol=shh00300&scale=240&ma=no&datalen=10000',
'em':'https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=1.518880&klt=101&fqt=2&beg=19900101&end=20251231&lmt=10000&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
'fund':'https://fund.eastmoney.com/pingzhongdata/511010.js'}
for k,u in urls.items():
 try:
  r=requests.get(u,timeout=30); open('work/'+k+'.txt','w',encoding='utf8').write(r.text); print(k,r.status_code,len(r.content),r.text[:180])
 except Exception as e: print(k,str(e))


