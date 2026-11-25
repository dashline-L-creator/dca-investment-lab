import requests,json,concurrent.futures
s=requests.Session();s.trust_env=False
base='https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=1.{code}&klt=101&fqt={adj}&beg=19900101&end=20251231&lmt=10000&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61'
def fetch(x):
 name,url=x;r=s.get(url,timeout=60);r.raise_for_status();r.encoding='utf8';open('work/'+name+'.json','w',encoding='utf8').write(r.text);print(name,len(r.content))
with concurrent.futures.ThreadPoolExecutor(4) as ex:list(ex.map(fetch,[(f'{c}_{a}',base.format(code=c,adj=a)) for c in ['511010','518880'] for a in [0,2]]))
