import requests,json,concurrent.futures

def run(c):
 s=requests.Session();s.trust_env=False
 for host in ['https://push2his.eastmoney.com','https://61.push2his.eastmoney.com','http://push2his.eastmoney.com']:
  u=host+'/api/qt/stock/kline/get'
  try:
   r=s.get(u,params={'secid':'1.'+c,'klt':'101','fqt':'2','beg':'19900101','end':'20251231','lmt':'10000','fields1':'f1,f2,f3,f4,f5,f6','fields2':'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61'},timeout=20)
   print(host,c,r.status_code,len(r.content));r.json();open('work/'+c+'_2.json','w',encoding='utf8').write(r.text);return
  except Exception as e: print(type(e).__name__)
run('511010')
